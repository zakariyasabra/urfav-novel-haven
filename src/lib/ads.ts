import { supabase } from "@/integrations/supabase/client";

/**
 * Ad system helpers.
 *
 * The admin dashboard stores raw ad markup (including external <script src="...">
 * tags, e.g. Adsterra Popunder) in `ad_placements.script_html`.
 *
 * React's `dangerouslySetInnerHTML` never EXECUTES <script> tags that it injects,
 * which is why Adsterra scripts were saved but never requested by the browser.
 * The helpers below parse the stored markup and re-create real <script> elements
 * through `document.createElement("script")` so the browser actually fetches and
 * runs them, with de-duplication so React re-renders don't inject twice.
 */

export interface AdRecord {
  id: string;
  slot: string;
  kind: string;
  enabled: boolean;
  script_html: string | null;
  image_url: string | null;
  link_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  frequency: number;
}

const AD_COLUMNS =
  "id,slot,kind,enabled,script_html,image_url,link_url,starts_at,ends_at,priority,frequency";

/** Public ad fetch. RLS already limits rows to enabled + in-schedule ads. */
export async function fetchActiveAds(): Promise<AdRecord[]> {
  const { data, error } = await supabase
    .from("ad_placements")
    .select(AD_COLUMNS)
    .eq("enabled", true)
    .order("priority", { ascending: false });
  if (error) return [];
  return ((data ?? []) as unknown as AdRecord[]).filter(isAdActive);
}

/** Disabled / not-yet-started / expired ads are never eligible. */
export function isAdActive(ad: AdRecord, now: number = Date.now()): boolean {
  if (!ad.enabled) return false;
  if (ad.starts_at && new Date(ad.starts_at).getTime() > now) return false;
  if (ad.ends_at && new Date(ad.ends_at).getTime() <= now) return false;
  return true;
}

/**
 * Frequency (%) gate. The dice roll is stored per-ad in sessionStorage so the
 * decision is stable for the whole visit (no flicker between navigations) and
 * still works in incognito (sessionStorage is available; falls back to always-on).
 */
export function passesFrequency(ad: AdRecord): boolean {
  const freq = typeof ad.frequency === "number" ? ad.frequency : 100;
  if (freq >= 100) return true;
  if (freq <= 0) return false;
  try {
    const key = `ad_freq_${ad.id}`;
    let roll = sessionStorage.getItem(key);
    if (roll === null) {
      roll = String(Math.floor(Math.random() * 100));
      sessionStorage.setItem(key, roll);
    }
    return Number(roll) < freq;
  } catch {
    return true;
  }
}

/** Highest-priority eligible ad for a slot. */
export function pickAdForSlot(ads: AdRecord[] | undefined, slot: string): AdRecord | null {
  if (!ads?.length) return null;
  const candidates = ads
    .filter((a) => a.slot === slot && isAdActive(a) && passesFrequency(a))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return candidates[0] ?? null;
}

/** Tracks scripts already injected in this document to avoid duplicates. */
const injected = new Set<string>();

function scriptKey(ad: AdRecord, el: HTMLScriptElement, index: number) {
  return el.src ? `src:${el.src}` : `ad:${ad.id}:${index}`;
}

/**
 * Injects the markup stored in `ad.script_html`.
 *
 * - Non-script markup goes into `container` (normal banner/html/native ads).
 * - Every <script> is re-created via document.createElement so it EXECUTES.
 *   Inline scripts keep their code; external ones keep src/async/defer/attrs.
 * - `once` (used for popunder / global scripts) keeps the tag in <head> for the
 *   whole session and skips re-injection on re-render or route change.
 *
 * Returns a cleanup function that removes the nodes it created (except `once`
 * scripts, which must stay alive for the popunder handler to work).
 */
export function injectAdMarkup(
  ad: AdRecord,
  container: HTMLElement | null,
  opts: { once?: boolean } = {},
): () => void {
  if (typeof document === "undefined" || !ad.script_html) return () => {};
  const created: HTMLElement[] = [];

  const template = document.createElement("template");
  template.innerHTML = ad.script_html;
  const nodes = Array.from(template.content.childNodes);

  let scriptIndex = 0;
  for (const node of nodes) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "SCRIPT") {
      const src = node as HTMLScriptElement;
      const key = scriptKey(ad, src, scriptIndex++);

      // De-duplication: same external src (or same inline block) is injected once.
      if (injected.has(key)) continue;
      if (src.src && document.querySelector(`script[src="${CSS.escape(src.src)}"]`)) {
        injected.add(key);
        continue;
      }

      const el = document.createElement("script");
      for (const attr of Array.from(src.attributes)) el.setAttribute(attr.name, attr.value);
      if (!src.src) el.text = src.textContent ?? "";
      el.setAttribute("data-ad-id", ad.id);
      el.setAttribute("data-ad-slot", ad.slot);

      if (opts.once) {
        injected.add(key);
        document.head.appendChild(el);
      } else {
        (container ?? document.body).appendChild(el);
        created.push(el);
      }
      continue;
    }
    if (container) {
      const clone = node.cloneNode(true);
      container.appendChild(clone);
      if (clone.nodeType === Node.ELEMENT_NODE) created.push(clone as HTMLElement);
    }
  }

  return () => {
    // Remove only the nodes we appended (leave React-owned children alone).
    for (const el of created) el.remove();
  };
}
