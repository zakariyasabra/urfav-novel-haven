// Client-side helpers for the AI Reading Assistant. RPCs live in the DB
// (see ai_assistant_*, ai_get_asset). Server functions live in
// `src/lib/ai-assistant.functions.ts`.

import { supabase } from "@/integrations/supabase/client";

export interface AiConversation {
  id: string;
  novel_id: string;
  title: string | null;
  pinned: boolean;
  allow_spoilers: boolean;
  updated_at: string;
  created_at: string;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface AiAsset {
  kind: string;
  scope_key: string;
  lang: string;
  content: unknown;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args: Record<string, unknown>) => (supabase as any).rpc(name, args);

export async function listConversations(novelId: string): Promise<AiConversation[]> {
  const { data, error } = await rpc("ai_assistant_list_conversations", { _novel_id: novelId });
  if (error) return [];
  return (data ?? []) as AiConversation[];
}

export async function createConversation(novelId: string, title?: string): Promise<string | null> {
  const { data, error } = await rpc("ai_assistant_create_conversation", {
    _novel_id: novelId,
    _title: title ?? null,
  });
  if (error) return null;
  return (data as string) ?? null;
}

export async function listMessages(conversationId: string): Promise<AiMessage[]> {
  const { data, error } = await rpc("ai_assistant_list_messages", { _conversation_id: conversationId });
  if (error) return [];
  return (data ?? []) as AiMessage[];
}

export async function clearConversation(conversationId: string) {
  await rpc("ai_assistant_clear_conversation", { _conversation_id: conversationId });
}

export async function deleteConversation(conversationId: string) {
  await rpc("ai_assistant_delete_conversation", { _conversation_id: conversationId });
}

export async function togglePinned(conversationId: string, pinned: boolean) {
  await rpc("ai_assistant_set_pinned", { _conversation_id: conversationId, _pinned: pinned });
}

export async function setSpoilers(conversationId: string, allow: boolean) {
  await rpc("ai_assistant_set_spoilers", { _conversation_id: conversationId, _allow: allow });
}

export async function fetchAsset(
  novelId: string,
  kind: string,
  lang: "ar" | "en" = "ar",
  scopeKey = "all",
): Promise<AiAsset | null> {
  const { data, error } = await rpc("ai_get_asset", {
    _novel_id: novelId,
    _kind: kind,
    _lang: lang,
    _scope_key: scopeKey,
  });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as AiAsset) ?? null;
}
