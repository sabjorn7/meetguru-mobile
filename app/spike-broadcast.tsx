// THROWAWAY SPIKE — de-risks @api.video/react-native-livestream on our stack
// (Expo SDK 54, New Architecture, RN 0.81). NOT the real broadcast UI.
// Delete this file (and the __DEV__ entry on the profile screen) once the spike concludes.
//
// What it proves: (1) the native Fabric component builds & renders a camera preview on New
// Arch; (2) startStreaming() pushes camera→RTMP to our PeerTube using the SAME createLive()
// path the site uses. Server-side confirmation is done separately via PeerTube getVideoInfo.

import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ApiVideoLiveStreamView,
  type ApiVideoLiveStreamMethods,
} from '@api.video/react-native-livestream';

import { AppText, PillButton } from '@/components/ui';
import { createLive } from '@/features/streams/peertubeLive';
import { errorMessage } from '@/lib/errors';
import { colors, spacing } from '@/theme';

export default function SpikeBroadcastScreen() {
  const ref = useRef<ApiVideoLiveStreamMethods>(null);
  const [status, setStatus] = useState('Готов. Нажмите «Создать эфир → в эфир».');
  const [videoUuid, setVideoUuid] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function goLive() {
    setBusy(true);
    try {
      setStatus('Создаю тестовый эфир в PeerTube…');
      const live = await createLive({ name: `SPIKE ${new Date().toISOString()}` });
      setVideoUuid(String(live.video?.uuid ?? live.video?.id ?? ''));
      if (!live.rtmpUrl || !live.streamKey) {
        setStatus('PeerTube не вернул rtmpUrl/streamKey.');
        return;
      }
      setStatus(`Подключаюсь к ${live.rtmpUrl} …`);
      // url = PeerTube RTMP server, streamKey = its live key — exact 1:1 mapping.
      await ref.current?.startStreaming(live.streamKey, live.rtmpUrl);
      setStreaming(true);
    } catch (e) {
      setStatus('Ошибка: ' + errorMessage(e, 'не удалось запустить эфир.'));
    } finally {
      setBusy(false);
    }
  }

  function stop() {
    ref.current?.stopStreaming();
    setStreaming(false);
    setStatus('Остановлено.');
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Spike: вещание' }} />

      <ApiVideoLiveStreamView
        style={styles.preview}
        ref={ref}
        camera="back"
        enablePinchedZoom
        video={{ fps: 30, resolution: '720p', bitrate: 2 * 1024 * 1024, gopDuration: 1 }}
        audio={{ bitrate: 128000, sampleRate: 44100, isStereo: true }}
        isMuted={false}
        onConnectionSuccess={() => setStatus('✅ onConnectionSuccess — PeerTube принимает поток')}
        onConnectionFailed={(code) => setStatus('❌ onConnectionFailed: ' + code)}
        onDisconnect={() => {
          setStreaming(false);
          setStatus('⚠️ onDisconnect');
        }}
      />

      <View style={styles.panel}>
        <AppText variant="caption" style={styles.status}>
          {status}
        </AppText>
        {videoUuid ? (
          <AppText variant="caption" style={styles.uuid} selectable>
            video: {videoUuid}
          </AppText>
        ) : null}
        <PillButton
          label={streaming ? 'Стоп' : 'Создать эфир → в эфир'}
          variant={streaming ? 'outline' : 'primary'}
          loading={busy}
          disabled={busy}
          onPress={streaming ? stop : goLive}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  preview: { flex: 1, alignSelf: 'stretch', backgroundColor: '#000' },
  panel: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.bg },
  status: { color: colors.body },
  uuid: { color: colors.faint },
});
