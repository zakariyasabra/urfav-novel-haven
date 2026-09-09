import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, loading, isBlocked, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (isBlocked) {
      void signOut();
      return;
    }

    if (!user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, isBlocked, signOut, navigate]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        جاري التحميل…
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#080604]" />
    );
  }

  if (!user) return null;

  return <Outlet />;
}
