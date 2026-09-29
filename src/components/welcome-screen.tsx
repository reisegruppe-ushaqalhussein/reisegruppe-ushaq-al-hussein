import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, type AppLang } from "@/lib/i18n";
import logoAsset from "@/assets/welcome-logo.png.asset.json";
import welcomeBackground from "@/assets/welcome-shrine.jpg";

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
    <section className={`welcome-shell fixed inset-0 z-[100] overflow-hidden bg-primary text-primary-foreground ${leaving ? "welcome-leave" : "welcome-arrive"}`} aria-label="Willkommen | أهلاً وسهلاً">
      <img src={welcomeBackground} alt="ضريح مضاء ليلاً | Beleuchteter Schrein bei Nacht" className="absolute inset-0 h-full w-full object-cover" />
      <div className="welcome-overlay absolute inset-0" />
      <div className="relative mx-auto flex h-full w-full max-w-[520px] flex-col items-center px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
        <div className="welcome-text-glow rounded-lg px-5 py-2">
          <p lang="ar" dir="rtl" className="font-arabic-display text-xl text-secondary">مَا كَانَ لِلَّهِ يَنْمُو</p>
          <div className="gold-line mx-auto mt-2 h-px w-24" />
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
          <div className="flex h-[clamp(11rem,31vh,15rem)] w-full max-w-[20rem] items-center justify-center">
            <img src={logoAsset.url} alt="شعار حملة عشاق الحسين - ألمانيا" className="max-h-full max-w-full object-contain drop-shadow-2xl" />
          </div>
          <div className="welcome-text-glow mt-3 rounded-lg px-4 py-3">
            <h1 lang="ar" dir="rtl" className="font-arabic-display text-[clamp(1.7rem,7vw,2.35rem)] font-bold leading-tight text-secondary">حملة عشاق الحسين - ألمانيا</h1>
            <p lang="ar" dir="rtl" className="font-arabic-display mt-2 text-lg text-primary-foreground">شعارنا المصداقيّة وخدمة الزوّار</p>
          </div>
        </div>

        <div className="relative z-10 w-full">
          <div className="welcome-language mx-auto grid w-fit grid-cols-3 gap-1 rounded-lg border border-primary-foreground/20 p-1 backdrop-blur-md" role="group" aria-label="Sprache wählen | اختر اللغة">
            {languageOptions.map((option) => (
              <Button key={option.id} type="button" variant="ghost" onClick={() => setLang(option.id)} aria-pressed={selected === option.id} className={`h-9 min-w-14 px-3 text-xs font-bold text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground ${selected === option.id ? "bg-primary-foreground/20 text-secondary" : ""}`}>
                {option.label}
              </Button>
            ))}
          </div>
          <Button onClick={enter} variant="outline" className="welcome-enter mt-3 h-14 w-full border-primary-foreground/30 text-base font-bold text-primary-foreground backdrop-blur-md hover:text-primary-foreground">
            <span>تفضل بالدخول</span><span className="opacity-50">/</span><span dir="ltr">App starten</span><ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}