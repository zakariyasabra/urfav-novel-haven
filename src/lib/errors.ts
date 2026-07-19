// Friendly Arabic error mapper. Never expose raw Postgres/Supabase text to users.
import { toast } from "sonner";

type AnyError = unknown;

const CODE_MAP: Record<string, string> = {
  "23505": "هذه القيمة موجودة مسبقاً.",
  "23503": "لا يمكن إتمام العملية بسبب ارتباط ببيانات أخرى.",
  "23502": "بيانات مطلوبة ناقصة.",
  "23514": "القيمة المدخلة غير صالحة.",
  "22001": "النص المدخل طويل جداً.",
  "22P02": "صيغة البيانات غير صحيحة.",
  "42501": "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
  "42P01": "خطأ في النظام، حاول لاحقاً.",
  PGRST116: "لم يتم العثور على العنصر المطلوب.",
  PGRST301: "انتهت صلاحية الجلسة، سجّل الدخول مجدداً.",
};

const MESSAGE_PATTERNS: Array<[RegExp, string]> = [
  [/forbidden|permission denied|not authorized/i, "ليس لديك صلاحية لتنفيذ هذا الإجراء."],
  [/not authenticated|jwt|unauthorized|no authorization/i, "يجب تسجيل الدخول أولاً."],
  [/insufficient coins/i, "رصيد العملات غير كافٍ."],
  [/insufficient pending earnings/i, "الأرباح المتاحة غير كافية للسحب."],
  [/minimum 100 coins/i, "الحد الأدنى للسحب هو 100 عملة."],
  [/cannot gift to self/i, "لا يمكنك إهداء نفسك."],
  [/amount must be positive/i, "المبلغ يجب أن يكون أكبر من صفر."],
  [/cannot revoke self admin/i, "لا يمكنك إلغاء دورك كمشرف عام."],
  [/chapter is free/i, "هذا الفصل مجاني بالفعل."],
  [/chapter not found|not found/i, "العنصر المطلوب غير موجود."],
  [/already processed/i, "تم معالجة هذا الطلب مسبقاً."],
  [/duplicate key|already exists|unique/i, "هذه القيمة موجودة مسبقاً."],
  [/rate limit|too many/i, "محاولات كثيرة، حاول بعد قليل."],
  [/network|fetch failed|failed to fetch/i, "تعذر الاتصال بالخادم، تحقق من الإنترنت."],
  [/timeout/i, "انتهت مهلة الطلب، حاول مجدداً."],
  [/invalid file|file too large/i, "الملف غير صالح أو حجمه كبير."],
  [/violates row-level security/i, "ليس لديك صلاحية لتنفيذ هذا الإجراء."],
];

/** Convert any error to a user-safe Arabic message. Never returns raw PG text. */
export function toArabicError(err: AnyError, fallback = "حدث خطأ غير متوقع، حاول مجدداً."): string {
  if (!err) return fallback;
  const e = err as {
    code?: string;
    message?: string;
    error_description?: string;
    details?: string;
    hint?: string;
  };
  // Always log the technical error so devs can debug from console.
  if (typeof console !== "undefined") console.error("[error]", err);
  if (e.code && CODE_MAP[e.code]) return CODE_MAP[e.code];
  const raw = String(e.message || e.error_description || e.details || err);
  // If the backend already raised an Arabic message (RPCs do this), surface it verbatim.
  if (/[\u0600-\u06FF]/.test(raw)) return raw;
  for (const [re, msg] of MESSAGE_PATTERNS) if (re.test(raw)) return msg;
  return fallback;
}

/** Show an Arabic toast for any error. Returns the mapped message. */
export function showError(err: AnyError, fallback?: string): string {
  const msg = toArabicError(err, fallback);
  toast.error(msg);
  return msg;
}

/** Show a success toast in Arabic. */
export function showSuccess(msg: string) {
  toast.success(msg);
}
