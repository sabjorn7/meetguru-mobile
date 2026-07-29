import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

/** Public web URL of a club (opened in the browser for subscribe/manage — never in-app). */
export function clubSiteUrl(clubId: string): string {
  return `https://app.meetgu.ru/club?club=${clubId}`;
}

/** Today as YYYY-MM-DD, for comparing against club_subs.end_date (a date). */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Format a timestamp as DD.MM.YY HH:mm (mirrors the site's post/chat dates). */
export function formatClubDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export type ClubAccessStatus = 'owner' | 'active' | 'expired' | 'none';

/** A club in the "My clubs" list. */
export type ClubListItem = {
  id: string;
  title: string | null;
  shortDescr: string | null;
  cover: string | null; // clubs.label
  ownerId: string | null;
  subscriberCount: number;
  postCount: number;
  status: ClubAccessStatus;
};

/** Full club for the detail screen, with its owner's name/photo. */
export type ClubDetail = {
  id: string;
  title: string | null;
  shortDescr: string | null;
  descr: string | null;
  cover: string | null;
  price: number | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerPhoto: string | null;
};

/** The current user's subscription to a club (null if none). */
export type ClubSub = { active: boolean; endDate: string | null };

/** A post in a club feed (author is the club owner). */
export type ClubPost = {
  id: string;
  createdAt: string;
  text: string | null;
  photos: string[];
  video: string | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

/** A comment under a club post. */
export type ClubComment = {
  id: string;
  text: string;
  createdAt: string;
  authorName: string | null;
  authorPhoto: string | null;
};

/** A message in the club group chat. */
export type ClubChatMessage = {
  id: string;
  createdAt: string;
  text: string | null;
  images: string[];
  authorId: string | null;
  authorName: string | null;
  authorPhoto: string | null;
};

type LikeEntry = { id: string; date?: string | null };

function likeArray(likes: Tables<'club_posts'>['likes']): LikeEntry[] {
  return Array.isArray(likes) ? likes.filter((l): l is LikeEntry => !!l && typeof l.id === 'string') : [];
}

/** Whether a user may read a club's gated content. */
export function clubHasAccess(ownerId: string | null, sub: ClubSub | null, userId: string): boolean {
  if (ownerId && ownerId === userId) return true;
  if (!sub || !sub.active) return false;
  if (sub.endDate == null) return true;
  return sub.endDate >= todayISO();
}

/** Clubs the user can see: those they subscribe to (any state) or own. */
export async function fetchMyClubs(userId: string): Promise<ClubListItem[]> {
  const today = todayISO();

  const [{ data: mySubs, error: subErr }, { data: owned, error: ownErr }] = await Promise.all([
    supabase.from('club_subs').select('club,active,end_date').eq('suber', userId),
    supabase.from('clubs').select('id').eq('owner', userId),
  ]);
  if (subErr) throw subErr;
  if (ownErr) throw ownErr;

  const subByClub = new Map<string, ClubSub>();
  for (const s of mySubs ?? []) {
    if (s.club) subByClub.set(s.club, { active: !!s.active, endDate: s.end_date ?? null });
  }
  const ownedIds = new Set((owned ?? []).map((c) => c.id));
  const ids = [...new Set([...subByClub.keys(), ...ownedIds])];
  if (ids.length === 0) return [];

  const [{ data: clubs, error: clubErr }, { data: subRows }, { data: postRows }] = await Promise.all([
    supabase.from('clubs').select('id,title,short_descr,label,owner').in('id', ids),
    supabase.from('club_subs').select('club').in('club', ids).eq('active', true),
    supabase.from('club_posts').select('club').in('club', ids),
  ]);
  if (clubErr) throw clubErr;

  const subCount = new Map<string, number>();
  for (const r of subRows ?? []) if (r.club) subCount.set(r.club, (subCount.get(r.club) ?? 0) + 1);
  const postCount = new Map<string, number>();
  for (const r of postRows ?? []) if (r.club) postCount.set(r.club, (postCount.get(r.club) ?? 0) + 1);

  const statusFor = (clubId: string, ownerId: string | null): ClubAccessStatus => {
    if (ownerId === userId) return 'owner';
    const s = subByClub.get(clubId);
    if (!s || !s.active) return 'none';
    if (s.endDate == null || s.endDate >= today) return 'active';
    return 'expired';
  };

  return (clubs ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    shortDescr: c.short_descr,
    cover: c.label,
    ownerId: c.owner,
    subscriberCount: subCount.get(c.id) ?? 0,
    postCount: postCount.get(c.id) ?? 0,
    status: statusFor(c.id, c.owner),
  }));
}

