// Recovers the app when the browser holds an old HTML/JS build after a new deploy.
// Symptom: "Failed to fetch dynamically imported module .../assets/routes-XXXX.js"
// The referenced chunk no longer exists on the server, so we reload once to get fresh HTML.

const KEY = "__chunk_reload_at";
const HARD_KEY = "__chunk_hard_reload_at";

function isChunkError(message: string): boolean {
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk .* failed/i.test(message) ||
    /Loading CSS chunk .* failed/i.test(message) ||
    /expected a JavaScript(-or-Wasm)? module/i.test(message) ||
    /MIME type \('text\/html'\)/i.test(message) ||
    /Unexpected token '<'/i.test(message)
  );
}

/** Drops the service worker + every Cache Storage entry, then reloads bypassing cache. */
export async function hardRefresh() {
  if (typeof window === "undefined") return;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_r", String(Date.now()));
  window.location.replace(url.toString());
}

function recover(message: string) {
  if (!isChunkError(message)) return;
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY) ?? 0);
    // Only one automatic reload per minute, to avoid a reload loop.
    if (Date.now() - last < 60_000) {
      // A plain reload already happened and did not help: the stale build is
      // being served from the service worker / HTTP cache. Purge and retry once.
      const lastHard = Number(sessionStorage.getItem(HARD_KEY) ?? 0);
      if (Date.now() - lastHard < 10 * 60_000) return;
      sessionStorage.setItem(HARD_KEY, String(Date.now()));
      void hardRefresh();
      return;
    }
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  window.location.reload();
}

export function recoverFromChunkError(error: unknown) {
  if (typeof window === "undefined") return;
  const msg = typeof error === "string" ? error : String((error as { message?: string })?.message ?? "");
  recover(msg);
}

export function installChunkReload() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => recover(String(e?.message ?? "")));
  window.addEventListener("unhandledrejection", (e) => {
    const r = e?.reason as { message?: string } | string | undefined;
    recover(typeof r === "string" ? r : String(r?.message ?? ""));
  });
}
