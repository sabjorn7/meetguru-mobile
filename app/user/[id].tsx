import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AppText, Card, PillButton } from '@/components/ui';
import {
  fetchCoursesByOwner,
  fetchEnrolledCourses,
  type CourseListItem,
} from '@/features/courses/api';
import { CourseCard } from '@/features/courses/CourseCard';
import { fetchProfile, publicProfileUrl, roleLabel, type Profile } from '@/features/profile/api';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

// booking_url is surfaced as the big "Записаться" button, so it's excluded here.
const SOCIAL_FIELDS: { key: keyof Profile; label: string }[] = [
  { key: 'telegram_url', label: 'Telegram' },
  { key: 'whatsapp_url', label: 'WhatsApp' },
  { key: 'vk_url', label: 'VK' },
  { key: 'youtube_url', label: 'YouTube' },
  { key: 'website_url', label: 'Сайт' },
];

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [createdCourses, setCreatedCourses] = useState<CourseListItem[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<CourseListItem[]>([]);
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

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    Promise.all([fetchCoursesByOwner(id), fetchEnrolledCourses(id)])
      .then(([created, enrolled]) => {
        if (!mounted) return;
        setCreatedCourses(created);
        setEnrolledCourses(enrolled);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [id]);

  const openCourse = (course: CourseListItem) => {
    if (course.slug) router.push(`/course/${course.slug}`);
  };

  async function share() {
    if (!id) return;
    const url = publicProfileUrl(id);
    const name = profile?.Name?.trim();
    await Share.share({ message: name ? `${name} — MeetGuru\n${url}` : url, url });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Профиль' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (notFound || error || !profile) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Профиль' }} />
        <AppText variant="body" style={{ color: notFound ? colors.muted : colors.danger }}>
          {notFound ? 'Профиль не найден' : error}
        </AppText>
      </View>
    );
  }

  const displayName = profile.Name?.trim() || 'Пользователь';
  const socials = SOCIAL_FIELDS.map((f) => ({ ...f, url: profile[f.key] })).filter(
    (f): f is { key: keyof Profile; label: string; url: string } =>
      typeof f.url === 'string' && f.url.length > 0,
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Stack.Screen
        options={{
          title: 'Профиль',
          headerRight: () => (
            <Pressable onPress={share} hitSlop={12} style={{ paddingHorizontal: 8 }}>
              <Ionicons name="share-outline" size={22} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <Card style={styles.headerCard}>
        {profile.Photo ? (
          <Image source={{ uri: profile.Photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <AppText variant="h1" style={{ color: colors.faint }}>
              {displayName[0]?.toUpperCase() ?? '?'}
            </AppText>
          </View>
        )}
        <AppText variant="h2" style={{ textAlign: 'center' }}>
          {displayName}
        </AppText>
        {profile.role ? (
          <AppText variant="caption" style={styles.role}>
            {roleLabel(profile.role)}
          </AppText>
        ) : null}

        {profile.Description ? (
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

      {profile.booking_url ? (
        <PillButton
          label="Записаться"
          onPress={() => Linking.openURL(profile.booking_url as string)}
        />
      ) : null}

      {createdCourses.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title">Созданные курсы</AppText>
          {createdCourses.map((c) => (
            <CourseCard key={c.id} course={c} onPress={openCourse} />
          ))}
        </View>
      ) : null}

      {enrolledCourses.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title">Пройденные курсы</AppText>
          {enrolledCourses.map((c) => (
            <CourseCard key={c.id} course={c} onPress={openCourse} />
          ))}
        </View>
      ) : null}
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
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  headerCard: { alignItems: 'center', gap: 4, padding: spacing.xl },
  role: { color: colors.primary, textAlign: 'center', alignSelf: 'stretch' },
  section: { gap: spacing.md },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.sm,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  description: { textAlign: 'center', marginTop: spacing.sm },
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
});
