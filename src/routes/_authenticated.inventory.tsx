import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Package, Check, X } from "lucide-react";

import {
  mkMyInventory, mkMyEquipment, mkEquip, mkUnequip,
  CATEGORY_LABELS_AR, RARITY_STYLES,
  type InventoryItem, type EquipmentSlot, type MarketCategory,
} from "@/lib/marketplace-api";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/inventory")({
  ssr: false,
  component: InventoryPage,
  head: () => ({ meta: [{ title: "حقيبتي — FAVNOL" }] }),
});

function InventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [equip, setEquip] = useState<EquipmentSlot[]>([]);
  const [filter, setFilter] = useState<MarketCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function reload() {
    setLoading(true);
    const [inv, eq] = await Promise.all([mkMyInventory(), mkMyEquipment()]);
    setItems(inv); setEquip(eq); setLoading(false);
  }
  useEffect(() => { if (user) void reload(); }, [user]);

  const cats = Array.from(new Set(items.map((i) => i.category)));
  const shown = items.filter((i) => (filter === "all" || i.category === filter) && (!search || i.title_ar.includes(search)));

  async function onEquip(id: string) {
    const r = await mkEquip(id);
    if (r.ok) { toast.success("تم التجهيز"); void reload(); }
    else toast.error(r.error === "expired" ? "العنصر منتهي" : "تعذّر التجهيز");
  }
  async function onUnequip(slot: string) {
    await mkUnequip(slot); toast.success("تم الإزالة"); void reload();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-black">
        <Package className="h-6 w-6 text-primary" /> حقيبتي
      </h1>

      {equip.length > 0 && (
        <section className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <h2 className="mb-3 text-sm font-bold">العناصر المُجهّزة</h2>
          <div className="flex flex-wrap gap-2">
            {equip.map((e) => (
              <div key={e.slot} className="flex items-center gap-2 rounded-full border border-primary/40 bg-background/60 px-3 py-1 text-xs">
                <span className="font-semibold">{CATEGORY_LABELS_AR[e.slot as MarketCategory] ?? e.slot}:</span>
                <span className="text-muted-foreground">{e.item_code}</span>
                <button onClick={() => onUnequip(e.slot)} className="text-red-400 hover:text-red-300"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-card/50"}`}
        >الكل</button>
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === c ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-card/50"}`}
          >{CATEGORY_LABELS_AR[c]}</button>
        ))}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث…"
          className="ms-auto min-w-[10rem] rounded-full border border-border/50 bg-card/50 px-3 py-1 text-xs"
        />
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-card/40" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card/40 p-10 text-center text-muted-foreground">حقيبتك فارغة</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {shown.map((it) => {
            const r = RARITY_STYLES[it.rarity];
            const equipped = it.is_equipped;
            return (
              <div key={it.id} className={`rounded-xl border ${r.ring} bg-card/70 p-3`}>
                <div className={`mb-1 flex items-center justify-between text-[10px] font-bold uppercase ${r.text}`}>
                  <span>{r.label_ar}</span>
                  <span className="text-muted-foreground">{CATEGORY_LABELS_AR[it.category]}</span>
                </div>
                <div className="mb-2 flex h-16 items-center justify-center rounded-lg bg-background/60 text-2xl">
                  {it.image_url ? <img src={it.image_url} alt="" className="max-h-16" /> : (it.icon ?? "🎁")}
                </div>
                <div className="mb-2 line-clamp-1 text-sm font-bold">{it.title_ar}</div>
                {it.expires_at && <div className="mb-2 text-[10px] text-amber-400">ينتهي: {new Date(it.expires_at).toLocaleDateString("ar-EG")}</div>}
                {it.category === "box" ? (
                  <div className="text-xs text-muted-foreground">افتح الصندوق من صفحة المهام</div>
                ) : (
                  <button
                    onClick={() => equipped ? onUnequip(it.category) : onEquip(it.id)}
                    className={`w-full rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      equipped
                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        : "bg-primary text-primary-foreground hover:brightness-110"
                    }`}
                  >
                    {equipped ? <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> مُجهّز</span> : "تجهيز"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
