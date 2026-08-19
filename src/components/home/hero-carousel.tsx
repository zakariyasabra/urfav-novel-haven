import { memo, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { heroes, heroesSmall, heroesMedium } from "@/lib/covers";
import { useT } from "@/i18n/provider";

/**
 * Isolated so the 6s slide timer only re-renders the hero, not the whole
 * homepage tree (previously every section re-rendered every 6 seconds).
 * Markup and styling are unchanged from the original inline hero.
 */
function HeroCarouselBase() {
  const t = useT();
  const [slide, setSlide] = useState(0);

  const heroSlides = [
    {
      img: heroes[0],
      imgSm: heroesSmall[0],
      imgMd: heroesMedium[0],
      title: t("home.hero1.title"),
      subtitle: t("home.hero1.subtitle"),
    },
    {
      img: heroes[1],
      imgSm: heroesSmall[1],
      imgMd: heroesMedium[1],
      title: t("home.hero2.title"),
      subtitle: t("home.hero2.subtitle"),
    },
    {
      img: heroes[2],
      imgSm: heroesSmall[2],
      imgMd: heroesMedium[2],
      title: t("home.hero3.title"),
      subtitle: t("home.hero3.subtitle"),
    },
  ];

  useEffect(() => {
    const tm = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 6000);
    return () => clearInterval(tm);
  }, [heroSlides.length]);

  const s = heroSlides[slide];

  return (
    <section className="relative h-[460px] w-full overflow-hidden sm:h-[520px] md:h-[620px]">
      {heroSlides.map((hs, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? "opacity-100" : "opacity-0"}`}
        >
          <img
            src={hs.imgSm}
            srcSet={`${hs.imgSm} 768w, ${hs.imgMd} 1200w, ${hs.img} 1600w`}
            sizes="100vw"
            alt=""
            className="h-full w-full object-cover"
            width={1920}
            height={1088}
            loading={i === 0 ? "eager" : "lazy"}
            decoding={i === 0 ? "sync" : "async"}
            {...(i === 0 ? { fetchPriority: "high" as const } : {})}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-l from-background/80 via-transparent to-transparent" />
        </div>
      ))}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:pb-16">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Sparkles className="h-3.5 w-3.5" /> {t("home.badge")}
          </div>
          <h1 className="text-3xl font-black leading-tight sm:text-4xl md:text-6xl">
            <span className="text-gradient-primary">{s.title}</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg md:text-xl">
            {s.subtitle}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 sm:mt-6 sm:gap-3">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90"
            >
              <Link to="/latest">{t("home.startReading")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary/40">
              <Link to="/categories">{t("home.browseCategories")}</Link>
            </Button>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 sm:mt-8">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all ${i === slide ? "w-8 bg-primary" : "w-4 bg-white/30 hover:bg-white/60"}`}
              aria-label={t("home.slide", { n: i + 1 })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export const HeroCarousel = memo(HeroCarouselBase);
