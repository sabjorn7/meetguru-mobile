import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AppText, Card, PillButton } from '@/components/ui';
import { fetchArticlesByAuthor, type ArticleListItem } from '@/features/articles/api';
import { ArticleCard } from '@/features/articles/ArticleCard';
import { useAuth } from '@/features/auth/AuthContext';
import { findOrCreateDirectChat } from '@/features/chats/api';
import {
  fetchCoursesByOwner,
  fetchEnrolledCourses,
  type CourseListItem,
} from '@/features/courses/api';
import { CourseCard } from '@/features/courses/CourseCard';
import {
  fetchProfile,
  publicProfileUrl,
  roleLabel,
  showCreated,
  showEnrolled,
  type Profile,
} from '@/features/profile/api';
import {
  isSubscribableRole,
  isSubscribed,
  subscribe,
  subscriberCount,
  unsubscribe,
} from '@/features/subscriptions/api';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

/** Russian plural for "подписчик" (1 подписчик / 2 подписчика / 5 подписчиков). */
function pluralSubscribers(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'подписчик';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'подписчика';
  return 'подписчиков';
}

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
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [createdCourses, setCreatedCourses] = useState<CourseListItem[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<CourseListItem[]>([]);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [followed, setFollowed] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  const isSelf = !!user && user.id === id;
  const canSubscribe = !isSelf && isSubscribableRole(profile?.role);

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
    Promise.all([fetchCoursesByOwner(id), fetchEnrolledCourses(id), fetchArticlesByAuthor(id)])
      .then(([created, enrolled, authored]) => {
        if (!mounted) return;
        setCreatedCourses(created);
        setEnrolledCourses(enrolled);
        setArticles(authored);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [id]);

  // Load follow state + follower count once the profile (and its role) is known.
  useEffect(() => {
    let mounted = true;
    if (!id || isSelf || !isSubscribableRole(profile?.role)) return;
    subscriberCount(id)
      .then((n) => mounted && setFollowerCount(n))
      .catch(() => {});
    if (user) {
      isSubscribed(user.id, id)
        .then((v) => mounted && setFollowed(v))
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [id, user, isSelf, profile?.role]);

  async function toggleFollow() {
    if (!user || !id || followBusy) return;
    const next = !followed;
    setFollowBusy(true);
    setFollowed(next); // optimistic
    setFollowerCount((c) => (c == null ? c : Math.max(0, c + (next ? 1 : -1))));
    try {
      if (next) await subscribe(user.id, id);
      else await unsubscribe(user.id, id);
    } catch (e) {
      setFollowed(!next); // revert
      setFollowerCount((c) => (c == null ? c : Math.max(0, c + (next ? -1 : 1))));
      Alert.alert('Ошибка', errorMessage(e, 'Не удалось обновить подписку.'));
    } finally {
      setFollowBusy(false);
    }
  }

  async function openChat() {
    if (!user || !id || openingChat) return;
    setOpeningChat(true);
    try {
      const chatId = await findOrCreateDirectChat(user.id, id);
      router.push(`/chat/${chatId}`);
    } catch (e) {
      Alert.alert('Ошибка', errorMessage(e, 'Не удалось открыть чат.'));
    } finally {
      setOpeningChat(false);
    }
  }

  const openCourse = (course: CourseListItem) => {
    if (course.slug) router.push(`/course/${course.slug}`);
  };
  const openArticle = (article: ArticleListItem) => {
    if (article.slug) router.push(`/article/${article.slug}`);
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
        {canSubscribe && followerCount != null ? (
          <AppText variant="caption" style={{ color: colors.muted }}>
            {followerCount} {pluralSubscribers(followerCount)}
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

      {user && !isSelf ? (
        <View style={styles.actionRow}>
          {canSubscribe ? (
            <PillButton
              label={followed ? 'Вы подписаны' : 'Подписаться'}
              variant={followed ? 'outline' : 'primary'}
              onPress={toggleFollow}
              loading={followBusy}
              style={styles.actionButton}
            />
          ) : null}
          <PillButton
            label="Написать"
            variant="outline"
            onPress={openChat}
            loading={openingChat}
            style={styles.actionButton}
          />
        </View>
      ) : null}

      {profile.booking_url ? (
        <PillButton
          label="Записаться"
          onPress={() => Linking.openURL(profile.booking_url as string)}
        />
      ) : null}

      {showCreated(profile.hide) && createdCourses.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title">Созданные курсы</AppText>
          {createdCourses.map((c) => (
            <CourseCard key={c.id} course={c} onPress={openCourse} />
          ))}
        </View>
      ) : null}

      {showEnrolled(profile.hide) && enrolledCourses.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title">Пройденные курсы</AppText>
          {enrolledCourses.map((c) => (
            <CourseCard key={c.id} course={c} onPress={openCourse} />
          ))}
        </View>
      ) : null}

      {articles.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title">Статьи</AppText>
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} onPress={openArticle} />
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
  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionButton: { flex: 1 },
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
