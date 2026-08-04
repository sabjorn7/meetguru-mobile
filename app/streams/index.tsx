import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { AppText, PillButton } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchProfile } from '@/features/profile/api';
import { canStream, isFreeStream, listAllStreams, type Stream } from '@/features/streams/api';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

const priceFormatter = new Intl.NumberFormat('ru-RU');
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

function scheduledLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : dateFormatter.format(d);
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'live') {
    return (
      <View style={[styles.badge, styles.badgeLive]}>
        <View style={styles.liveDot} />
        <AppText variant="label" style={{ color: colors.white }}>
          В ЭФИРЕ
        </AppText>
      </View>
    );
  }
  if (status === 'ended') {
    return (
      <View style={[styles.badge, styles.badgeEnded]}>
        <AppText variant="label" style={{ color: colors.white }}>
          ЗАПИСЬ
        </AppText>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.badgeSoon]}>
      <AppText variant="label" style={{ color: colors.white }}>
        СКОРО
      </AppText>
    </View>
  );
}

function StreamCard({ stream, onPress }: { stream: Stream; onPress: (s: Stream) => void }) {
  const free = isFreeStream(stream);
  const when = scheduledLabel(stream.scheduled_at);
  return (
    <Pressable style={styles.card} onPress={() => onPress(stream)}>
      <View style={styles.cover}>
        {stream.cover_url ? (
          <Image source={{ uri: stream.cover_url }} style={StyleSheet.absoluteFill} />
        ) : (
          <Ionicons name="videocam" size={40} color={colors.primaryTint} />
        )}
        <View style={styles.badgeOverlay}>
          <StatusBadge status={stream.status} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <AppText variant="subtitle" numberOfLines={2}>
          {stream.title}
        </AppText>
        {stream.authorUser?.Name ? (
          <AppText variant="caption" style={{ color: colors.muted }} numberOfLines={1}>
            {stream.authorUser.Name}
          </AppText>
        ) : null}
        {when ? (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.faint} />
            <AppText variant="caption" style={{ color: colors.faint }}>
              {when}
            </AppText>
          </View>
        ) : null}
        <AppText variant="label" style={{ color: free ? colors.success : colors.primary }}>
          {free ? 'Бесплатно' : `${priceFormatter.format(Number(stream.price))} ₽`}
        </AppText>
      </View>
    </Pressable>
  );
}

export default function StreamsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [rows, profile] = await Promise.all([
        listAllStreams(),
        user ? fetchProfile(user.id) : Promise.resolve(null),
      ]);
      setStreams(rows);
      setRole(profile?.role ?? null);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Не удалось загрузить эфиры.'));
    }
  }, [user]);

  // Reload on focus so a freshly created stream (or a status change) shows up on return.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load().finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openStream = useCallback((s: Stream) => router.push(`/streams/${s.id}`), [router]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Трансляции' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Трансляции' }} />
      <FlatList
        data={streams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StreamCard stream={item} onPress={openStream} />}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          canStream(role) ? (
            <View style={styles.headerAction}>
              <PillButton label="Создать эфир" onPress={() => router.push('/streams/new')} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <AppText
              variant="body"
              style={{ color: error ? colors.danger : colors.muted, textAlign: 'center' }}
            >
              {error ?? 'Пока нет ни одного эфира'}
            </AppText>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, flexGrow: 1, backgroundColor: colors.bg },
  row: { gap: spacing.md },
  headerAction: { marginBottom: spacing.lg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cover: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeLive: { backgroundColor: colors.danger },
  badgeEnded: { backgroundColor: colors.muted },
  badgeSoon: { backgroundColor: colors.primary },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  cardBody: {
    padding: spacing.md,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
