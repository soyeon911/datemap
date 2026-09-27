import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';

type Step = 'email' | 'code';

export function LoginScreen() {
  const { signInWithEmail, verifyEmailCode } = useAuth();
  const theme = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSendCode() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      await signInWithEmail(trimmedEmail);
      setStep('code');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      await verifyEmailCode(email.trim(), trimmedCode);
      // Success updates `session` via onAuthStateChange; AuthGate swaps this screen out.
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">DearMap</ThemedText>

        {step === 'email' ? (
          <>
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
              editable={!submitting}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />

            <Pressable
              onPress={handleSendCode}
              disabled={submitting || !email.trim()}
              style={[styles.button, submitting && styles.buttonDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.buttonLabel}>인증코드 보내기</ThemedText>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <ThemedText type="subtitle" style={styles.subtitle}>
              {email.trim()}로{'\n'}인증코드를 보냈어요
            </ThemedText>

            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="6자리 코드"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoComplete="one-time-code"
              keyboardType="number-pad"
              editable={!submitting}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />

            <Pressable
              onPress={handleVerifyCode}
              disabled={submitting || !code.trim()}
              style={[styles.button, submitting && styles.buttonDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.buttonLabel}>확인</ThemedText>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setStep('email');
                setCode('');
                setErrorMessage('');
              }}
              disabled={submitting}
            >
              <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
                다른 이메일로 다시 시도
              </ThemedText>
            </Pressable>
          </>
        )}

        {errorMessage && (
          <ThemedText type="small" style={[styles.message, styles.errorMessage]}>
            {errorMessage}
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
