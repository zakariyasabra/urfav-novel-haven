import { showError } from "@/lib/errors";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Share2, X, Smile } from "lucide-react";
import { toast } from "sonner";
import { toggleTextReaction, hashSelection, postComment } from "@/lib/social-api";
import { useAuth } from "@/hooks/use-auth";

const EMOJIS = ["❤️", "🔥", "😂", "😮", "😢", "👏"];

interface Props {
  chapterId: string;
  novelId: string;
  novelTitle: string;
  containerRef: React.RefObject<HTMLElement | null>;
  onReacted?: () => void;
  onCommented?: () => void;
}

export function TextSelectionToolbar({
  chapterId,
  novelId,
  novelTitle,
  containerRef,
  onReacted,
  onCommented,
}: Props) {
  const { user } = useAuth();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function onSel() {
      // لا تُحدّث الحالة أثناء فتح المودال — الضغط على الحقل يُنهي التحديد
      // وسيؤدي ذلك لإخفاء المودال.
      const active = document.activeElement;
      if (
        showComment ||
        (active instanceof Node && modalRef.current?.contains(active)) ||
        (active instanceof Node && toolbarRef.current?.contains(active))
      ) {
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setPos(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const container = containerRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) {
        setPos(null);
        return;
      }
      const t = sel.toString().trim();
      if (t.length < 3) {
        setPos(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setText(t);
      setPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 8 });
    }
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [containerRef, showComment]);

  useEffect(() => {
    if (!showComment) return;
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showComment]);

  async function react(emoji: string) {
    if (!user) {
      toast.error("سجل الدخول للتفاعل");
      return;
    }
    try {
      const hash = hashSelection(text);
      await toggleTextReaction({
        chapter_id: chapterId,
        selection_hash: hash,
        selection_text: text,
        emoji,
      });
      toast.success("تم");
      onReacted?.();
      window.getSelection()?.removeAllRanges();
      setPos(null);
    } catch (e: unknown) {
      showError(e);
    }
  }




  async function share() {
    const quote = `"${text}"\n— ${novelTitle}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: quote, title: novelTitle });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(quote);
      toast.success("تم نسخ الاقتباس");
    }
    window.getSelection()?.removeAllRanges();
    setPos(null);
  }

  async function submitComment() {
    if (!user) {
      toast.error("سجل الدخول");
      return;
    }
    if (!commentText.trim()) return;
    try {
      await postComment({
        novel_id: novelId,
        chapter_id: chapterId,
        content: commentText.trim(),
        is_spoiler: isSpoiler,
        selection_text: text.slice(0, 500),
        selection_hash: hashSelection(text),
      });
      toast.success("تم النشر");
      onCommented?.();
      setCommentText("");
      setShowComment(false);
      setPos(null);
      window.getSelection()?.removeAllRanges();
    } catch (e: unknown) {
      showError(e);
    }
  }

  return (
    <>
      {pos && (
        <div
          ref={toolbarRef}
          style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            transform: "translate(-50%, -100%)",
          }}
          className="z-[70] flex items-center gap-1 rounded-full border border-border/60 bg-popover px-1.5 py-1 text-popover-foreground shadow-2xl animate-fade-in"
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            onClick={() => setPickerOpen((v) => !v)}
            title="تفاعل"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
          >
            <Smile className="h-4 w-4" />
          </button>
          {pickerOpen && (
            <div className="flex items-center gap-1 border-s border-border/60 ps-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => react(e)}
                  className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-secondary"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowComment(true)}
            title="تعليق"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
          >
            <MessageCircle className="h-4 w-4" />
          </button>


          <button
            onClick={share}
            title="مشاركة"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {showComment && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowComment(false);
          }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-md rounded-xl border border-border/60 bg-popover p-4 text-popover-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-bold">تعليق على مقطع</div>
              <button
                onClick={() => setShowComment(false)}
                className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <blockquote className="mb-3 rounded-md border-s-2 border-primary bg-primary/5 p-2 text-xs italic text-muted-foreground">
              "{text.length > 200 ? text.slice(0, 200) + "…" : text}"
            </blockquote>
            <textarea
              ref={textareaRef}
              autoFocus
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              placeholder="شاركنا رأيك..."
              className="w-full resize-none rounded-md border border-input bg-background/60 p-2 text-sm outline-none focus:border-primary"
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="accent-primary"
              />
              يحتوي على حرق
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setShowComment(false)}
                className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="rounded-md bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                نشر
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
