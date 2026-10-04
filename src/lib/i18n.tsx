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

// ---- English: built-in dictionary + automatic translation cache for everything else ----
const CACHE_KEY = "en-cache-v1";
let cache: Record<string, string> = {};
let loaded = false;
const pending = new Set<string>();
const failed = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function loadCache() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { cache = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "{}"); } catch { cache = {}; }
}
async function flush() {
  timer = null;
  const batch = [...pending].slice(0, 40);
  batch.forEach((t) => pending.delete(t));
  if (!batch.length) return;
  try {
    const r = await translateToEnglish({ data: { texts: batch } });
    if (r.ok) {
      batch.forEach((t, i) => { cache[t] = r.out[i]; });
      try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* storage full */ }
      listeners.forEach((l) => l());
    } else batch.forEach((t) => failed.add(t));
  } catch { batch.forEach((t) => failed.add(t)); }
  if (pending.size) timer = setTimeout(flush, 50);
}

/** Returns English for a German (or Arabic) source text; unknown texts are translated automatically and appear moments later. */
export const toEnglish = (de: string) => {
  if (!de || !de.trim()) return de;
  if (en[de]) return en[de];
  loadCache();
  if (cache[de]) return cache[de];
  if (typeof window !== "undefined" && !failed.has(de) && !/^[\d\s+()\-.:/,]+$/.test(de)) {
    pending.add(de);
    if (!timer) timer = setTimeout(flush, 120);
  }
  return de;
};

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
    document.documentElement.dir = lang === "ar" || lang === "both" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = (l: AppLang) => { setLangState(l); window.localStorage.setItem("app-lang", l); };
  return <LangContext.Provider value={{ lang, setLang, v }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
