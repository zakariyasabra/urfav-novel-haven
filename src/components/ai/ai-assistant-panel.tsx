import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Send, Plus, Pin, Trash2, Loader2, ShieldAlert, BookText, Users, Clock, Globe2, BookMarked, ListOrdered } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  listConversations,
  createConversation,
  listMessages,
  deleteConversation,
  pinConversation,
  setConversationSpoilers,
  fetchAsset,
  type AiConversation,
  type AiMessage,
} from "@/lib/ai-assistant-api";
import { askAiAssistant } from "@/lib/ai-assistant.functions";
import { useT } from "@/i18n/provider";

const ASSET_KINDS: Array<{ key: string; icon: typeof BookText; label: string }> = [
  { key: "summary_spoilerfree", icon: BookText, label: "ملخص خالٍ من الحرق" },
  { key: "summary_progress", icon: BookMarked, label: "ملخص حتى تقدمي" },
  { key: "characters", icon: Users, label: "دليل الشخصيات" },
  { key: "timeline", icon: Clock, label: "الخط الزمني" },
  { key: "world", icon: Globe2, label: "دليل العالم" },
  { key: "glossary", icon: BookText, label: "مسرد المصطلحات" },
  { key: "reading_order", icon: ListOrdered, label: "ترتيب القراءة" },
];

export function AiAssistantPanel({ novelId, novelTitle }: { novelId: string; novelTitle: string }) {
  const { user } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {t("ai.assistant.title") ?? "المساعد الذكي"}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {novelTitle}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-8 rounded-lg border border-border/60 bg-surface/60 p-6 text-center text-sm text-muted-foreground">
            {t("ai.assistant.signInRequired") ?? "سجّل دخولك لاستخدام المساعد الذكي."}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("ai.assistant.title") ?? "المساعد الذكي"}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-full flex-col p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border/60 p-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="truncate">{novelTitle}</span>
          </SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="chat" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 w-fit">
            <TabsTrigger value="chat">اسأل المساعد</TabsTrigger>
            <TabsTrigger value="assets">أدلة الرواية</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="mt-0 flex-1 overflow-hidden">
            <ChatTab novelId={novelId} />
          </TabsContent>
          <TabsContent value="assets" className="mt-0 flex-1 overflow-y-auto">
            <AssetsTab novelId={novelId} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ---------- Chat ----------

