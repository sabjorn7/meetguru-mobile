import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import type { ProfileListItem } from '@/features/profile/api';
import { PersonRow } from '@/features/profile/PersonRow';
import { fetchMySubscriptions, fetchSubscribers } from '@/features/subscriptions/api';
import { errorMessage } from '@/lib/errors';
import { colors, spacing } from '@/theme';

type Mode = 'following' | 'followers';

const COPY: Record<Mode, { title: string; empty: string }> = {
  following: { title: 'Мои подписки', empty: 'Вы пока ни на кого не подписаны' },
  followers: { title: 'Мои подписчики', empty: 'У вас пока нет подписчиков' },
};

export default function SubscriptionsScreen() {
  const { mode: rawMode } = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = rawMode === 'followers' ? 'followers' : 'following';
  const copy = COPY[mode];

  const { user } = useAuth();
  const router = useRouter();
  const [people, setPeople] = useState<ProfileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const fetch = mode === 'followers' ? fetchSubscribers : fetchMySubscriptions;
      setPeople(await fetch(user.id));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Не удалось загрузить список.'));
    }
  }, [user, mode]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openPerson = useCallback(
    (p: ProfileListItem) => router.push(`/user/${p.id}`),
    [router],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: copy.title }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: copy.title }} />
      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PersonRow person={item} onPress={openPerson} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <AppText variant="body" style={{ color: error ? colors.danger : colors.muted }}>
              {error ?? copy.empty}
            </AppText>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, flexGrow: 1, backgroundColor: colors.bg },
  separator: { height: spacing.md },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
});
