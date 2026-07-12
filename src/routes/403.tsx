import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/403")({
  head: () => ({
    meta: [
      { title: "403 — غير مصرح" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForbiddenPage,
});

function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-8xl font-black text-gradient-primary">403</h1>
      <h2 className="mt-4 text-2xl font-bold">غير مصرح لك بالوصول</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        هذه الصفحة مخصصة للمشرفين فقط.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-gradient-to-r from-primary to-primary-glow px-6 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
