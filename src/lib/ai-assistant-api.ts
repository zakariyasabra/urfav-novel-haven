// Client-side helpers for the AI Reading Assistant. See DB RPCs
// ai_assistant_*, ai_get_asset, ai_reader_context.
import { supabase } from "@/integrations/supabase/client";

export interface AiConversation {
  id: string;
  title: string | null;
  is_pinned: boolean;
  allow_spoilers: boolean;
  updated_at: string;
  message_count: number;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface AiAsset {
  id: string;
  content: unknown;
  scope_key: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args: Record<string, unknown>) => (supabase as any).rpc(name, args);

export async function listConversations(novelId: string): Promise<AiConversation[]> {
  const { data, error } = await rpc("ai_assistant_conversations", { _novel_id: novelId });
  if (error) return [];
  return (data ?? []) as AiConversation[];
}

export async function createConversation(
  novelId: string,
  title: string | null,
  allowSpoilers = false,
): Promise<string | null> {
  const { data, error } = await rpc("ai_assistant_create_conversation", {
    _novel_id: novelId,
    _title: title,
    _allow_spoilers: allowSpoilers,
  });
  if (error) return null;
  return (data as string) ?? null;
}

export async function listMessages(conversationId: string): Promise<AiMessage[]> {
  const { data, error } = await rpc("ai_assistant_messages", { _conversation_id: conversationId });
  if (error) return [];
  return (data ?? []) as AiMessage[];
}

export async function deleteConversation(id: string) {
  await rpc("ai_assistant_delete_conversation", { _id: id });
}

export async function renameConversation(id: string, title: string) {
  await rpc("ai_assistant_rename_conversation", { _id: id, _title: title });
}

export async function pinConversation(id: string, pinned: boolean) {
  await rpc("ai_assistant_pin_conversation", { _id: id, _pinned: pinned });
}

export async function setConversationSpoilers(id: string, allow: boolean) {
  // Direct update — RLS restricts to the owning user.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("ai_conversations") as any).update({ allow_spoilers: allow }).eq("id", id);
}

export async function fetchAsset(
  novelId: string,
  kind: string,
  lang: "ar" | "en" = "ar",
): Promise<AiAsset | null> {
  const { data, error } = await rpc("ai_get_asset", {
    _novel_id: novelId,
    _kind: kind,
    _lang: lang,
  });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as AiAsset) ?? null;
}

export async function adminDeleteAsset(novelId: string, kind?: string) {
  await rpc("ai_admin_delete_asset", { _novel_id: novelId, _kind: kind ?? null });
}
