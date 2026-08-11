import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import { useStreamChat } from './useStreamChat';

type Props = {
  streamId: string;
  currentUserId: string | null;
  /** Whether the current user may post (viewers gated by access; host always true). */
  canWrite: boolean;
  /** 'dark' for the broadcast overlay over the camera, 'light' for the viewer screen. */
  variant?: 'light' | 'dark';
  /** Poll only while the chat is actually visible. */
  enabled?: boolean;
  /** 'scroll' gives the feed its own scroll (host overlay); 'inline' maps the messages into
   *  the parent scroll view (viewer screen). */
  layout?: 'scroll' | 'inline';
  /** Bound the scroll feed; omit to fill the flex parent (full-screen host overlay). */
  maxHeight?: number;
  style?: StyleProp<ViewStyle>;
};

export function StreamChat({
  streamId,
  currentUserId,
  canWrite,
  variant = 'light',
  enabled = true,
  layout = 'inline',
  maxHeight,
  style,
}: Props) {
  const { messages, loading, error, send } = useStreamChat(streamId, { enabled });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const feedRef = useRef<ScrollView>(null);
  const dark = variant === 'dark';

  // Keep the newest message in view.
  useEffect(() => {
    if (layout === 'scroll') feedRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, layout]);

  async function handleSend() {
    const t = text.trim();
    if (!t || !currentUserId || sending) return;
    setSending(true);
    try {
      await send(currentUserId, t);
      setText('');
    } catch {
      // surfaced via the hook's `error`
    } finally {
      setSending(false);
    }
  }

  const fg = dark ? colors.white : colors.ink;
  const sub = dark ? 'rgba(255,255,255,0.7)' : colors.muted;
  const nameColor = dark ? '#9ecbff' : colors.primary;

  const rows = messages.map((m) => (
    <View key={m.id} style={styles.row}>
      <AppText variant="caption" style={{ color: nameColor }}>
        {m.authorUser?.Name || 'Гость'}
      </AppText>
      <AppText variant="body" style={{ color: fg }}>
        {m.text}
      </AppText>
    </View>
  ));

  return (
    <View style={[styles.wrap, style]}>
      {loading ? (
        <AppText variant="caption" style={{ color: sub }}>
          Загрузка чата…
        </AppText>
      ) : messages.length === 0 ? (
        <AppText variant="caption" style={{ color: sub }}>
          Сообщений пока нет.
        </AppText>
      ) : layout === 'scroll' ? (
        <ScrollView
          ref={feedRef}
          style={maxHeight ? { maxHeight } : { flex: 1 }}
          contentContainerStyle={styles.feed}
        >
          {rows}
        </ScrollView>
      ) : (
        <View style={styles.feed}>{rows}</View>
      )}

      {error ? (
        <AppText variant="caption" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}

      {canWrite && currentUserId ? (
        <View style={[styles.composer, dark ? styles.composerDark : styles.composerLight]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Сообщение…"
            placeholderTextColor={sub}
            style={[styles.input, { color: fg }]}
            editable={!sending}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable onPress={handleSend} disabled={sending || !text.trim()} hitSlop={8}>
            <AppText variant="label" style={{ color: colors.primary, opacity: text.trim() ? 1 : 0.4 }}>
              Отпр.
            </AppText>
          </Pressable>
        </View>
      ) : !currentUserId ? (
        <AppText variant="caption" style={{ color: sub }}>
          Войдите, чтобы писать в чат.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  feed: { gap: spacing.sm, paddingVertical: spacing.xs },
  row: { gap: 2 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  composerLight: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  composerDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  input: { flex: 1, paddingVertical: spacing.sm, fontSize: 15 },
});
