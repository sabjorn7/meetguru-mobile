import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { getLocalUri } from '@/features/offline/downloads';

import { resolveHlsUrl } from './stream';

type Props = {
  videoId: string | null;
  style?: ViewStyle;
};

export function PeerTubePlayer({ videoId, style }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let mounted = true;
    setStatus('loading');
    setUri(null);
    (async () => {
      // Prefer a locally downloaded copy (offline); fall back to the HLS stream.
      const local = videoId ? await getLocalUri(videoId) : null;
      const resolved = local ?? (await resolveHlsUrl(videoId));
      if (!mounted) return;
      setUri(resolved);
      setStatus(resolved ? 'ready' : 'unavailable');
    })();
    return () => {
      mounted = false;
    };
  }, [videoId]);

  const source = useMemo(() => (uri ? { uri } : null), [uri]);
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
  });

  return (
    <View style={[styles.container, style]}>
      {status === 'ready' ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          allowsFullscreen
          allowsPictureInPicture
          contentFit="contain"
        />
      ) : (
        <View style={styles.overlay}>
          {status === 'loading' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.unavailable}>Видео недоступно</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailable: {
    color: '#d1d5db',
    fontSize: 14,
  },
});
