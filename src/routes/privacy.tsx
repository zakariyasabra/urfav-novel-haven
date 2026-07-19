import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site-config";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — FAVNOL" },
      { name: "description", content: "كيف نجمع بياناتك ونحميها على منصة FAVNOL." },
      { property: "og:title", content: "سياسة الخصوصية — FAVNOL" },
      { property: "og:description", content: "التزامنا بحماية خصوصية القراء." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/privacy` }],
  }),
  component: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-6 text-4xl font-black">سياسة الخصوصية</h1>
      <div className="prose-reading space-y-4 text-foreground/90">
        <p>آخر تحديث: {new Date().toLocaleDateString("ar-EG")}</p>
        <h2 className="text-2xl font-bold">1. البيانات التي نجمعها</h2>
        <p>
          نجمع الحد الأدنى من البيانات اللازمة لتشغيل الخدمة: البريد الإلكتروني، اسم المستخدم، سجل
          القراءة، والتفضيلات.
        </p>
        <h2 className="text-2xl font-bold">2. كيف نستخدم بياناتك</h2>
        <ul className="list-disc space-y-1 pe-6">
          <li>تخصيص تجربة القراءة (مواصلة القراءة، المفضلة)</li>
          <li>إرسال إشعارات عند تحديث رواياتك المفضلة</li>
          <li>تحسين المنصة عبر تحليلات مجمّعة ومجهولة</li>
        </ul>
        <h2 className="text-2xl font-bold">3. مشاركة البيانات</h2>
        <p>
          لا نبيع بياناتك لأي طرف ثالث. قد نشارك بيانات محدودة مع مزودي البنية التحتية (استضافة،
          تحليلات) تحت اتفاقيات صارمة.
        </p>
        <h2 className="text-2xl font-bold">4. حقوقك</h2>
        <p>
          يحق لك طلب نسخة من بياناتك أو حذف حسابك في أي وقت عبر صفحة{" "}
          <a className="text-primary hover:underline" href="/contact">
            تواصل معنا
          </a>
          .
        </p>
        <h2 className="text-2xl font-bold">5. الكوكيز</h2>
        <p>نستخدم كوكيز أساسية لتسجيل الدخول وحفظ التفضيلات، وكوكيز تحليلات مجهولة.</p>
      </div>
    </div>
  ),
});
