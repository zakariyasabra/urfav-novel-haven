import cover1 from "@/assets/cover-1.webp";
import cover2 from "@/assets/cover-2.webp";
import cover3 from "@/assets/cover-3.webp";
import cover4 from "@/assets/cover-4.webp";
import cover5 from "@/assets/cover-5.webp";
import hero1 from "@/assets/hero-1.webp";
import hero2 from "@/assets/hero-2.webp";
import hero3 from "@/assets/hero-3.webp";
import { storageImageUrl } from "@/lib/storage-images";

const covers: Record<string, string> = {
  "cover-1": cover1,
  "cover-2": cover2,
  "cover-3": cover3,
  "cover-4": cover4,
  "cover-5": cover5,
};

export function coverUrl(slug: string | null | undefined): string {
  if (!slug) return cover1;
  if (slug.startsWith("http")) return slug;
  if (slug.startsWith("/")) return slug;
  return covers[slug] ?? storageImageUrl(slug);
}

export function absoluteCoverUrl(slug: string | null | undefined, origin: string): string {
  const url = coverUrl(slug);
  if (url.startsWith("http")) return url;
  return new URL(url, origin).toString();
}

/** Desktop-sized hero images (1600w WebP). */
export const heroes = [hero1, hero2, hero3];
