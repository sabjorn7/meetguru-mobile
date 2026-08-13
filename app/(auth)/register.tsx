import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, PillButton, TextField } from '@/components/ui';
import { LEGAL_URLS, openLegal } from '@/constants/legal';
import { useAuth } from '@/features/auth/AuthContext';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

/** Registration roles. `label` is shown; `value` is the stored users.role. */
const ROLE_OPTIONS = [
  { label: 'Специалист', value: 'Ученик' },
  { label: 'Спикер', value: 'Спикер' },
  { label: 'Учебное заведение', value: 'Учебное заведение' },
] as const;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>(ROLE_OPTIONS[0].value);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length >= 6 && agreed && !submitting;

  async function handleRegister() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const { needsConfirmation } = await signUp(email, password, role);
      if (needsConfirmation) {
        setInfo('Мы отправили письмо для подтверждения. Проверьте почту, затем войдите.');
      }
    } catch (e) {
      setError(errorMessage(e, 'Не удалось зарегистрироваться.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <AppText variant="h1" style={styles.title}>
            MeetGuru
          </AppText>
          <AppText variant="body" style={styles.subtitle}>
            Регистрация
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
            placeholder="Пароль (мин. 6 символов)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            editable={!submitting}
          />

          <AppText variant="label" style={styles.roleLabel}>
            Вы регистрируетесь как
          </AppText>
          <View style={styles.roles}>
            {ROLE_OPTIONS.map((option) => {
              const active = role === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.roleChip, active && styles.roleChipActive]}
                  onPress={() => setRole(option.value)}
                  disabled={submitting}
                >
                  <AppText variant="caption" style={active ? styles.roleTextActive : styles.roleText}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <AppText variant="caption" style={{ color: colors.danger }}>
              {error}
            </AppText>
          ) : null}
          {info ? (
            <AppText variant="caption" style={{ color: colors.success }}>
              {info}
            </AppText>
          ) : null}

          <Pressable
            style={styles.agreeRow}
            onPress={() => setAgreed((v) => !v)}
            disabled={submitting}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed ? (
                <AppText variant="caption" style={styles.checkboxMark}>
                  ✓
                </AppText>
              ) : null}
            </View>
            <AppText variant="caption" style={styles.agreeText}>
              Я принимаю{' '}
              <AppText
                variant="caption"
                style={styles.legalLink}
                onPress={() => openLegal(LEGAL_URLS.terms)}
              >
                Условия использования
              </AppText>{' '}
              и{' '}
              <AppText
                variant="caption"
                style={styles.legalLink}
                onPress={() => openLegal(LEGAL_URLS.privacy)}
              >
                Политику конфиденциальности
              </AppText>
            </AppText>
          </Pressable>

          <PillButton
            label="Зарегистрироваться"
            onPress={handleRegister}
            loading={submitting}
            disabled={!canSubmit}
            style={styles.button}
          />

          <View style={styles.footer}>
            <AppText variant="caption">Уже есть аккаунт? </AppText>
            <Link href="/(auth)/login" replace>
              <AppText variant="caption" style={{ color: colors.primary }}>
                Войти
              </AppText>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', color: colors.muted, marginBottom: spacing.md },
  roleLabel: { color: colors.muted, marginTop: spacing.xs },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleText: { color: colors.muted },
  roleTextActive: { color: colors.white },
  button: { marginTop: spacing.sm },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xs },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: colors.white, fontWeight: '700', lineHeight: 18 },
  agreeText: { flex: 1, color: colors.muted },
  legalLink: { color: colors.primary, textDecorationLine: 'underline' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
});
