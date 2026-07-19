import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listClubs } from "@/lib/clubs-api";
import { useT } from "@/i18n/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Plus, Lock } from "lucide-react";

export const Route = createFileRoute("/clubs/")({
  head: () => ({
    meta: [
      { title: "أندية القراءة — FAVNOL" },
      {
        name: "description",
        content: "انضم إلى أندية القراءة وناقش رواياتك المفضلة مع قراء آخرين.",
      },
      { property: "og:title", content: "أندية القراءة — FAVNOL" },
      { property: "og:description", content: "مجتمعات قرائية حول رواياتك المفضلة." },
    ],
  }),
  component: ClubsList,
});

function ClubsList() {
  const t = useT();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["clubs", search],
    queryFn: () => listClubs({ search: search || undefined }),
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t("clubs.title") === "clubs.title" ? "أندية القراءة" : t("clubs.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">ناقش رواياتك مع قراء آخرين</p>
        </div>
        <Button asChild>
          <Link to="/clubs/new">
            <Plus className="me-2 h-4 w-4" /> إنشاء نادي
          </Link>
        </Button>
      </div>

      <Input
        placeholder="ابحث عن نادي…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 max-w-md"
      />

      {isLoading ? (
        <div className="text-muted-foreground py-16 text-center">{t("common.loading")}</div>
      ) : !data || data.length === 0 ? (
        <div className="text-muted-foreground py-16 text-center">
          لا توجد أندية بعد. كن أول من ينشئ نادياً!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((club) => (
            <Link key={club.id} to="/clubs/$slug" params={{ slug: club.slug }}>
              <Card className="hover:border-primary/60 h-full transition-colors">
                {club.cover_url ? (
                  <div className="bg-muted h-32 overflow-hidden rounded-t-lg">
                    <img
                      src={club.cover_url}
                      alt={club.name_ar}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="from-primary/20 to-primary/5 h-32 rounded-t-lg bg-gradient-to-br" />
                )}
                <CardContent className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="line-clamp-1 font-semibold">{club.name_ar}</h3>
                    {club.is_private && <Lock className="text-muted-foreground h-3.5 w-3.5" />}
                  </div>
                  {club.description_ar && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {club.description_ar}
                    </p>
                  )}
                  <div className="text-muted-foreground mt-3 flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {club.member_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> {club.post_count}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
