// Recovers the app when the browser holds an old HTML/JS build after a new deploy.
// Symptom: "Failed to fetch dynamically imported module .../assets/routes-XXXX.js"
// The referenced chunk no longer exists on the server, so we reload once to get fresh HTML.

const KEY = "__chunk_reload_at";

function isChunkError(message: string): boolean {
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk .* failed/i.test(message)
  );
}

function recover(message: string) {
  if (!isChunkError(message)) return;
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    // Only one automatic reload per minute, to avoid a reload loop.
    if (Date.now() - last < 60_000) return;
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
