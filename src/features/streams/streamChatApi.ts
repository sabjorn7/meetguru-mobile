import { supabase } from '@/lib/supabase';

// Viewer/host chat for a stream. Mirrors the site's streamsApi chat helpers. RLS is off
// project-wide, so the anon/authenticated client reads & writes directly; access (read + write)
// is gated in the UI by the same access check used for the stream itself.

export type StreamMessageAuthor = { id: string; Name: string | null; Photo: string | null };

export type StreamMessage = {
  id: string;
  created_at: string;
  text: string | null;
  img: string[] | null;
  owner: string | null;
  stream: string;
  authorUser: StreamMessageAuthor | null;
};

/** Attach each message's author (Name/Photo) via one batched users lookup. */
async function attachMessageAuthors(
  rows: Omit<StreamMessage, 'authorUser'>[],
): Promise<StreamMessage[]> {
  const ids = [...new Set(rows.map((r) => r.owner).filter((v): v is string => !!v))];
  let byId: Record<string, StreamMessageAuthor> = {};
  if (ids.length) {
    const { data } = await supabase.from('users').select('id,Name,Photo').in('id', ids);
    byId = Object.fromEntries((data ?? []).map((u) => [u.id, u as StreamMessageAuthor]));
  }
  return rows.map((r) => ({ ...r, authorUser: r.owner ? (byId[r.owner] ?? null) : null }));
}

/** Messages of a stream's chat (oldest first), with authors attached. */
export async function listStreamMessages(
  streamId: string,
  { limit = 200 }: { limit?: number } = {},
): Promise<StreamMessage[]> {
  const { data, error } = await supabase
    .from('stream_chat')
    .select('id, created_at, text, img, owner, stream')
    .eq('stream', streamId)
    .neq('deleted', true)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Не удалось загрузить чат: ${error.message}`);
  return attachMessageAuthors((data ?? []) as Omit<StreamMessage, 'authorUser'>[]);
}

/** Post a message to a stream's chat. */
export async function sendStreamMessage(input: {
  stream: string;
  owner: string;
  text: string;
  img?: string[];
}): Promise<void> {
  const clean = input.text.trim();
  if (!clean && !(input.img && input.img.length)) throw new Error('Пустое сообщение.');
  const { error } = await supabase
    .from('stream_chat')
    .insert({ stream: input.stream, owner: input.owner, text: clean, img: input.img ?? [] });
  if (error) throw new Error(`Не удалось отправить сообщение: ${error.message}`);
}

/** Soft-delete a message (author of the message or of the stream — enforced by the UI). */
export async function deleteStreamMessage(id: string): Promise<void> {
  const { error } = await supabase.from('stream_chat').update({ deleted: true }).eq('id', id);
  if (error) throw new Error(`Не удалось удалить сообщение: ${error.message}`);
}
