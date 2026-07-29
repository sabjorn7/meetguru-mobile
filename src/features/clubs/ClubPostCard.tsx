import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, TextField } from '@/components/ui';
import { PeerTubePlayer } from '@/features/video/PeerTubePlayer';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

import {
  fetchPostComments,
  formatClubDate,
  submitComment,
  toggleLike,
  type ClubComment,
  type ClubPost,
} from './api';

export function ClubPostCard({
  post,
  userId,
  ownerName,
  ownerPhoto,
}: {
  post: ClubPost;
  userId: string;
  ownerName: string | null;
  ownerPhoto: string | null;
}) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likeBusy, setLikeBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<ClubComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [count, setCount] = useState(post.commentCount);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  async function onToggleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const res = await toggleLike(post.id, userId);
      setLiked(res.liked);
      setLikeCount(res.count);
    } catch {
      setLiked(!nextLiked); // revert
      setLikeCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setLikeBusy(false);
    }
  }

  async function openComments() {
    const next = !open;
    setOpen(next);
    if (next && comments.length === 0) {
      setLoadingComments(true);
      try {
        const list = await fetchPostComments(post.id);
        setComments(list);
        setCount(list.length);
      } catch {
        // ignore
      } finally {
        setLoadingComments(false);
      }
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await submitComment(post.id, userId, text);
      const list = await fetchPostComments(post.id);
      setComments(list);
      setCount(list.length);
      setDraft('');
    } catch (e) {
      // surface minimally
      setDraft(draft);
      console.warn('comment failed', errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        {ownerPhoto ? (
          <Image source={{ uri: ownerPhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <AppText variant="label" style={{ color: colors.primary }}>
              {(ownerName || '?')[0]?.toUpperCase() ?? '?'}
            </AppText>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" numberOfLines={1}>
            {ownerName || 'Клуб'}
          </AppText>
          <AppText variant="label" style={{ color: colors.muted }}>
            {formatClubDate(post.createdAt)}
          </AppText>
        </View>
      </View>

      {post.text ? (
        <AppText variant="body" style={styles.text}>
          {post.text}
        </AppText>
      ) : null}

      {post.photos.map((uri) => (
        <Image key={uri} source={{ uri }} style={styles.photo} resizeMode="cover" />
      ))}

      {post.video ? <PeerTubePlayer videoId={post.video} style={styles.video} /> : null}

      <View style={styles.actions}>
        <Pressable onPress={onToggleLike} style={styles.action} hitSlop={8}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? colors.danger : colors.muted}
          />
          <AppText variant="label" style={{ color: colors.muted }}>
            {likeCount}
          </AppText>
        </Pressable>
        <Pressable onPress={openComments} style={styles.action} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.muted} />
          <AppText variant="label" style={{ color: colors.muted }}>
            {count}
          </AppText>
        </Pressable>
      </View>

      {open ? (
        <View style={styles.comments}>
          {loadingComments ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                {c.authorPhoto ? (
                  <Image source={{ uri: c.authorPhoto }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatar, styles.avatarFallback]}>
                    <AppText variant="label" style={{ color: colors.primary, fontSize: 11 }}>
                      {(c.authorName || '?')[0]?.toUpperCase() ?? '?'}
                    </AppText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <AppText variant="label" style={{ color: colors.ink }}>
                    {c.authorName || 'Пользователь'}
                  </AppText>
                  <AppText variant="body">{c.text}</AppText>
                </View>
              </View>
            ))
          )}
          <View style={styles.composer}>
            <TextField
              value={draft}
              onChangeText={setDraft}
              placeholder="Комментарий…"
              style={{ flex: 1 }}
              multiline
            />
            <Pressable onPress={send} disabled={sending || !draft.trim()} style={styles.send} hitSlop={8}>
              {sending ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={draft.trim() ? colors.primary : colors.faint}
                />
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  text: { marginTop: 2 },
  photo: { width: '100%', height: 240, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  video: { marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xs },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  comments: {
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primarySoft,
  },
  comment: { flexDirection: 'row', gap: spacing.sm },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  send: { paddingBottom: 14, paddingHorizontal: 4 },
});
