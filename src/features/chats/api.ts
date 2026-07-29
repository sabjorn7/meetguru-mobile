import { supabase } from '@/lib/supabase';

/** A chat summarised for the list screen. */
export type ChatListItem = {
  id: string;
  title: string;
  photo: string | null;
  isGroup: boolean;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  unread: boolean;
};

/** A message with its author's name/photo resolved. */
export type ChatMessage = {
  id: string;
  text: string;
  createdAt: string;
  creatorId: string | null;
  authorName: string | null;
  authorPhoto: string | null;
};

/**
 * Fetch the current user's chats, newest activity first, with previews and
 * unread flags. Assembled server-side in one RPC call (scales to users with
 * many chats — the old client fan-out overflowed the request URL past ~100).
 */
export async function fetchChats(userId: string): Promise<ChatListItem[]> {
  const { data, error } = await supabase.rpc('get_user_chats', { p_user_id: userId });
  if (error) throw error;
  return (data ?? []) as unknown as ChatListItem[];
}

/** Fetch all messages of a chat (oldest first) with author name/photo. */
export async function fetchMessages(chatId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id,text,created_at,creator')
    .eq('chat', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const creatorIds = [...new Set(rows.map((r) => r.creator).filter((c): c is string => c != null))];
  const authors = new Map<string, { Name: string | null; Photo: string | null }>();
  if (creatorIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id,Name,Photo')
      .in('id', creatorIds);
    if (usersError) throw usersError;
    (users ?? []).forEach((u) => authors.set(u.id, { Name: u.Name, Photo: u.Photo }));
  }

  return rows.map((r) => {
    const author = r.creator ? authors.get(r.creator) : undefined;
    return {
      id: r.id,
      text: r.text ?? '',
      createdAt: r.created_at,
      creatorId: r.creator,
      authorName: author?.Name ?? null,
      authorPhoto: author?.Photo ?? null,
    };
  });
}

/**
 * Send a message. Inserts into `messages`; DB triggers reset the chat's unread
 * state and bump its sort order. Returns the inserted row's id.
 */
export async function sendMessage(
  chatId: string,
  text: string,
  creatorId: string,
  recipientId: string | null,
): Promise<string> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat: chatId, text, creator: creatorId, user_2: recipientId })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/** A chat participant. */
export type ChatMember = {
  id: string;
  name: string | null;
  photo: string | null;
  email: string;
  role: string | null;
};

/** Fetch the participants of a chat (from its `users` array). */
export async function fetchChatMembers(chatId: string): Promise<ChatMember[]> {
  const { data: chat, error } = await supabase
    .from('chats')
    .select('users')
    .eq('id', chatId)
    .maybeSingle();
  if (error) throw error;

  const ids = (chat?.users ?? []).filter((id): id is string => typeof id === 'string');
  if (ids.length === 0) return [];

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id,Name,Photo,email,role')
    .in('id', ids);
  if (usersError) throw usersError;

  return (users ?? []).map((u) => ({
    id: u.id,
    name: u.Name,
    photo: u.Photo,
    email: u.email,
    role: u.role,
  }));
}

/** A user matched by the new-chat search. */
export type UserSearchResult = {
  id: string;
  name: string | null;
  photo: string | null;
  email: string;
};

/** Search users by name or email (excluding the current user). */
export async function searchUsers(query: string, excludeId: string): Promise<UserSearchResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const pattern = `%${term}%`;
  const { data, error } = await supabase
    .from('users')
    .select('id,Name,Photo,email')
    .or(`Name.ilike.${pattern},email.ilike.${pattern}`)
    .neq('id', excludeId)
    .limit(20);

  if (error) throw error;
  return (data ?? []).map((u) => ({ id: u.id, name: u.Name, photo: u.Photo, email: u.email }));
}

/**
 * Return the existing 1:1 chat between the two users, or create one.
 * A DB trigger appends the new chat id to each member's `users.chats`.
 */
export async function findOrCreateDirectChat(meId: string, otherId: string): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from('chats')
    .select('id,users')
    .eq('is_group', false)
    .contains('users', [meId, otherId]);
  if (findError) throw findError;

  const match = (existing ?? []).find((c) => (c.users?.length ?? 0) === 2);
  if (match) return match.id;

  const { data, error } = await supabase
    .from('chats')
    .insert({
      // is_group is a generated column (>2 users) — must not be set explicitly.
      users: [meId, otherId],
      user_1: meId,
      user_2: otherId,
      read: [meId],
      sort_date: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Create a group chat (>2 members). `is_group` is generated from member count,
 * so it must not be set. The trigger syncs each member's `users.chats`.
 */
export async function createGroupChat(
  meId: string,
  otherIds: string[],
  title: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('chats')
    .insert({
      users: [meId, ...otherIds],
      title: title.trim(),
      creator: meId,
      read: [meId],
      sort_date: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Delete a chat for everyone. A BEFORE DELETE trigger removes its messages and
 * unlinks it from each member's `users.chats`.
 */
export async function deleteChat(chatId: string): Promise<void> {
  const { error } = await supabase.from('chats').delete().eq('id', chatId);
  if (error) throw error;
}

/** Mark a chat as read by the current user (idempotent RPC). */
export async function markChatRead(chatId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('add_user_to_chat_read', {
    p_chat_id: chatId,
    p_user_id: userId,
  });
  if (error) throw error;
}
