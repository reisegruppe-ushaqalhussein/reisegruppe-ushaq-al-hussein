import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, type AppLang } from "@/lib/i18n";
import welcomeBackgroundAsset from "@/assets/celestial-shrines-splash.jpg.asset.json";
import welcomeLogoAsset from "@/assets/ushaq-original-logo.png.asset.json";

const languageOptions: Array<{ id: Exclude<AppLang, "both">; label: string }> = [
  { id: "ar", label: "AR" },
  { id: "de", label: "DE" },
  { id: "en", label: "EN" },
];

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
        <div className="shrink-0 px-5 pt-3">
          <p lang="ar" dir="rtl" className="font-arabic-display text-xl font-bold text-primary-foreground">مَا كَانَ لِلَّهِ يَنْمُو</p>
          <div className="mx-auto mt-3 h-px w-20 bg-secondary/90" />
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start pt-[clamp(1.25rem,5vh,3.25rem)]">
          <img src={welcomeLogoAsset.url} alt="حملة عشاق الحسين - ألمانيا" className="welcome-logo h-auto w-[clamp(10rem,47vw,12.5rem)] object-contain" loading="eager" />
          <p dir="ltr" className="welcome-title mt-2 text-[clamp(1.05rem,4.6vw,1.3rem)] font-bold text-primary-foreground">Reisegruppe Ushaq al-Hussein</p>
          <p lang="ar" dir="rtl" className="font-arabic-display mt-2 text-sm font-bold text-secondary">شعارنا المصداقيّة وخدمة الزوّار</p>
        </div>

        <div className="welcome-actions relative z-10 mt-auto w-full pt-6">
          <div dir="ltr" className="welcome-language mx-auto flex w-fit items-center gap-1 rounded-full p-1" role="group" aria-label="Sprache wählen | اختر اللغة">
            {languageOptions.map((option) => (
              <Button key={option.id} type="button" variant="ghost" onClick={() => setLang(option.id)} aria-pressed={selected === option.id} className={`h-9 min-w-[3.25rem] rounded-full px-4 text-xs font-bold tracking-[0.06em] text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground ${selected === option.id ? "welcome-language-active" : ""}`}>
                {option.label}
              </Button>
            ))}
          </div>
          <Button dir="ltr" onClick={enter} className="welcome-enter mt-3 h-14 w-full text-base font-bold text-primary-foreground hover:text-primary-foreground">
            <span dir="rtl">ابدأ الرحلة</span><span className="opacity-50">/</span><span>Reise starten</span><ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
