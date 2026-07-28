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
