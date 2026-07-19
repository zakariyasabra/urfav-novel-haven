import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user]);
  if (loading)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        جاري التحميل…
      </div>
    );
  if (!user) return null;
  return <Outlet />;
}
