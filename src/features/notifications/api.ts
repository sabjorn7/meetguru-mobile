import { supabase } from '@/lib/supabase';

/** Persist (or refresh) a device push token for the user. Token is unique. */
export async function savePushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, updated_at: new Date().toISOString() },
      { onConflict: 'token' },
    );
  if (error) throw error;
}

/** Remove a device's token (e.g. on sign-out). Best-effort. */
export async function removePushToken(token: string): Promise<void> {
  await supabase.from('push_tokens').delete().eq('token', token);
}

/** Resolve a course slug from its id — used to deep-link a purchase notification. */
export async function fetchCourseSlugById(courseId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('course')
    .select('slug')
    .eq('id', courseId)
    .maybeSingle();
  if (error) throw error;
  return data?.slug ?? null;
}
