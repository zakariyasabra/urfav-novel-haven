import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site-config";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — UR Fav Novel" },
      { name: "description", content: "منصة UR Fav Novel: قصتنا، رؤيتنا، وفريقنا." },
      { property: "og:title", content: "من نحن — UR Fav Novel" },
      { property: "og:description", content: "منصة عربية عصرية لقراءة الروايات ." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
  }),
  component: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-6 text-4xl font-black">من نحن</h1>
      <div className="prose-reading space-y-4 text-foreground/90">
        <p>UR Fav Novel هي منصة عربية مخصصة لعشاق الروايات  تأسست بهدف تقديم تجربة قراءة عصرية وأنيقة تليق بالقارئ العربي.</p>
        <p>نؤمن بأن القصص العظيمة تستحق أن تُقرأ بأفضل شكل ممكن. لذلك بنينا منصة سريعة،  وبواجهة مصممة خصيصاً للقراءة المطولة.</p>
        <h2 className="text-2xl font-bold">رؤيتنا</h2>
        <p>أن نصبح الوجهة الأولى لقراء الروايات  في العالم العربي، وأن نمنح  منصة عادلة لعرض أعمالهم.</p>
        <h2 className="text-2xl font-bold">ماذا نقدم؟</h2>
        <ul className="list-disc space-y-1 pe-6">
          <li>آلاف الروايات  بجودة عالية</li>
          <li>قراءة مجانية بلا قيود</li>
          <li>واجهة عصرية مع أوضاع قراءة متعددة</li>
          <li>مجتمع نشط من القراء المتفاعلين</li>
          <li>عضوية VIP اختيارية لتجربة أفضل</li>
        </ul>
      </div>
    </div>
  ),
});
