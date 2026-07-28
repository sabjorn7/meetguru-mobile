import { Image, StyleSheet, Text, View } from 'react-native';

import type { CourseReview } from './api';

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

function initial(name: string | null): string {
  return name?.trim()?.[0]?.toUpperCase() ?? '?';
}

function ReviewAvatar({ review }: { review: CourseReview }) {
  if (review.photo) {
    return <Image source={{ uri: review.photo }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitial}>{initial(review.name)}</Text>
    </View>
  );
}

export function CourseReviews({ reviews }: { reviews: CourseReview[] }) {
  return (
    <View style={styles.list}>
      {reviews.map((review, index) => (
        <View key={`${review.user_id}-${index}`} style={styles.review}>
          <ReviewAvatar review={review} />
          <View style={styles.reviewBody}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewName}>{review.name ?? 'Пользователь'}</Text>
              {review.date ? <Text style={styles.reviewDate}>{formatDate(review.date)}</Text> : null}
            </View>
            <Text style={styles.reviewText}>{review.comment}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  review: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6b7280',
  },
  reviewBody: {
    flex: 1,
    gap: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reviewName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
});
