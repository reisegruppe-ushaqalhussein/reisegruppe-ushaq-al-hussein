import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, type AppLang } from "@/lib/i18n";
import logoAsset from "@/assets/welcome-logo.png.asset.json";
import welcomeBackground from "@/assets/welcome-shrine.jpg";

const languageOptions: Array<{ id: Exclude<AppLang, "both">; label: string }> = [
  { id: "ar", label: "العربية" },
  { id: "de", label: "Deutsch" },
  { id: "en", label: "English" },
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
      <div className="welcome-pattern absolute inset-0 opacity-25" />
      <div className="relative mx-auto flex h-full w-full max-w-[520px] flex-col items-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
        <p lang="ar" dir="rtl" className="welcome-quote font-arabic-display text-lg text-secondary">مَا كَانَ لِلَّهِ يَنْمُو</p>
        <div className="gold-line mt-3 h-px w-28" />

        <div className="welcome-arch relative mt-5 flex min-h-0 w-full flex-1 flex-col items-center justify-center px-5">
          <span className="welcome-gem absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-secondary" />
          <div className="welcome-logo-stage flex h-[clamp(10rem,29vh,14rem)] w-full max-w-[20rem] items-center justify-center">
            <img src={logoAsset.url} alt="شعار حملة عشاق الحسين - ألمانيا" className="max-h-full max-w-full object-contain drop-shadow-2xl" />
          </div>
          <h1 className="font-arabic-display mt-3 text-[clamp(1.55rem,6vw,2.15rem)] font-bold leading-tight text-secondary">حملة عشاق الحسين - ألمانيا</h1>
          <p lang="de" dir="ltr" className="mt-1 text-sm font-semibold text-primary-foreground/90">Reisegruppe Ushaq al-Hussein</p>
          <p lang="ar" dir="rtl" className="font-arabic-display mt-4 text-lg text-primary-foreground">شعارنا المصداقيّة وخدمة الزوّار</p>
          <p lang="de" dir="ltr" className="font-welcome-display mt-1 text-sm text-primary-foreground/75">Gemeinsam reisen. Gemeinsam erleben.</p>
        </div>

        <div className="relative z-10 mt-5 w-full">
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Sprache wählen | اختر اللغة">
            {languageOptions.map((option) => (
              <Button key={option.id} type="button" variant="outline" onClick={() => setLang(option.id)} aria-pressed={selected === option.id} className={`h-11 border-primary-foreground/25 bg-primary/55 px-1 text-xs text-primary-foreground backdrop-blur-md hover:bg-primary-foreground/15 hover:text-primary-foreground ${selected === option.id ? "border-secondary bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground" : ""}`}>
                {selected === option.id && <Check className="h-3.5 w-3.5" />}{option.label}
              </Button>
            ))}
          </div>
          <Button onClick={enter} className="mt-3 h-14 w-full bg-secondary text-base font-extrabold text-secondary-foreground shadow-xl hover:bg-secondary/90">
            <span>تفضل بالدخول</span><span className="opacity-55">/</span><span dir="ltr">App starten</span><ArrowLeft className="h-5 w-5 rotate-180" />
          </Button>
        </div>
      </div>
    </section>
  );
}