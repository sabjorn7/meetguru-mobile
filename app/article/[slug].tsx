import { Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';

import { averageArticleRating } from '@/features/articles/api';
import { ArticleComments } from '@/features/articles/ArticleComments';
import { useArticleDetail } from '@/features/articles/useArticleDetail';
import { PeerTubePlayer } from '@/features/video/PeerTubePlayer';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '' : dateFormatter.format(parsed);
}

const htmlBaseStyle = { color: '#1f2937', fontSize: 16, lineHeight: 24 };
const htmlTagStyles = {
  p: { marginTop: 0, marginBottom: 12 },
  h3: { fontSize: 20, fontWeight: '700' as const, marginTop: 8, marginBottom: 8, color: '#111827' },
  h4: { fontSize: 17, fontWeight: '700' as const, marginTop: 8, marginBottom: 6, color: '#111827' },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#d1d5db',
    paddingLeft: 12,
    marginLeft: 0,
    color: '#4b5563',
  },
  a: { color: '#2563eb' },
};

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { article, author, comments, notFound, loading, error } = useArticleDetail(slug);
  const { width } = useWindowDimensions();

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Статья' }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Статья' }} />
        <Text style={styles.muted}>Статья не найдена</Text>
      </View>
    );
  }

  if (error || !article) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Статья' }} />
        <Text style={styles.errorText}>{error ?? 'Не удалось загрузить статью.'}</Text>
      </View>
    );
  }

  const rating = averageArticleRating(article.Rating);
  const cover = article.Image && article.Image.length > 0 ? article.Image : null;
  const date = formatDate(article.Publish_date ?? article.created_at);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: article.Title ?? 'Статья' }} />

      {cover ? <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" /> : null}

      <View style={styles.section}>
        {article.Category ? <Text style={styles.category}>{article.Category}</Text> : null}
        <Text style={styles.title}>{article.Title ?? 'Без названия'}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.date}>{date}</Text>
          {rating !== null ? <Text style={styles.rating}>★ {rating.toFixed(1)}</Text> : null}
        </View>

        {author ? (
          <View style={styles.authorRow}>
            {author.Photo ? (
              <Image source={{ uri: author.Photo }} style={styles.authorAvatar} />
            ) : (
              <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
                <Text style={styles.authorInitial}>
                  {author.Name?.trim()?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <Text style={styles.authorName}>{author.Name ?? 'Автор'}</Text>
          </View>
        ) : null}
      </View>

      {article.video_id ? <PeerTubePlayer videoId={article.video_id} /> : null}

      <View style={styles.section}>
        <RenderHtml
          contentWidth={width - 32}
          source={{ html: article.Content ?? '' }}
          baseStyle={htmlBaseStyle}
          tagsStyles={htmlTagStyles}
          enableExperimentalMarginCollapsing
        />
      </View>

      {comments.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Комментарии · {comments.length}</Text>
          <ArticleComments comments={comments} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#eef2f7',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  category: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 13,
    color: '#9ca3af',
  },
  rating: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f59e0b',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
  },
  authorAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitial: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  muted: {
    fontSize: 15,
    color: '#6b7280',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 15,
    textAlign: 'center',
  },
});
