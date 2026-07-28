import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import {
  fetchProfile,
  updateProfile,
  uploadAvatar,
  type ProfilePatch,
} from '@/features/profile/api';

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
  const { user } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [photo, setPhoto] = useState<string | null>(null);
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
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

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
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось сохранить профиль.');
    } finally {
      setSaving(false);
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Редактирование' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarBlock}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <Pressable onPress={handlePickAvatar} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.changePhoto}>Изменить фото</Text>
            )}
          </Pressable>
        </View>

        {FIELDS.map((field) => (
          <View key={field.key} style={styles.fieldGroup}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              style={[styles.input, field.multiline && styles.inputMultiline]}
              value={form[field.key]}
              onChangeText={(text) => setField(field.key, text)}
              placeholder={field.placeholder}
              placeholderTextColor="#9ca3af"
              multiline={field.multiline}
              autoCapitalize={field.key === 'Name' || field.key === 'Description' ? 'sentences' : 'none'}
              autoCorrect={field.key === 'Name' || field.key === 'Description'}
            />
          </View>
        ))}

        <Pressable
          style={[styles.saveButton, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Сохранить</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e5e7eb',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 38,
    fontWeight: '700',
    color: '#6b7280',
  },
  changePhoto: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
