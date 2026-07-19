import { supabase } from "@/integrations/supabase/client";

export type TicketCategory =
  | "bug"
  | "suggestion"
  | "feature"
  | "translation"
  | "novel"
  | "chapter"
  | "payment"
  | "account"
  | "copyright"
  | "abuse"
  | "other";
export type TicketStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "waiting_user"
  | "resolved"
  | "closed"
  | "rejected";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export interface SupportTicket {
  id: string;
  user_id: string;
  category: TicketCategory;
  subject: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  attachments: unknown[];
  created_at: string;
}

export function collectContext(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const nav = window.navigator;
  const doc = document.documentElement;
  return {
    url: window.location.href,
    ua: nav.userAgent,
    lang: nav.language,
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    theme: doc.getAttribute("data-theme") || (doc.classList.contains("dark") ? "dark" : "light"),
    time: new Date().toISOString(),
  };
}

export async function createTicket(input: {
  category: TicketCategory;
  subject: string;
  body: string;
}): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: u.user.id,
      category: input.category,
      subject: input.subject.trim().slice(0, 200),
      body: input.body.trim().slice(0, 5000),
      context: collectContext(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function fetchMyTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SupportTicket[];
}

export async function fetchTicket(id: string): Promise<SupportTicket | null> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as SupportTicket | null;
}

export async function fetchTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const { data, error } = await supabase
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TicketMessage[];
}

export async function replyTicket(ticketId: string, body: string, isInternal = false) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const { error } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    author_id: u.user.id,
    body: body.trim().slice(0, 4000),
    is_internal: isInternal,
  });
  if (error) throw error;
}

export async function fetchAllTickets(filter?: {
  status?: TicketStatus;
  priority?: TicketPriority;
}) {
  let q = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
  if (filter?.status) q = q.eq("status", filter.status);
  if (filter?.priority) q = q.eq("priority", filter.priority);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as SupportTicket[];
}

export async function updateTicket(
  id: string,
  patch: Partial<Pick<SupportTicket, "status" | "priority" | "assigned_to">>,
) {
  const { error } = await supabase.from("support_tickets").update(patch).eq("id", id);
  if (error) throw error;
}
