import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchProfile, publicProfileUrl, roleLabel, type Profile } from '@/features/profile/api';
import { errorMessage } from '@/lib/errors';

const SOCIAL_FIELDS: { key: keyof Profile; label: string }[] = [
  { key: 'telegram_url', label: 'Telegram' },
  { key: 'whatsapp_url', label: 'WhatsApp' },
  { key: 'vk_url', label: 'VK' },
  { key: 'youtube_url', label: 'YouTube' },
  { key: 'website_url', label: 'Сайт' },
  { key: 'booking_url', label: 'Запись' },
];

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    fetchProfile(id)
      .then((data) => {
        if (!mounted) return;
        if (!data) setNotFound(true);
        else setProfile(data);
      })
      .catch((e) => mounted && setError(errorMessage(e, 'Не удалось загрузить профиль.')))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  async function share() {
    if (!id) return;
    const url = publicProfileUrl(id);
    const name = profile?.Name?.trim();
    await Share.share({
      message: name ? `${name} — MeetGuru\n${url}` : url,
      url,
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Профиль' }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (notFound || error || !profile) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Профиль' }} />
        <Text style={notFound ? styles.muted : styles.errorText}>
          {notFound ? 'Профиль не найден' : error}
        </Text>
      </View>
    );
  }

  const displayName = profile.Name?.trim() || 'Пользователь';
  const socials = SOCIAL_FIELDS.map((f) => ({ ...f, url: profile[f.key] })).filter(
    (f): f is { key: keyof Profile; label: string; url: string } =>
      typeof f.url === 'string' && f.url.length > 0,
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: 'Профиль',
          headerRight: () => (
            <Pressable onPress={share} hitSlop={12} style={{ paddingHorizontal: 8 }}>
              <Ionicons name="share-outline" size={22} color="#2563eb" />
            </Pressable>
          ),
        }}
      />

      <View style={styles.header}>
        {profile.Photo ? (
          <Image source={{ uri: profile.Photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{displayName[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <Text style={styles.name}>{displayName}</Text>
        {profile.role ? <Text style={styles.role}>{roleLabel(profile.role)}</Text> : null}
      </View>

      {profile.Description ? <Text style={styles.description}>{profile.Description}</Text> : null}

      {socials.length > 0 ? (
        <View style={styles.socialRow}>
          {socials.map((s) => (
            <Pressable key={s.key} style={styles.socialChip} onPress={() => Linking.openURL(s.url)}>
              <Text style={styles.socialText}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.shareButton} onPress={share}>
        <Ionicons name="share-outline" size={18} color="#fff" />
        <Text style={styles.shareText}>Поделиться профилем</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e5e7eb',
    marginBottom: 8,
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
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  role: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  socialText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
  },
  shareText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  muted: {
    fontSize: 15,
    color: '#6b7280',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 15,
    textAlign: 'center',
  },
});
