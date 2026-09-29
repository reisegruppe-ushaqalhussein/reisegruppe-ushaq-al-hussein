import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, type AppLang } from "@/lib/i18n";
import welcomeLogoAsset from "@/assets/ushaq-campaign-logo.png.asset.json";

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
    <section className={`welcome-shell fixed inset-0 z-[100] overflow-hidden text-primary ${leaving ? "welcome-leave" : "welcome-arrive"}`} aria-label="Willkommen | أهلاً وسهلاً">
      <div className="relative mx-auto flex h-full w-full max-w-[520px] flex-col items-center px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-center">
        <div className="shrink-0 px-5 pt-3">
          <p lang="ar" dir="rtl" className="font-arabic-display text-xl font-bold text-primary">مَا كَانَ لِلَّهِ يَنْمُو</p>
          <div className="mx-auto mt-3 h-px w-20 bg-secondary" />
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start pt-[clamp(2rem,9vh,5rem)]">
          <img src={welcomeLogoAsset.url} alt="حملة عشاق الحسين - ألمانيا" className="welcome-logo h-auto w-[clamp(8.5rem,39vw,10.5rem)] object-contain" loading="eager" />
          <p lang="ar" dir="rtl" className="font-arabic-display mt-5 text-base font-bold text-primary">شعارنا المصداقيّة وخدمة الزوّار</p>
        </div>

        <div className="relative z-10 mt-auto w-full pt-6">
          <div dir="ltr" className="welcome-language mx-auto grid w-fit grid-cols-3 gap-1 rounded-lg border border-primary/20 p-1" role="group" aria-label="Sprache wählen | اختر اللغة">
            {languageOptions.map((option) => (
              <Button key={option.id} type="button" variant="ghost" onClick={() => setLang(option.id)} aria-pressed={selected === option.id} className={`h-9 min-w-14 px-3 text-xs font-bold text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground ${selected === option.id ? "bg-primary-foreground/15 text-secondary" : ""}`}>
                {option.label}
              </Button>
            ))}
          </div>
          <Button dir="ltr" onClick={enter} className="welcome-enter mt-3 h-14 w-full text-base font-bold text-primary-foreground hover:text-primary-foreground">
            <span dir="rtl">تفضل بالدخول</span><span className="opacity-50">/</span><span>App starten</span><ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}