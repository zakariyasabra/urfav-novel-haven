import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Heart, Reply, Pin, Trash2, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  fetchThreadedComments, postComment, toggleCommentLike, togglePinComment, deleteComment,
  type CommentRow,
} from "@/lib/social-api";
import { useAuth } from "@/hooks/use-auth";
import { timeAgoAr } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface Props { chapterId?: string; novelId?: string; }

export function ThreadedComments({ chapterId, novelId }: Props) {
  const { user, isStaff } = useAuth();
  const qc = useQueryClient();
  const scope = { chapterId, novelId };
  const key = ["threaded-comments", chapterId ?? null, novelId ?? null];
  const q = useQuery({ queryKey: key, queryFn: () => fetchThreadedComments(scope), enabled: !!(chapterId || novelId) });

  const [text, setText] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [busy, setBusy] = useState(false);

  const { roots, childMap } = useMemo(() => {
    const rows = q.data ?? [];
    const cm = new Map<string, CommentRow[]>();
    const rs: CommentRow[] = [];
    rows.forEach((r) => {
      if (r.parent_id) {
        if (!cm.has(r.parent_id)) cm.set(r.parent_id, []);
        cm.get(r.parent_id)!.push(r);
      } else rs.push(r);
    });
    return { roots: rs, childMap: cm };
  }, [q.data]);

  async function submit(parentId: string | null, content: string, isSpoiler: boolean) {
    setBusy(true);
    try {
      await postComment({ novel_id: novelId, chapter_id: chapterId, content, parent_id: parentId, is_spoiler: isSpoiler });
      qc.invalidateQueries({ queryKey: key });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطأ"); }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {user ? (
        <div className="rounded-lg border border-border/40 bg-surface/40 p-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
            placeholder="اكتب تعليقك... استخدم @اسم للإشارة"
            className="w-full resize-none rounded-md border border-input bg-background/60 p-2 text-sm outline-none focus:border-primary" />
          <div className="mt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="accent-primary" />
              حرق
            </label>
            <Button size="sm" disabled={busy || !text.trim()}
              onClick={async () => { await submit(null, text.trim(), spoiler); setText(""); setSpoiler(false); }}>
              نشر
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border/40 bg-surface/40 p-3 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="font-bold text-primary">سجل دخول</Link> للتعليق
        </div>
      )}

      {roots.length === 0 && (
        <div className="rounded-lg border border-border/40 bg-surface/40 p-6 text-center text-sm text-muted-foreground">كن أول من يعلق</div>
      )}

      {roots.map((c) => (
        <CommentNode key={c.id} c={c} depth={0}
          replies={childMap.get(c.id) ?? []}
          childMap={childMap}
          onLike={async (id) => { try { await toggleCommentLike(id); qc.invalidateQueries({ queryKey: key }); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطأ"); } }}
          onReply={submit}
          onPin={async (id, next) => { try { await togglePinComment(id, next); qc.invalidateQueries({ queryKey: key }); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطأ"); } }}
          onDelete={async (id) => { if (!confirm("حذف التعليق؟")) return; try { await deleteComment(id); qc.invalidateQueries({ queryKey: key }); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطأ"); } }}
          canModerate={!!isStaff}
          myId={user?.id ?? null}
        />
      ))}
    </div>
  );
}

function CommentNode({
  c, depth, replies, childMap, onLike, onReply, onPin, onDelete, canModerate, myId,
}: {
  c: CommentRow;
  depth: number;
  replies: CommentRow[];
  childMap: Map<string, CommentRow[]>;
  onLike: (id: string) => void;
  onReply: (parentId: string, content: string, isSpoiler: boolean) => Promise<void>;
  onPin: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
  canModerate: boolean;
  myId: string | null;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySpoiler, setReplySpoiler] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const mention = c.content.replace(/@([\w\u0621-\u064A]+)/g, (_m, u) =>
    `<a class="font-bold text-primary" href="/authors/${u}">@${u}</a>`
  );

  return (
    <div style={{ marginInlineStart: depth > 0 ? Math.min(depth, 3) * 16 : 0 }} className="rounded-lg border border-border/40 bg-surface/50 p-3">
      <header className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {(c.profile?.display_name ?? c.profile?.username ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <Link to="/authors/$username" params={{ username: c.profile?.username ?? "" }} className="text-sm font-bold hover:text-primary">
            {c.profile?.display_name ?? c.profile?.username ?? "مستخدم"}
          </Link>
          {c.is_pinned && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"><Pin className="me-0.5 inline h-3 w-3" />مثبّت</span>}
          <span className="text-[11px] text-muted-foreground">{timeAgoAr(c.created_at)}</span>
        </div>
      </header>

      {c.selection_text && (
        <blockquote className="mb-2 rounded-md border-s-2 border-primary bg-primary/5 p-2 text-xs italic text-muted-foreground">
          "{c.selection_text.slice(0, 200)}{c.selection_text.length > 200 ? "…" : ""}"
        </blockquote>
      )}

      {c.is_spoiler && !revealed ? (
        <button onClick={() => setRevealed(true)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-secondary p-3 text-sm font-bold text-muted-foreground hover:bg-secondary/70">
          <EyeOff className="h-4 w-4" /> يحتوي حرق — اضغط للكشف
        </button>
      ) : (
        <div className="text-sm text-foreground/90">
          {c.is_spoiler && (
            <button onClick={() => setRevealed(false)} className="mb-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Eye className="h-3 w-3" /> إخفاء الحرق
            </button>
          )}
          <div dangerouslySetInnerHTML={{ __html: mention }} />
        </div>
      )}

      <footer className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <button onClick={() => onLike(c.id)} className="flex items-center gap-1 hover:text-primary">
          <Heart className="h-3.5 w-3.5" /> {c.likes_count}
        </button>
        <button onClick={() => setReplyOpen((v) => !v)} className="flex items-center gap-1 hover:text-primary">
          <Reply className="h-3.5 w-3.5" /> رد
        </button>
        {canModerate && (
          <button onClick={() => onPin(c.id, !c.is_pinned)} className="flex items-center gap-1 hover:text-primary">
            <Pin className="h-3.5 w-3.5" /> {c.is_pinned ? "إلغاء" : "تثبيت"}
          </button>
        )}
        {(canModerate || myId === c.user_id) && (
          <button onClick={() => onDelete(c.id)} className="flex items-center gap-1 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> حذف
          </button>
        )}
      </footer>

      {replyOpen && (
        <div className="mt-2 rounded-md border border-border/40 bg-background/40 p-2">
          <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2}
            placeholder="اكتب رداً..."
            className="w-full resize-none rounded-md border border-input bg-background/60 p-2 text-xs outline-none focus:border-primary" />
          <div className="mt-1 flex items-center justify-between">
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <input type="checkbox" checked={replySpoiler} onChange={(e) => setReplySpoiler(e.target.checked)} className="accent-primary" />حرق
            </label>
            <Button size="sm" disabled={!replyText.trim()}
              onClick={async () => { await onReply(c.id, replyText.trim(), replySpoiler); setReplyText(""); setReplySpoiler(false); setReplyOpen(false); }}>
              إرسال
            </Button>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {replies.map((r) => (
            <CommentNode key={r.id} c={r} depth={depth + 1}
              replies={childMap.get(r.id) ?? []} childMap={childMap}
              onLike={onLike} onReply={onReply} onPin={onPin} onDelete={onDelete}
              canModerate={canModerate} myId={myId} />
          ))}
        </div>
      )}
    </div>
  );
}
