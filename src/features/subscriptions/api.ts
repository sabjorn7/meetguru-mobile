import { roleLabel, type ProfileListItem } from '@/features/profile/api';
import { supabase } from '@/lib/supabase';

/** Roles that can be followed (mirrors the site: only speakers / institutions). */
export const SUBSCRIBABLE_ROLES = ['Спикер', 'Учебное заведение'] as const;

/** Whether a profile with this role can be subscribed to. */
export function isSubscribableRole(role: string | null | undefined): boolean {
  return role != null && (SUBSCRIBABLE_ROLES as readonly string[]).includes(role);
}

/** Whether `subscriberId` currently follows `targetId`. */
export async function isSubscribed(subscriberId: string, targetId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('subscriber', subscriberId)
    .eq('target', targetId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** Follow a target. Idempotent — a duplicate (subscriber,target) is ignored. */
export async function subscribe(subscriberId: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      { subscriber: subscriberId, target: targetId },
      { onConflict: 'subscriber,target', ignoreDuplicates: true },
    );
  if (error) throw error;
}

/** Unfollow a target (no-op if not subscribed). */
export async function unsubscribe(subscriberId: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('subscriber', subscriberId)
    .eq('target', targetId);
  if (error) throw error;
}

/** Number of followers of `targetId`. */
export async function subscriberCount(targetId: string): Promise<number> {
  const { count, error } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('target', targetId);
  if (error) throw error;
  return count ?? 0;
}

/** Resolve a set of user ids to directory rows, preserving the given order. */
async function fetchProfilesByIds(ids: string[]): Promise<ProfileListItem[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('users')
    .select('id,Name,Photo,role,Description')
    .in('id', ids);
  if (error) throw error;

  const byId = new Map(
    (data ?? []).map((u) => [
      u.id,
      {
        id: u.id,
        name: u.Name,
        photo: u.Photo,
        role: roleLabel(u.role),
        description: u.Description,
      } satisfies ProfileListItem,
    ]),
  );
  return ids.map((id) => byId.get(id)).filter((p): p is ProfileListItem => p != null);
}

/** People `subscriberId` follows, newest first. */
export async function fetchMySubscriptions(subscriberId: string): Promise<ProfileListItem[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('target,created_at')
    .eq('subscriber', subscriberId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return fetchProfilesByIds((data ?? []).map((r) => r.target));
}

/** People who follow `targetId`, newest first. */
export async function fetchSubscribers(targetId: string): Promise<ProfileListItem[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('subscriber,created_at')
    .eq('target', targetId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return fetchProfilesByIds((data ?? []).map((r) => r.subscriber));
}
