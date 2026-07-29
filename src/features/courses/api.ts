import { supabase } from '@/lib/supabase';
import type { Json, Tables } from '@/types/database';

/** Columns the catalog list needs — mirrors the website's course query. */
const LIST_COLUMNS =
  'id,Title,Decription,slug,video_id,Price,old_price,Free,Category,rating' as const;

/** A course row trimmed to the fields used by the list screen. */
export type CourseListItem = Pick<
  Tables<'course'>,
  | 'id'
  | 'Title'
  | 'Decription'
  | 'slug'
  | 'video_id'
  | 'Price'
  | 'old_price'
  | 'Free'
  | 'Category'
  | 'rating'
>;

/** One entry in the `course.rating` jsonb array. */
type RatingEntry = { rating?: number; user_id?: string; date?: string };

/**
 * Fetch published courses for the catalog. Same filter the web app uses:
 * only moderated-published rows that have a slug, newest first.
 */
export async function fetchCourses(): Promise<CourseListItem[]> {
  const { data, error } = await supabase
    .from('course')
    .select(LIST_COLUMNS)
    .eq('ModStatus', 'Опубликовано')
    .not('slug', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Full course row for the detail screen. */
export type CourseDetail = Pick<
  Tables<'course'>,
  | 'id'
  | 'Title'
  | 'Decription'
  | 'WhatTeach'
  | 'For'
  | 'slug'
  | 'video_id'
  | 'Price'
  | 'old_price'
  | 'Free'
  | 'Category'
  | 'rating'
  | 'comment'
  | 'DurationLong'
>;

const DETAIL_COLUMNS =
  'id,Title,Decription,WhatTeach,For,slug,video_id,Price,old_price,Free,Category,rating,comment,DurationLong' as const;

/** One lesson in a course. `File` is a single downloadable material URL, if any. */
export type LessonItem = Pick<Tables<'lessons'>, 'id' | 'Title' | 'Descr' | 'video_id' | 'File'>;

/** A user review from the `course.comment` jsonb array. */
export type CourseReview = {
  user_id: string;
  name: string | null;
  photo: string | null;
  comment: string;
  date: string | null;
};

/** Fetch a single published course by its slug, or null if not found. */
export async function fetchCourseBySlug(slug: string): Promise<CourseDetail | null> {
  const { data, error } = await supabase
    .from('course')
    .select(DETAIL_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Fetch a course's lessons in display order (mirrors get_course_data ordering). */
export async function fetchCourseLessons(courseId: string): Promise<LessonItem[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id,Title,Descr,video_id,File')
    .eq('Course', courseId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Whether the current user has access to a course. Mirrors the web app: access
 * is granted by the presence of a `user_course` row for (user, course). Free
 * courses are treated as accessible even without a row.
 */
export async function checkCourseAccess(
  courseId: string,
  userId: string,
  isFree: boolean,
): Promise<boolean> {
  if (isFree) return true;

  const { data, error } = await supabase
    .from('user_course')
    .select('id')
    .eq('course', courseId)
    .eq('user', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

/** Number of enrolled students (rows in user_course for the course). */
export async function fetchStudentsCount(courseId: string): Promise<number> {
  const { count, error } = await supabase
    .from('user_course')
    .select('id', { count: 'exact', head: true })
    .eq('course', courseId);

  if (error) throw error;
  return count ?? 0;
}

/** Parse the `course.comment` jsonb array into typed reviews (newest first). */
export function parseReviews(comment: CourseDetail['comment']): CourseReview[] {
  if (!Array.isArray(comment)) return [];
  return (comment as Record<string, unknown>[])
    .filter((entry) => typeof entry?.comment === 'string' && entry.comment.trim().length > 0)
    .map((entry) => ({
      user_id: String(entry.user_id ?? ''),
      name: typeof entry.name === 'string' ? entry.name : null,
      photo: typeof entry.photo === 'string' ? entry.photo : null,
      comment: String(entry.comment),
      date: typeof entry.date === 'string' ? entry.date : null,
    }))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

/** Count of ratings in the `rating` jsonb array. */
export function ratingCount(rating: CourseDetail['rating']): number {
  return Array.isArray(rating) ? rating.length : 0;
}

/**
 * Human-readable access format. Mirrors the web app: DurationLong is the access
 * length in months; 0 means unlimited.
 */
export function accessFormatLabel(durationLong: number | null): string {
  return durationLong && durationLong > 0
    ? `Доступ на ${durationLong} мес.`
    : 'Доступ без ограничения по времени';
}

/** Fetch specific courses by id, preserving the given order. Used by "My courses". */
export async function fetchCoursesByIds(ids: string[]): Promise<CourseListItem[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from('course').select(LIST_COLUMNS).in('id', ids);
  if (error) throw error;

  const byId = new Map((data ?? []).map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is CourseListItem => c != null);
}

/** The current user's own rating for a course, or null if they haven't rated. */
export function myCourseRating(
  rating: CourseListItem['rating'],
  userId: string,
): number | null {
  if (!Array.isArray(rating)) return null;
  const mine = (rating as RatingEntry[]).find((e) => e?.user_id === userId);
  return typeof mine?.rating === 'number' ? mine.rating : null;
}

/** Add or replace the current user's rating for a course (read-modify-write jsonb). */
export async function submitCourseRating(
  courseId: string,
  userId: string,
  rating: number,
): Promise<void> {
  const { data, error } = await supabase
    .from('course')
    .select('rating')
    .eq('id', courseId)
    .single();
  if (error) throw error;

  const current = Array.isArray(data.rating) ? (data.rating as RatingEntry[]) : [];
  const next = current.filter((e) => e?.user_id !== userId);
  next.push({ rating, user_id: userId, date: new Date().toISOString() });

  const { error: updateError } = await supabase
    .from('course')
    .update({ rating: next })
    .eq('id', courseId);
  if (updateError) throw updateError;
}

/** Append the current user's review to a course (read-modify-write jsonb). */
export async function submitCourseReview(
  courseId: string,
  userId: string,
  text: string,
): Promise<void> {
  const [{ data, error }, { data: author }] = await Promise.all([
    supabase.from('course').select('comment').eq('id', courseId).single(),
    supabase.from('users').select('Name,Photo').eq('id', userId).maybeSingle(),
  ]);
  if (error) throw error;

  const current = Array.isArray(data.comment) ? (data.comment as Json[]) : [];
  const next: Json[] = [
    ...current,
    {
      user_id: userId,
      name: author?.Name ?? null,
      photo: author?.Photo ?? null,
      comment: text.trim(),
      date: new Date().toISOString(),
    },
  ];

  const { error: updateError } = await supabase
    .from('course')
    .update({ comment: next })
    .eq('id', courseId);
  if (updateError) throw updateError;
}

/**
 * Whether the user is a member of the course — has a `user_course` row (bought,
 * or added a free course). Unlike `checkCourseAccess`, free courses do NOT count
 * without a row. Used to gate leaving a review (parity with the website).
 */
export async function hasCourseMembership(courseId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_course')
    .select('id')
    .eq('course', courseId)
    .eq('user', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

/** Average of the `rating` jsonb array, or null when there are no ratings. */
export function averageRating(rating: CourseListItem['rating']): number | null {
  if (!Array.isArray(rating) || rating.length === 0) return null;
  const values = (rating as RatingEntry[])
    .map((entry) => entry?.rating)
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}
