import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [sub, setSub] = useState<ClubSub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [tab, setTab] = useState<Tab>(tabParam === 'chat' ? 'chat' : 'posts');
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);

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
      setPostsLoaded(true);
    } catch {
      // ignore
    } finally {
      setPostsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (access && tab === 'posts' && !postsLoaded) loadPosts();
  }, [access, tab, postsLoaded, loadPosts]);

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
  const screen = <Stack.Screen options={{ title: club.title ?? 'Клуб' }} />;

  // Paywall — non-subscribers see the full pitch (cover + long description) + site CTA.
  if (!access) {
    return (
      <ScrollView contentContainerStyle={styles.paywallContent}>
        {screen}
        {club.cover ? <Image source={{ uri: club.cover }} style={styles.cover} /> : null}
        <Card style={styles.paywall}>
          <AppText variant="h2" style={{ textAlign: 'center' }}>
            {club.title ?? 'Клуб'}
          </AppText>
          {club.descr ? (
            <AppText variant="body" style={{ color: colors.body }}>
              {club.descr}
            </AppText>
          ) : club.shortDescr ? (
            <AppText variant="body" style={{ color: colors.body }}>
              {club.shortDescr}
            </AppText>
          ) : null}
          <AppText variant="title" style={{ textAlign: 'center', marginTop: spacing.sm }}>
            {isExpired ? 'Подписка истекла' : 'Доступ только для подписчиков'}
          </AppText>
          <PillButton
            label={isExpired ? 'Продлить подписку' : 'Оформить подписку'}
            onPress={openSite}
          />
          <AppText variant="label" style={{ color: colors.faint, textAlign: 'center' }}>
            Оплата и управление подпиской — на сайте meetgu.ru
          </AppText>
        </Card>
      </ScrollView>
    );
  }

  // Subscriber / owner — tabs; compact header (no long description).
  return (
    <View style={[styles.flex, { paddingBottom: kbHeight }]}>
      {screen}
      <View style={[styles.tabsBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <SegmentedTabs
          options={[
            { value: 'posts', label: 'Записи' },
            { value: 'chat', label: 'Чат клуба' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'posts' ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClubPostCard
              post={item}
              userId={user!.id}
              ownerName={club.ownerName}
              ownerPhoto={club.ownerPhoto}
            />
          )}
          contentContainerStyle={styles.feed}
          ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
          initialNumToRender={4}
          windowSize={5}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={postsLoading} onRefresh={loadPosts} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            club.shortDescr ? (
              <AppText variant="body" style={styles.shortDescr}>
                {club.shortDescr}
              </AppText>
            ) : null
          }
          ListEmptyComponent={
            postsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
              <AppText variant="body" style={styles.empty}>
                Пока нет записей
              </AppText>
            )
          }
        />
      ) : (
        <ClubChat clubId={club.id} userId={user!.id} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  tabsBar: { padding: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.bg },
  feed: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  shortDescr: { color: colors.muted, marginBottom: spacing.lg },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  paywallContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg, backgroundColor: colors.bg },
  cover: { width: '100%', height: 180, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  paywall: { gap: spacing.md, padding: spacing.xl },
});
