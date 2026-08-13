import { supabase } from '@/lib/supabase';

// UGC moderation: block a user (hide their messages) and report content.
// Backs the Apple 1.2 / Google Play UGC requirements. RLS is off project-wide,
// so the authenticated client writes directly. Tables: see db/moderation.sql.

export type ReportTargetType = 'message' | 'stream' | 'user';

/** Ids of users the given user has blocked (their messages are hidden). */
export async function listBlockedUserIds(blocker: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked')
    .eq('blocker', blocker);
  if (error) throw new Error(`Не удалось загрузить блокировки: ${error.message}`);
  return (data ?? []).map((r) => r.blocked as string);
}

/** Block a user so the blocker stops seeing their messages. Idempotent. */
export async function blockUser(blocker: string, blocked: string): Promise<void> {
  if (!blocker || !blocked || blocker === blocked) return;
  const { error } = await supabase
    .from('user_blocks')
    .upsert({ blocker, blocked }, { onConflict: 'blocker,blocked' });
  if (error) throw new Error(`Не удалось заблокировать пользователя: ${error.message}`);
}

/** File a report on a message, a stream, or a user. */
export async function reportContent(input: {
  reporter: string | null;
  targetType: ReportTargetType;
  targetId: string;
  stream?: string | null;
  reason?: string;
}): Promise<void> {
  const { error } = await supabase.from('stream_reports').insert({
    reporter: input.reporter,
    target_type: input.targetType,
    target_id: input.targetId,
    stream: input.stream ?? null,
    reason: input.reason ?? null,
  });
  if (error) throw new Error(`Не удалось отправить жалобу: ${error.message}`);
}
