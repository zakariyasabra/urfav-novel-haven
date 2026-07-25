import { useEffect } from "react";

/**
 * Site-wide content protection.
 *
 * - Copy / cut / context-menu / drag are blocked everywhere except real
 *   form inputs (input, textarea, select, contenteditable).
 * - Text SELECTION is blocked by default, but allowed inside any element
 *   marked with [data-allow-select] so features that need a selection
 *   (chapter reader → highlight-to-comment) keep working. Copying that
 *   selection is still blocked.
 * - Common devtools / view-source shortcuts are swallowed.
 *
 * Client-side deterrent only, not real DRM.
 */
export function ContentProtection() {
  useEffect(() => {
    document.documentElement.classList.add("no-copy");

    const isFormField = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      return !!el.closest("input, textarea, select, [contenteditable='true']");
    };

    const isSelectAllowed = (el: EventTarget | null) => {
      if (isFormField(el)) return true;
      if (!(el instanceof HTMLElement)) return false;
      return !!el.closest("[data-allow-select]");
    };

    // Copy / cut / context / drag → block unless in a real form field.
    const blockCopy = (e: Event) => {
      if (isFormField(e.target)) return;
      e.preventDefault();
    };

    // selectstart → allow when inside data-allow-select OR a form field.
    const onSelectStart = (e: Event) => {
      if (isSelectAllowed(e.target)) return;
      e.preventDefault();
    };

    const onKey = (e: KeyboardEvent) => {
      const inField = isFormField(e.target);
      const k = e.key.toLowerCase();
      // Ctrl/Cmd + C / X → block everywhere (even inside data-allow-select)
      if ((e.ctrlKey || e.metaKey) && ["c", "x"].includes(k) && !inField) {
        e.preventDefault();
        return;
      }
      // Ctrl/Cmd + A / S / P / U → block outside form fields
      if ((e.ctrlKey || e.metaKey) && ["a", "s", "p", "u"].includes(k) && !inField) {
        e.preventDefault();
      }
      // Devtools shortcuts
      if (k === "f12") e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k)) {
        e.preventDefault();
      }
    };

    document.addEventListener("copy", blockCopy);
    document.addEventListener("cut", blockCopy);
    document.addEventListener("contextmenu", blockCopy);
    document.addEventListener("dragstart", blockCopy);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("keydown", onKey);

    return () => {
      document.documentElement.classList.remove("no-copy");
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("cut", blockCopy);
      document.removeEventListener("contextmenu", blockCopy);
      document.removeEventListener("dragstart", blockCopy);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
