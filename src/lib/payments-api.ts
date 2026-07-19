// Payments abstraction — Phase 7
// Provider-agnostic client. NO provider SDKs. Reads the provider registry and
// exposes a single createPaymentIntent() signature that future Stripe/PayPal/etc.
// integrations can plug into without changing call sites.

import { supabase } from "@/integrations/supabase/client";

export type PaymentProviderCode =
  | "stripe" | "paypal" | "apple_pay" | "google_pay"
  | "stc_pay" | "mada" | "crypto" | "manual";

export type PaymentKind =
  | "coins" | "vip" | "tip" | "donation"
  | "purchase" | "rental" | "battle_pass";

export type PaymentTargetType =
  | "chapter" | "novel" | "vip_plan" | "author" | "season" | "other";

export interface PaymentProvider {
  code: PaymentProviderCode;
  name_ar: string;
  name_en: string | null;
  kind: string;
  enabled: boolean;
  is_live: boolean;
  supports_recurring: boolean;
  sort_order: number;
  config: Record<string, unknown>;
}

export interface PaymentIntentInput {
  provider: PaymentProviderCode;
  kind: PaymentKind;
  amountCents: number;
  currency: string;
  targetType?: PaymentTargetType;
  targetRef?: string;
  idempotencyKey?: string;
  meta?: Record<string, unknown>;
}

export interface PaymentIntentResult {
  ok: boolean;
  transactionId?: string;
  redirectUrl?: string;   // reserved for future providers
  clientSecret?: string;  // reserved for future providers
  error?: string;
}

/** List enabled providers (public read, filtered server-side by RLS). */
export async function listEnabledProviders(): Promise<PaymentProvider[]> {
  const { data, error } = await supabase
    .from("payment_providers")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PaymentProvider[];
}

/**
 * Create a payment intent. Today this only inserts a `pending` row into
 * payment_transactions for auditing. Future provider integrations will:
 *   - Stripe: create a PaymentIntent server-side, return clientSecret.
 *   - PayPal: create an Order, return approve URL.
 *   - Apple/Google Pay: return a wallet token payload.
 *   - Manual (bank/wallet): use existing coin_purchase_requests flow.
 *
 * All future providers must call this function; no direct provider SDK calls
 * from feature code.
 */
export async function createPaymentIntent(
  input: PaymentIntentInput
): Promise<PaymentIntentResult> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) return { ok: false, error: "unauthenticated" };

  const { data, error } = await supabase
    .from("payment_transactions")
    .insert({
      user_id: userId,
      provider: input.provider,
      kind: input.kind,
      amount_cents: input.amountCents,
      currency: input.currency,
      target_type: input.targetType ?? null,
      target_ref: input.targetRef ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      meta: input.meta ?? {},
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, transactionId: data.id };
}

/** Public helper for future provider webhooks; server-side only in real use. */
export function paymentProviderLabel(p: PaymentProvider, lang: "ar" | "en") {
  return (lang === "en" ? p.name_en : p.name_ar) ?? p.name_ar;
}
