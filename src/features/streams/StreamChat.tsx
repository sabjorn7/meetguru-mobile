import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  type AlertButton,
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

import { reportContent } from './moderationApi';
import { deleteStreamMessage, type StreamMessage } from './streamChatApi';
import { useStreamChat } from './useStreamChat';

type Props = {
  streamId: string;
  currentUserId: string | null;
  /** Whether the current user may post (viewers gated by access; host always true). */
  canWrite: boolean;
  /** The stream's host can delete anyone's message (moderation). */
  isHost?: boolean;
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
  isHost = false,
  variant = 'light',
  enabled = true,
  layout = 'inline',
  maxHeight,
  style,
}: Props) {
  const { messages, loading, error, send, refresh, block } = useStreamChat(streamId, {
    enabled,
    currentUserId,
  });
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

  async function reportMessage(m: StreamMessage) {
    try {
      await reportContent({
        reporter: currentUserId,
        targetType: 'message',
        targetId: m.id,
        stream: streamId,
        reason: m.text ?? undefined,
      });
      Alert.alert('Жалоба отправлена', 'Спасибо. Мы рассмотрим её в течение 24 часов.');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось отправить жалобу.');
    }
  }

  function confirmBlock(m: StreamMessage) {
    if (!m.owner) return;
    const name = m.authorUser?.Name || 'этого пользователя';
    Alert.alert(
      'Заблокировать?',
      `Сообщения пользователя «${name}» больше не будут вам показываться.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Заблокировать',
          style: 'destructive',
          onPress: async () => {
            try {
              await block(m.owner!);
            } catch (e) {
              Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось заблокировать.');
            }
          },
        },
      ],
    );
  }

  async function removeMessage(m: StreamMessage) {
    try {
      await deleteStreamMessage(m.id);
      await refresh();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось удалить сообщение.');
    }
  }

  function onLongPressMessage(m: StreamMessage) {
    if (!currentUserId) return;
    const isOwn = m.owner === currentUserId;
    const buttons: AlertButton[] = [];
    if (!isOwn && m.owner) {
      buttons.push({ text: 'Пожаловаться', onPress: () => reportMessage(m) });
      buttons.push({ text: 'Заблокировать пользователя', style: 'destructive', onPress: () => confirmBlock(m) });
    }
    if (isOwn || isHost) {
      buttons.push({ text: 'Удалить сообщение', style: 'destructive', onPress: () => removeMessage(m) });
    }
    if (!buttons.length) return;
    buttons.push({ text: 'Отмена', style: 'cancel' });
    Alert.alert('Сообщение', m.text ?? '', buttons);
  }

  const fg = dark ? colors.white : colors.ink;
  const sub = dark ? 'rgba(255,255,255,0.7)' : colors.muted;
  const nameColor = dark ? '#9ecbff' : colors.primary;

  const rows = messages.map((m) => (
    <Pressable key={m.id} style={styles.row} onLongPress={() => onLongPressMessage(m)} delayLongPress={300}>
      <AppText variant="caption" style={{ color: nameColor }}>
        {m.authorUser?.Name || 'Гость'}
      </AppText>
      <AppText variant="body" style={{ color: fg }}>
        {m.text}
      </AppText>
    </Pressable>
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
