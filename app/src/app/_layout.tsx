import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { LoginScreen } from '@/components/auth/login-screen';
import { DATABASE_NAME, migrateDatabase } from '@/db/migrations';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { CoupleProvider } from '@/lib/couple-context';

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  return session ? <AppTabs /> : <LoginScreen />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
        <AuthProvider>
          <CoupleProvider>
            <AnimatedSplashOverlay />
            <AuthGate />
          </CoupleProvider>
        </AuthProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
