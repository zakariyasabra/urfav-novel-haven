import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  AUTHOR_ASSETS_BUCKET,
  storageImageUrl,
  storageObjectPath,
} from "@/lib/storage-images";

type ImageUploaderProps = {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  aspect?: "cover" | "banner" | "square";
  label?: string;
  hint?: string;
  deleteOnRemove?: boolean;
};

const aspectClass: Record<NonNullable<ImageUploaderProps["aspect"]>, string> = {
  cover: "aspect-[2/3]",
  banner: "aspect-[3/1]",
  square: "aspect-square",
};

type UploadResponse = {
  url?: string;
  error?: string;
};

export function ImageUploader({
  value,
  onChange,
  folder = "uploads",
  aspect = "cover",
  label = "Image",
  hint,
  deleteOnRemove = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = storageImageUrl(value);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("اختر ملف صورة صالح.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 5MB.");
      return;
    }

    setBusy(true);

    try {
      /*
       * نستخدم جلسة Supabase فقط لإثبات هوية المستخدم.
       * الصورة نفسها لا يتم رفعها إلى Supabase Storage.
       */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
      }

      const cleanFolder = folder.replace(
        /^\/+|\/+$|[^a-zA-Z0-9/_-]/g,
        "",
      );

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", cleanFolder || "uploads");

      const response = await fetch("/api/media-upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      let result: UploadResponse = {};

      try {
        result = (await response.json()) as UploadResponse;
      } catch {
        // لو السيرفر رجع استجابة غير JSON
      }

      if (!response.ok) {
        throw new Error(
          result.error || `تعذر رفع الصورة (${response.status}).`,
        );
      }

      if (!result.url) {
        throw new Error("تم الرفع لكن لم يتم استلام رابط الصورة.");
      }

      /*
       * نخزن الرابط الكامل القادم من media.favnol.com
       * مثال:
       * https://media.favnol.com/covers/xxxx.jpg
       */
      onChange(result.url);

      toast.success("تم رفع الصورة.");
    } catch (error) {
      console.error("[ImageUploader] upload failed:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر رفع الصورة.",
      );
    } finally {
      setBusy(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function remove() {
    /*
     * نخفي الصورة من الفورم/قاعدة البيانات فورًا.
     */
    onChange(null);

    /*
     * دعم الصور القديمة فقط:
     * لو القيمة القديمة ما زالت تشير إلى Supabase Storage
     * و deleteOnRemove=true نحذفها من Supabase.
     *
     * صور media.favnol.com لا نحاول حذفها من Supabase.
     */
    if (!deleteOnRemove || !value) {
      return;
    }

    try {
      const path = storageObjectPath(value);

      if (!path) {
        return;
      }

      const { error } = await supabase.storage
        .from(AUTHOR_ASSETS_BUCKET)
        .remove([path]);

      if (error) {
        console.error(
          "[ImageUploader] legacy image delete failed:",
          error,
        );
      }
    } catch (error) {
      console.error(
        "[ImageUploader] legacy image delete failed:",
        error,
      );
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{label}</div>

          {hint && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {hint}
            </p>
          )}
        </div>

        {value && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => void remove()}
            disabled={busy}
            aria-label="Remove image"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={`relative grid w-full place-items-center overflow-hidden rounded-xl border border-dashed border-border/70 bg-surface/30 transition hover:border-primary/70 ${aspectClass[aspect]}`}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt=""
              className="h-full w-full object-cover"
            />

            {busy && (
              <div className="absolute inset-0 grid place-items-center bg-background/60">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            )}
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 text-sm font-semibold text-muted-foreground">
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ImagePlus className="h-6 w-6" />
            )}

            {busy ? "جارِ الرفع…" : "رفع صورة"}
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];

          if (file) {
            void upload(file);
          }
        }}
      />
    </div>
  );
}
