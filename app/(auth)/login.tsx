import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, PillButton, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { errorMessage } from '@/lib/errors';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSignIn() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(errorMessage(e, 'Не удалось войти. Попробуйте ещё раз.'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleForgotPassword() {
    Alert.alert(
      'Восстановление пароля',
      'Откроется сайт MeetGuru. Там нажмите «Забыли пароль?», введите email и следуйте ссылке из письма.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Открыть сайт', onPress: () => WebBrowser.openBrowserAsync('https://app.meetgu.ru/login') },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <AppText variant="h1" style={styles.title}>
            MeetGuru
          </AppText>
          <AppText variant="body" style={styles.subtitle}>
            Вход в аккаунт
          </AppText>

          <TextField
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!submitting}
          />
          <TextField
            placeholder="Пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
            editable={!submitting}
            onSubmitEditing={handleSignIn}
            returnKeyType="go"
          />

          <Pressable onPress={handleForgotPassword} hitSlop={8} style={styles.forgot}>
            <AppText variant="caption" style={{ color: colors.primary }}>
              Забыли пароль?
            </AppText>
          </Pressable>

          {error ? (
            <AppText variant="caption" style={{ color: colors.danger }}>
              {error}
            </AppText>
          ) : null}

          <PillButton
            label="Войти"
            onPress={handleSignIn}
            loading={submitting}
            disabled={!canSubmit}
            style={styles.button}
          />

          <View style={styles.footer}>
            <AppText variant="caption">Нет аккаунта? </AppText>
            <Link href="/(auth)/register" replace>
              <AppText variant="caption" style={{ color: colors.primary }}>
                Зарегистрироваться
              </AppText>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', color: colors.muted, marginBottom: spacing.md },
  forgot: { alignSelf: 'flex-end' },
  button: { marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
});