/** Fetch a club + its owner's name/photo. */
export async function fetchClub(clubId: string): Promise<ClubDetail | null> {
  const { data, error } = await supabase
    .from('clubs')
    .select('id,title,short_descr,descr,label,price,owner')
    .eq('id', clubId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  let ownerName: string | null = null;
  let ownerPhoto: string | null = null;
  if (data.owner) {
    const { data: u } = await supabase.from('users').select('Name,Photo').eq('id', data.owner).maybeSingle();
    ownerName = u?.Name ?? null;
    ownerPhoto = u?.Photo ?? null;
  }
  return {
    id: data.id,
    title: data.title,
    shortDescr: data.short_descr,
    descr: data.descr,
    cover: data.label,
    price: data.price,
    ownerId: data.owner,
    ownerName,
    ownerPhoto,
  };
}

/** The current user's subscription row for a club, or null. */
export async function fetchMyClubSub(clubId: string, userId: string): Promise<ClubSub | null> {
  const { data, error } = await supabase
    .from('club_subs')
    .select('active,end_date')
    .eq('club', clubId)
    .eq('suber', userId)
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { active: !!data.active, endDate: data.end_date ?? null };
}

/** Posts of a club, newest first, with like/comment counts for the given user. */
export async function fetchClubPosts(clubId: string, userId: string): Promise<ClubPost[]> {
  const { data, error } = await supabase
    .from('club_posts')
    .select('id,created_at,text,photos,video,likes')
    .eq('club', clubId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: comments } = await supabase
    .from('club_posts_comments')
    .select('club_post')
    .in('club_post', ids);
  const commentCount = new Map<string, number>();
  for (const c of comments ?? []) {
    if (c.club_post) commentCount.set(c.club_post, (commentCount.get(c.club_post) ?? 0) + 1);
  }

  return rows.map((r) => {
    const likes = likeArray(r.likes);
    return {
      id: r.id,
      createdAt: r.created_at,
      text: r.text,
      photos: r.photos ?? [],
      video: r.video,
      likeCount: likes.length,
      likedByMe: likes.some((l) => l.id === userId),
      commentCount: commentCount.get(r.id) ?? 0,
    };
  });
}

/** Toggle the current user's like on a post (read-modify-write of club_posts.likes). */
export async function toggleLike(postId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  const { data, error } = await supabase.from('club_posts').select('likes').eq('id', postId).maybeSingle();
  if (error) throw error;
  const current = likeArray(data?.likes ?? null);
  const has = current.some((l) => l.id === userId);
  const next = has
    ? current.filter((l) => l.id !== userId)
    : [...current, { id: userId, date: new Date().toISOString() }];

  const { error: upErr } = await supabase.from('club_posts').update({ likes: next }).eq('id', postId);
  if (upErr) throw upErr;
  return { liked: !has, count: next.length };
}

/** Comments under a post, oldest first, with author name/photo. */
export async function fetchPostComments(postId: string): Promise<ClubComment[]> {
  const { data, error } = await supabase
    .from('club_posts_comments')
    .select('id,text,created_at,onwer')
    .eq('club_post', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const authorIds = [...new Set(rows.map((r) => r.onwer).filter((o): o is string => o != null))];
  const authors = new Map<string, { Name: string | null; Photo: string | null }>();
  if (authorIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id,Name,Photo').in('id', authorIds);
    (users ?? []).forEach((u) => authors.set(u.id, u));
  }

  return rows
    .filter((r) => (r.text ?? '').trim().length > 0)
    .map((r) => {
      const a = r.onwer ? authors.get(r.onwer) : undefined;
      return {
        id: r.id,
        text: r.text ?? '',
        createdAt: r.created_at,
        authorName: a?.Name ?? null,
        authorPhoto: a?.Photo ?? null,
      };
    });
}

/** Post a comment on a club post. */
export async function submitComment(postId: string, userId: string, text: string): Promise<void> {
  const { error } = await supabase
    .from('club_posts_comments')
    .insert({ club_post: postId, onwer: userId, text: text.trim() });
  if (error) throw error;
}

/** Club group-chat messages (non-deleted), oldest first, with author name/photo. */
export async function fetchClubChat(clubId: string): Promise<ClubChatMessage[]> {
  const { data, error } = await supabase
    .from('club_chat')
    .select('id,created_at,text,img,owner')
    .eq('club', clubId)
    .eq('deleted', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const authorIds = [...new Set(rows.map((r) => r.owner).filter((o): o is string => o != null))];
  const authors = new Map<string, { Name: string | null; Photo: string | null }>();
  if (authorIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id,Name,Photo').in('id', authorIds);
    (users ?? []).forEach((u) => authors.set(u.id, u));
  }

  return rows.map((r) => {
    const a = r.owner ? authors.get(r.owner) : undefined;
    return {
      id: r.id,
      createdAt: r.created_at,
      text: r.text,
      images: r.img ?? [],
      authorId: r.owner,
      authorName: a?.Name ?? null,
      authorPhoto: a?.Photo ?? null,
    };
  });
}

/** Send a message to the club group chat. */
export async function sendClubChat(clubId: string, userId: string, text: string): Promise<void> {
  const { error } = await supabase
    .from('club_chat')
    .insert({ club: clubId, owner: userId, text: text.trim(), deleted: false });
  if (error) throw error;
}
