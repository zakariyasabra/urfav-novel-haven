import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Imperative confirm/prompt replacements for window.confirm / window.prompt.
// Usage:
//   if (!(await confirmDialog({ title: "حذف؟", body: "..." }))) return;
//   const note = await promptDialog({ title: "ملاحظة" }); if (note === null) return;

type ConfirmOpts = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};
type PromptOpts = {
  title: string;
  body?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  required?: boolean;
  maxLength?: number;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmReq = { kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void };
type PromptReq = { kind: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void };
type Req = ConfirmReq | PromptReq;

const listeners = new Set<(r: Req) => void>();
function push(r: Req) {
  for (const l of listeners) l(r);
}

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => push({ kind: "confirm", opts, resolve }));
}
export function promptDialog(opts: PromptOpts): Promise<string | null> {
  return new Promise((resolve) => push({ kind: "prompt", opts, resolve }));
}

export function DialogHost() {
  const [queue, setQueue] = useState<Req[]>([]);
  useEffect(() => {
    const l = (r: Req) => setQueue((q) => [...q, r]);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const current = queue[0];
  function done() {
    setQueue((q) => q.slice(1));
  }

  if (!current) return null;

  if (current.kind === "confirm") {
    return (
      <ConfirmUI
        opts={current.opts}
        onDone={(v) => {
          current.resolve(v);
          done();
        }}
      />
    );
  }
  return (
    <PromptUI
      opts={current.opts}
      onDone={(v) => {
        current.resolve(v);
        done();
      }}
    />
  );
}

function Shell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-lg font-black">{title}</h3>
          <button onClick={onClose} aria-label="إغلاق" className="shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmUI({ opts, onDone }: { opts: ConfirmOpts; onDone: (v: boolean) => void }) {
  return (
    <Shell title={opts.title} onClose={() => onDone(false)}>
      {opts.body && (
        <p className="mb-5 text-sm text-muted-foreground whitespace-pre-line">{opts.body}</p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onDone(false)}>
          {opts.cancelLabel ?? "إلغاء"}
        </Button>
        <Button
          onClick={() => onDone(true)}
          className={
            opts.danger ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
          }
        >
          {opts.confirmLabel ?? "تأكيد"}
        </Button>
      </div>
    </Shell>
  );
}

function PromptUI({ opts, onDone }: { opts: PromptOpts; onDone: (v: string | null) => void }) {
  const [val, setVal] = useState(opts.defaultValue ?? "");
  const trimmed = val.trim();
  const valid = !opts.required || trimmed.length > 0;
  function submit() {
    if (!valid) return;
    onDone(val);
  }
  return (
    <Shell title={opts.title} onClose={() => onDone(null)}>
      {opts.body && (
        <p className="mb-3 text-sm text-muted-foreground whitespace-pre-line">{opts.body}</p>
      )}
      {opts.label && <label className="mb-1 block text-xs font-bold">{opts.label}</label>}
      {opts.multiline ? (
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          maxLength={opts.maxLength ?? 500}
          placeholder={opts.placeholder}
          autoFocus
          className="mb-4 min-h-24 w-full resize-none rounded-md border border-input bg-background/60 p-2.5 text-sm outline-none focus:border-primary"
        />
      ) : (
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          maxLength={opts.maxLength ?? 200}
          placeholder={opts.placeholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className="mb-4 h-11 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
        />
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onDone(null)}>
          {opts.cancelLabel ?? "إلغاء"}
        </Button>
        <Button onClick={submit} disabled={!valid}>
          {opts.confirmLabel ?? "تأكيد"}
        </Button>
      </div>
    </Shell>
  );
}
