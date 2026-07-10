import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Library, User, Crown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const items: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; accent?: boolean; auth?: boolean }[] = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/search", label: "بحث", icon: Search },
  { to: "/vip", label: "VIP", icon: Crown, accent: true },
  { to: "/library", label: "المكتبة", icon: Library, auth: true },
  { to: "/profile", label: "حسابي", icon: User, auth: true },
];

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const isReader = path.match(/^\/novels\/[^/]+\/\d+/);
  if (isReader) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/" && path.startsWith(it.to));
          const to = it.auth && !user ? "/auth" : it.to;
          const Icon = it.icon;
          return (
            <Link key={it.to} to={to as string}
              className={`grid place-items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}>
              <Icon className={`h-5 w-5 ${it.accent ? "text-primary-glow" : ""}`} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
