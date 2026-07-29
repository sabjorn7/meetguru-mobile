import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchMyClubs, type ClubListItem } from '@/features/clubs/api';
import { ClubCard } from '@/features/clubs/ClubCard';
import { errorMessage } from '@/lib/errors';
import { colors, spacing } from '@/theme';

export default function ClubsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [clubs, setClubs] = useState<ClubListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setClubs(await fetchMyClubs(user.id));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Не удалось загрузить клубы.'));
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openClub = useCallback((c: ClubListItem) => router.push(`/club/${c.id}`), [router]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Клубы' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Клубы' }} />
      <FlatList
        data={clubs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ClubCard club={item} onPress={openClub} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <AppText variant="body" style={{ color: error ? colors.danger : colors.muted, textAlign: 'center' }}>
              {error ?? 'Вы не состоите ни в одном клубе'}
            </AppText>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, flexGrow: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
});
