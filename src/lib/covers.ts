import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";
import cover4 from "@/assets/cover-4.jpg";
import cover5 from "@/assets/cover-5.jpg";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";

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
  return covers[slug] ?? cover1;
}

export const heroes = [hero1, hero2, hero3];
