import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';

import { RatingInput } from '@/components/RatingInput';
import { AppText, Card, PillButton, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import {
  averageArticleRating,
  hasRatedArticle,
  submitArticleComment,
  submitArticleRating,
} from '@/features/articles/api';
import { ArticleComments } from '@/features/articles/ArticleComments';
import { useArticleDetail } from '@/features/articles/useArticleDetail';
import { PeerTubePlayer } from '@/features/video/PeerTubePlayer';
import { errorMessage } from '@/lib/errors';
import { colors, fonts, radius, spacing } from '@/theme';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '' : dateFormatter.format(parsed);
}

const htmlBaseStyle = { color: colors.body, fontSize: 16, lineHeight: 25, fontFamily: fonts.regular };
const htmlTagStyles = {
  p: { marginTop: 0, marginBottom: 12 },
  h3: { fontSize: 20, fontFamily: fonts.bold, marginTop: 8, marginBottom: 8, color: colors.ink },
  h4: { fontSize: 17, fontFamily: fonts.bold, marginTop: 8, marginBottom: 6, color: colors.ink },
  strong: { fontFamily: fonts.bold },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryTint,
    paddingLeft: 12,
    marginLeft: 0,
    color: colors.muted,
  },
  a: { color: colors.primary },
};

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { article, author, comments, notFound, loading, error, reload } = useArticleDetail(slug);
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const [rated, setRated] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const articleId = article?.id;

  useEffect(() => {
    let mounted = true;
    if (!articleId || !user) return;
    hasRatedArticle(articleId, user.id)
      .then((has) => mounted && setRated(has))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [articleId, user]);

  const handleRate = useCallback(
    async (value: number) => {
      if (!articleId || !user || submittingRating || rated) return;
      setRatingValue(value);
      setSubmittingRating(true);
      try {
        await submitArticleRating(articleId, user.id, value);
        setRated(true);
        reload();
      } catch (e) {
        Alert.alert('Ошибка', errorMessage(e, 'Не удалось сохранить оценку.'));
      } finally {
        setSubmittingRating(false);
      }
    },
    [articleId, user, submittingRating, rated, reload],
  );

  const handleComment = useCallback(async () => {
    if (!articleId || !user || submittingComment) return;
    const text = commentText.trim();
    if (!text) return;
    setSubmittingComment(true);
    try {
      await submitArticleComment(articleId, user.id, text);
      setCommentText('');
      reload();
    } catch (e) {
      Alert.alert('Ошибка', errorMessage(e, 'Не удалось отправить комментарий.'));
    } finally {
      setSubmittingComment(false);
    }
  }, [articleId, user, commentText, submittingComment, reload]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Статья' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Статья' }} />
        <AppText variant="body" style={{ color: colors.muted }}>
          Статья не найдена
        </AppText>
      </View>
    );
  }

  if (error || !article) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Статья' }} />
        <AppText variant="body" style={{ color: colors.danger }}>
          {error ?? 'Не удалось загрузить статью.'}
        </AppText>
      </View>
    );
  }

  const rating = averageArticleRating(article.Rating);
  const cover = article.Image && article.Image.length > 0 ? article.Image : null;
  const date = formatDate(article.Publish_date ?? article.created_at);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: article.Title ?? 'Статья' }} />

      {cover ? (
        <Card style={styles.coverCard}>
          <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" />
        </Card>
      ) : null}

      {article.Category ? (
        <AppText variant="label" style={styles.category}>
          {article.Category.toUpperCase()}
        </AppText>
      ) : null}
      <AppText variant="h2">{article.Title ?? 'Без названия'}</AppText>

      <View style={styles.metaRow}>
        <AppText variant="caption" style={{ color: colors.faint }}>
          {date}
        </AppText>
        {rating !== null ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.amber} />
            <AppText variant="caption" style={{ color: colors.ink }}>
              {rating.toFixed(1)}
            </AppText>
          </View>
        ) : null}
      </View>

      {author ? (
        <View style={styles.authorRow}>
          {author.Photo ? (
            <Image source={{ uri: author.Photo }} style={styles.authorAvatar} />
          ) : (
            <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
              <AppText variant="caption" style={{ color: colors.muted }}>
                {author.Name?.trim()?.[0]?.toUpperCase() ?? '?'}
              </AppText>
            </View>
          )}
          <AppText variant="caption" style={{ color: colors.body }}>
            {author.Name ?? 'Автор'}
          </AppText>
        </View>
      ) : null}

      {article.video_id ? (
        <Card style={styles.playerCard}>
          <PeerTubePlayer videoId={article.video_id} />
        </Card>
      ) : null}

      <RenderHtml
        contentWidth={width - 2 * spacing.lg}
        source={{ html: article.Content ?? '' }}
        baseStyle={htmlBaseStyle}
        tagsStyles={htmlTagStyles}
        enableExperimentalMarginCollapsing
      />

      {user ? (
        <Card style={styles.block}>
          <AppText variant="title">Ваша оценка</AppText>
          {rated ? (
            <AppText variant="body" style={{ color: colors.muted }}>
              Спасибо, вы оценили статью
            </AppText>
          ) : (
            <RatingInput value={ratingValue} onChange={handleRate} disabled={submittingRating} />
          )}
        </Card>
      ) : null}

      <View style={styles.commentsSection}>
        <AppText variant="title">
          Комментарии{comments.length ? ` · ${comments.length}` : ''}
        </AppText>
        {comments.length > 0 ? <ArticleComments comments={comments} /> : null}

        {user ? (
          <>
            <TextField
              placeholder="Написать комментарий…"
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <PillButton
              label="Отправить"
              onPress={handleComment}
              loading={submittingComment}
              disabled={!commentText.trim()}
            />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
  coverCard: { overflow: 'hidden', padding: 0 },
  cover: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.primarySoft },
  playerCard: { overflow: 'hidden', padding: 0 },
  category: { color: colors.primary, letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  authorAvatar: { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  authorAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  block: { padding: spacing.lg, gap: spacing.md },
  commentsSection: { gap: spacing.md, marginTop: spacing.sm },
});
