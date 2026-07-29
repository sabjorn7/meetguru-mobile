import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { RatingInput } from '@/components/RatingInput';
import { AppText, Card, PillButton, SegmentedTabs } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import {
  accessFormatLabel,
  averageRating,
  myCourseRating,
  parseReviews,
  ratingCount,
  submitCourseRating,
  submitCourseReview,
  type LessonItem,
} from '@/features/courses/api';
import { CourseReviews } from '@/features/courses/CourseReviews';
import { useCourseDetail } from '@/features/courses/useCourseDetail';
import { DownloadButton } from '@/features/offline/DownloadButton';
import { PeerTubePlayer } from '@/features/video/PeerTubePlayer';
import { errorMessage } from '@/lib/errors';
import { colors, radius, spacing } from '@/theme';

const WEB_ORIGIN = 'https://app.meetgu.ru';
const priceFormatter = new Intl.NumberFormat('ru-RU');

function formatPrice(value: number | null): string {
  return `${priceFormatter.format(value ?? 0)} ₽`;
}

type Tab = 'lessons' | 'about';

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { course, lessons, studentsCount, hasAccess, canReview, notFound, loading, error, refreshAccess, reload } =
    useCourseDetail(slug);
  const { user } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('lessons');
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleRate = useCallback(
    async (value: number) => {
      if (!course || !user || submittingRating) return;
      setSubmittingRating(true);
      try {
        await submitCourseRating(course.id, user.id, value);
        reload();
      } catch (e) {
        Alert.alert('Ошибка', errorMessage(e, 'Не удалось сохранить оценку.'));
      } finally {
        setSubmittingRating(false);
      }
    },
    [course, user, submittingRating, reload],
  );

  const handleReview = useCallback(async () => {
    if (!course || !user || submittingReview) return;
    const t = reviewText.trim();
    if (!t) return;
    setSubmittingReview(true);
    try {
      await submitCourseReview(course.id, user.id, t);
      setReviewText('');
      reload();
    } catch (e) {
      Alert.alert('Ошибка', errorMessage(e, 'Не удалось отправить отзыв.'));
    } finally {
      setSubmittingReview(false);
    }
  }, [course, user, reviewText, submittingReview, reload]);

  const isFree = course ? course.Free === true || (course.Price ?? 0) === 0 : false;
  const rating = course ? averageRating(course.rating) : null;

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
    refreshAccess();
  }, [slug, refreshAccess]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Курс' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Курс' }} />
        <AppText variant="body" style={{ color: colors.muted }}>
          Курс не найден
        </AppText>
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Курс' }} />
        <AppText variant="body" style={{ color: colors.danger }}>
          {error ?? 'Не удалось загрузить курс.'}
        </AppText>
      </View>
    );
  }

  const reviews = parseReviews(course.comment);
  const ratingsTotal = ratingCount(course.rating);
  const materialsCount = lessons.filter((l) => (l.File ?? '').trim().length > 0).length;
  const myRating = user ? myCourseRating(course.rating, user.id) : null;

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: course.Title ?? 'Курс' }} />

      <Card style={styles.playerCard} elevated>
        <PeerTubePlayer videoId={playingVideoId} />
      </Card>

      {course.Category ? (
        <AppText variant="label" style={styles.category}>
          {course.Category.toUpperCase()}
        </AppText>
      ) : null}
      <AppText variant="h2">{course.Title ?? 'Без названия'}</AppText>

      <View style={styles.metaRow}>
        {isFree ? (
          <View style={styles.freeBadge}>
            <AppText variant="label" style={{ color: colors.success }}>
              Бесплатно
            </AppText>
          </View>
        ) : (
          <View style={styles.priceRow}>
            <AppText variant="title" style={{ color: colors.primary }}>
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
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={15} color={colors.amber} />
            <AppText variant="subtitle">{rating.toFixed(1)}</AppText>
            {ratingsTotal > 0 ? (
              <AppText variant="caption" style={{ color: colors.faint }}>
                ({ratingsTotal})
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>

      <Card style={styles.statsCard} elevated={false}>
        <Stat value={lessons.length} label={pluralLessons(lessons.length)} icon="play-circle" />
        <View style={styles.statDivider} />
        <Stat value={materialsCount} label={pluralMaterials(materialsCount)} icon="document-text" />
        <View style={styles.statDivider} />
        <Stat value={studentsCount} label={pluralStudents(studentsCount)} icon="people" />
      </Card>

      <View style={styles.accessChip}>
        <Ionicons name="time-outline" size={14} color={colors.muted} />
        <AppText variant="caption">{accessFormatLabel(course.DurationLong)}</AppText>
      </View>

      {!hasAccess && !isFree ? (
        <PillButton label={`Купить за ${formatPrice(course.Price)}`} onPress={handleBuy} />
      ) : null}

      <SegmentedTabs
        options={[
          { value: 'lessons', label: `Уроки${lessons.length ? ` (${lessons.length})` : ''}` },
          { value: 'about', label: 'Описание' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'lessons' ? (
        <Card style={styles.listCard} elevated>
          {lessons.length === 0 ? (
            <AppText variant="body" style={{ color: colors.muted }}>
              Уроков пока нет
            </AppText>
          ) : (
            lessons.map((lesson, index) => {
              const locked = !hasAccess;
              const active = lesson.video_id != null && lesson.video_id === playingVideoId;
              return (
                <View
                  key={lesson.id}
                  style={[styles.lessonRow, index > 0 && styles.lessonBorder]}
                >
                  <Pressable
                    style={[
                      styles.lessonCircle,
                      locked ? styles.lessonCircleLocked : active && styles.lessonCircleActive,
                    ]}
                    onPress={() => (locked ? undefined : playLesson(lesson))}
                    disabled={locked || !lesson.video_id}
                  >
                    <Ionicons
                      name={locked ? 'lock-closed' : active ? 'pause' : 'play'}
                      size={15}
                      color={locked ? colors.faint : colors.white}
                    />
                  </Pressable>
                  <View style={styles.lessonBody}>
                    <AppText variant="bodyMedium" numberOfLines={2} style={{ color: colors.ink }}>
                      {index + 1}. {lesson.Title ?? 'Урок'}
                    </AppText>
                  </View>
                  {!locked && lesson.video_id ? (
                    <DownloadButton
                      videoId={lesson.video_id}
                      title={lesson.Title ?? 'Урок'}
                      courseSlug={slug}
                    />
                  ) : null}
                </View>
              );
            })
          )}
        </Card>
      ) : (
        <View style={styles.aboutBlock}>
          {course.Decription ? <AboutBlock title="Описание" body={course.Decription} /> : null}
          {course.WhatTeach ? <AboutBlock title="Чему научитесь" body={course.WhatTeach} /> : null}
          {course.For ? <AboutBlock title="Для кого" body={course.For} /> : null}
          {!course.Decription && !course.WhatTeach && !course.For ? (
            <AppText variant="body" style={{ color: colors.muted }}>
              Описание пока не добавлено
            </AppText>
          ) : null}
        </View>
      )}

      {canReview ? (
        <Card style={styles.reviewCard} elevated>
          <AppText variant="title">Ваша оценка</AppText>
          <RatingInput value={myRating ?? 0} onChange={handleRate} disabled={submittingRating} />
          <TextInput
            style={styles.reviewInput}
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Написать отзыв…"
            placeholderTextColor={colors.faint}
            multiline
          />
          <PillButton
            label="Отправить отзыв"
            onPress={handleReview}
            loading={submittingReview}
            disabled={!reviewText.trim()}
          />
        </Card>
      ) : user ? (
        <Card style={styles.reviewHintCard} elevated={false}>
          <AppText variant="body" style={{ color: colors.muted, textAlign: 'center' }}>
            {isFree
              ? 'Добавьте курс себе, чтобы оценить его и оставить отзыв.'
              : 'Оставить отзыв могут участники курса.'}
          </AppText>
        </Card>
      ) : null}

      {reviews.length > 0 ? (
        <View style={styles.reviewsSection}>
          <AppText variant="title">Отзывы · {reviews.length}</AppText>
          <CourseReviews reviews={reviews} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <AppText variant="subtitle">{value}</AppText>
      <AppText variant="label">{label}</AppText>
    </View>
  );
}

function AboutBlock({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.aboutSection}>
      <AppText variant="title">{title}</AppText>
      <AppText variant="body">{body}</AppText>
    </View>
  );
}

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
  playerCard: {
    overflow: 'hidden',
    padding: 0,
  },
  category: {
    color: colors.primary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  oldPrice: {
    color: colors.faint,
    textDecorationLine: 'line-through',
  },
  freeBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.hairline,
  },
  accessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  listCard: {
    padding: spacing.xs,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  lessonBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  lessonCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonCircleActive: {
    backgroundColor: colors.primaryDark,
  },
  lessonCircleLocked: {
    backgroundColor: colors.primaryTint,
  },
  lessonBody: {
    flex: 1,
  },
  aboutBlock: {
    gap: spacing.lg,
  },
  aboutSection: {
    gap: spacing.sm,
  },
  reviewCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  reviewHintCard: {
    padding: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Raleway_400Regular',
    fontSize: 15,
    color: colors.ink,
    minHeight: 76,
    textAlignVertical: 'top',
  },
  reviewsSection: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
