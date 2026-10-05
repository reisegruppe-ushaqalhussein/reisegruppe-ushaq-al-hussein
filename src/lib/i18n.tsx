import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { translateToEnglish } from "./site-content.functions";

export type AppLang = "both" | "ar" | "de" | "en";

const en: Record<string, string> = {
  "Aktuelles": "Latest",
  "Alle unsere religiösen Reisen an einem Ort: Irak, Iran, Umrah und Hadsch.": "All our religious journeys in one place: Iraq, Iran, Umrah and Hajj.",
  "Allgemeine Bittgebete": "General supplications",
  "Anmeldeformular öffnen": "Open registration form",
  "Anmeldung zu den Reisen": "Trip registration",
  "Anmeldung": "Registration",
  "Anmeldung offen": "Registration open",
  "Termin angekündigt": "Date announced",
  "Anrufen": "Call",
  "App teilen": "Share app",
  "Arabische Schriftgröße": "Arabic font size",
  "Arten der Zyarat bei dieser Reise": "Types of Ziyarat on this trip",
  "Besuch der heiligen Stätten im Irak, zu verschiedenen Anlässen im Jahresverlauf.": "Visiting the holy shrines in Iraq on various occasions throughout the year.",
  "Bittgebete & Ziyarat": "Supplications & Ziyarat",
  "Deutsche Schriftgröße": "Translation font size",
  "Dunkelblau": "Dark",
  "Weiß": "Light",
  "Warm": "Sepia",
  "E-Mail öffnen": "Open email",
  "Fadschr": "Fajr",
  "Findet ganzjährig zu unterschiedlichen Terminen statt, passend zu den Schulferien (Winterferien, Neujahr, Osterferien und Sommerferien).": "Takes place year-round on various dates, matching school holidays (winter, New Year, Easter and summer).",
  "Flug": "Flight",
  "Füllen Sie das Formular aus. Unser Team meldet sich anschließend bei Ihnen.": "Fill out the form. Our team will then get in touch with you.",
  "Für Spenden Hajj Yasser Aldor kontaktieren": "Contact Hajj Yasser Aldor to donate",
  "Gebetszeiten": "Prayer times",
  "Geleitet von Hajj Yasser Aldor": "Led by Hajj Yasser Aldor",
  "Hadsch": "Hajj",
  "Heilige Stätten": "Holy shrines",
  "Heiliges Kerbela": "Holy Karbala",
  "Heiliges Maschhad": "Holy Mashhad",
  "Heiliges Nadschaf": "Holy Najaf",
  "Heiliges Qom": "Holy Qom",
  "Heiliges al-Kazimiyya": "Holy al-Kazimiyya",
  "Helfen Sie Pilgern, die ihre Reisekosten nicht selbst tragen können, und unterstützen Sie den Fortbestand der Reisegruppe.": "Help pilgrims who cannot cover their travel costs and support the group's continuity.",
  "Häufige Fragen (FAQ)": "Frequently asked questions",
  "Irak-Reise": "Iraq trip",
  "Iran — Zyarat Imam Rida (as)": "Iran — Ziyarat Imam Rida (as)",
  "Jetzt anmelden": "Register now",
  "Kerbela": "Karbala",
  "Nadschaf": "Najaf",
  "Kommende Reisen": "Upcoming trips",
  "Kontakt": "Contact",
  "Kontaktnummern": "Contact numbers",
  "Leseeinstellungen": "Reading settings",
  "Lesefläche": "Background",
  "Mekka & Medina": "Mecca & Medina",
  "Neuigkeiten": "News",
  "Nur Sofortüberweisung — Keine Ratenzahlung möglich": "Instant bank transfer only — no instalments",
  "Ortszeit Irak — nach jaʿfaritischer Berechnung": "Iraq local time — Jaʿfari calculation",
  "Passen Sie die Darstellung an Ihre Leseweise an.": "Adjust the display to suit your reading.",
  "Rechts": "Right",
  "Zentriert": "Centered",
  "Reisearten": "Trip types",
  "Reisedetails": "Trip details",
  "Reisen": "Trips",
  "Reiseprogramm für diesen Termin": "Programme for this date",
  "Sonnenaufgang": "Sunrise",
  "Spenden für einen Pilger": "Donate for a pilgrim",
  "Spenden": "Donate",
  "Start": "Home",
  "Textausrichtung": "Text alignment",
  "Unterkunft": "Accommodation",
  "Verfügbare Abflughäfen: Frankfurt, Hamburg, Berlin, Düsseldorf (weitere auf Anfrage).": "Departure airports: Frankfurt, Hamburg, Berlin, Düsseldorf (others on request).",
  "Verpflegung": "Meals",
  "Visum & Flughäfen": "Visa & airports",
  "Visum je nach Reisepass:": "Visa depending on passport:",
  "Vollständigen Text herunterladen": "Download full text",
  "Zahlungsmethoden": "Payment methods",
  "Ziyarat & Andachtswerke": "Ziyarat & devotions",
  "Ziyarat der beiden Imame al-Askari (as)": "Ziyarat of the two Imams al-Askari (as)",
  "Ziyarat der beiden Imame al-Kazim (as)": "Ziyarat of the two Imams al-Kazim (as)",
  "Ziyarat des Propheten Muhammad (s)": "Ziyarat of the Prophet Muhammad (s)",
  "Zur Reise anmelden": "Register for this trip",
  "Zyarat Imam Hussein (as) Winterferien / Neujahr": "Ziyarat Imam Hussein (as) Winter holidays / New Year",
  "Verwaltung": "Admin",
  "Sprache": "Language",
  "Übersetzung": "Translation",
  "Lautschrift": "Transliteration",
  "Arabisch": "Arabic",
};

