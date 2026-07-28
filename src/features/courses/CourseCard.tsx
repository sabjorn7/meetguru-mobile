import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

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
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(course)}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverPlaceholderText}>MeetGuru</Text>
        </View>
      )}

      <View style={styles.body}>
        {course.Category ? <Text style={styles.category}>{course.Category}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>
          {course.Title ?? 'Без названия'}
        </Text>

        <View style={styles.metaRow}>
          {isFree ? (
            <Text style={styles.free}>Бесплатно</Text>
          ) : (
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(course.Price)}</Text>
              {course.old_price ? (
                <Text style={styles.oldPrice}>{formatPrice(course.old_price)}</Text>
              ) : null}
            </View>
          )}

          {rating !== null ? (
            <Text style={styles.rating}>★ {rating.toFixed(1)}</Text>
          ) : null}
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  oldPrice: {
    fontSize: 13,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  free: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
});
