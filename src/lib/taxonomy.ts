import taxonomyData from "@/data/favnol_taxonomy.json";
import type { Lang } from "@/lib/i18n-content";

export interface TaxonomyTag {
  slug: string;
  name_ar: string;
  name_en: string;
}

export interface TaxonomyCategory {
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  emoji: string;
  icon: string;
  color: string;
  cover_url: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  tags: TaxonomyTag[];
}

interface TaxonomyFile {
  version: string;
  categories: TaxonomyCategory[];
  tags: TaxonomyTag[];
}

const data = taxonomyData as TaxonomyFile;

export function getTaxonomyCategories(): TaxonomyCategory[] {
  return data.categories
    .filter((c) => c.is_active)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getTaxonomyCategory(slug: string): TaxonomyCategory | undefined {
  return data.categories.find((c) => c.slug === slug);
}

export function getAllTaxonomyTags(): TaxonomyTag[] {
  return data.tags;
}

export function pickLocalized(
  cat: Pick<TaxonomyCategory, "name_ar" | "name_en" | "description_ar" | "description_en">,
  lang: Lang,
) {
  const name = lang === "en" ? cat.name_en || cat.name_ar : cat.name_ar || cat.name_en;
  const description =
    lang === "en" ? cat.description_en || cat.description_ar : cat.description_ar || cat.description_en;
  return { name, description };
}

export function pickTagName(tag: TaxonomyTag, lang: Lang) {
  return lang === "en" ? tag.name_en || tag.name_ar : tag.name_ar || tag.name_en;
}
