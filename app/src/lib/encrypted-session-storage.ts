import AsyncStorage from '@react-native-async-storage/async-storage';
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { utf8Decode, utf8Encode } from '@/utils/utf8';

// The Supabase session holds the refresh token. SecureStore (the iOS keychain /
// Android Keystore) protects data, but large values can be rejected by the
// platform, and a session can outgrow that. So only a 256-bit key lives in
// SecureStore, and the session is sealed with AES-GCM before going to AsyncStorage.
const KEY_NAME = 'dearmap.session-encryption-key';
const ENCRYPTED_PREFIX = 'enc:v1:';

let keyPromise: Promise<AESEncryptionKey> | null = null;

// Cached so that two writes at once cannot each create, and store, a different key.
function getOrCreateKey() {
  keyPromise ??= (async () => {
    const storedKey = await SecureStore.getItemAsync(KEY_NAME);

    if (storedKey) {
      return AESEncryptionKey.import(storedKey, 'hex');
    }

    const key = await AESEncryptionKey.generate();

    await SecureStore.setItemAsync(KEY_NAME, await key.encoded('hex'));

    return key;
  })();

  keyPromise.catch(() => {
    keyPromise = null;
  });

  return keyPromise;
}

async function setItem(name: string, value: string) {
  const sealed = await aesEncryptAsync(utf8Encode(value), await getOrCreateKey());

  await AsyncStorage.setItem(name, ENCRYPTED_PREFIX + (await sealed.combined('base64')));
}

async function getItem(name: string) {
  const stored = await AsyncStorage.getItem(name);

  if (stored === null) {
    return null;
  }

  // Saved in plain text by a build before this one: encrypt it now, so updating
  // the app does not sign anyone out.
  if (!stored.startsWith(ENCRYPTED_PREFIX)) {
    await setItem(name, stored);
    return stored;
  }

  try {
    const sealed = AESSealedData.fromCombined(stored.slice(ENCRYPTED_PREFIX.length));
    const bytes = await aesDecryptAsync(sealed, await getOrCreateKey(), { output: 'bytes' });

    return utf8Decode(bytes);
  } catch {
    // The key no longer matches (for example the keychain was reset). The session
    // cannot be read, so it is dropped and the person signs in again.
    await AsyncStorage.removeItem(name);
    return null;
  }
}

async function removeItem(name: string) {
  await AsyncStorage.removeItem(name);
}

export const encryptedSessionStorage = { getItem, setItem, removeItem };

/** @internal Lets tests start each case without a cached key. */
export function resetKeyCacheForTests() {
  keyPromise = null;
}
