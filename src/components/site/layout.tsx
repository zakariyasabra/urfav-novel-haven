import { Link, useRouterState } from "@tanstack/react-router";
import { Search, User as UserIcon, Library, LogOut, Shield, BookOpen, Crown, PenLine, Wallet } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications-bell";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/", label: "الرئيسية" },
  { to: "/latest", label: "آخر التحديثات" },
  { to: "/popular", label: "الأكثر شعبية" },
  { to: "/categories", label: "التصنيفات" },
  { to: "/completed", label: "المكتملة" },
  { to: "/vip", label: "VIP", accent: true },
];

export function SiteHeader() {
  const { user, isAdmin, isAuthor, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const isReader = /^\/novels\/[^/]+\/\d+/.test(pathname);
  if (isReader) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <div className="text-lg font-black tracking-tight">
              UR <span className="text-gradient-primary">Fav</span> Novel
            </div>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link key={n.to} to={n.to}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  n.accent
                    ? "bg-gradient-to-r from-primary/20 to-primary-glow/20 text-primary-glow hover:from-primary/30 hover:to-primary-glow/30"
                    : active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}>
                {n.accent && <Crown className="h-3.5 w-3.5" />}
                {n.label}
              </Link>
            );
          })}
        </nav>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) window.location.href = `/search?q=${encodeURIComponent(q.trim())}`;
          }}
          className="ms-auto hidden items-center md:flex">
          <div className="relative">
            <Search className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن رواية..."
              className="h-9 w-56 rounded-md border border-input bg-secondary/50 ps-3 pe-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
          </div>
        </form>

        <Link to="/search" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden">
          <Search className="h-5 w-5" />
        </Link>

        <NotificationsBell />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="me-2 h-4 w-4" />الملف الشخصي</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/library"><Library className="me-2 h-4 w-4" />مكتبتي</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/wallet"><Wallet className="me-2 h-4 w-4" />المحفظة</Link></DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={isAuthor ? "/author" : "/author/apply"}><PenLine className="me-2 h-4 w-4" />{isAuthor ? "لوحة الكاتب" : "كن كاتباً"}</Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild><Link to="/admin"><Shield className="me-2 h-4 w-4" />لوحة الإدارة</Link></DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="me-2 h-4 w-4" />تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90">
            <Link to="/auth">دخول</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isReader = /^\/novels\/[^/]+\/\d+/.test(pathname);
  if (isReader) return null;
  return (
    <footer className="mt-24 border-t border-border/60 bg-surface/40 pb-[calc(env(safe-area-inset-bottom)+68px)] lg:pb-6">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="text-lg font-black">UR <span className="text-gradient-primary">Fav</span> Novel</div>
          </div>
          <p className="text-sm text-muted-foreground">
            منصتك المفضلة لقراءة الروايات المترجمة بأعلى جودة، مجاناً وبتصميم عصري أنيق.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">التصفح</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/latest" className="hover:text-primary">آخر التحديثات</Link></li>
            <li><Link to="/popular" className="hover:text-primary">الأكثر شعبية</Link></li>
            <li><Link to="/completed" className="hover:text-primary">الروايات المكتملة</Link></li>
            <li><Link to="/ongoing" className="hover:text-primary">الروايات المستمرة</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">المستخدم</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-primary">تسجيل الدخول</Link></li>
            <li><Link to="/library" className="hover:text-primary">مكتبتي</Link></li>
            <li><Link to="/wallet" className="hover:text-primary">المحفظة</Link></li>
            <li><Link to="/profile" className="hover:text-primary">الملف الشخصي</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">قانوني</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary">من نحن</Link></li>
            <li><Link to="/contact" className="hover:text-primary">تواصل معنا</Link></li>
            <li><Link to="/privacy" className="hover:text-primary">سياسة الخصوصية</Link></li>
            <li><Link to="/terms" className="hover:text-primary">شروط الاستخدام</Link></li>
            <li><Link to="/dmca" className="hover:text-primary">بلاغ حقوق النشر</Link></li>
            <li><Link to="/vip" className="hover:text-primary">اشتراك VIP</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} UR Fav Novel — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}
