import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";
import { gmUseReferral } from "@/lib/gamification-api";
import { toast } from "sonner";

export const Route = createFileRoute("/r/$code")({
  ssr: false,
  component: ReferralLanding,
});

function ReferralLanding() {
  const { code } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      try { sessionStorage.setItem("favnol_ref", code); } catch { /* ignore */ }
      void navigate({ to: "/auth" });
      return;
    }
    (async () => {
      try {
        await gmUseReferral(code);
        toast.success("تمت إضافة مكافأة الإحالة!");
      } catch (e) {
        const msg = (e as Error).message;
        if (!msg.includes("already_referred")) toast.error(msg);
      }
      void navigate({ to: "/" });
    })();
  }, [loading, user, code, navigate]);

  return (
    
      <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">
        جاري تفعيل الإحالة…
      </div>
    
  );
}
