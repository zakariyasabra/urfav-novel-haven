import { useCallback, useEffect, useRef, useState } from "react";

/**
 * سجل تراجع/إعادة عام لأي حالة نصية (كتابة، حذف، لصق).
 * - يجمّع الكتابة السريعة في خطوة واحدة (coalesce) خلال 500ms
 * - يسجّل التغييرات الكبيرة (لصق/حذف كتلة) فورًا كخطوة مستقلة
 */
export function useUndoHistory<T>(
  value: T,
  apply: (next: T) => void,
  options?: { resetKey?: string; delay?: number; isBig?: (prev: T, next: T) => boolean },
) {
  const delay = options?.delay ?? 500;
  const resetKey = options?.resetKey ?? "";

  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const current = useRef<T>(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internal = useRef(false);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  // إعادة تهيئة السجل عند تغيير الحقل/التبويب
  useEffect(() => {
    past.current = [];
    future.current = [];
    current.current = value;
    if (timer.current) clearTimeout(timer.current);
    rerender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (internal.current) {
      internal.current = false;
      current.current = value;
      return;
    }
    if (Object.is(value, current.current)) return;

    const prev = current.current;
    const commit = () => {
      past.current.push(prev);
      if (past.current.length > 200) past.current.shift();
      future.current = [];
      timer.current = null;
      rerender();
    };

    const big = options?.isBig?.(prev, value) ?? false;
    current.current = value;

    if (big) {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      past.current.push(prev);
      future.current = [];
      rerender();
      return;
    }

    if (timer.current) return; // ضمن نفس دفعة الكتابة
    timer.current = setTimeout(commit, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const flush = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const undo = useCallback(() => {
    flush();
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(current.current);
    internal.current = true;
    current.current = prev;
    apply(prev);
    rerender();
  }, [apply]);

  const redo = useCallback(() => {
    flush();
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(current.current);
    internal.current = true;
    current.current = next;
    apply(next);
    rerender();
  }, [apply]);

  return {
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
