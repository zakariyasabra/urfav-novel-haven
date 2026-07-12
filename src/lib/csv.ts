// Simple, safe CSV export for admin tables. UTF-8 BOM so Excel renders Arabic.
function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Prevent CSV injection: prefix cells that start with a formula trigger.
  const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; label: string; format?: (v: unknown, row: T) => unknown }[],
) {
  const header = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(c.format ? c.format(r[c.key], r) : r[c.key])).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
