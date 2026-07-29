import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

/** Article fields for the catalog list. */
export type ArticleListItem = Pick<
  Tables<'articles'>,
  'id' | 'Title' | 'Image' | 'Category' | 'Publish_date' | 'created_at' | 'Rating' | 'slug'
>;

const LIST_COLUMNS = 'id,Title,Image,Category,Publish_date,created_at,Rating,slug' as const;

/** Full article for the detail screen. */
export type ArticleDetail = Pick<
  Tables<'articles'>,
  | 'id'
  | 'Title'
  | 'Content'
  | 'Image'
  | 'Category'
  | 'Publish_date'
  | 'created_at'
  | 'Rating'
  | 'Creator'
  | 'video_id'
  | 'slug'
>;

const DETAIL_COLUMNS =
  'id,Title,Content,Image,Category,Publish_date,created_at,Rating,Creator,video_id,slug' as const;

/** Article author (subset of users). */
export type ArticleAuthor = Pick<Tables<'users'>, 'id' | 'Name' | 'Photo'>;

/** A comment with its author's name/photo joined in. */
export type ArticleComment = {
  id: string;
  text: string;
  created_at: string;
  authorName: string | null;
  authorPhoto: string | null;
};

/** Published articles, newest first (Publish_date, falling back to created_at). */
export async function fetchArticles(): Promise<ArticleListItem[]> {
  const { data, error } = await supabase
    .from('articles')
    .select(LIST_COLUMNS)
    .eq('Status', 'Опубликовано')
    .not('slug', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Published articles authored by a user — the profile "Статьи" section. */
export async function fetchArticlesByAuthor(userId: string): Promise<ArticleListItem[]> {
  const { data, error } = await supabase
    .from('articles')
    .select(LIST_COLUMNS)
    .eq('Creator', userId)
    .eq('Status', 'Опубликовано')
    .not('slug', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return data ?? [];
}

/** Fetch one published article by slug, or null. */
export async function fetchArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const { data, error } = await supabase
    .from('articles')
    .select(DETAIL_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Fetch an article author by id, or null. */
export async function fetchArticleAuthor(creatorId: string): Promise<ArticleAuthor | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id,Name,Photo')
    .eq('id', creatorId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Non-deleted comments for an article with author name/photo, oldest first. */
export async function fetchArticleComments(articleId: string): Promise<ArticleComment[]> {
  const { data, error } = await supabase
    .from('article_comments')
    .select('id,text,created_at,creator')
    .eq('article', articleId)
    .eq('delete', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const creatorIds = [...new Set(rows.map((r) => r.creator).filter((c): c is string => c != null))];
  const authors = new Map<string, ArticleAuthor>();
  if (creatorIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id,Name,Photo')
      .in('id', creatorIds);
    if (usersError) throw usersError;
    (users ?? []).forEach((u) => authors.set(u.id, u));
  }

  return rows
    .filter((r) => (r.text ?? '').trim().length > 0)
    .map((r) => {
      const author = r.creator ? authors.get(r.creator) : undefined;
      return {
        id: r.id,
        text: r.text ?? '',
        created_at: r.created_at,
        authorName: author?.Name ?? null,
        authorPhoto: author?.Photo ?? null,
      };
    });
}

/** Add a comment to an article (its detail screen reads from article_comments). */
export async function submitArticleComment(
  articleId: string,
  userId: string,
  text: string,
): Promise<void> {
  const { error } = await supabase
    .from('article_comments')
    .insert({ article: articleId, creator: userId, text: text.trim(), delete: false });
  if (error) throw error;
}

/** Whether the current user has already rated an article (rating is append-only). */
export async function hasRatedArticle(articleId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('articles_rating')
    .select('id')
    .eq('article', articleId)
    .eq('author', userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** Rate an article once. Inserts into articles_rating; a trigger appends to articles.Rating. */
export async function submitArticleRating(
  articleId: string,
  userId: string,
  rating: number,
): Promise<void> {
  const { error } = await supabase
    .from('articles_rating')
    .insert({ article: articleId, author: userId, rating });
  if (error) throw error;
}

/** Average of the `Rating` numeric array, or null when empty. */
export function averageArticleRating(rating: ArticleListItem['Rating']): number | null {
  if (!Array.isArray(rating) || rating.length === 0) return null;
  const values = rating.filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return null;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}
