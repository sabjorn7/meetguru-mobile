import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ApiVideoLiveStreamView,
  type ApiVideoLiveStreamMethods,
} from '@api.video/react-native-livestream';

import { AppText, PillButton } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { getStreamById, setStreamStatus, type Stream } from '@/features/streams/api';
import { StreamChat } from '@/features/streams/StreamChat';
import { getLiveCredentials, type LiveCredentials } from '@/features/streams/peertubeLive';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

// idle: preview, not broadcasting · connecting: startStreaming in flight · live: on air
// ended: broadcast finished (by the author, by backgrounding/screen-off, or by a dropped
//        connection) — terminal, because our PeerTube lives are permanentLive:false and cannot
//        be re-streamed once the RTMP session drops · error: start failed
type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

const KEEP_AWAKE_TAG = 'broadcast-live';

function fmtElapsed(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * In-app broadcaster: pushes the phone camera to the stream's PeerTube RTMP endpoint.
 *
 * Platform reality: the camera push cannot survive the app going to background or the screen
 * locking — @api.video's Android view stops streaming in onHostPause, and iOS suspends capture
 * for backgrounded apps. AND our PeerTube lives are permanentLive:false, so the first RTMP drop
 * ends the live for good — the same stream key cannot be reconnected. So an interruption is
 * terminal: we end the broadcast honestly (status=ended, the replay is saved up to that point),
 * warn the host up front, and hold a keep-awake lock to prevent the most common trigger.
 */
export default function BroadcastScreen() {
  const { stream: streamId } = useLocalSearchParams<{ stream: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ref = useRef<ApiVideoLiveStreamMethods>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stream, setStream] = useState<Stream | null>(null);
  const [creds, setCreds] = useState<LiveCredentials | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [camera, setCamera] = useState<'front' | 'back'>('back');
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showChat, setShowChat] = useState(false);

  // Refs mirror state so the once-subscribed AppState listener reads current values.
  const streamRef = useRef<Stream | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const liveMarkedRef = useRef(false); // we wrote 'live' and haven't finalized to 'ended'
  const streamingRef = useRef(false); // the native push is currently active
  const intentionalStopRef = useRef(false); // we stopped on purpose → ignore the ensuing onDisconnect
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /** Best-effort DB status write (RLS off; failure is non-fatal — author can also fix on detail). */
  const setStatusSafe = useCallback(async (status: 'live' | 'ended') => {
    const id = streamRef.current?.id;
    if (!id) return;
    try {
      await setStreamStatus(id, status);
    } catch {
      // ignore — never let a status write break the broadcast UX
    }
  }, []);

  // Load the stream + its live credentials; enforce author-only.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = streamId ? await getStreamById(streamId) : null;
        if (!mounted) return;
        if (!s) {
          setLoadError('Эфир не найден.');
          return;
        }
        if (!user || s.author !== user.id) {
          setLoadError('Вести трансляцию может только автор эфира.');
          setStream(s);
          return;
        }
        setStream(s);
        if (!s.peertube_video_id) {
          setLoadError('У эфира нет привязанного видео PeerTube.');
          return;
        }
        const c = await getLiveCredentials(s.peertube_video_id);
        if (!mounted) return;
        if (!c.rtmpUrl || !c.streamKey) {
          setLoadError('PeerTube не вернул RTMP-сервер и ключ.');
          return;
        }
        setCreds(c);
      } catch (e) {
        if (mounted) setLoadError(errorMessage(e, 'Не удалось подготовить трансляцию.'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [streamId, user]);

  // Elapsed timer runs only while live; it freezes at the final value when the broadcast ends.
  useEffect(() => {
    if (phase !== 'live') return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Keep the screen awake while connecting/live — a screen-off is itself a background that would
  // end the broadcast.
  useEffect(() => {
    const keep = phase === 'live' || phase === 'connecting';
    if (keep) void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    else deactivateKeepAwake(KEEP_AWAKE_TAG);
  }, [phase]);

  /** Terminal end of the broadcast: stop the push and finalize status to 'ended'. */
  const endBroadcast = useCallback(() => {
    intentionalStopRef.current = true; // the lib's stop will emit onDisconnect — ignore it
    ref.current?.stopStreaming();
    streamingRef.current = false;
    setPhase('ended');
    if (liveMarkedRef.current) {
      liveMarkedRef.current = false;
      void setStatusSafe('ended');
    }
  }, [setStatusSafe]);

  // AppState: background/screen-off drops the RTMP session, which permanently ends a
  // permanentLive:false live. Reflect that honestly — the broadcast is over.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        if (streamingRef.current || phaseRef.current === 'live' || phaseRef.current === 'connecting') {
          endBroadcast();
        }
      }
    });
    return () => sub.remove();
  }, [endBroadcast]);

  // Safety net: if the screen unmounts mid-broadcast, stop the push and finalize the status.
  useEffect(() => {
    return () => {
      if (streamingRef.current) {
        intentionalStopRef.current = true;
        ref.current?.stopStreaming();
        streamingRef.current = false;
      }
      if (liveMarkedRef.current) {
        liveMarkedRef.current = false;
        void setStatusSafe('ended');
      }
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [setStatusSafe]);

  async function goLive() {
    if (!creds?.rtmpUrl || !creds?.streamKey) return;
    intentionalStopRef.current = false;
    setPhase('connecting');
    setErrorText(null);
    setElapsed(0);
    try {
      // url = PeerTube RTMP server, streamKey = its live key (1:1 mapping).
      await ref.current?.startStreaming(creds.streamKey, creds.rtmpUrl);
      streamingRef.current = true;
    } catch (e) {
      setPhase('error');
      setErrorText(errorMessage(e, 'Не удалось начать трансляцию.'));
    }
  }

  function openStream() {
    const s = streamRef.current;
    if (s) router.replace(`/streams/${s.id}`);
    else router.back();
  }

  function confirmClose() {
    if (phase === 'live' || phase === 'connecting') {
      Alert.alert(
        'Завершить эфир?',
        'Трансляция остановится. Продолжить её потом будет нельзя — начнётся обработка записи.',
        [
          { text: 'Не завершать', style: 'cancel' },
          { text: 'Завершить', style: 'destructive', onPress: endBroadcast },
        ],
      );
    } else if (phase === 'ended') {
      openStream();
    } else {
      router.back();
    }
  }

  // ---- Non-camera states ----
  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    );
  }
  if (loadError) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Трансляция' }} />
        <AppText variant="body" style={{ color: colors.white, textAlign: 'center' }}>
          {loadError}
        </AppText>
        <Pressable style={styles.textBtn} onPress={() => router.back()}>
          <AppText variant="subtitle" style={{ color: colors.white }}>
            Назад
          </AppText>
        </Pressable>
      </View>
    );
  }

  const live = phase === 'live';
  const connecting = phase === 'connecting';
  const ended = phase === 'ended';

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <ApiVideoLiveStreamView
        style={StyleSheet.absoluteFillObject}
        ref={ref}
        camera={camera}
        enablePinchedZoom
        video={{ fps: 30, resolution: '720p', bitrate: 2 * 1024 * 1024, gopDuration: 1 }}
        audio={{ bitrate: 128000, sampleRate: 44100, isStereo: true }}
        isMuted={muted}
        onConnectionSuccess={() => {
          setPhase('live');
          liveMarkedRef.current = true;
          void setStatusSafe('live');
        }}
        onConnectionFailed={(code) => {
          streamingRef.current = false;
          setPhase('error');
          setErrorText(`Не удалось подключиться к серверу (код ${code}).`);
        }}
        onDisconnect={() => {
          if (intentionalStopRef.current) {
            intentionalStopRef.current = false;
            return; // our own stop (explicit end / background) — already handled
          }
          // unexpected drop while in foreground (e.g. network loss). The live can't be resumed
          // (permanentLive:false), so end honestly.
          endBroadcast();
        }}
      />

      {/* Top bar: close + status */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable hitSlop={12} onPress={confirmClose} style={styles.iconChip}>
          <Ionicons name="close" size={24} color={colors.white} />
        </Pressable>
        {live ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <AppText variant="label" style={{ color: colors.white }}>
              В ЭФИРЕ · {fmtElapsed(elapsed)}
            </AppText>
          </View>
        ) : (
          <AppText variant="label" style={{ color: colors.white }} numberOfLines={1}>
            {stream?.title ?? ''}
          </AppText>
        )}
        {!ended ? (
          <Pressable hitSlop={12} onPress={() => setShowChat((v) => !v)} style={styles.iconChip}>
            <Ionicons
              name={showChat ? 'chatbubbles' : 'chatbubbles-outline'}
              size={22}
              color={colors.white}
            />
          </Pressable>
        ) : (
          <View style={styles.iconChip} />
        )}
      </View>

      {/* Host chat: read viewer questions and reply without leaving the broadcast */}
      {showChat && !ended && stream ? (
        <KeyboardAvoidingView
          style={[styles.chatOverlay, { paddingBottom: insets.bottom + spacing.sm }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.chatHeader, { paddingTop: insets.top + spacing.sm }]}>
            <AppText variant="title" style={{ color: colors.white }}>
              Чат эфира
            </AppText>
            <Pressable hitSlop={12} onPress={() => setShowChat(false)} style={styles.iconChip}>
              <Ionicons name="close" size={24} color={colors.white} />
            </Pressable>
          </View>
          <StreamChat
            streamId={stream.id}
            currentUserId={user?.id ?? null}
            canWrite
            variant="dark"
            layout="scroll"
            enabled={showChat}
            style={styles.chatFeed}
          />
        </KeyboardAvoidingView>
      ) : null}

      {errorText && !ended ? (
        <View style={[styles.errorBar, { top: insets.top + 56 }]}>
          <AppText variant="caption" style={{ color: colors.white, textAlign: 'center' }}>
            {errorText}
          </AppText>
        </View>
      ) : null}

      {/* Pre-stream warning about the foreground-only limitation */}
      {phase === 'idle' ? (
        <View style={[styles.warnBanner, { top: insets.top + 56 }]}>
          <Ionicons name="warning" size={18} color={colors.white} />
          <AppText variant="caption" style={{ color: colors.white, flex: 1 }}>
            Не сворачивайте приложение и не выключайте экран во время эфира — это завершит
            трансляцию, продолжить будет нельзя.
          </AppText>
        </View>
      ) : null}

      {/* Ended overlay */}
      {ended ? (
        <View style={styles.scrim}>
          <View style={styles.endCard}>
            <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            <AppText variant="title" style={{ textAlign: 'center' }}>
              Эфир завершён
            </AppText>
            <AppText variant="body" style={{ color: colors.muted, textAlign: 'center' }}>
              {elapsed > 0 ? `Длительность ${fmtElapsed(elapsed)}. ` : ''}Запись обрабатывается и
              появится на странице эфира через несколько минут.
            </AppText>
            <PillButton label="Открыть эфир" onPress={openStream} />
          </View>
        </View>
      ) : null}

      {/* Bottom controls (hidden once ended or while the chat is open) */}
      {!ended && !showChat ? (
        <>
          <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Pressable style={styles.sideBtn} hitSlop={8} onPress={() => setMuted((m) => !m)}>
              <Ionicons name={muted ? 'mic-off' : 'mic'} size={26} color={colors.white} />
              <AppText variant="caption" style={styles.sideLabel}>
                {muted ? 'Вкл. звук' : 'Выкл. звук'}
              </AppText>
            </Pressable>

            <Pressable
              style={[styles.goBtn, live && styles.goBtnLive]}
              onPress={live ? endBroadcast : goLive}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Ionicons name={live ? 'stop' : 'radio'} size={30} color={colors.white} />
              )}
            </Pressable>

            <Pressable
              style={styles.sideBtn}
              hitSlop={8}
              onPress={() => setCamera((c) => (c === 'back' ? 'front' : 'back'))}
            >
              <Ionicons name="camera-reverse" size={26} color={colors.white} />
              <AppText variant="caption" style={styles.sideLabel}>
                Камера
              </AppText>
            </Pressable>
          </View>

          {phase === 'idle' ? (
            <AppText variant="caption" style={[styles.hint, { bottom: insets.bottom + 112 }]}>
              Нажмите, чтобы выйти в эфир
            </AppText>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const OVERLAY = 'rgba(0,0,0,0.45)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  textBtn: { padding: spacing.sm },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: OVERLAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: OVERLAY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  errorBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(220,38,38,0.9)',
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  warnBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(245,158,11,0.92)',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  endCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
  },
  sideBtn: { alignItems: 'center', gap: 4, width: 72 },
  sideLabel: { color: colors.white },
  goBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  goBtnLive: { backgroundColor: colors.ink },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    color: colors.white,
    opacity: 0.8,
  },
  chatOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingHorizontal: spacing.lg,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  chatFeed: { flex: 1, paddingBottom: spacing.md },
});
