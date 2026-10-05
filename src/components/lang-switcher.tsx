import { Languages } from "lucide-react";
import { useLang, type AppLang } from "@/lib/i18n";

/** Language picker shown in every page header (main header and full pages). */
export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const options: { id: AppLang; label: string }[] = [{ id: "both", label: "ع | DE" }, { id: "ar", label: "العربية" }, { id: "de", label: "Deutsch" }, { id: "en", label: "English" }];
  return (
    <div className="mt-3 flex items-center justify-center gap-1" role="group" aria-label="اللغة | Sprache">
      <Languages className="h-4 w-4 text-secondary" aria-hidden="true" />
      {options.map((o) => <button key={o.id} type="button" onClick={() => setLang(o.id)} aria-pressed={lang === o.id} className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${lang === o.id ? "bg-secondary text-secondary-foreground" : "text-primary-foreground/75 hover:bg-primary-foreground/10"}`}>{o.label}</button>)}
    </div>
  );
}
