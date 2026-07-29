import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText, Card, PillButton, SegmentedTabs } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import {
  clubHasAccess,
  clubSiteUrl,
  fetchClub,
  fetchClubPosts,
  fetchMyClubSub,
  type ClubDetail,
  type ClubPost,
  type ClubSub,
} from '@/features/clubs/api';
import { ClubChat } from '@/features/clubs/ClubChat';
import { ClubPostCard } from '@/features/clubs/ClubPostCard';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

type Tab = 'posts' | 'chat';

export default function ClubScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { user } = useAuth();

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [sub, setSub] = useState<ClubSub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [tab, setTab] = useState<Tab>(tabParam === 'chat' ? 'chat' : 'posts');
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const access = !!user && !!club && clubHasAccess(club.ownerId, sub, user.id);

  useEffect(() => {
    let mounted = true;
    if (!id || !user) return;
    setLoading(true);
    Promise.all([fetchClub(id), fetchMyClubSub(id, user.id)])
      .then(([c, s]) => {
        if (!mounted) return;
        if (!c) setNotFound(true);
        else {
          setClub(c);
          setSub(s);
        }
      })
      .catch((e) => mounted && setError(errorMessage(e, 'Не удалось загрузить клуб.')))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id, user]);

  const loadPosts = useCallback(async () => {
    if (!id || !user) return;
    setPostsLoading(true);
    try {
      setPosts(await fetchClubPosts(id, user.id));
    } catch {
      // ignore
    } finally {
      setPostsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (access && tab === 'posts' && posts.length === 0) loadPosts();
  }, [access, tab, posts.length, loadPosts]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Клуб' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (notFound || error || !club) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Клуб' }} />
        <AppText variant="body" style={{ color: notFound ? colors.muted : colors.danger }}>
          {notFound ? 'Клуб не найден' : error}
        </AppText>
      </View>
    );
  }

  const isExpired = sub != null && !access;
  const openSite = () => WebBrowser.openBrowserAsync(clubSiteUrl(club.id));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: club.title ?? 'Клуб' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.headerCard}>
          {club.cover ? <Image source={{ uri: club.cover }} style={styles.cover} /> : null}
          <View style={styles.headerBody}>
            <AppText variant="h2">{club.title ?? 'Клуб'}</AppText>
            {club.shortDescr ? (
              <AppText variant="body" style={{ color: colors.muted }}>
                {club.shortDescr}
              </AppText>
            ) : null}
            {club.descr ? <AppText variant="body">{club.descr}</AppText> : null}
          </View>
        </Card>

        {access ? (
          <>
            <SegmentedTabs
              options={[
                { value: 'posts', label: 'Записи' },
                { value: 'chat', label: 'Чат клуба' },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === 'posts' ? (
              postsLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
              ) : posts.length === 0 ? (
                <AppText variant="body" style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.lg }}>
                  Пока нет записей
                </AppText>
              ) : (
                <View style={{ gap: spacing.lg }}>
                  {posts.map((p) => (
                    <ClubPostCard
                      key={p.id}
                      post={p}
                      userId={user!.id}
                      ownerName={club.ownerName}
                      ownerPhoto={club.ownerPhoto}
                    />
                  ))}
                </View>
              )
            ) : (
              <ClubChat clubId={club.id} userId={user!.id} />
            )}
          </>
        ) : (
          <Card style={styles.paywall}>
            <AppText variant="title" style={{ textAlign: 'center' }}>
              {isExpired ? 'Подписка истекла' : 'Доступ только для подписчиков'}
            </AppText>
            <AppText variant="body" style={{ color: colors.muted, textAlign: 'center' }}>
              {isExpired
                ? 'Продлите подписку на сайте, чтобы снова читать записи и чат клуба.'
                : 'Оформите подписку на сайте, чтобы получить доступ к записям и чату клуба.'}
            </AppText>
            <PillButton
              label={isExpired ? 'Продлить подписку' : 'Оформить подписку'}
              onPress={openSite}
            />
            <AppText variant="label" style={{ color: colors.faint, textAlign: 'center' }}>
              Оплата и управление подпиской — на сайте meetgu.ru
            </AppText>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  headerCard: { padding: 0, overflow: 'hidden' },
  cover: { width: '100%', height: 160, backgroundColor: colors.primarySoft },
  headerBody: { padding: spacing.lg, gap: spacing.sm },
  paywall: { gap: spacing.md, padding: spacing.xl, alignItems: 'stretch' },
});
