import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, TextField } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

import { fetchClubChat, formatClubDate, sendClubChat, type ClubChatMessage } from './api';

export function ClubChat({ clubId, userId }: { clubId: string; userId: string }) {
  const [messages, setMessages] = useState<ClubChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setMessages(await fetchClubChat(clubId));
    } catch {
      // ignore — keep whatever is shown
    }
  }, [clubId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

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

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
  }

  return (
    <View style={styles.wrap}>
      {messages.length === 0 ? (
        <AppText variant="body" style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.lg }}>
          Пока нет сообщений
        </AppText>
      ) : (
        messages.map((m) => (
          <Card key={m.id} style={styles.msg}>
            <View style={styles.msgHead}>
              {m.authorPhoto ? (
                <Image source={{ uri: m.authorPhoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <AppText variant="label" style={{ color: colors.primary }}>
                    {(m.authorName || '?')[0]?.toUpperCase() ?? '?'}
                  </AppText>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <AppText variant="subtitle" numberOfLines={1}>
                  {m.authorName || 'Участник'}
                </AppText>
                <AppText variant="label" style={{ color: colors.muted }}>
                  {formatClubDate(m.createdAt)}
                </AppText>
              </View>
            </View>
            {m.text ? <AppText variant="body">{m.text}</AppText> : null}
            {m.images.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.image} resizeMode="cover" />
            ))}
          </Card>
        ))
      )}

      <View style={styles.composer}>
        <TextField
          value={draft}
          onChangeText={setDraft}
          placeholder="Начните печатать…"
          style={{ flex: 1 }}
          multiline
        />
        <Pressable onPress={send} disabled={sending || !draft.trim()} style={styles.send} hitSlop={8}>
          {sending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons name="send" size={22} color={draft.trim() ? colors.primary : colors.faint} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  msg: { gap: spacing.sm, padding: spacing.lg },
  msgHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: 220, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  send: { paddingBottom: 14, paddingHorizontal: 4 },
});
