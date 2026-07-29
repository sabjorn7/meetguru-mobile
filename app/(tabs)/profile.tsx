import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import type { CourseListItem } from '@/features/courses/api';
import { CourseCard } from '@/features/courses/CourseCard';
import { roleLabel, type Profile } from '@/features/profile/api';
import { useProfile } from '@/features/profile/useProfile';

const SOCIAL_FIELDS: { key: keyof Profile; label: string }[] = [
  { key: 'telegram_url', label: 'Telegram' },
  { key: 'whatsapp_url', label: 'WhatsApp' },
  { key: 'vk_url', label: 'VK' },
  { key: 'youtube_url', label: 'YouTube' },
  { key: 'website_url', label: 'Сайт' },
  { key: 'booking_url', label: 'Запись' },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile, myCourses, loading, refreshing, error, refresh } = useProfile();
  const router = useRouter();

  const [signingOut, setSigningOut] = useState(false);

  // Refresh when returning to the tab (e.g. after editing), but not on first mount.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );

  const openCourse = useCallback(
    (course: CourseListItem) => {
      if (course.slug) router.push(`/course/${course.slug}`);
    },
    [router],
  );

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const displayName = profile?.Name?.trim() || 'Пользователь';
  const socials = SOCIAL_FIELDS.map((f) => ({ ...f, url: profile?.[f.key] })).filter(
    (f): f is { key: keyof Profile; label: string; url: string } => typeof f.url === 'string' && f.url.length > 0,
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        {profile?.Photo ? (
          <Image source={{ uri: profile.Photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{displayName[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <Text style={styles.name}>{displayName}</Text>
        {profile?.role ? <Text style={styles.role}>{roleLabel(profile.role)}</Text> : null}
        <Text style={styles.email}>{profile?.email ?? user?.email ?? ''}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {profile?.Description ? <Text style={styles.description}>{profile.Description}</Text> : null}

      {socials.length > 0 ? (
        <View style={styles.socialRow}>
          {socials.map((s) => (
            <Pressable key={s.key} style={styles.socialChip} onPress={() => Linking.openURL(s.url)}>
              <Text style={styles.socialText}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.editButton} onPress={() => router.push('/profile/edit')}>
          <Text style={styles.editText}>Редактировать профиль</Text>
        </Pressable>
        <Pressable style={styles.editButton} onPress={() => router.push('/downloads')}>
          <Text style={styles.editText}>Загрузки (офлайн)</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Мои курсы{myCourses.length ? ` · ${myCourses.length}` : ''}</Text>
        {myCourses.length === 0 ? (
          <Text style={styles.muted}>У вас пока нет курсов</Text>
        ) : (
          <View style={styles.courseList}>
            {myCourses.map((course) => (
              <CourseCard key={course.id} course={course} onPress={openCourse} />
            ))}
          </View>
        )}
      </View>

      <Pressable
        style={[styles.signOutButton, signingOut && styles.disabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#dc2626" />
        ) : (
          <Text style={styles.signOutText}>Выйти</Text>
        )}
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
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#e5e7eb',
    marginBottom: 8,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '700',
    color: '#6b7280',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  role: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    textAlign: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
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
  actions: {
    gap: 8,
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  courseList: {
    gap: 16,
  },
  muted: {
    fontSize: 15,
    color: '#6b7280',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  signOutText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '600',
  },
});
