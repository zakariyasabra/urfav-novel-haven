import { supabase } from "@/integrations/supabase/client";

export const AUTHOR_ASSETS_BUCKET = "author-assets";
const AUTHOR_ASSETS_PUBLIC_PATH = `/api/public/storage/${AUTHOR_ASSETS_BUCKET}/`;

export function storageImageUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("http") || value.startsWith("/")) return value;
  return `${AUTHOR_ASSETS_PUBLIC_PATH}${value
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function storageObjectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("http")) return value.replace(/^\/+/, "");

  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/public/${AUTHOR_ASSETS_BUCKET}/`;
    const proxyMarker = AUTHOR_ASSETS_PUBLIC_PATH;
    const proxyIndex = url.pathname.indexOf(proxyMarker);
    if (proxyIndex !== -1)
      return decodeURIComponent(url.pathname.slice(proxyIndex + proxyMarker.length));
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

export function safeStorageFileName(name: string): string {
  const ext =
    name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const allowed = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
  return `${crypto.randomUUID()}.${allowed.has(ext) ? ext : "jpg"}`;
}
