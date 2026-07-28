import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { averageArticleRating, type ArticleListItem } from './api';

type Props = {
  article: ArticleListItem;
  onPress: (article: ArticleListItem) => void;
};

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatDate(article: ArticleListItem): string {
  const iso = article.Publish_date ?? article.created_at;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '' : dateFormatter.format(parsed);
}

export function ArticleCard({ article, onPress }: Props) {
  const rating = averageArticleRating(article.Rating);
  const cover = article.Image && article.Image.length > 0 ? article.Image : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(article)}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverPlaceholderText}>MeetGuru</Text>
        </View>
      )}

      <View style={styles.body}>
        {article.Category ? <Text style={styles.category}>{article.Category}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>
          {article.Title ?? 'Без названия'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.date}>{formatDate(article)}</Text>
          {rating !== null ? <Text style={styles.rating}>★ {rating.toFixed(1)}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eceef1',
  },
  cardPressed: {
    opacity: 0.7,
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#eef2f7',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    color: '#9aa5b1',
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    padding: 14,
    gap: 6,
  },
  category: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  date: {
    fontSize: 13,
    color: '#9ca3af',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
});
