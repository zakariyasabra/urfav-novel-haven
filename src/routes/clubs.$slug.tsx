import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getClubBySlug,
  isClubMember,
  joinClub,
  leaveClub,
  listClubPosts,
  createClubPost,
  listPostReplies,
  replyToPost,
  type ClubPost,
} from "@/lib/clubs-api";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { toArabicError } from "@/lib/errors";
import { Users, MessageSquare, Lock, Send } from "lucide-react";

export const Route = createFileRoute("/clubs/$slug")({
  component: ClubDetail,
});

function ClubDetail() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();

  const { data: club, isLoading } = useQuery({
    queryKey: ["club", slug],
    queryFn: () => getClubBySlug(slug),
  });

  const { data: member } = useQuery({
    queryKey: ["club-member", club?.id],
    queryFn: () => (club ? isClubMember(club.id) : Promise.resolve(false)),
    enabled: !!club,
  });

  const { data: posts } = useQuery({
    queryKey: ["club-posts", club?.id],
    queryFn: () => (club ? listClubPosts(club.id) : Promise.resolve([])),
    enabled: !!club,
  });

  // Realtime new posts
  useEffect(() => {
    if (!club) return;
    const ch = supabase
      .channel(`club-${club.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reading_club_posts",
          filter: `club_id=eq.${club.id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["club-posts", club.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [club, qc]);

  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  async function onJoin() {
    if (!club) return;
    try {
      await joinClub(club.id);
      toast.success("تم الانضمام");
      qc.invalidateQueries({ queryKey: ["club-member", club.id] });
      qc.invalidateQueries({ queryKey: ["club", slug] });
    } catch (e) {
      toast.error(toArabicError(e));
    }
  }
  async function onLeave() {
    if (!club) return;
    try {
      await leaveClub(club.id);
      toast.success("تمت المغادرة");
      qc.invalidateQueries({ queryKey: ["club-member", club.id] });
    } catch (e) {
      toast.error(toArabicError(e));
    }
  }
  async function onPost(e: React.FormEvent) {
    e.preventDefault();
    if (!club || content.trim().length < 2) return;
    setPosting(true);
    try {
      await createClubPost({ club_id: club.id, content: content.trim() });
      setContent("");
      qc.invalidateQueries({ queryKey: ["club-posts", club.id] });
    } catch (e) {
      toast.error(toArabicError(e));
    } finally {
      setPosting(false);
    }
  }

  if (isLoading) return <div className="container mx-auto p-8 text-center">جاري التحميل…</div>;
  if (!club) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p>النادي غير موجود</p>
        <Link to="/clubs" className="text-primary mt-4 inline-block">
          العودة إلى الأندية
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        {club.cover_url ? (
          <img src={club.cover_url} alt="" className="mb-4 h-40 w-full rounded-lg object-cover" />
        ) : (
          <div className="from-primary/20 to-primary/5 mb-4 h-40 rounded-lg bg-gradient-to-br" />
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              {club.name_ar}
              {club.is_private && <Lock className="text-muted-foreground h-4 w-4" />}
            </h1>
            {club.description_ar && (
              <p className="text-muted-foreground mt-1">{club.description_ar}</p>
            )}
            <div className="text-muted-foreground mt-2 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {club.member_count} عضو
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" /> {club.post_count} منشور
              </span>
            </div>
          </div>
          <div>
            {member ? (
              <Button variant="outline" onClick={onLeave}>
                مغادرة
              </Button>
            ) : (
              <Button onClick={onJoin}>انضم</Button>
            )}
          </div>
        </div>
      </div>

      {member && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <form onSubmit={onPost} className="space-y-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="اكتب منشوراً…"
                rows={3}
                maxLength={2000}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={posting || content.trim().length < 2}>
                  <Send className="me-2 h-4 w-4" />
                  {posting ? "جارٍ النشر…" : "نشر"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {(posts ?? []).map((p) => (
          <PostItem key={p.id} post={p} canReply={!!member} />
        ))}
        {posts && posts.length === 0 && (
          <div className="text-muted-foreground py-12 text-center">لا توجد منشورات بعد</div>
        )}
      </div>
    </div>
  );
}

function PostItem({ post, canReply }: { post: ClubPost; canReply: boolean }) {
  const [showReplies, setShowReplies] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  const { data: replies } = useQuery({
    queryKey: ["club-replies", post.id],
    queryFn: () => listPostReplies(post.id),
    enabled: showReplies,
  });

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    if (reply.trim().length < 1) return;
    setSending(true);
    try {
      await replyToPost(post.id, reply.trim());
      setReply("");
      qc.invalidateQueries({ queryKey: ["club-replies", post.id] });
    } catch (e) {
      toast.error(toArabicError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        {post.title && <h3 className="mb-1 font-semibold">{post.title}</h3>}
        <p className="whitespace-pre-wrap text-sm">{post.content}</p>
        <div className="text-muted-foreground mt-3 flex items-center gap-4 text-xs">
          <button
            onClick={() => setShowReplies((v) => !v)}
            className="hover:text-foreground flex items-center gap-1"
          >
            <MessageSquare className="h-3.5 w-3.5" /> {post.reply_count} رد
          </button>
          <span>{new Date(post.created_at).toLocaleDateString("ar")}</span>
        </div>
        {showReplies && (
          <div className="mt-4 space-y-2 border-t pt-3">
            {(replies ?? []).map((r) => (
              <div key={r.id} className="bg-muted/30 rounded p-2 text-sm">
                {r.content}
              </div>
            ))}
            {canReply && (
              <form onSubmit={onReply} className="flex gap-2 pt-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={1}
                  placeholder="اكتب رداً…"
                  className="min-h-9"
                  maxLength={1000}
                />
                <Button type="submit" size="sm" disabled={sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
