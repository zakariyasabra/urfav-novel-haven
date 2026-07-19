// Messaging — provider-agnostic client contract.
// Every state change goes through an RPC; the frontend can be added later
// without changing this file.

import { supabase } from "@/integrations/supabase/client";

export type ConversationKind = "dm" | "author_reader" | "admin_user" | "support";
export type MessageKind = "text" | "system" | "attachment";

export interface ConversationSummary {
  conversation_id: string;
  kind: ConversationKind;
  subject: string | null;
  last_message_at: string | null;
  last_body: string | null;
  last_sender_id: string | null;
  unread_count: number;
  archived: boolean;
  muted: boolean;
}

export interface Message {
  id: string;
  sender_id: string | null;
  kind: MessageKind;
  body: string | null;
  meta: Record<string, unknown>;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

// ── Conversations ──────────────────────────────────────────────────────────
export async function startDm(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc("msg_start_dm", { _other_user_id: otherUserId });
  if (error) throw error;
  return data as string;
}

export async function adminOpenConversation(userId: string, subject?: string): Promise<string> {
  const { data, error } = await supabase.rpc("msg_admin_open_with_user", {
    _user_id: userId, _subject: subject ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function listConversations(includeArchived = false, limit = 50): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc("msg_list_conversations", {
    _include_archived: includeArchived, _limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as ConversationSummary[];
}

// ── Messages ───────────────────────────────────────────────────────────────
export async function listMessages(conversationId: string, before?: string, limit = 50): Promise<Message[]> {
  const { data, error } = await supabase.rpc("msg_list_messages", {
    _conversation_id: conversationId, _before: before ?? undefined, _limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(
  conversationId: string,
  body: string,
  kind: MessageKind = "text",
  meta: Record<string, unknown> = {},
): Promise<string> {
  const { data, error } = await supabase.rpc("msg_send", {
    _conversation_id: conversationId, _body: body, _kind: kind, _meta: meta as never,
  });
  if (error) throw error;
  return data as string;
}

export async function softDeleteMessage(messageId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("msg_soft_delete_message", { _message_id: messageId });
  if (error) throw error;
  return Boolean(data);
}

export async function searchMessages(q: string, limit = 30) {
  const { data, error } = await supabase.rpc("msg_search", { _q: q, _limit: limit });
  if (error) throw error;
  return (data ?? []) as Array<{
    message_id: string; conversation_id: string; sender_id: string | null; body: string | null; created_at: string;
  }>;
}

// ── Participant state ──────────────────────────────────────────────────────
export async function markRead(conversationId: string) {
  const { error } = await supabase.rpc("msg_mark_read", { _conversation_id: conversationId });
  if (error) throw error;
}

export async function archiveConversation(conversationId: string, archived = true) {
  const { error } = await supabase.rpc("msg_archive", { _conversation_id: conversationId, _archived: archived });
  if (error) throw error;
}

export async function muteConversation(conversationId: string, minutes: number | null) {
  const { error } = await supabase.rpc("msg_mute", { _conversation_id: conversationId, _minutes: minutes ?? undefined });
  if (error) throw error;
}

// ── Blocking ───────────────────────────────────────────────────────────────
export async function blockUser(userId: string, reason?: string) {
  const { error } = await supabase.rpc("msg_block_user", { _other_user_id: userId, _reason: reason ?? undefined });
  if (error) throw error;
}

export async function unblockUser(userId: string) {
  const { error } = await supabase.rpc("msg_unblock_user", { _other_user_id: userId });
  if (error) throw error;
}

// ── Realtime helper ────────────────────────────────────────────────────────
// Usage inside a component effect:
//   const channel = subscribeToConversation(id, (msg) => {...});
//   return () => supabase.removeChannel(channel);
export function subscribeToConversation(conversationId: string, onInsert: (m: Message) => void) {
  return supabase
    .channel(`msg:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();
}
