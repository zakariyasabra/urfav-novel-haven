import { useEffect } from "react";

/**
 * Blocks copy, cut, context menu, drag and common devtools shortcuts
 * across the whole app. Inputs, textareas and elements marked with
 * data-allow-select remain fully usable.
 *
 * Note: client-side protection only — determined users can still view
 * source. This is a soft deterrent, not real DRM.
 */
export function ContentProtection() {
  useEffect(() => {
    document.documentElement.classList.add("no-copy");

    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      return !!el.closest("[data-allow-select], input, textarea, select, [contenteditable='true']");
    };

    const block = (e: Event) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };

    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const k = e.key.toLowerCase();
      // Ctrl/Cmd + C / X / A / S / P / U
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "s", "p", "u"].includes(k)) {
        e.preventDefault();
      }
      // F12 devtools
      if (k === "f12") e.preventDefault();
      // Ctrl+Shift+I / J / C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k)) {
        e.preventDefault();
      }
    };

    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("keydown", onKey);

    return () => {
      document.documentElement.classList.remove("no-copy");
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
