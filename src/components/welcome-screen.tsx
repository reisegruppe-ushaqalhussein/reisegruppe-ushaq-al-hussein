import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, type AppLang } from "@/lib/i18n";
import welcomeBackgroundAsset from "@/assets/celestial-shrines-splash.jpg.asset.json";
import welcomeLogoAsset from "@/assets/ushaq-original-logo.png.asset.json";
import bismillahAsset from "@/assets/bismillah-rich-gold.png";

const languageOptions: Array<{ id: Exclude<AppLang, "both">; label: string }> = [
  { id: "ar", label: "AR" },
  { id: "de", label: "DE" },
  { id: "en", label: "EN" },
];

const actionLabels: Record<Exclude<AppLang, "both">, string> = {
  ar: "ابدأ الرحلة",
  de: "Reise starten",
  en: "Start Journey",
};

export function WelcomeScreen({ onEnter }: { onEnter: () => void }) {
  const { lang, setLang } = useLang();
  const selected = lang === "both" ? "de" : lang;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);

  const enter = () => {
    setLang(selected);
    window.localStorage.setItem("welcome-seen", "true");
    setLeaving(true);
    window.setTimeout(onEnter, 360);
  };

  return (
    <section className={`welcome-shell fixed inset-0 z-[100] overflow-hidden text-primary-foreground ${leaving ? "welcome-leave" : "welcome-arrive"}`} aria-label="Willkommen | أهلاً وسهلاً">
      <img src={welcomeBackgroundAsset.url} alt="" aria-hidden="true" className="welcome-background absolute inset-0 h-full w-full object-cover" loading="eager" />
      <div className="relative mx-auto flex h-full w-full max-w-[520px] flex-col items-center px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-center">
        <img src={bismillahAsset.url} alt="بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" className="welcome-bismillah mt-1 h-auto w-[min(58vw,13.75rem)] shrink-0 self-center object-contain" loading="eager" />

        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start pt-[clamp(0.65rem,2vh,1.25rem)]">
          <img src={welcomeLogoAsset.url} alt="حملة عشاق الحسين - ألمانيا" className="welcome-logo h-auto w-[clamp(11rem,48vw,13rem)] self-center object-contain" loading="eager" />
          <p dir="ltr" className="welcome-title mx-auto mt-1.5 whitespace-nowrap font-welcome-display text-[clamp(0.7rem,3.2vw,0.85rem)] font-semibold leading-snug text-secondary">Reisegruppe Ushaq al-Hussein</p>
          <p lang="ar" dir="rtl" className="welcome-slogan mx-auto mt-1 font-arabic-display text-[clamp(0.95rem,4.2vw,1.1rem)] font-bold leading-relaxed text-secondary">شعارنا المصداقية وخدمة الزوار</p>
        </div>

        <div className="welcome-actions z-10 pt-6">
          <div dir="ltr" className="welcome-language mx-auto flex w-fit items-center gap-1 rounded-full p-1" role="group" aria-label="Sprache wählen | اختر اللغة">
            {languageOptions.map((option) => (
              <Button key={option.id} type="button" variant="ghost" onClick={() => setLang(option.id)} aria-pressed={selected === option.id} className={`h-9 min-w-[3.25rem] rounded-full px-4 text-xs font-bold tracking-[0.06em] text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground ${selected === option.id ? "welcome-language-active" : ""}`}>
                {option.label}
              </Button>
            ))}
          </div>
          <Button dir={selected === "ar" ? "rtl" : "ltr"} onClick={enter} className="welcome-enter mx-auto mt-3 h-12 w-fit min-w-44 px-7 text-sm font-bold text-primary-foreground hover:text-primary-foreground">
            <span>{actionLabels[selected]}</span><ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
