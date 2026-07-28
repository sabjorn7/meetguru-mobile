import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

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
>;

const DETAIL_COLUMNS =
  'id,Title,Decription,WhatTeach,For,slug,video_id,Price,old_price,Free,Category,rating' as const;

/** One lesson in a course. */
export type LessonItem = Pick<Tables<'lessons'>, 'id' | 'Title' | 'Descr' | 'video_id'>;

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
    .select('id,Title,Descr,video_id')
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
