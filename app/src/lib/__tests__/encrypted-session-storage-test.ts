import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { encryptedSessionStorage, resetKeyCacheForTests } from '@/lib/encrypted-session-storage';

const mockAsyncStore = new Map<string, string>();
const mockSecureStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (name: string) => mockAsyncStore.get(name) ?? null),
  setItem: jest.fn(async (name: string, value: string) => void mockAsyncStore.set(name, value)),
  removeItem: jest.fn(async (name: string) => void mockAsyncStore.delete(name)),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (name: string) => mockSecureStore.get(name) ?? null),
  setItemAsync: jest.fn(async (name: string, value: string) => void mockSecureStore.set(name, value)),
}));

// Stands in for expo-crypto with the real AES-256-GCM from WebCrypto, so a wrong
// key really fails to decrypt instead of being simulated.
jest.mock('expo-crypto', () => {
  const subtle = globalThis.crypto.subtle;
  const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16));
  const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
  const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
  const importRaw = (raw: Uint8Array<ArrayBuffer>) => subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

  class AESEncryptionKey {
    readonly raw: Uint8Array<ArrayBuffer>;

    constructor(raw: Uint8Array<ArrayBuffer>) {
      this.raw = raw;
    }

    static async generate() {
      return new AESEncryptionKey(globalThis.crypto.getRandomValues(new Uint8Array(32)));
    }

    static async import(hex: string) {
      return new AESEncryptionKey(fromHex(hex));
    }

    async encoded() {
      return toHex(this.raw);
    }
  }

  class AESSealedData {
    readonly data: Uint8Array<ArrayBuffer>;

    constructor(data: Uint8Array<ArrayBuffer>) {
      this.data = data;
    }

    static fromCombined(base64: string) {
      return new AESSealedData(fromBase64(base64));
    }

    async combined() {
      return toBase64(this.data);
    }
  }

  return {
    AESEncryptionKey,
    AESSealedData,
    async aesEncryptAsync(plaintext: Uint8Array<ArrayBuffer>, key: AESEncryptionKey) {
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
      const body = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, await importRaw(key.raw), plaintext));
      const combined = new Uint8Array(iv.length + body.length);

      combined.set(iv);
      combined.set(body, iv.length);

      return new AESSealedData(combined);
    },
    async aesDecryptAsync(sealed: AESSealedData, key: AESEncryptionKey) {
      const iv = sealed.data.slice(0, 12);
      const body = sealed.data.slice(12);

      return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv }, await importRaw(key.raw), body));
    },
  };
});

const SESSION_KEY = 'sb-project-auth-token';
const session = JSON.stringify({ access_token: 'token-abc', user: { email: 'a@b.c', user_metadata: { name: '데이트' } } });

beforeEach(() => {
  mockAsyncStore.clear();
  mockSecureStore.clear();
  resetKeyCacheForTests();
  jest.clearAllMocks();
});

describe('encryptedSessionStorage', () => {
  it('does not write the session to AsyncStorage in plain text', async () => {
    await encryptedSessionStorage.setItem(SESSION_KEY, session);

    const stored = mockAsyncStore.get(SESSION_KEY)!;

    expect(stored.startsWith('enc:v1:')).toBe(true);
    expect(stored).not.toContain('token-abc');
    expect(mockSecureStore.size).toBe(1);
  });

  it('reads back what it wrote, including Korean text', async () => {
    await encryptedSessionStorage.setItem(SESSION_KEY, session);

    await expect(encryptedSessionStorage.getItem(SESSION_KEY)).resolves.toBe(session);
  });

  it('reads the session after the app restarts', async () => {
    await encryptedSessionStorage.setItem(SESSION_KEY, session);
    resetKeyCacheForTests();

    await expect(encryptedSessionStorage.getItem(SESSION_KEY)).resolves.toBe(session);
  });

  it('keeps a plain-text session from an earlier build and encrypts it', async () => {
    mockAsyncStore.set(SESSION_KEY, session);

    await expect(encryptedSessionStorage.getItem(SESSION_KEY)).resolves.toBe(session);
    expect(mockAsyncStore.get(SESSION_KEY)).not.toContain('token-abc');
    await expect(encryptedSessionStorage.getItem(SESSION_KEY)).resolves.toBe(session);
  });

  it('drops a session it can no longer decrypt', async () => {
    await encryptedSessionStorage.setItem(SESSION_KEY, session);
    mockSecureStore.clear();
    resetKeyCacheForTests();

    await expect(encryptedSessionStorage.getItem(SESSION_KEY)).resolves.toBeNull();
    expect(mockAsyncStore.has(SESSION_KEY)).toBe(false);
  });

  it('creates only one key when two writes start together', async () => {
    await Promise.all([
      encryptedSessionStorage.setItem(SESSION_KEY, session),
      encryptedSessionStorage.setItem(`${SESSION_KEY}-code-verifier`, 'verifier'),
    ]);

    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    await expect(encryptedSessionStorage.getItem(`${SESSION_KEY}-code-verifier`)).resolves.toBe('verifier');
  });

  it('returns null for a missing item and removes items', async () => {
    await expect(encryptedSessionStorage.getItem('missing')).resolves.toBeNull();

    await encryptedSessionStorage.setItem(SESSION_KEY, session);
    await encryptedSessionStorage.removeItem(SESSION_KEY);

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(SESSION_KEY);
    await expect(encryptedSessionStorage.getItem(SESSION_KEY)).resolves.toBeNull();
  });
});
