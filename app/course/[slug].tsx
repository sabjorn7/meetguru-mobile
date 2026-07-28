import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  accessFormatLabel,
  averageRating,
  parseReviews,
  ratingCount,
  type LessonItem,
} from '@/features/courses/api';
import { CourseReviews } from '@/features/courses/CourseReviews';
import { useCourseDetail } from '@/features/courses/useCourseDetail';
import { PeerTubePlayer } from '@/features/video/PeerTubePlayer';

const WEB_ORIGIN = 'https://app.meetgu.ru';
const priceFormatter = new Intl.NumberFormat('ru-RU');

function formatPrice(value: number | null): string {
  return `${priceFormatter.format(value ?? 0)} ₽`;
}

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { course, lessons, studentsCount, hasAccess, notFound, loading, error, refreshAccess } =
    useCourseDetail(slug);

  const scrollRef = useRef<ScrollView>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const isFree = course ? course.Free === true || (course.Price ?? 0) === 0 : false;
  const rating = course ? averageRating(course.rating) : null;

  // Default the player to the course promo; a lesson tap overrides it.
  const playingVideoId = useMemo(
    () => activeVideoId ?? course?.video_id ?? null,
    [activeVideoId, course?.video_id],
  );

  const playLesson = useCallback((lesson: LessonItem) => {
    if (!lesson.video_id) return;
    setActiveVideoId(lesson.video_id);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const handleBuy = useCallback(async () => {
    if (!slug) return;
    await WebBrowser.openBrowserAsync(`${WEB_ORIGIN}/course/${slug}`);
    // The purchase completes on the website; re-check access on return.
    refreshAccess();
  }, [slug, refreshAccess]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Курс' }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Курс' }} />
        <Text style={styles.muted}>Курс не найден</Text>
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Курс' }} />
        <Text style={styles.errorText}>{error ?? 'Не удалось загрузить курс.'}</Text>
      </View>
    );
  }

  const reviews = parseReviews(course.comment);
  const ratingsTotal = ratingCount(course.rating);
  const materialsCount = lessons.filter((l) => (l.File ?? '').trim().length > 0).length;

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: course.Title ?? 'Курс' }} />

      <PeerTubePlayer videoId={playingVideoId} />

      <View style={styles.section}>
        {course.Category ? <Text style={styles.category}>{course.Category}</Text> : null}
        <Text style={styles.title}>{course.Title ?? 'Без названия'}</Text>

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
            <Text style={styles.rating}>
              ★ {rating.toFixed(1)}
              {ratingsTotal > 0 ? <Text style={styles.ratingCount}> · {ratingsTotal}</Text> : null}
            </Text>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <Stat value={lessons.length} label={pluralLessons(lessons.length)} />
          <Stat value={materialsCount} label={pluralMaterials(materialsCount)} />
          <Stat value={studentsCount} label={pluralStudents(studentsCount)} />
        </View>

        <View style={styles.accessChip}>
          <Text style={styles.accessChipText}>{accessFormatLabel(course.DurationLong)}</Text>
        </View>

        {!hasAccess && !isFree ? (
          <Pressable style={styles.buyButton} onPress={handleBuy}>
            <Text style={styles.buyText}>Купить за {formatPrice(course.Price)}</Text>
          </Pressable>
        ) : null}
      </View>

      {course.Decription ? (
        <Section title="Описание">
          <Text style={styles.body}>{course.Decription}</Text>
        </Section>
      ) : null}

      {course.WhatTeach ? (
        <Section title="Чему научитесь">
          <Text style={styles.body}>{course.WhatTeach}</Text>
        </Section>
      ) : null}

      {course.For ? (
        <Section title="Для кого">
          <Text style={styles.body}>{course.For}</Text>
        </Section>
      ) : null}

      <Section title={`Уроки${lessons.length ? ` · ${lessons.length}` : ''}`}>
        {lessons.length === 0 ? (
          <Text style={styles.muted}>Уроков пока нет</Text>
        ) : (
          lessons.map((lesson, index) => {
            const locked = !hasAccess;
            const active = lesson.video_id != null && lesson.video_id === playingVideoId;
            return (
              <Pressable
                key={lesson.id}
                style={[styles.lessonRow, active && styles.lessonRowActive]}
                onPress={() => (locked ? undefined : playLesson(lesson))}
                disabled={locked || !lesson.video_id}
              >
                <Text style={styles.lessonIndex}>{index + 1}</Text>
                <View style={styles.lessonBody}>
                  <Text style={styles.lessonTitle} numberOfLines={2}>
                    {lesson.Title ?? 'Урок'}
                  </Text>
                </View>
                <Text style={styles.lessonIcon}>{locked ? '🔒' : active ? '▶' : '›'}</Text>
              </Pressable>
            );
          })
        )}
      </Section>

      {reviews.length > 0 ? (
        <Section title={`Отзывы · ${reviews.length}`}>
          <CourseReviews reviews={reviews} />
        </Section>
      ) : null}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Russian plural helper: [one, few, many]. */
function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

const pluralLessons = (n: number) => plural(n, ['урок', 'урока', 'уроков']);
const pluralMaterials = (n: number) => plural(n, ['материал', 'материала', 'материалов']);
const pluralStudents = (n: number) => plural(n, ['ученик', 'ученика', 'учеников']);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
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
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  oldPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  free: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16a34a',
  },
  rating: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f59e0b',
  },
  ratingCount: {
    fontWeight: '400',
    color: '#9ca3af',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eceef1',
    borderRadius: 12,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  accessChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  accessChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  buyButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  lessonRowActive: {
    backgroundColor: '#eff6ff',
  },
  lessonIndex: {
    width: 24,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
  },
  lessonBody: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 15,
    color: '#111827',
  },
  lessonIcon: {
    fontSize: 16,
    color: '#6b7280',
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
