import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { encryptedSessionStorage } from '@/lib/encrypted-session-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required. Add them to app/.env.'
  );
}

// AsyncStorage's native bridge assumes a browser/native runtime. Expo Router's web
// export also renders this module in a plain Node (SSR) context with no `window`,
// where AsyncStorage crashes the whole bundler. Only wire it in on native platforms;
// supabase-js falls back to safe in-memory/browser storage everywhere else.
// On native, the session is stored encrypted (see encrypted-session-storage.ts).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : encryptedSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
