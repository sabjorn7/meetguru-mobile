import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import { averageRating, type CourseListItem } from './api';
import { resolveCourseImage } from './peertube';

type Props = {
  course: CourseListItem;
  onPress: (course: CourseListItem) => void;
};

const priceFormatter = new Intl.NumberFormat('ru-RU');

function formatPrice(value: number | null): string {
  return `${priceFormatter.format(value ?? 0)} ₽`;
}

export function CourseCard({ course, onPress }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    resolveCourseImage(course.video_id).then((url) => {
      if (mounted) setImageUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, [course.video_id]);

  const rating = averageRating(course.rating);
  const isFree = course.Free === true || (course.Price ?? 0) === 0;

  return (
    <Pressable onPress={() => onPress(course)} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card} elevated>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <AppText variant="title" style={styles.placeholderText}>
              MeetGuru
            </AppText>
          </View>
        )}

        <View style={styles.body}>
          {course.Category ? (
            <AppText variant="label" style={styles.category}>
              {course.Category.toUpperCase()}
            </AppText>
          ) : null}
          <AppText variant="subtitle" numberOfLines={2}>
            {course.Title ?? 'Без названия'}
          </AppText>

          <View style={styles.metaRow}>
            {isFree ? (
              <View style={styles.freeBadge}>
                <AppText variant="label" style={styles.freeText}>
                  Бесплатно
                </AppText>
              </View>
            ) : (
              <View style={styles.priceRow}>
                <AppText variant="subtitle" style={styles.price}>
                  {formatPrice(course.Price)}
                </AppText>
                {course.old_price ? (
                  <AppText variant="caption" style={styles.oldPrice}>
                    {formatPrice(course.old_price)}
                  </AppText>
                ) : null}
              </View>
            )}

            {rating !== null ? (
              <View style={styles.rating}>
                <Ionicons name="star" size={13} color={colors.amber} />
                <AppText variant="caption" style={styles.ratingText}>
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
  pressed: {
    opacity: 0.85,
  },
  card: {
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.primarySoft,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.faint,
  },
  body: {
    padding: spacing.lg,
    gap: 6,
  },
  category: {
    color: colors.primary,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  price: {
    color: colors.ink,
  },
  oldPrice: {
    color: colors.faint,
    textDecorationLine: 'line-through',
  },
  freeBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freeText: {
    color: colors.success,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: colors.ink,
  },
});
