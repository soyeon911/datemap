import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';

export function LoginScreen() {
  const { signInWithEmail, authError } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // authError comes from the auth-callback deep link (e.g. magic link exchange failing),
  // which can happen after this screen already showed "sent" for the original request.
  const displayError = authError ?? (status === 'error' ? errorMessage : null);

  async function handleSendMagicLink() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return;
    }

    setStatus('sending');
    setErrorMessage('');

    try {
      await signInWithEmail(trimmedEmail);
      setStatus('sent');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">DearMap</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          기록을 지키기 위해{'\n'}이메일로 로그인해주세요
        </ThemedText>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          editable={status !== 'sending' && status !== 'sent'}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        />

        <Pressable
          onPress={handleSendMagicLink}
          disabled={status === 'sending' || status === 'sent' || !email.trim()}
          style={[styles.button, (status === 'sending' || status === 'sent') && styles.buttonDisabled]}
        >
          {status === 'sending' ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.buttonLabel}>매직링크 보내기</ThemedText>
          )}
        </Pressable>

        {status === 'sent' && !displayError && (
          <ThemedText type="small" style={styles.message}>
            {email.trim()}로 로그인 링크를 보냈어요. 메일함을 확인해주세요.
          </ThemedText>
        )}

        {displayError && (
          <ThemedText type="small" style={[styles.message, styles.errorMessage]}>
            {displayError}
          </ThemedText>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  message: {
    textAlign: 'center',
  },
  errorMessage: {
    color: '#d64545',
  },
});