// ---- Automatic translation (English, and German for Arabic-only texts), cached per device ----
type Target = "en" | "de";
const CACHE_KEYS: Record<Target, string> = { en: "en-cache-v1", de: "de-cache-v1" };
const caches: Record<Target, Record<string, string>> = { en: {}, de: {} };
const loaded: Record<Target, boolean> = { en: false, de: false };
const pending: Record<Target, Set<string>> = { en: new Set(), de: new Set() };
const failed: Record<Target, Set<string>> = { en: new Set(), de: new Set() };
const timers: Record<Target, ReturnType<typeof setTimeout> | null> = { en: null, de: null };
const listeners = new Set<() => void>();
const ARABIC = /[\u0600-\u06FF]/;
const NON_TEXT = /^[\d\s+()\-.:/,|€$%#@*•·–—]+$/;

function loadCache(t: Target) {
  if (loaded[t] || typeof window === "undefined") return;
  loaded[t] = true;
  try { caches[t] = JSON.parse(window.localStorage.getItem(CACHE_KEYS[t]) || "{}"); } catch { caches[t] = {}; }
}
async function flush(t: Target) {
  timers[t] = null;
  const batch = [...pending[t]].slice(0, 40);
  batch.forEach((s) => pending[t].delete(s));
  if (!batch.length) return;
  try {
    const r = await translateToEnglish({ data: { texts: batch, target: t } });
    if (r.ok) {
      batch.forEach((s, i) => { caches[t][s] = r.out[i] || s; });
      try { window.localStorage.setItem(CACHE_KEYS[t], JSON.stringify(caches[t])); } catch { /* storage full */ }
      listeners.forEach((l) => l());
    } else batch.forEach((s) => failed[t].add(s));
  } catch { batch.forEach((s) => failed[t].add(s)); }
  if (pending[t].size) timers[t] = setTimeout(() => flush(t), 50);
}
function translate(text: string, t: Target) {
  if (!text || !text.trim() || NON_TEXT.test(text)) return text;
  loadCache(t);
  const hit = caches[t][text];
  if (hit) return hit;
  if (typeof window !== "undefined" && !failed[t].has(text)) {
    pending[t].add(text);
    if (!timers[t]) timers[t] = setTimeout(() => flush(t), 120);
  }
  return text;
}

/** Returns English for a German (or Arabic) source text; unknown texts are translated automatically and appear moments later. */
export const toEnglish = (de: string) => {
  if (!de || !de.trim()) return de;
  if (en[de]) return en[de];
  return translate(de, "en");
};
/** German for a text; Arabic-only texts are translated automatically. */
export const toGerman = (text: string) => (text && ARABIC.test(text) ? translate(text, "de") : text);

/** The single source of truth for what a bilingual pair shows in each language mode. */
export function display(lang: AppLang, ar: string, de: string): { main: string; sub: string } {
  const a = (ar ?? "").trim();
  const d = (de ?? "").trim();
  if (lang === "en") return { main: toEnglish(d || a), sub: "" };
  if (lang === "de") return { main: d && !ARABIC.test(d) ? d : toGerman(d || a), sub: "" };
  if (lang === "ar") return { main: a || d, sub: "" };
  const germanSub = d && d !== a ? (ARABIC.test(d) ? toGerman(d) : d) : (a ? toGerman(a) : "");
  return { main: a || d, sub: germanSub === (a || d) ? "" : germanSub };
}
export const isArabic = (s: string) => ARABIC.test(s);


const LangContext = createContext<{ lang: AppLang; setLang: (l: AppLang) => void; v: number }>({ lang: "both", setLang: () => {}, v: 0 });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLang>("both");
  const [v, setV] = useState(0);
  useLayoutEffect(() => {
    const saved = window.localStorage.getItem("app-lang");
    if (saved === "ar" || saved === "de" || saved === "en" || saved === "both") setLangState(saved);
  }, []);
  useEffect(() => {
    const l = () => setV((x) => x + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "both" ? "ar" : lang;
  }, [lang]);
  const setLang = (l: AppLang) => { setLangState(l); window.localStorage.setItem("app-lang", l); };
  return <LangContext.Provider value={{ lang, setLang, v }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** Shared bilingual text: one language per mode, Arabic above German in "both"; aligns to the start of its own script. */
export function LangText({ ar, de, en: enText, inverse }: { ar: string; de: string; en?: string | undefined; inverse?: boolean | undefined }) {
  const { lang } = useLang();
  const { main, sub } = lang === "en" && enText ? { main: enText, sub: "" } : display(lang, ar, de);
  const rtl = ARABIC.test(main);
  if (!sub) return <span dir={rtl ? "rtl" : "ltr"} className={`block ${rtl ? "text-right" : "text-left"}`}>{main}</span>;
  return <span className="block">{main && <span className="block">{main}</span>}<span lang="de" dir="ltr" className={`block text-[0.8em] italic ${inverse ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{sub}</span></span>;
}