function ChatTab({ novelId }: { novelId: string }) {
  const qc = useQueryClient();
  const askFn = useServerFn(askAiAssistant);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const conversations = useQuery({
    queryKey: ["ai-convs", novelId],
    queryFn: () => listConversations(novelId),
  });

  useEffect(() => {
    if (!activeId && conversations.data && conversations.data.length > 0) {
      setActiveId(conversations.data[0].id);
    }
  }, [conversations.data, activeId]);

  const activeConv = useMemo<AiConversation | undefined>(
    () => conversations.data?.find((c) => c.id === activeId),
    [conversations.data, activeId],
  );

  const messages = useQuery({
    queryKey: ["ai-msgs", activeId],
    queryFn: () => (activeId ? listMessages(activeId) : Promise.resolve([] as AiMessage[])),
    enabled: !!activeId,
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.data, sending]);

  async function newConv() {
    const id = await createConversation(novelId, null, false);
    if (!id) return toast.error("تعذّر بدء محادثة جديدة");
    setActiveId(id);
    qc.invalidateQueries({ queryKey: ["ai-convs", novelId] });
  }

  async function submit() {
    const message = input.trim();
    if (!message || sending) return;
    let convId = activeId;
    if (!convId) {
      convId = await createConversation(novelId, message.slice(0, 60), false);
      if (!convId) return toast.error("تعذّر بدء المحادثة");
      setActiveId(convId);
    }
    setInput("");
    setSending(true);
    try {
      await askFn({ data: { conversation_id: convId, message } });
      qc.invalidateQueries({ queryKey: ["ai-msgs", convId] });
      qc.invalidateQueries({ queryKey: ["ai-convs", novelId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطأ غير معروف";
      if (msg === "rate_limited") toast.error("تم تجاوز الحد المسموح، حاول لاحقًا");
      else if (msg === "credits_exhausted") toast.error("رصيد الذكاء الاصطناعي منتهٍ");
      else toast.error(`تعذّر الحصول على إجابة: ${msg}`);
    } finally {
      setSending(false);
    }
  }

  async function togglePinned(c: AiConversation) {
    await pinConversation(c.id, !c.is_pinned);
    qc.invalidateQueries({ queryKey: ["ai-convs", novelId] });
  }

  async function del(c: AiConversation) {
    await deleteConversation(c.id);
    if (activeId === c.id) setActiveId(null);
    qc.invalidateQueries({ queryKey: ["ai-convs", novelId] });
  }

  async function toggleSpoilers(v: boolean) {
    if (!activeConv) return;
    await setConversationSpoilers(activeConv.id, v);
    qc.invalidateQueries({ queryKey: ["ai-convs", novelId] });
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="border-e border-border/60 md:w-56">
        <div className="flex items-center justify-between p-3">
          <span className="text-xs font-semibold text-muted-foreground">المحادثات</span>
          <Button size="icon" variant="ghost" onClick={newConv} aria-label="محادثة جديدة">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="max-h-40 md:max-h-none">
          <ul className="space-y-1 p-2">
            {(conversations.data ?? []).map((c) => (
              <li key={c.id} className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${activeId === c.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/60"}`}>
                <button className="flex-1 truncate text-start" onClick={() => setActiveId(c.id)}>
                  {c.title ?? "محادثة"}
                </button>
                <button onClick={() => togglePinned(c)} aria-label="تثبيت" className={c.is_pinned ? "text-primary" : "opacity-0 group-hover:opacity-100"}>
                  <Pin className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => del(c)} aria-label="حذف" className="opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {(conversations.data ?? []).length === 0 && (
              <li className="px-2 py-4 text-center text-xs text-muted-foreground">لا محادثات بعد</li>
            )}
          </ul>
        </ScrollArea>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>السماح بالحرق</span>
            <Switch checked={!!activeConv?.allow_spoilers} onCheckedChange={toggleSpoilers} disabled={!activeConv} />
          </div>
          {activeConv?.allow_spoilers && <Badge variant="destructive">حرق مفعّل</Badge>}
        </div>
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {(messages.data ?? []).map((m) => (
            <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "ms-auto bg-primary text-primary-foreground" : "me-auto bg-surface"}`}>
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>
          ))}
          {sending && (
            <div className="me-auto flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> يفكر…
            </div>
          )}
          {(messages.data ?? []).length === 0 && !sending && (
            <div className="mx-auto max-w-md rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              اسأل عن الشخصيات، الأحداث، العالم — الإجابة تحترم تقدّمك في القراءة.
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex items-end gap-2 border-t border-border/60 p-3"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل المساعد…"
            rows={2}
            className="flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <Button type="submit" size="icon" disabled={sending || !input.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ---------- Assets ----------

function AssetsTab({ novelId }: { novelId: string }) {
  return (
    <div className="space-y-3 p-4">
      {ASSET_KINDS.map((k) => (
        <AssetCard key={k.key} novelId={novelId} kind={k.key} label={k.label} Icon={k.icon} />
      ))}
    </div>
  );
}

function AssetCard({
  novelId,
  kind,
  label,
  Icon,
}: {
  novelId: string;
  kind: string;
  label: string;
  Icon: typeof BookText;
}) {
  const q = useQuery({
    queryKey: ["ai-asset", novelId, kind],
    queryFn: () => fetchAsset(novelId, kind, "ar"),
  });
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/60 bg-surface/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </span>
        {q.data ? (
          <Badge variant="secondary">جاهز</Badge>
        ) : (
          <Badge variant="outline">لم يُنشأ بعد</Badge>
        )}
      </button>
      {open && (
        <div className="border-t border-border/60 px-4 py-3 text-sm">
          {q.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : q.data ? (
            <AssetContent content={q.data.content} />
          ) : (
            <p className="text-muted-foreground">
              لم يُنشأ هذا الدليل بعد. يمكن للمشرف توليده من لوحة الإدارة.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AssetContent({ content }: { content: unknown }) {
  if (!content || typeof content !== "object") return null;
  const c = content as Record<string, unknown>;
  if (typeof c.summary === "string") {
    return <p className="whitespace-pre-wrap leading-relaxed">{c.summary}</p>;
  }
  if (Array.isArray(c.entries)) {
    return (
      <ul className="space-y-2">
        {(c.entries as Array<{ chapter?: number; title?: string; recap?: string; label?: string; note?: string; kind?: string }>).map(
          (e, i) => (
            <li key={i} className="rounded-md bg-surface/60 p-2">
              <div className="text-xs font-semibold text-primary">
                {e.chapter !== undefined ? `فصل ${e.chapter}` : e.label ?? ""}
                {e.kind ? ` · ${e.kind}` : ""}
              </div>
              {e.title && <div className="font-semibold">{e.title}</div>}
              <div className="text-sm">{e.recap ?? e.note ?? ""}</div>
            </li>
          ),
        )}
      </ul>
    );
  }
  if (Array.isArray(c.characters)) {
    return (
      <ul className="space-y-2">
        {(c.characters as Array<{ name?: string; description?: string; status?: string; first_appearance?: string; abilities?: string[]; relationships?: string[] }>).map(
          (ch, i) => (
            <li key={i} className="rounded-md bg-surface/60 p-2">
              <div className="font-semibold">{ch.name}</div>
              {ch.description && <div className="text-sm">{ch.description}</div>}
              <div className="mt-1 text-xs text-muted-foreground">
                {ch.status && <span>الحالة: {ch.status} · </span>}
                {ch.first_appearance && <span>الظهور: {ch.first_appearance}</span>}
              </div>
            </li>
          ),
        )}
      </ul>
    );
  }
  if (Array.isArray(c.events)) {
    return (
      <ol className="space-y-1 ps-4">
        {(c.events as Array<{ chapter?: number; event?: string }>).map((e, i) => (
          <li key={i} className="text-sm">
            <span className="font-semibold text-primary">فصل {e.chapter}:</span> {e.event}
          </li>
        ))}
      </ol>
    );
  }
  if (Array.isArray(c.sections)) {
    return (
      <div className="space-y-2">
        {(c.sections as Array<{ heading?: string; body?: string }>).map((s, i) => (
          <div key={i}>
            <div className="font-semibold">{s.heading}</div>
            <p className="text-sm">{s.body}</p>
          </div>
        ))}
      </div>
    );
  }
  if (Array.isArray(c.terms)) {
    return (
      <dl className="space-y-1 text-sm">
        {(c.terms as Array<{ term?: string; definition?: string }>).map((t, i) => (
          <div key={i}>
            <dt className="font-semibold">{t.term}</dt>
            <dd className="ps-2 text-muted-foreground">{t.definition}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <pre className="overflow-auto text-xs">{JSON.stringify(c, null, 2)}</pre>;
}
