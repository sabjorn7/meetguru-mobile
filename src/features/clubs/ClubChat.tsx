import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { colors, fonts } from '@/theme';

import { fetchClubChat, formatClubDate, sendClubChat, type ClubChatMessage } from './api';

function ChatRow({ msg, mine }: { msg: ClubChatMessage; mine: boolean }) {
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
      {!mine && msg.authorPhoto ? (
        <Image source={{ uri: msg.authorPhoto }} style={styles.avatar} />
      ) : !mine ? (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{(msg.authorName || '?')[0]?.toUpperCase() ?? '?'}</Text>
        </View>
      ) : null}
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        {!mine ? <Text style={styles.author}>{msg.authorName || 'Участник'}</Text> : null}
        {msg.text ? (
          <Text style={[styles.text, mine && styles.textMine]}>{msg.text}</Text>
        ) : null}
        {msg.images.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.image} resizeMode="cover" />
        ))}
        <Text style={[styles.time, mine && styles.timeMine]}>{formatClubDate(msg.createdAt)}</Text>
      </View>
    </View>
  );
}

export function ClubChat({ clubId, userId }: { clubId: string; userId: string }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ClubChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setMessages(await fetchClubChat(clubId));
    } catch {
      // ignore
    }
  }, [clubId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // Inverted list: newest at the bottom, pinned automatically.
  const inverted = useMemo(() => [...messages].reverse(), [messages]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendClubChat(clubId, userId, text);
      setDraft('');
      await load();
    } catch (e) {
      console.warn('club chat send failed', errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.flex}>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="body" style={{ color: colors.muted }}>
            Пока нет сообщений
          </AppText>
        </View>
      ) : (
        <FlatList
          data={inverted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatRow msg={item} mine={item.authorId === userId} />}
          inverted
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom || 8 }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Начните печатать…"
          placeholderTextColor="#9ca3af"
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendDisabled]}
          onPress={send}
          disabled={!draft.trim() || sending}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>➤</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  listContent: { paddingHorizontal: 12, paddingVertical: 12 },
  row: { marginVertical: 3, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, gap: 3 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#f1f3f5', borderBottomLeftRadius: 4 },
  author: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.ink },
  textMine: { color: colors.white },
  image: { width: 200, height: 150, borderRadius: 10, backgroundColor: colors.primarySoft },
  time: { fontSize: 11, color: '#9ca3af', alignSelf: 'flex-end' },
  timeMine: { color: '#c7dbff' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontSize: 18 },
});
