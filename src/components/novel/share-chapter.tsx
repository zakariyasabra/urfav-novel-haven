import { useState } from "react";
import { Share2, Copy, Twitter, Facebook, Send, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  slug: string;
  novelTitle: string;
  chapterNum: number;
  chapterTitle?: string;
}

export function ShareChapter({ slug, novelTitle, chapterNum, chapterTitle }: Props) {
  const [open, setOpen] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/novels/${slug}/${chapterNum}`
      : `/novels/${slug}/${chapterNum}`;
  const shareText = `${novelTitle} — الفصل ${chapterNum}${chapterTitle ? `: ${chapterTitle}` : ""} على FAVNOL`;

  async function doShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, text: shareText, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    setOpen(true);
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    toast.success("تم نسخ رابط الفصل");
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={doShare}
        title="مشاركة الفصل"
        aria-label="مشاركة الفصل"
        className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5"
      >
        <Share2 className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border/60 bg-popover p-4 text-popover-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold">مشاركة الفصل</div>
              <button
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-2 text-xs opacity-70">{shareText}</div>
            <div className="grid grid-cols-4 gap-2">
              <ShareBtn label="نسخ" onClick={copy}>
                <Copy className="h-5 w-5" />
              </ShareBtn>
              <ShareBtn
                label="تويتر"
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`}
              >
                <Twitter className="h-5 w-5" />
              </ShareBtn>
              <ShareBtn
                label="فيسبوك"
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
              >
                <Facebook className="h-5 w-5" />
              </ShareBtn>
              <ShareBtn
                label="تيليجرام"
                href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`}
              >
                <Send className="h-5 w-5" />
              </ShareBtn>
            </div>
            <input
              readOnly
              value={url}
              className="mt-3 w-full rounded-md border border-input bg-background/60 p-2 text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        </div>
      )}
    </>
  );
}

function ShareBtn({
  label,
  onClick,
  href,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const cls =
    "flex flex-col items-center gap-1 rounded-lg border border-border/60 p-3 text-xs hover:border-primary hover:text-primary";
  if (href)
    return (
      <a target="_blank" rel="noreferrer" href={href} className={cls}>
        {children}
        <span>{label}</span>
      </a>
    );
  return (
    <button onClick={onClick} className={cls}>
      {children}
      <span>{label}</span>
    </button>
  );
}
