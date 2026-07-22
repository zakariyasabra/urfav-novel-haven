import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  AUTHOR_ASSETS_BUCKET,
  safeStorageFileName,
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
      const cleanFolder = folder.replace(/^\/+|\/+$|[^a-zA-Z0-9/_-]/g, "");
      const path = `${cleanFolder || "uploads"}/${safeStorageFileName(file.name)}`;
      const { error } = await supabase.storage
        .from(AUTHOR_ASSETS_BUCKET)
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (error) throw error;
      onChange(path);
      toast.success("تم رفع الصورة.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع الصورة.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    const path = storageObjectPath(value);
    onChange(null);
    if (deleteOnRemove && path) {
      await supabase.storage.from(AUTHOR_ASSETS_BUCKET).remove([path]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {value && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={remove}
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
          <img src={preview} alt="" className="h-full w-full object-cover" />
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
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
