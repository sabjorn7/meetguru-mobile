import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Card, PillButton, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import {
  fetchProfile,
  showCreated,
  showEnrolled,
  updateProfile,
  updateProfileVisibility,
  uploadAvatar,
  type ProfilePatch,
} from '@/features/profile/api';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

type FormState = {
  Name: string;
  Description: string;
  telegram_url: string;
  whatsapp_url: string;
  vk_url: string;
  youtube_url: string;
  website_url: string;
  booking_url: string;
};

const EMPTY_FORM: FormState = {
  Name: '',
  Description: '',
  telegram_url: '',
  whatsapp_url: '',
  vk_url: '',
  youtube_url: '',
  website_url: '',
  booking_url: '',
};

const FIELDS: { key: keyof FormState; label: string; multiline?: boolean; placeholder?: string }[] = [
  { key: 'Name', label: 'Имя' },
  { key: 'Description', label: 'О себе', multiline: true },
  { key: 'telegram_url', label: 'Telegram', placeholder: 'https://t.me/…' },
  { key: 'whatsapp_url', label: 'WhatsApp' },
  { key: 'vk_url', label: 'VK' },
  { key: 'youtube_url', label: 'YouTube' },
  { key: 'website_url', label: 'Сайт' },
  { key: 'booking_url', label: 'Ссылка для записи' },
];

/** Trim to a value or null so blank fields clear the column. */
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function EditProfileScreen() {
  const { user, updatePassword } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [kbHeight, setKbHeight] = useState(0);

  // Lift content by the exact keyboard height (edge-to-edge doesn't resize the window and
  // KeyboardAvoidingView mis-measures on Android — see the chat screen for the rationale).
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photo, setPhoto] = useState<string | null>(null);
  const [showCreatedCourses, setShowCreatedCourses] = useState(true);
  const [showEnrolledCourses, setShowEnrolledCourses] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!user) return;
    fetchProfile(user.id)
      .then((profile) => {
        if (!mounted || !profile) return;
        setForm({
          Name: profile.Name ?? '',
          Description: profile.Description ?? '',
          telegram_url: profile.telegram_url ?? '',
          whatsapp_url: profile.whatsapp_url ?? '',
          vk_url: profile.vk_url ?? '',
          youtube_url: profile.youtube_url ?? '',
          website_url: profile.website_url ?? '',
          booking_url: profile.booking_url ?? '',
        });
        setPhoto(profile.Photo ?? null);
        setShowCreatedCourses(showCreated(profile.hide));
        setShowEnrolledCourses(showEnrolled(profile.hide));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  async function persistVisibility(nextCreated: boolean, nextEnrolled: boolean) {
    if (!user) return;
    try {
      await updateProfileVisibility(user.id, { my: !nextCreated, buy: !nextEnrolled });
    } catch (e) {
      Alert.alert('Ошибка', errorMessage(e, 'Не удалось сохранить настройку.'));
    }
  }

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePickAvatar() {
    if (!user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нет доступа', 'Разрешите доступ к галерее, чтобы изменить фото.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.base64) return;

    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, asset.base64, asset.mimeType ?? 'image/jpeg');
      setPhoto(url);
    } catch (e) {
      Alert.alert('Ошибка загрузки', e instanceof Error ? e.message : 'Не удалось загрузить фото.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const patch: ProfilePatch = {
        Name: orNull(form.Name),
        Description: orNull(form.Description),
        telegram_url: orNull(form.telegram_url),
        whatsapp_url: orNull(form.whatsapp_url),
        vk_url: orNull(form.vk_url),
        youtube_url: orNull(form.youtube_url),
        website_url: orNull(form.website_url),
        booking_url: orNull(form.booking_url),
      };
      await updateProfile(user.id, patch);
      router.back();
    } catch (e) {
      Alert.alert('Ошибка', errorMessage(e, 'Не удалось сохранить профиль.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (changingPassword) return;
    if (newPassword.length < 6) {
      Alert.alert('Пароль слишком короткий', 'Минимум 6 символов.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Пароли не совпадают', 'Повторите новый пароль без ошибок.');
      return;
    }
    setChangingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Готово', 'Пароль изменён.');
    } catch (e) {
      Alert.alert('Ошибка', errorMessage(e, 'Не удалось изменить пароль.'));
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Редактирование' }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const initial = form.Name.trim()[0]?.toUpperCase() ?? '?';

  return (
    <View style={[styles.flex, { paddingBottom: kbHeight }]}>
      <Stack.Screen options={{ title: 'Редактирование' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarBlock}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <AppText variant="h1" style={{ color: colors.faint }}>
                {initial}
              </AppText>
            </View>
          )}
          <Pressable onPress={handlePickAvatar} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <AppText variant="subtitle" style={{ color: colors.primary }}>
                Изменить фото
              </AppText>
            )}
          </Pressable>
        </View>

        {FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            value={form[field.key]}
            onChangeText={(text) => setField(field.key, text)}
            placeholder={field.placeholder}
            multiline={field.multiline}
            autoCapitalize={field.key === 'Name' || field.key === 'Description' ? 'sentences' : 'none'}
            autoCorrect={field.key === 'Name' || field.key === 'Description'}
          />
        ))}

        <Card style={styles.visibilityCard}>
          <AppText variant="title">Видимость на профиле</AppText>
          <View style={styles.switchRow}>
            <AppText variant="bodyMedium" style={styles.switchLabel}>
              Показывать созданные курсы
            </AppText>
            <Switch
              value={showCreatedCourses}
              onValueChange={(v) => {
                setShowCreatedCourses(v);
                persistVisibility(v, showEnrolledCourses);
              }}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <AppText variant="bodyMedium" style={styles.switchLabel}>
              Показывать пройденные курсы
            </AppText>
            <Switch
              value={showEnrolledCourses}
              onValueChange={(v) => {
                setShowEnrolledCourses(v);
                persistVisibility(showCreatedCourses, v);
              }}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </Card>

        <PillButton label="Сохранить" onPress={handleSave} loading={saving} style={styles.save} />

        <Card style={styles.passwordSection}>
          <AppText variant="title">Смена пароля</AppText>
          <TextField
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Новый пароль (мин. 6 символов)"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
          />
          <TextField
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Повторите новый пароль"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
          />
          <PillButton
            label="Изменить пароль"
            variant="outline"
            onPress={handleChangePassword}
            loading={changingPassword}
            disabled={!newPassword || !confirmPassword}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: {
    marginTop: spacing.sm,
  },
  visibilityCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: {
    flex: 1,
    color: colors.ink,
  },
  passwordSection: {
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
});
