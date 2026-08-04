import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Card, PillButton } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import {
  accessExpiry,
  deleteStream,
  getStreamById,
  isFreeStream,
  resolveAccess,
  setStreamStatus,
  streamAirDate,
  type Stream,
} from '@/features/streams/api';
import {
  getLiveCredentials,
  getVideoInfo,
  VIDEO_STATE,
  type LiveCredentials,
  type VideoInfo,
} from '@/features/streams/peertubeLive';
import { PeerTubePlayer } from '@/features/video/PeerTubePlayer';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

const WEB_ORIGIN = 'https://app.meetgu.ru';
const priceFormatter = new Intl.NumberFormat('ru-RU');
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});
const POLL_MS = 20000;

function fmtDate(d: Date | null): string | null {
  return d && !Number.isNaN(d.getTime()) ? dateFormatter.format(d) : null;
}

/** Placeholder shown in the 16:9 player slot when there's nothing to play yet. */
function PlayerPlaceholder({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.placeholder}>
      <Ionicons name={icon} size={40} color={colors.faint} />
      <AppText variant="body" style={{ color: colors.faint, textAlign: 'center' }}>
        {text}
      </AppText>
    </View>
  );
}

export default function StreamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [stream, setStream] = useState<Stream | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [access, setAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Author-only state
  const [creds, setCreds] = useState<LiveCredentials | null>(null);
  const [revealKey, setRevealKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isAuthor = !!user && !!stream && stream.author === user.id;

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const s = await getStreamById(id);
      if (!s) {
        setNotFound(true);
        return;
      }
      setStream(s);
      const [granted, vinfo] = await Promise.all([
        resolveAccess(s, user?.id ?? null),
        getVideoInfo(s.peertube_video_id),
      ]);
      setAccess(granted);
      setInfo(vinfo);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Не удалось загрузить эфир.'));
    }
  }, [id, user]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // While the stream isn't ended and the player has nothing to show yet, poll PeerTube so
  // the player switches on automatically once the broadcast goes live.
  const playable = info?.hasPlaylist || info?.stateId === VIDEO_STATE.PUBLISHED;
  const shouldPoll = !!stream && stream.status !== 'ended' && !playable;
  const streamVideoId = stream?.peertube_video_id ?? null;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!shouldPoll || !streamVideoId) return;
    pollRef.current = setInterval(async () => {
      const vinfo = await getVideoInfo(streamVideoId);
      if (vinfo) setInfo(vinfo);
    }, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [shouldPoll, streamVideoId]);

  const loadCreds = useCallback(async () => {
    if (!stream?.peertube_video_id) return;
    setBusy(true);
    try {
      setCreds(await getLiveCredentials(stream.peertube_video_id));
    } catch (e) {
      Alert.alert('Ошибка', errorMessage(e, 'Не удалось получить данные OBS.'));
    } finally {
      setBusy(false);
    }
  }, [stream]);

  const flipStatus = useCallback(
    async (status: 'live' | 'ended') => {
      if (!stream) return;
      setBusy(true);
      try {
        await setStreamStatus(stream.id, status);
        setStream({ ...stream, status });
      } catch (e) {
        Alert.alert('Ошибка', errorMessage(e, 'Не удалось обновить статус.'));
      } finally {
        setBusy(false);
      }
    },
    [stream],
  );

  const handleDelete = useCallback(async () => {
    if (!stream) return;
    setBusy(true);
    try {
      await deleteStream(stream);
      router.back();
    } catch (e) {
      Alert.alert('Ошибка', errorMessage(e, 'Не удалось удалить эфир.'));
      setBusy(false);
    }
  }, [stream, router]);

  const handleBuy = useCallback(async () => {
    if (!stream) return;
    await WebBrowser.openBrowserAsync(`${WEB_ORIGIN}/streams?stream=${stream.id}`);
    // Re-check access on return (the purchase may have granted it).
    setAccess(await resolveAccess(stream, user?.id ?? null));
  }, [stream, user]);

  const handleShare = useCallback(() => {
    if (!stream) return;
    Share.share({
      title: stream.title,
      message: `${stream.title}\n${WEB_ORIGIN}/streams?stream=${stream.id}`,
    }).catch(() => {});
  }, [stream]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Эфир' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (notFound || !stream) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Эфир' }} />
        <AppText variant="body" style={{ color: error ? colors.danger : colors.muted }}>
          {error ?? 'Эфир не найден'}
        </AppText>
      </View>
    );
  }

  const free = isFreeStream(stream);
  const when = fmtDate(streamAirDate(stream));
  const expiryDate = accessExpiry(stream);
  // The paid-replay window is "closed" only once its end date is actually in the past —
  // a future expiry means the stream just hasn't aired yet, so buying is still offered.
  const windowClosed =
    !free && !isAuthor && !access && expiryDate != null && expiryDate.getTime() < Date.now();

  // Decide what fills the player slot.
  let player: React.ReactNode;
  if (!access) {
    player = <PlayerPlaceholder icon="lock-closed" text="Доступ к эфиру платный" />;
  } else if (playable) {
    player = <PeerTubePlayer videoId={stream.peertube_video_id} />;
  } else if (stream.status === 'ended') {
    player = <PlayerPlaceholder icon="cloud-done-outline" text="Эфир завершён, запись обрабатывается" />;
  } else {
    player = <PlayerPlaceholder icon="time-outline" text="Эфир ещё не начался" />;
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: stream.title || 'Эфир' }} />

      <Card style={styles.playerCard} elevated>
        {player}
      </Card>

      <View style={styles.titleRow}>
        <AppText variant="h2" style={{ flex: 1 }}>
          {stream.title}
        </AppText>
        <Ionicons name="share-outline" size={24} color={colors.primary} onPress={handleShare} />
      </View>

      {stream.authorUser?.Name ? (
        <AppText variant="caption" style={{ color: colors.muted }}>
          {stream.authorUser.Name}
        </AppText>
      ) : null}

      <View style={styles.metaRow}>
        <AppText variant="title" style={{ color: free ? colors.success : colors.primary }}>
          {free ? 'Бесплатно' : `${priceFormatter.format(Number(stream.price))} ₽`}
        </AppText>
        {when ? (
          <View style={styles.inlineMeta}>
            <Ionicons name="time-outline" size={15} color={colors.muted} />
            <AppText variant="caption">{when}</AppText>
          </View>
        ) : null}
      </View>

      {/* Buy CTA for a paid stream the viewer doesn't own */}
      {!access && !isAuthor ? (
        windowClosed ? (
          <Card style={styles.noticeCard} elevated={false}>
            <AppText variant="body" style={{ color: colors.muted, textAlign: 'center' }}>
              Доступ к записи завершён
            </AppText>
          </Card>
        ) : (
          <PillButton label={`Купить за ${priceFormatter.format(Number(stream.price))} ₽`} onPress={handleBuy} />
        )
      ) : null}

      {stream.description ? (
        <View style={styles.section}>
          <AppText variant="title">Описание</AppText>
          <AppText variant="body">{stream.description}</AppText>
        </View>
      ) : null}

      {/* Author controls */}
      {isAuthor ? (
        <Card style={styles.authorCard} elevated>
          <AppText variant="title">Управление эфиром</AppText>

          <View style={styles.controlRow}>
            {stream.status !== 'live' ? (
              <PillButton
                label="Я в эфире"
                onPress={() => flipStatus('live')}
                loading={busy}
                style={styles.controlBtn}
              />
            ) : (
              <PillButton
                label="Завершить"
                variant="outline"
                onPress={() => flipStatus('ended')}
                loading={busy}
                style={styles.controlBtn}
              />
            )}
          </View>

          <PillButton
            label={creds ? 'Обновить данные эфира' : 'Данные для эфира (OBS / Larix)'}
            variant="outline"
            onPress={loadCreds}
            loading={busy && !creds}
          />

          {creds ? (
            <View style={styles.credsBox}>
              <AppText variant="label">RTMP-сервер</AppText>
              <AppText variant="bodyMedium" selectable style={styles.mono}>
                {creds.rtmpUrl ?? '—'}
              </AppText>
              <View style={styles.keyHeader}>
                <AppText variant="label">Ключ трансляции</AppText>
                <AppText
                  variant="label"
                  style={{ color: colors.primary }}
                  onPress={() => setRevealKey((v) => !v)}
                >
                  {revealKey ? 'Скрыть' : 'Показать'}
                </AppText>
              </View>
              <AppText variant="bodyMedium" selectable style={styles.mono}>
                {revealKey ? creds.streamKey ?? '—' : '••••••••••••••••'}
              </AppText>
              <AppText variant="caption" style={{ color: colors.faint }}>
                Удерживайте значение, чтобы скопировать. Вставьте сервер и ключ в OBS на компьютере
                или в мобильный вещатель (например, Larix Broadcaster).
              </AppText>
            </View>
          ) : null}

          {free ? (
            confirmDelete ? (
              <View style={styles.controlRow}>
                <PillButton
                  label="Точно удалить"
                  onPress={handleDelete}
                  loading={busy}
                  style={styles.deleteBtn}
                />
                <PillButton
                  label="Отмена"
                  variant="outline"
                  onPress={() => setConfirmDelete(false)}
                  style={styles.controlBtn}
                />
              </View>
            ) : (
              <AppText
                variant="bodyMedium"
                style={{ color: colors.danger, textAlign: 'center' }}
                onPress={() => setConfirmDelete(true)}
              >
                Удалить эфир
              </AppText>
            )
          ) : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  playerCard: {
    overflow: 'hidden',
    padding: 0,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  noticeCard: {
    padding: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  authorCard: {
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  controlRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  controlBtn: {
    flex: 1,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: colors.danger,
  },
  credsBox: {
    gap: spacing.xs,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  keyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  mono: {
    color: colors.ink,
  },
});
