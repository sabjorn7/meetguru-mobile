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
  View,
} from 'react-native';

import { AppText, Card, PillButton } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import type { CourseListItem } from '@/features/courses/api';
import { CourseCard } from '@/features/courses/CourseCard';
import { roleLabel, type Profile } from '@/features/profile/api';
import { useProfile } from '@/features/profile/useProfile';
import { colors, radius, spacing } from '@/theme';

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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayName = profile?.Name?.trim() || 'Пользователь';
  const socials = SOCIAL_FIELDS.map((f) => ({ ...f, url: profile?.[f.key] })).filter(
    (f): f is { key: keyof Profile; label: string; url: string } =>
      typeof f.url === 'string' && f.url.length > 0,
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
      <Card style={styles.headerCard}>
        {profile?.Photo ? (
          <Image source={{ uri: profile.Photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <AppText variant="h1" style={{ color: colors.faint }}>
              {displayName[0]?.toUpperCase() ?? '?'}
            </AppText>
          </View>
        )}
        <AppText variant="h2">{displayName}</AppText>
        {profile?.role ? (
          <AppText variant="label" style={styles.role}>
            {roleLabel(profile.role)}
          </AppText>
        ) : null}
        <AppText variant="caption" style={{ color: colors.muted }}>
          {profile?.email ?? user?.email ?? ''}
        </AppText>

        {profile?.Description ? (
          <AppText variant="body" style={styles.description}>
            {profile.Description}
          </AppText>
        ) : null}

        {socials.length > 0 ? (
          <View style={styles.socialRow}>
            {socials.map((s) => (
              <Pressable key={s.key} style={styles.socialChip} onPress={() => Linking.openURL(s.url)}>
                <AppText variant="label" style={{ color: colors.primary }}>
                  {s.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Card>

      {error ? (
        <AppText variant="caption" style={{ color: colors.danger, textAlign: 'center' }}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <PillButton
          label="Редактировать профиль"
          variant="outline"
          onPress={() => router.push('/profile/edit')}
        />
        <PillButton
          label="Загрузки (офлайн)"
          variant="outline"
          onPress={() => router.push('/downloads')}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="title">
          Мои курсы{myCourses.length ? ` · ${myCourses.length}` : ''}
        </AppText>
        {myCourses.length === 0 ? (
          <AppText variant="body" style={{ color: colors.muted }}>
            У вас пока нет курсов
          </AppText>
        ) : (
          <View style={styles.courseList}>
            {myCourses.map((course) => (
              <CourseCard key={course.id} course={course} onPress={openCourse} />
            ))}
          </View>
        )}
      </View>

      <Pressable
        style={[styles.signOut, signingOut && styles.disabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <AppText variant="subtitle" style={{ color: colors.danger }}>
            Выйти
          </AppText>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  headerCard: {
    alignItems: 'center',
    gap: 4,
    padding: spacing.xl,
  },
  role: { color: colors.primary, textAlign: 'center', alignSelf: 'stretch' },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.sm,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  description: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  socialChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actions: { gap: spacing.sm },
  section: { gap: spacing.md },
  courseList: { gap: spacing.lg },
  signOut: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});
