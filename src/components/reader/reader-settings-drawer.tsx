import {
  Type,
  Moon,
  Sun,
  Palette,
  Minus,
  Plus,
  RotateCcw,
  Play,
  Pause,
  Maximize2,
} from "lucide-react";
import type { ReaderSettings, ReaderTheme, ReaderFont } from "@/hooks/use-reader-settings";
import { Button } from "@/components/ui/button";

const THEMES: { key: ReaderTheme; label: string; swatch: string }[] = [
  { key: "dark", label: "داكن", swatch: "#0f0f11" },
  { key: "amoled", label: "AMOLED", swatch: "#000000" },
  { key: "light", label: "فاتح", swatch: "#ffffff" },
  { key: "sepia", label: "سيبيا", swatch: "#f4ecd8" },
  { key: "soft", label: "ضوء ناعم", swatch: "#1c1a17" },
];

const FONTS: { key: ReaderFont; label: string }[] = [
  { key: "reading", label: "قراءة" },
  { key: "sans", label: "حديث" },
  { key: "display", label: "عريض" },
];

export function ReaderSettingsPanel({
  settings,
  update,
  reset,
  onToggleFullscreen,
}: {
  settings: ReaderSettings;
  update: <K extends keyof ReaderSettings>(k: K, v: ReaderSettings[K]) => void;
  reset: () => void;
  onToggleFullscreen: () => void;
}) {
  return (
    <div className="space-y-5 p-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Palette className="h-3.5 w-3.5" /> السمة
        </div>
        <div className="grid grid-cols-5 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => update("theme", t.key)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] font-semibold transition-all ${
                settings.theme === t.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-border"
              }`}
            >
              <span
                className="h-6 w-6 rounded-full border border-white/10 shadow-inner"
                style={{ background: t.swatch }}
              />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Type className="h-3.5 w-3.5" /> الخط
        </div>
        <div className="grid grid-cols-3 gap-2">
          {FONTS.map((f) => (
            <button
              key={f.key}
              onClick={() => update("font", f.key)}
              className={`rounded-lg border px-2 py-2 text-sm font-bold transition-all ${
                settings.font === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 hover:border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Slider
        label="حجم الخط"
        value={settings.fontSize}
        min={14}
        max={30}
        step={1}
        suffix="px"
        onChange={(v) => update("fontSize", v)}
      />
      <Slider
        label="ارتفاع السطر"
        value={settings.lineHeight}
        min={1.4}
        max={2.4}
        step={0.1}
        onChange={(v) => update("lineHeight", v)}
      />
      <Slider
        label="تباعد الحروف"
        value={settings.letterSpacing}
        min={-0.5}
        max={2}
        step={0.1}
        suffix="px"
        onChange={(v) => update("letterSpacing", v)}
      />

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={settings.autoScroll ? "default" : "secondary"}
          size="sm"
          onClick={() => update("autoScroll", !settings.autoScroll)}
        >
          {settings.autoScroll ? (
            <>
              <Pause className="me-1 h-4 w-4" />
              إيقاف
            </>
          ) : (
            <>
              <Play className="me-1 h-4 w-4" />
              تمرير تلقائي
            </>
          )}
        </Button>
        <Button variant="secondary" size="sm" onClick={onToggleFullscreen}>
          <Maximize2 className="me-1 h-4 w-4" />
          ملء الشاشة
        </Button>
      </div>

      {settings.autoScroll && (
        <Slider
          label="سرعة التمرير"
          value={settings.autoScrollSpeed}
          min={10}
          max={120}
          step={5}
          onChange={(v) => update("autoScrollSpeed", v)}
        />
      )}

      <div className="flex items-center justify-between border-t border-border/40 pt-3">
        <button
          onClick={reset}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> إعادة تعيين
        </button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {settings.theme === "light" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {Number.isInteger(step) ? value : value.toFixed(1)}
          {suffix ?? ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border/60 text-muted-foreground hover:bg-secondary"
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-primary"
        />
        <button
          onClick={() => onChange(Math.min(max, Math.round((value + step) * 10) / 10))}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border/60 text-muted-foreground hover:bg-secondary"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
