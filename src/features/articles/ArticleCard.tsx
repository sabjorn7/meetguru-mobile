import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { colors, spacing } from '@/theme';

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
    <Pressable onPress={() => onPress(article)} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card} elevated>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <AppText variant="title" style={{ color: colors.faint }}>
              MeetGuru
            </AppText>
          </View>
        )}

        <View style={styles.body}>
          {article.Category ? (
            <AppText variant="label" style={styles.category}>
              {article.Category.toUpperCase()}
            </AppText>
          ) : null}
          <AppText variant="subtitle" numberOfLines={2}>
            {article.Title ?? 'Без названия'}
          </AppText>
          <View style={styles.metaRow}>
            <AppText variant="caption" style={{ color: colors.faint }}>
              {formatDate(article)}
            </AppText>
            {rating !== null ? (
              <View style={styles.rating}>
                <Ionicons name="star" size={13} color={colors.amber} />
                <AppText variant="caption" style={{ color: colors.ink }}>
                  {rating.toFixed(1)}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  card: { overflow: 'hidden' },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.primarySoft,
  },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, gap: 6 },
  category: { color: colors.primary, letterSpacing: 0.5 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
