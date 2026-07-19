import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { fetchFaqs } from "@/lib/monetization-api";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "الأسئلة الشائعة — FAVNOL" }] }),
  component: FaqPage,
});

function FaqPage() {
  const q = useQuery({ queryKey: ["faqs-public"], queryFn: () => fetchFaqs(false) });
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-black md:text-4xl">الأسئلة الشائعة</h1>
      <div className="space-y-2">
        {(q.data ?? []).map((f) => (
          <div key={f.id} className="rounded-xl border border-border/40 bg-surface/40">
            <button
              onClick={() => setOpen(open === f.id ? null : f.id)}
              className="flex w-full items-center justify-between gap-3 p-4 text-start"
            >
              <span className="font-bold">{f.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition ${open === f.id ? "rotate-180" : ""}`}
              />
            </button>
            {open === f.id && (
              <div className="border-t border-border/40 p-4 text-sm text-foreground/85 whitespace-pre-line">
                {f.answer}
              </div>
            )}
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
            لا توجد أسئلة بعد.
          </div>
        )}
      </div>
    </div>
  );
}
