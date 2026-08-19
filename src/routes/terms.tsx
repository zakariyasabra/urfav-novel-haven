import { createFileRoute } from "@tanstack/react-router";
import { canonicalUrl } from "@/lib/site-config";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — FAVNOL" },
      { name: "description", content: "الشروط والأحكام لاستخدام منصة FAVNOL." },
      { property: "og:title", content: "شروط الاستخدام — FAVNOL" },
      { property: "og:description", content: "قواعد الاستخدام العادل للمنصة." },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/terms") }],
  }),
  component: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-6 text-4xl font-black">شروط الاستخدام</h1>
      <div className="prose-reading space-y-4 text-foreground/90">
        <p>باستخدامك لمنصة FAVNOL فإنك توافق على الشروط التالية:</p>
        <h2 className="text-2xl font-bold">1. المحتوى</h2>
        <p>
          جميع الروايات والفصول المعروضة تخضع لحقوق أصحابها، ويُمنع إعادة نشرها أو استخدامها تجاريًا دون
          إذن. FAVNOL منصة عرض ونشر للأعمال وفق حقوق مالكيها.

        </p>
        <h2 className="text-2xl font-bold">2. الحساب والأمان</h2>
        <p>أنت مسؤول عن الحفاظ على سرية بيانات حسابك، وعن جميع الأنشطة التي تتم عبره.</p>
        <h2 className="text-2xl font-bold">3. السلوك المقبول</h2>
        <ul className="list-disc space-y-1 pe-6">
          <li>ممنوع النشر المسيء أو المخالف للقانون في التعليقات</li>
          <li>ممنوع محاولة اختراق أو إساءة استخدام الخدمة</li>
          <li>ممنوع نسخ المحتوى تجارياً دون إذن أصحاب الحقوق</li>
        </ul>
        <h2 className="text-2xl font-bold">4. VIP والاشتراكات</h2>
        <p>الاشتراكات VIP قابلة للإلغاء في أي وقت. لا يوجد استرداد للمبالغ عن الأيام المستخدمة.</p>
        <h2 className="text-2xl font-bold">5. إنهاء الحساب</h2>
        <p>نحتفظ بحق تعليق أو إنهاء أي حساب يخالف هذه الشروط.</p>
      </div>
    </div>
  ),
});
