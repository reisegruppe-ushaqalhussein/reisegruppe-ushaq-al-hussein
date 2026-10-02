import { createPortal } from "react-dom";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { fetchContentOfflineFirst, OfflineMissingError } from "@/lib/offline";
import { OfflineFallback } from "@/components/offline-status";
import { defaultContacts, defaultContent, duaCategoryOf, type ContactEntry, type TripEntry, type FaqEntry, type NewsEntry, type DuaCategory, type SiteContent } from "@/lib/site-content";
import { LangProvider, toEnglish, useLang, type AppLang } from "@/lib/i18n";
import { DuaAddButton, DuaAdminActions, useAdminPassword } from "@/components/dua-admin";
import { ReciterPlayer } from "@/components/audio-player";
import { GuideView, ItineraryView, TasbeehView } from "@/components/extras";
import { WelcomeScreen } from "@/components/welcome-screen";
import { enablePush } from "@/lib/push";
import { Bell, CalendarClock, Compass, Eye, EyeOff, Feather, MapPin, Minus, Moon, Plus, Sun, Vibrate } from "lucide-react";
import { QiblaView, ResourcesView, useFavorites } from "@/components/group2";
import { AddButton, ItemActions, useSaveContent, type FieldDef } from "@/components/inline-admin";
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeft,
  AlignCenter,
  AlignRight,
  BookOpen,
  Check,
  Clock,
  Copy,
  CreditCard,
  Download,
  Facebook,
  Instagram,
  Siren,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  CircleCheck,
  HandHeart, HelpCircle,
  Home,
  Hotel,
  IdCard,
  Landmark,
  Luggage,
  Megaphone,
  MessageCircle,
  Mail,
  Music2,
  MoonStar,
  Phone,
  Plane,
  Pause,
  Play,
  Settings,
  Globe,
  Type as TypeIcon,
  Languages,
  ScrollText,
  Share2,
  Soup,
  Sparkles,
  Star,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import shrineImage from "@/assets/karbala-shrine.jpg";
import iraqInvitation from "@/assets/invitation_iraq_2026-12.jpg.asset.json";
import winterInvitation from "@/assets/invitation_winter_new_year_2026-12.jpg.asset.json";
import umrahInvitation from "@/assets/invitation_umrah_2027-01.jpg.asset.json";
import najafShrine from "@/assets/shrine-najaf.jpg";
import kazimiyyaShrine from "@/assets/shrine-kazimiyya.jpg";
import samarraShrine from "@/assets/shrine-samarra.jpg";
import mashhadShrine from "@/assets/shrine-mashhad.jpg";
import qomShrine from "@/assets/shrine-qom.jpg";
import meccaMedinaShrine from "@/assets/shrine-mecca-medina.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "حملة عشاق الحسين - ألمانيا | Reisegruppe Ushaq al-Hussein" },
      { name: "description", content: "رحلات دينية إلى العراق وإيران والعمرة والحج | Religiöse Reisen in den Irak, Iran, zur Umrah und zum Hadsch" },
      { property: "og:title", content: "حملة عشاق الحسين - ألمانيا | Reisegruppe Ushaq al-Hussein" },
      { property: "og:description", content: "كل رحلاتنا الدينية بمكان واحد | Alle religiösen Reisen an einem Ort" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(contentQuery),
  component: Index,
  errorComponent: ({ error }) => (error instanceof OfflineMissingError || (typeof navigator !== "undefined" && !navigator.onLine) ? <OfflineFallback /> : <div className="p-6 text-center">تعذّر تحميل المحتوى | Inhalt konnte nicht geladen werden</div>),
});

const contentQuery = queryOptions({ queryKey: ["site-content"], queryFn: fetchContentOfflineFirst, networkMode: "offlineFirst", retry: 1 });

const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdpuQ5tU5kNJL7Pp8f-vwALemNfp8NF2qRWazP5yb1UP2nDeg/viewform";
const officialEmail = "ushaqalhussein.contact@gmail.com";
const socialLinks = [
  { href: "https://www.instagram.com/reisegruppe_ushaq_al_hussein", label: "إنستغرام | Instagram", icon: Instagram },
  { href: "https://www.facebook.com/share/1KF3URwHzk/", label: "فيسبوك | Facebook", icon: Facebook },
  { href: "https://www.tiktok.com/@reise_ushaq_alhussein", label: "تيك توك | TikTok", icon: Music2 },
];

type View = "home" | "trips" | "registration" | "contacts" | "news" | "donations" | "duas" | "itinerary" | "guide" | "tasbeeh" | "qibla" | "occasions" | "hadiths" | "faqs" | "visa" | "favorites";
type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
type PairProps = { ar: string; de: string; align?: "right" | "center"; inverse?: boolean };

function Pair({ ar, de, align = "right", inverse = false }: PairProps) {
  const { lang } = useLang();
  const alignCls = align === "center" ? "text-center" : "text-right";
  if (lang === "ar") return <span lang="ar" dir="rtl" className={`block font-bold leading-relaxed ${alignCls}`}>{ar}</span>;
  if (lang === "de" || lang === "en") return <span lang={lang} dir="ltr" className={`block font-bold leading-snug ${align === "center" ? "text-center" : "text-left"}`}>{lang === "en" ? toEnglish(de) : de}</span>;
  return (
    <span className={`block ${align === "center" ? "text-center" : "text-right"}`}>
      <span lang="ar" dir="rtl" className="block font-bold leading-relaxed">{ar}</span>
      <span lang="de" dir="ltr" className={`mt-0.5 block text-[0.72em] font-medium italic leading-snug ${inverse ? "text-primary-foreground/65" : "text-muted-foreground"}`}>{de}</span>
    </span>
  );
}

const tripMeta: Record<string, { statusAr: string; statusDe: string; icon: IconType; image: string | null }> = {
  iraq: { statusAr: "التسجيل مفتوح", statusDe: "Anmeldung offen", icon: Landmark, image: iraqInvitation.url },
  winter: { statusAr: "التسجيل مفتوح", statusDe: "Anmeldung offen", icon: Landmark, image: winterInvitation.url },
  umrah: { statusAr: "موعد معلن", statusDe: "Termin angekündigt", icon: MoonStar, image: umrahInvitation.url },
};
const fallbackMeta = { statusAr: "موعد معلن", statusDe: "Termin angekündigt", icon: CalendarDays as IconType, image: null };
type UpcomingTrip = SiteContent["trips"][number] & (typeof tripMeta)[string];

type AdminProps = { password: string; content: SiteContent } | null;
const tripFields: FieldDef[] = [
  { key: "ar", ar: "اسم الرحلة", de: "Reisename" }, { key: "de", ar: "الاسم بالألمانية", de: "Name (DE)", ltr: true },
  { key: "date", ar: "التاريخ", de: "Datum", ltr: true },
  { key: "statusAr", ar: "الحالة (مثلاً: التسجيل مفتوح / اكتمل العدد)", de: "Status (AR)" }, { key: "statusDe", ar: "الحالة بالألمانية", de: "Status (DE)", ltr: true },
  { key: "descAr", ar: "الوصف", de: "Beschreibung (AR)", multiline: true }, { key: "descDe", ar: "الوصف بالألمانية", de: "Beschreibung (DE)", ltr: true, multiline: true },
  { key: "programAr", ar: "برنامج هذه الرحلة", de: "Reiseprogramm (AR)", multiline: true }, { key: "programDe", ar: "البرنامج بالألمانية", de: "Reiseprogramm (DE)", ltr: true, multiline: true },
  { key: "visible", ar: "إظهار للزوار", de: "Sichtbar", checkbox: true },
];
const faqFields: FieldDef[] = [
  { key: "qAr", ar: "السؤال", de: "Frage (AR)" }, { key: "qDe", ar: "السؤال بالألمانية", de: "Frage (DE)", ltr: true }, { key: "qEn", ar: "السؤال بالإنجليزية", de: "Frage (EN)", ltr: true },
  { key: "aAr", ar: "الجواب", de: "Antwort (AR)", multiline: true }, { key: "aDe", ar: "الجواب بالألمانية", de: "Antwort (DE)", ltr: true, multiline: true }, { key: "aEn", ar: "الجواب بالإنجليزية", de: "Antwort (EN)", ltr: true, multiline: true },
];
const programFields: FieldDef[] = [
  { key: "programAr", ar: "برنامج الرحلة (التجمع، الانطلاق، الفنادق)", de: "Programm (AR)", multiline: true }, { key: "programDe", ar: "البرنامج بالألمانية", de: "Programm (DE)", ltr: true, multiline: true },
];
const visaFields: FieldDef[] = [
  { key: "eu", ar: "رسوم الفيزا — جواز أوروبي", de: "Visumgebühr EU", ltr: true }, { key: "nonEu", ar: "رسوم الفيزا — جواز غير أوروبي", de: "Visumgebühr Nicht-EU", ltr: true },
  { key: "airportsAr", ar: "المطارات", de: "Flughäfen (AR)", multiline: true }, { key: "airportsDe", ar: "المطارات بالألمانية", de: "Flughäfen (DE)", ltr: true, multiline: true },
];
const newsFields: FieldDef[] = [
  { key: "ar", ar: "العنوان", de: "Titel (AR)" }, { key: "de", ar: "العنوان بالألمانية", de: "Titel (DE)", ltr: true },
  { key: "bodyAr", ar: "النص", de: "Text (AR)", multiline: true }, { key: "bodyDe", ar: "النص بالألمانية", de: "Text (DE)", ltr: true, multiline: true },
];
const contactFields: FieldDef[] = [
  { key: "ar", ar: "الاسم", de: "Name (AR)" }, { key: "de", ar: "الاسم بالألمانية", de: "Name (DE)", ltr: true },
  { key: "roleAr", ar: "الصفة", de: "Rolle (AR)" }, { key: "roleDe", ar: "الصفة بالألمانية", de: "Rolle (DE)", ltr: true },
  { key: "phone", ar: "رقم الهاتف", de: "Telefonnummer", ltr: true }, { key: "whatsapp", ar: "رابط واتساب", de: "WhatsApp-Link", ltr: true },
  { key: "visible", ar: "إظهار للزوار", de: "Für Besucher sichtbar", checkbox: true },
];
const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;


const generalTrips = [
  { id: "iraq", ar: "زيارة العراق", de: "Irak-Reise", icon: Landmark, statusAr: "عرض التفاصيل", statusDe: "Details anzeigen" },
  { id: "umrah", ar: "العمرة", de: "Umrah", icon: MoonStar, statusAr: "زيارة عامة", statusDe: "Allgemeine Reiseart" },
  { id: "iran", ar: "إيران — زيارة الإمام الرضا (ع)", de: "Iran — Zyarat Imam Rida (as)", icon: Sparkles, statusAr: "سيُعلن قريباً", statusDe: "Wird bald bekannt gegeben" },
  { id: "hajj", ar: "الحج", de: "Hadsch", icon: Star, statusAr: "سيُعلن قريباً", statusDe: "Wird bald bekannt gegeben" },
];



const viewTitles: Record<View, { ar: string; de: string }> = {
  home: { ar: "الرئيسية", de: "Start" },
  trips: { ar: "الرحلات", de: "Reisen" },
  registration: { ar: "التسجيل", de: "Anmeldung" },
  contacts: { ar: "التواصل", de: "Kontakt" },
  news: { ar: "الأخبار", de: "Neuigkeiten" },
  donations: { ar: "المساهمة", de: "Spenden" },
  duas: { ar: "الأدعية والزيارات", de: "Bittgebete & Ziyarat" },
  itinerary: { ar: "جدول الرحلة", de: "Tagesprogramm" },
  guide: { ar: "دليل الإقامة والمواقع", de: "Unterkunft & Orte" },
  tasbeeh: { ar: "السبحة الإلكترونية", de: "Digitale Tasbih" },
  qibla: { ar: "اتجاه القبلة", de: "Qibla-Kompass" },
  occasions: { ar: "المناسبات الخاصة", de: "Besondere Anlässe" },
  hadiths: { ar: "الأحاديث والروايات", de: "Hadithe & Überlieferungen" },
  faqs: { ar: "الأسئلة الشائعة", de: "Häufige Fragen (FAQ)" },
  visa: { ar: "الفيزا والمطارات", de: "Visum & Flughäfen" },
  favorites: { ar: "محفوظاتي", de: "Meine Favoriten" },
};

function AppHeader({ view, onHome }: { view: View; onHome: () => void }) {
  return (
    <header className="bg-primary px-5 pb-5 pt-6 text-primary-foreground">
      <div className="flex items-center justify-between gap-4">
        {view !== "home" ? (
          <Button variant="ghost" size="icon" onClick={onHome} aria-label="العودة للرئيسية | Zurück zur Startseite" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
            <ArrowLeft className="rotate-180" />
          </Button>
        ) : <span className="h-9 w-9" />}
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-extrabold">حملة عشاق الحسين (ع) — ألمانيا</p>
          <p lang="de" dir="ltr" className="mt-1 text-[10px] font-medium text-primary-foreground/65">Reisegruppe Ushaq al-Hussein (as) — Deutschland</p>
          <div className="gold-line mx-auto my-3 h-px w-24" />
          <Pair ar={viewTitles[view].ar} de={viewTitles[view].de} align="center" inverse />
        </div>
        <DarkModeToggle />
      </div>
      <LanguageSwitcher />
    </header>
  );
}

function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { const on = localStorage.getItem("dark-mode") === "1"; setDark(on); document.documentElement.classList.toggle("dark", on); }, []);
  const flip = () => { const on = !dark; setDark(on); localStorage.setItem("dark-mode", on ? "1" : "0"); document.documentElement.classList.toggle("dark", on); navigator.vibrate?.(10); };
  return <button type="button" onClick={flip} aria-pressed={dark} aria-label="الوضع الليلي | Nachtmodus" className="grid h-9 w-9 place-items-center rounded-md border border-secondary/50 text-secondary transition-colors hover:bg-secondary/15">{dark ? <Sun className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}</button>;
}

function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const options: { id: AppLang; label: string }[] = [{ id: "both", label: "ع | DE" }, { id: "ar", label: "العربية" }, { id: "de", label: "Deutsch" }, { id: "en", label: "English" }];
  return (
    <div className="mt-3 flex items-center justify-center gap-1" role="group" aria-label="اللغة | Sprache">
      <Languages className="h-4 w-4 text-secondary" aria-hidden="true" />
      {options.map((o) => <button key={o.id} type="button" onClick={() => setLang(o.id)} aria-pressed={lang === o.id} className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${lang === o.id ? "bg-secondary text-secondary-foreground" : "text-primary-foreground/75 hover:bg-primary-foreground/10"}`}>{o.label}</button>)}
    </div>
  );
}

function NavLabel({ ar, de }: { ar: string; de: string }) {
  const { lang } = useLang();
  if (lang === "ar") return <span className="text-[10px] font-bold leading-none">{ar}</span>;
  if (lang === "de" || lang === "en") return <span dir="ltr" className="max-w-full truncate text-[10px] font-bold leading-none">{lang === "en" ? toEnglish(de) : de}</span>;
  return <><span className="text-[10px] font-bold leading-none">{ar}</span><span lang="de" dir="ltr" className="max-w-full truncate text-[8px] italic leading-none">{de}</span></>;
}

function ScreenTitle({ icon: Icon, ar, de }: { icon: IconType; ar: string; de: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <h2 className="text-xl text-primary"><Pair ar={ar} de={de} /></h2>
    </div>
  );
}

function HomeView({ go, content, admin, payment }: { go: (view: View) => void; content: SiteContent; admin: AdminProps; payment: SiteContent["payment"] }) {
  const actions: Array<{ view: View; ar: string; de: string; icon: IconType }> = [
    { view: "trips", ar: "الرحلات", de: "Reisen", icon: Luggage },
    { view: "registration", ar: "التسجيل", de: "Anmeldung", icon: ScrollText },
    { view: "contacts", ar: "التواصل", de: "Kontakt", icon: Phone },
    { view: "news", ar: "الأخبار", de: "Neuigkeiten", icon: Megaphone },
    { view: "duas", ar: "الأدعية والزيارات", de: "Bittgebete & Ziyarat", icon: BookOpen },
    { view: "itinerary", ar: "جدول الرحلة", de: "Tagesprogramm", icon: CalendarClock },
    { view: "guide", ar: "دليل الإقامة والمواقع", de: "Unterkunft & Orte", icon: MapPin },
    { view: "tasbeeh", ar: "السبحة الإلكترونية", de: "Digitale Tasbih", icon: Vibrate },
    { view: "qibla", ar: "اتجاه القبلة", de: "Qibla-Kompass", icon: Compass },
    { view: "occasions", ar: "المناسبات الخاصة", de: "Besondere Anlässe", icon: Sparkles },
    { view: "hadiths", ar: "الأحاديث والروايات", de: "Hadithe & Überlieferungen", icon: Feather },
    { view: "faqs", ar: "الأسئلة الشائعة", de: "Häufige Fragen (FAQ)", icon: HelpCircle },
    { view: "visa", ar: "الفيزا والمطارات", de: "Visum & Flughäfen", icon: IdCard },
    { view: "favorites", ar: "محفوظاتي", de: "Meine Favoriten", icon: Star },
    { view: "donations", ar: "المساهمة", de: "Spenden", icon: HandHeart },
  ];
  return (
    <div className="screen-enter px-4 py-5">
      <section className="overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-md">
        <div className="relative h-28 overflow-hidden">
          <img src={shrineImage} alt="مرقد الإمام الحسين في كربلاء | Imam-Hussein-Schrein in Kerbela" className="h-full w-full object-cover object-center opacity-55" />
          <div className="hero-shade absolute inset-0" />
        </div>
        <div className="px-5 pb-6 pt-5 text-center">
          <h1 className="text-lg"><Pair ar="بإدارة الحاج ياسر الدر" de="Geleitet von Hajj Yasser Aldor" align="center" inverse /></h1>
          <div className="gold-line mx-auto my-4 h-px w-28" />
          <p className="text-sm"><Pair ar="كل رحلاتنا الدينية بمكان واحد: العراق، إيران، العمرة والحج." de="Alle unsere religiösen Reisen an einem Ort: Irak, Iran, Umrah und Hadsch." align="center" inverse /></p>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {actions.map(({ view, ar, de, icon: Icon }) => (
          <Button key={view} variant="outline" onClick={() => go(view)} className={`h-32 flex-col gap-3 whitespace-normal bg-card px-3 shadow-sm hover:border-secondary hover:bg-card `}>
            <span className="grid h-11 w-11 place-items-center rounded-md bg-accent text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <Pair ar={ar} de={de} align="center" />
          </Button>
        ))}
      </div>

      <InstallButton />
      <PrayerTimesCard />

      {payment?.visible && <PaymentCard payment={payment} />}
    </div>
  );
}

function TripFavButton({ id }: { id: string }) {
  const fav = useFavorites();
  const on = fav.has(`trip:${id}`);
  return <button type="button" onClick={() => fav.toggle(`trip:${id}`)} aria-pressed={on} aria-label="المفضلة | Favorit" className="absolute bottom-3 left-3 grid h-9 w-9 place-items-center rounded-full border border-secondary/50 bg-card text-secondary shadow-sm"><Star className={`h-4 w-4 ${on ? "fill-current" : ""}`} /></button>;
}

function FavoritesView({ content, go }: { content: SiteContent; go: (view: View) => void }) {
  const { ids } = useFavorites();
  const [reader, setReader] = useState<ReaderItem | null>(null);
  const trips = content.trips.filter((t) => ids.includes(`trip:${t.id}`) && t.visible && !t.hidden);
  const duas = content.duas.filter((d) => ids.includes(d.id) && !d.hidden).map((d) => ({ ...d, cat: duaCategoryOf(d), ...splitGermanText(d.textDe) }));
  if (reader) return <ZiyaratReader item={reader} onBack={() => setReader(null)} />;
  return <div className="screen-enter px-4 py-7">
    <ScreenTitle icon={Star} ar="محفوظاتي" de="Meine Favoriten" />
    {!trips.length && !duas.length && <p className="rounded-lg border border-dashed border-secondary/50 bg-card p-6 text-center text-sm"><Pair ar="لم تضف شيئاً بعد — اضغط على النجمة ⭐ بجانب أي رحلة أو دعاء لحفظه هنا." de="Noch nichts gespeichert — tippen Sie auf den Stern ⭐ bei einer Reise oder einem Gebet." align="center" /></p>}
    {trips.length > 0 && <section className="mb-7"><h3 className="mb-3 text-sm font-bold text-primary"><Pair ar="رحلاتي" de="Meine Reisen" /></h3><div className="space-y-3">{trips.map((t) => { const days = (() => { const m = t.date.match(/(\d{2})\.(\d{2})\.(\d{4})/); if (!m) return null; const d = Math.ceil((new Date(+m[3], +m[2] - 1, +m[1]).getTime() - Date.now()) / 86400000); return d > 0 ? d : null; })(); return <div key={t.id} className="relative"><button type="button" onClick={() => go("trips")} className="w-full rounded-lg border border-secondary/50 bg-card p-4 pb-12 text-right shadow-sm"><Pair ar={t.ar} de={t.de} /><span dir="ltr" className="mt-2 flex items-center justify-end gap-2 text-sm font-bold"><CalendarDays className="h-4 w-4 text-secondary" />{t.date}</span>{days && <span className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary"><Pair ar={`متبقٍ ${days} يوماً على الانطلاق ✈️`} de={`Noch ${days} Tage bis zur Abreise ✈️`} /></span>}{(t.programAr || t.programDe) && <div className="mt-3 whitespace-pre-line rounded-md bg-accent p-3 text-sm"><Pair ar={t.programAr ?? ""} de={t.programDe ?? ""} /></div>}</button><TripFavButton id={t.id} /></div>; })}</div></section>}
    {duas.length > 0 && <section><h3 className="mb-3 text-sm font-bold text-primary"><Pair ar="أدعيتي وزياراتي" de="Meine Gebete & Ziyarat" /></h3><div className="space-y-3">{duas.map((d) => <ReaderListButton key={d.id} item={d} onRead={setReader} />)}</div></section>}
  </div>;
}

function TripsView({ content, admin }: { content: SiteContent; admin: AdminProps }) {
  const saveContent = useSaveContent(admin?.password ?? "");
  const upcomingTrips: UpcomingTrip[] = content.trips.filter((t) => admin || (t.visible && !t.hidden)).map((t) => { const m = tripMeta[t.id] ?? fallbackMeta; return { ...t, ...m, statusAr: t.statusAr || m.statusAr, statusDe: t.statusDe || m.statusDe }; });
  const saveTrips = (trips: TripEntry[]) => saveContent({ ...content, trips });
  const { hotels, program } = content;
  const [selected, setSelected] = useState<UpcomingTrip | null>(null);
  const [iraqOpen, setIraqOpen] = useState(false);
  return (
    <div className="screen-enter px-4 py-7">
      <ScreenTitle icon={Luggage} ar="أنواع الزيارة" de="Reisearten" />
      <div className="grid grid-cols-2 gap-3">
        {generalTrips.map((trip) => {
          const Icon = trip.icon;
          const content = <><span className="grid h-11 w-11 place-items-center rounded-md bg-muted text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span><Pair ar={trip.ar} de={trip.de} align="center" /><span className="text-xs"><Pair ar={trip.statusAr} de={trip.statusDe} align="center" /></span></>;
          return trip.id === "iraq" ? <Button key={trip.id} variant="outline" onClick={() => setIraqOpen(true)} className="h-36 flex-col gap-2 whitespace-normal bg-card p-3 shadow-sm hover:border-secondary hover:bg-card">{content}</Button> : <article key={trip.id} className="flex h-36 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 text-center shadow-sm">{content}</article>;
        })}
      </div>

      <div className="my-7 border-t border-border" />
      <ScreenTitle icon={CalendarDays} ar="الرحلات القادمة" de="Kommende Reisen" />
      {admin && <AddButton label={{ ar: "إضافة رحلة جديدة", de: "Neue Reise hinzufügen" }} fields={tripFields} blank={{ ar: "", de: "", date: "", statusAr: "التسجيل مفتوح", statusDe: "Anmeldung offen", descAr: "", descDe: "", programAr: "", programDe: "", visible: true, hidden: false }} onAdd={(row) => saveTrips([...content.trips, { ...(row as TripEntry), id: `t${Date.now()}` }])} />}
      <div className="space-y-3">
        {upcomingTrips.map((trip) => {
          const Icon = trip.icon;
          const raw = content.trips.find((t) => t.id === trip.id)!;
          return <div key={trip.id} className={`relative ${raw.hidden ? "opacity-55" : ""}`}>{admin && <ItemActions fields={tripFields} item={{ ...raw, statusAr: raw.statusAr ?? trip.statusAr, statusDe: raw.statusDe ?? trip.statusDe }} hidden={raw.hidden ?? false} onVisibilityChange={(hidden) => saveTrips(content.trips.map((t) => (t.id === trip.id ? { ...t, hidden, visible: hidden ? t.visible : true } : t)))} onSave={(row) => saveTrips(content.trips.map((t) => (t.id === trip.id ? { ...(row as TripEntry), id: t.id, hidden: t.hidden ?? false } : t)))} onDelete={() => saveTrips(content.trips.filter((t) => t.id !== trip.id))} />}{(raw.programAr || raw.programDe) && <div className="mb-2 rounded-md border border-secondary/40 bg-accent p-3 text-sm"><div className="mb-1 text-xs font-bold text-primary"><Pair ar="برنامج الرحلة" de="Reiseprogramm" /></div><div className="whitespace-pre-line"><Pair ar={raw.programAr ?? ""} de={raw.programDe ?? ""} /></div></div>}<Button variant="outline" onClick={() => setSelected(trip)} className="h-auto min-h-32 w-full whitespace-normal bg-card p-4 text-right shadow-sm hover:border-secondary hover:bg-card"><span className="flex w-full items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-muted text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><Pair ar={trip.ar} de={trip.de} /><span dir="ltr" className="mt-3 flex items-center justify-end gap-2 text-sm font-bold text-foreground"><CalendarDays className="h-4 w-4 text-secondary" aria-hidden="true" />{trip.date}</span><span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-1 text-xs text-success-foreground"><CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /><Pair ar={trip.statusAr} de={trip.statusDe} /></span>{(trip.descAr || trip.descDe) && <span className="mt-3 block text-sm font-normal"><Pair ar={trip.descAr ?? ""} de={trip.descDe ?? ""} /></span>}</span><ChevronLeft className="mt-2 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" /></span></Button><TripFavButton id={trip.id} /></div>;
        })}
      </div>


      <Dialog open={iraqOpen} onOpenChange={setIraqOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto rounded-lg" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl text-primary"><Pair ar="زيارة العراق" de="Irak-Reise" /></DialogTitle>
            <DialogDescription asChild><div className="pt-2"><Pair ar="زيارة العتبات المقدسة في العراق، ضمن عدة مناسبات على مدار السنة." de="Besuch der heiligen Stätten im Irak, zu verschiedenen Anlässen im Jahresverlauf." /></div></DialogDescription>
          </DialogHeader>
          <section className="mt-2">
            <h3 className="text-lg text-primary"><Pair ar="أنواع الزيارة ضمن هذه الرحلة" de="Arten der Zyarat bei dieser Reise" /></h3>
            <div className="mt-4 space-y-4 text-sm">
              <div><Pair ar="زيارة الإمام الحسين (ع)" de="Zyarat Imam Hussein (as)" /><div className="mt-2"><Pair ar="تُقام على مدار السنة في أوقات مختلفة تتناسب مع العطل المدرسية (كعطلة الشتاء، رأس السنة، عطلة الفصح، والعطلة الصيفية)." de="Findet ganzjährig zu unterschiedlichen Terminen statt, passend zu den Schulferien (Winterferien, Neujahr, Osterferien und Sommerferien)." /></div></div>
              <Pair ar="زيارة الإمام الحسين (ع) عطلة الشتاء / رأس السنة" de="Zyarat Imam Hussein (as) Winterferien / Neujahr" />
              <Pair ar="زيارة عرفة" de="Zyarat Arafa" />
              <Pair ar="زيارة الأربعين" de="Zyarat Arbaeen" />
              <Pair ar="زيارة 15 شعبان" de="Zyarat 15 Shaaban" />
            </div>
          </section>
          <section className="mt-3 border-t border-border pt-5">
            <h3 className="text-lg text-primary"><Pair ar="تفاصيل الرحلة" de="Reisedetails" /></h3>
            <div className="mt-4 grid gap-3">
              <Detail icon={Plane} ar="الطيران" de="Flug" detailAr="الوصول عبر مطار بغداد." detailDe="Ankunft über den Flughafen Bagdad." />
               <Detail icon={Hotel} ar="السكن" de="Unterkunft" detailAr="ليلة في الكاظمية، وفندق في كربلاء، وفندق في النجف." detailDe="Eine Nacht in al-Kazimiyya, ein Hotel in Kerbela und ein Hotel in Nadschaf." />
               {(hotels.kadhimiya || hotels.karbala || hotels.najaf) && <div className="rounded-md bg-muted p-3 text-sm">{hotels.kadhimiya && <Pair ar={`الكاظمية: ${hotels.kadhimiya}`} de={`al-Kazimiyya: ${hotels.kadhimiya}`} />}{hotels.karbala && <Pair ar={`كربلاء: ${hotels.karbala}`} de={`Kerbela: ${hotels.karbala}`} />}{hotels.najaf && <Pair ar={`النجف: ${hotels.najaf}`} de={`Nadschaf: ${hotels.najaf}`} />}</div>}
              <Detail icon={BedDouble} ar="المجالس" de="Majlis" detailAr="مجالس حسينية بمرافقة خطيب ورادود حسيني." detailDe="Husseinitische Majlis mit Khatib und Radud Hosseini." />
              <Detail icon={Soup} ar="الطعام" de="Verpflegung" detailAr="أكل لبناني بامتياز — ثلاث وجبات يومياً." detailDe="Ausgezeichnete libanesische Küche — drei Mahlzeiten täglich." />
            </div>
          </section>
        </DialogContent>
      </Dialog>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto rounded-lg p-0" dir="rtl">
          {selected && (
            <>
              {selected.image ? (
                <img src={selected.image} alt={`دعوة ${selected.ar} | Einladung ${selected.de}`} className="max-h-[58vh] w-full rounded-t-lg bg-muted object-contain" />
              ) : (
                <div className="grid aspect-[4/2] place-items-center rounded-t-lg bg-primary text-secondary"><selected.icon className="h-12 w-12" aria-hidden="true" /></div>
              )}
              <div className="px-5 pb-5">
                <DialogHeader className="text-right">
                  <DialogTitle className="text-xl text-primary"><Pair ar={selected.ar} de={selected.de} /></DialogTitle>
                  <DialogDescription asChild><div>{selected.date && <p dir="ltr" className="mt-2 text-right text-sm font-bold text-foreground">{selected.date}</p>}</div></DialogDescription>
                </DialogHeader>
                <div className="mt-5 rounded-lg border border-border bg-muted p-4">
                  <h3 className="text-base text-primary"><Pair ar="برنامج الرحلة لهذا الموعد" de="Reiseprogramm für diesen Termin" /></h3>
                  {admin && <div className="mt-2"><ItemActions fields={programFields} item={{ programAr: content.trips.find((t) => t.id === selected.id)?.programAr ?? "", programDe: content.trips.find((t) => t.id === selected.id)?.programDe ?? "" }} onSave={(row) => saveTrips(content.trips.map((t) => (t.id === selected.id ? { ...t, programAr: String(row["programAr"] ?? ""), programDe: String(row["programDe"] ?? "") } : t)))} onDelete={() => saveTrips(content.trips.map((t) => (t.id === selected.id ? { ...t, programAr: "", programDe: "" } : t)))} /></div>}
                  <div className="mt-3 text-sm"><div className="whitespace-pre-line"><Pair ar={content.trips.find((t) => t.id === selected.id)?.programAr || program.ar} de={content.trips.find((t) => t.id === selected.id)?.programDe || program.de} /></div></div>
                </div>
                <Button asChild className="mt-5 h-14 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"><a href={formUrl} target="_blank" rel="noreferrer"><ScrollText /><Pair ar="سجّل في الرحلة" de="Zur Reise anmelden" align="center" /></a></Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ icon: Icon, ar, de, detailAr, detailDe }: { icon: IconType; ar: string; de: string; detailAr: string; detailDe: string }) {
  return <div className="flex gap-3 border-b border-border pb-3 last:border-0"><Icon className="mt-1 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" /><div><Pair ar={ar} de={de} /><p className="mt-1 text-sm"><Pair ar={detailAr} de={detailDe} /></p></div></div>;
}

function RegistrationView() {
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={ScrollText} ar="التسجيل في الرحلات" de="Anmeldung zu den Reisen" /><section className="rounded-lg bg-primary px-5 py-8 text-center text-primary-foreground shadow-md"><ScrollText className="mx-auto h-10 w-10 text-secondary" aria-hidden="true" /><h2 className="mt-5 text-xl"><Pair ar="ابدأ تسجيلك الآن" de="Jetzt anmelden" align="center" inverse /></h2><p className="mt-4 text-sm"><Pair ar="املأ الاستمارة، وسيتواصل معك فريق الحملة لإتمام التفاصيل." de="Füllen Sie das Formular aus. Unser Team meldet sich anschließend bei Ihnen." align="center" inverse /></p><Button asChild className="mt-7 h-14 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"><a href={formUrl} target="_blank" rel="noreferrer"><ScrollText /><Pair ar="فتح استمارة التسجيل" de="Anmeldeformular öffnen" align="center" /></a></Button></section></div>;
}

function ContactsView({ content, admin }: { content: SiteContent; admin: AdminProps }) {
  const saveContent = useSaveContent(admin?.password ?? "");
  const contacts = content.contacts ?? defaultContacts;
  const shownContacts = admin ? contacts : contacts.filter((contact) => contact.visible !== false && !contact.hidden);
  const saveContacts = (next: ContactEntry[]) => saveContent({ ...content, contacts: next });
  if (!admin && !content.contactsVisible) return <div className="screen-enter px-4 py-7"><ScreenTitle icon={Phone} ar="أرقام التواصل" de="Kontaktnummern" /><p className="rounded-lg border border-border bg-card p-5 text-center text-sm text-muted-foreground"><Pair ar="جهات التواصل غير متاحة حالياً." de="Die Kontaktdaten sind derzeit nicht verfügbar." align="center" /></p></div>;
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={Phone} ar="أرقام التواصل" de="Kontaktnummern" /><SocialLinks showEmail /><div className="mt-5 space-y-3">
    {admin && <AddButton label={{ ar: "إضافة جهة تواصل", de: "Neuen Kontakt hinzufügen" }} fields={contactFields} blank={{ ar: "", de: "", roleAr: "", roleDe: "", phone: "", whatsapp: "", visible: true, hidden: false }} onAdd={(row) => saveContacts([...contacts, { ...(row as ContactEntry), id: `c${Date.now()}` }])} />}
    {shownContacts.map((contact) => <div key={contact.id} className={contact.hidden ? "opacity-55" : ""}>{admin && <ItemActions fields={contactFields} item={contact} hidden={contact.hidden ?? false} onVisibilityChange={(hidden) => saveContacts(contacts.map((c) => (c.id === contact.id ? { ...c, hidden, visible: hidden ? (c.visible ?? true) : true } : c)))} onSave={(row) => saveContacts(contacts.map((c) => (c.id === contact.id ? { ...(row as ContactEntry), id: c.id, hidden: c.hidden ?? false } : c)))} onDelete={() => saveContacts(contacts.filter((c) => c.id !== contact.id))} />}<article className="rounded-lg border border-border bg-card p-4 shadow-sm"><h3 className="text-primary"><Pair ar={contact.ar} de={contact.de} /></h3><p className="mt-2 text-sm"><Pair ar={contact.roleAr} de={contact.roleDe} /></p><p dir="ltr" className="mt-3 text-right text-sm font-bold">{contact.phone}</p><div className="mt-4 grid grid-cols-2 gap-2"><Button asChild className="h-12"><a href={telHref(contact.phone)}><Phone /><Pair ar="اتصال" de="Anrufen" align="center" /></a></Button>{contact.whatsapp && <Button asChild className="h-12 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"><a href={contact.whatsapp} target="_blank" rel="noreferrer"><MessageCircle /><Pair ar="واتساب" de="WhatsApp" align="center" /></a></Button>}</div></article></div>)}
  </div></div>;
}

function FaqItem({ value, questionAr, questionDe, answerAr, answerDe }: { value: string; questionAr: string; questionDe: string; answerAr: string; answerDe: string }) {
  return <AccordionItem value={value}><AccordionTrigger className="gap-3 text-right hover:no-underline"><Pair ar={questionAr} de={questionDe} /></AccordionTrigger><AccordionContent className="text-sm"><Pair ar={answerAr} de={answerDe} /></AccordionContent></AccordionItem>;
}

function SocialLinks({ showEmail = false }: { showEmail?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(officialEmail); navigator.vibrate?.(30); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { window.location.href = `mailto:${officialEmail}`; }
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-center gap-2" dir="ltr">
        {socialLinks.map(({ href, label, icon: Icon }) => <Button key={href} asChild variant="outline" size="icon" className="h-11 w-11" title={label}><a href={href} target="_blank" rel="noreferrer" aria-label={label}><Icon className="h-5 w-5" /></a></Button>)}
        <Button asChild variant="outline" size="icon" className="h-11 w-11" title="البريد الإلكتروني | E-Mail"><a href={`mailto:${officialEmail}`} aria-label="البريد الإلكتروني | E-Mail"><Mail className="h-5 w-5" /></a></Button>
      </div>
      {showEmail && <div className="mt-4 border-t border-border pt-4"><p dir="ltr" className="break-all text-center text-sm font-semibold text-primary">{officialEmail}</p><div className="mt-3 grid grid-cols-2 gap-2"><Button asChild variant="outline" size="sm"><a href={`mailto:${officialEmail}`}><Mail /><Pair ar="فتح البريد" de="E-Mail öffnen" align="center" /></a></Button><Button variant="outline" size="sm" onClick={copyEmail}>{copied ? <Check /> : <Copy />}<Pair ar={copied ? "تم النسخ" : "نسخ الإيميل"} de={copied ? "Kopiert" : "E-Mail kopieren"} align="center" /></Button></div></div>}
    </div>
  );
}

function PaymentCard({ payment }: { payment: SiteContent["payment"] }) {
  const [copied, setCopied] = useState(false);
  const copyIban = async () => {
    if (!payment.iban) return;
    try { await navigator.clipboard.writeText(payment.iban.replace(/\s/g, "")); navigator.vibrate?.(30); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  };
  return <section className="mt-5 rounded-lg border border-secondary bg-card p-4 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-primary"><CreditCard className="h-5 w-5" /></span><h2 className="text-primary"><Pair ar="طرق الدفع والتحويل" de="Zahlungsmethoden" /></h2></div><div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">{payment.accountName && <Pair ar={`اسم الحساب: ${payment.accountName}`} de={`Kontoinhaber: ${payment.accountName}`} />}{payment.bankName && <Pair ar={`اسم البنك: ${payment.bankName}`} de={`Bank: ${payment.bankName}`} />}{payment.iban && <div><p dir="ltr" className="break-all text-right font-bold">IBAN: {payment.iban}</p><Button variant="outline" size="sm" onClick={copyIban} className="mt-2 w-full">{copied ? <Check /> : <Copy />}<Pair ar={copied ? "تم نسخ رقم الحساب" : "نسخ رقم الحساب"} de={copied ? "IBAN kopiert" : "IBAN kopieren"} align="center" /></Button></div>}{payment.bic && <p dir="ltr" className="break-all text-right font-bold">BIC: {payment.bic}</p>}<div className="rounded-md bg-accent p-3 text-primary"><Pair ar="التحويل البنكي الفوري فقط — لا يتوفر خيار التقسيط" de="Nur Sofortüberweisung — Keine Ratenzahlung möglich" /></div></div></section>;
}

function PushButton() {
  const [state, setState] = useState<"idle" | "busy" | "on">("idle");
  useEffect(() => { if (localStorage.getItem("push-enabled") && "Notification" in window && Notification.permission === "granted") setState("on"); }, []);
  const msgs: Record<string, string> = {
    "not-configured": "الإشعارات غير مفعّلة بعد | Benachrichtigungen noch nicht eingerichtet",
    unsupported: "جهازك لا يدعم الإشعارات. على iPhone أضف التطبيق للشاشة الرئيسية أولاً | Nicht unterstützt. Auf dem iPhone zuerst zum Home-Bildschirm hinzufügen",
    "open-in-new-tab": "افتح التطبيق في نافذة مستقلة لتفعيل الإشعارات | Bitte die App in einem eigenen Tab öffnen",
    denied: "تم رفض الإذن — فعّله من إعدادات المتصفح | Erlaubnis verweigert – bitte in den Browser-Einstellungen aktivieren",
  };
  return <Button variant="outline" disabled={state !== "idle"} className="w-full border-secondary" onClick={async () => {
    setState("busy");
    try { const r = await enablePush(); if (r === "registered") return setState("on"); window.alert(msgs[r]); } catch (e) { console.error(e); window.alert("تعذّر التفعيل | Aktivierung fehlgeschlagen"); }
    setState("idle");
  }}><Bell />{state === "on" ? <>الإشعارات العاجلة مفعّلة <span className="text-xs italic">| Eilmeldungen aktiv</span></> : <>تفعيل الإشعارات العاجلة <span className="text-xs italic">| Eilmeldungen aktivieren</span></>}</Button>;
}

function InstallButton() {
  const [evt, setEvt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone) setInstalled(true);
    const h = (e: Event) => { e.preventDefault(); setEvt(e as Event & { prompt: () => Promise<void> }); };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", h); window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", done); };
  }, []);
  if (installed) return null;
  const click = async () => {
    if (evt) { await evt.prompt(); setEvt(null); return; }
    setIosHelp(true);
  };
  return <>
    <Button onClick={click} className="mt-5 h-14 w-full gap-2 bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/90"><Smartphone /><Pair ar="تثبيت التطبيق على هاتفك 📲" de="App auf dem Handy installieren" align="center" /></Button>
    <Dialog open={iosHelp} onOpenChange={setIosHelp}><DialogContent className="w-[calc(100%-24px)] max-w-[396px]" dir="rtl"><DialogHeader className="text-right"><DialogTitle><Pair ar="إضافة التطبيق للشاشة الرئيسية" de="Zum Home-Bildschirm hinzufügen" /></DialogTitle><DialogDescription><Pair ar="خطوتان فقط:" de="Nur zwei Schritte:" /></DialogDescription></DialogHeader><ol className="space-y-4 text-sm">
      <li className="flex items-start gap-3 rounded-md bg-accent p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><Share /></span><Pair ar="1. اضغط زر المشاركة أسفل الشاشة في Safari (أو قائمة ⋮ في المتصفحات الأخرى)." de="1. Tippen Sie unten in Safari auf „Teilen“ (bzw. Menü ⋮ in anderen Browsern)." /></li>
      <li className="flex items-start gap-3 rounded-md bg-accent p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><SquarePlus /></span><Pair ar="2. اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة»." de="2. Wählen Sie „Zum Home-Bildschirm“ und dann „Hinzufügen“." /></li>
    </ol></DialogContent></Dialog>
  </>;
}

function ShareButton() {
  const share = () => {
    const url = window.location.origin;
    const text = `حملة عشاق الحسين (ع) — ألمانيا\nReisegruppe Ushaq al-Hussein — Deutschland\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };
  return <Button variant="outline" onClick={share} className="h-12 w-full"><Share2 /><Pair ar="مشاركة التطبيق" de="App teilen" align="center" /></Button>;
}

function NewsView({ content, admin }: { content: SiteContent; admin: AdminProps }) {
  const saveContent = useSaveContent(admin?.password ?? "");
  const news = content.news;
  const saveNews = (next: NewsEntry[]) => saveContent({ ...content, news: next });
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={Megaphone} ar="آخر الأخبار" de="Neuigkeiten" />
    {admin && <AddButton label={{ ar: "إضافة خبر جديد", de: "Neue Meldung hinzufügen" }} fields={newsFields} blank={{ ar: "", de: "", bodyAr: "", bodyDe: "", hidden: false }} onAdd={(row) => saveNews([row as NewsEntry, ...news])} />}
    <div className="space-y-3">{news.map((item, i) => (!item.hidden || admin) && (item.ar || item.de || admin) ? <div key={i} className={item.hidden ? "opacity-55" : ""}>{admin && <ItemActions fields={newsFields} item={item} hidden={item.hidden ?? false} onVisibilityChange={(hidden) => saveNews(news.map((n, j) => (j === i ? { ...n, hidden } : n)))} onSave={(row) => saveNews(news.map((n, j) => (j === i ? { ...(row as NewsEntry), hidden: n.hidden ?? false } : n)))} onDelete={() => saveNews(news.filter((_, j) => j !== i))} />}<article className="rounded-lg border border-border bg-card p-4 shadow-sm"><span className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-accent text-primary"><Megaphone className="h-4 w-4" aria-hidden="true" /></span><h3 className="text-primary"><Pair ar={item.ar} de={item.de} /></h3><p className="mt-3 border-t border-border pt-3 text-sm"><Pair ar={item.bodyAr} de={item.bodyDe} /></p></article></div> : null)}</div></div>;
}

const prayerNames: Array<{ key: string; ar: string; de: string }> = [
  { key: "Fajr", ar: "الفجر", de: "Fadschr" },
  { key: "Sunrise", ar: "الشروق", de: "Sonnenaufgang" },
  { key: "Dhuhr", ar: "الظهر", de: "Dhuhr" },
  { key: "Maghrib", ar: "المغرب", de: "Maghrib" },
];
const cities = [
  { id: "Karbala", ar: "كربلاء المقدسة", de: "Kerbela" },
  { id: "Najaf", ar: "النجف الأشرف", de: "Nadschaf" },
];

function PrayerTimesCard() {
  const [city, setCity] = useState(cities[0]!.id);
  const [times, setTimes] = useState<Record<string, string> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let off = false;
    setTimes(null); setFailed(false);
    fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Iraq&method=0`)
      .then((r) => r.json())
      .then((j) => { if (!off) setTimes(j?.data?.timings ?? null); })
      .catch(() => { if (!off) setFailed(true); });
    return () => { off = true; };
  }, [city]);
  return (
    <section className="mt-5 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent text-primary"><Clock className="h-5 w-5" aria-hidden="true" /></span>
        <h2 className="text-primary"><Pair ar="مواقيت الصلاة" de="Gebetszeiten" /></h2>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {cities.map((c) => (
          <Button key={c.id} size="sm" variant={city === c.id ? "default" : "outline"} onClick={() => setCity(c.id)} className="h-auto py-1.5"><Pair ar={c.ar} de={c.de} align="center" inverse={city === c.id} /></Button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {prayerNames.map((p) => (
          <div key={p.key} className="rounded-md bg-muted px-1 py-2">
            <p className="text-[11px] font-bold text-primary">{p.ar}</p>
            <p lang="de" dir="ltr" className="text-[9px] italic text-muted-foreground">{p.de}</p>
            <p dir="ltr" className="mt-1 text-sm font-extrabold text-secondary">{times?.[p.key] ?? (failed ? "—" : "…")}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground"><Pair ar="بالتوقيت المحلي للعراق — حسب المذهب الجعفري" de="Ortszeit Irak — nach jaʿfaritischer Berechnung" /></p>
    </section>
  );
}

function AlertBanner({ alert }: { alert: SiteContent["alert"] }) {
  const [hidden, setHidden] = useState(false);
  if (!alert.active || (!alert.ar && !alert.de) || hidden) return null;
  return (
    <div role="alert" className="alert-glow mx-4 mt-4 flex items-start gap-3 rounded-lg border border-secondary bg-primary p-4 text-primary-foreground">
      <Siren className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-secondary" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="mb-1 text-xs font-extrabold text-secondary">تنبيه عاجل <span lang="de" className="italic">| Eilmeldung</span></p>
        <Pair ar={alert.ar} de={alert.de} inverse />
      </div>
      <button onClick={() => setHidden(true)} aria-label="إغلاق | Schließen" className="text-lg leading-none text-primary-foreground/70 hover:text-primary-foreground">×</button>
    </div>
  );
}

type ReaderItem = { id: string; ar: string; de: string; textAr: string; latin: string; translation: string; link?: string; hidden?: boolean; reciters?: import("@/lib/site-content").Reciter[]; textEn?: string };
type Shrine = { id: string; ar: string; de: string; image: string; entries: ReaderItem[] };

function splitGermanText(value: string) {
  const [latin, ...translation] = value.split(/\s+[—–-]\s+/);
  return { latin: latin ?? "", translation: translation.join(" — ") || value };
}

type AdminCtx = { password: string; content: SiteContent } | null;

function DuasView({ content }: { content: SiteContent }) {
  const duas = content.duas;
  const adminPw = useAdminPassword();
  const admin: AdminCtx = adminPw ? { password: adminPw, content } : null;
  const managedEntries = useMemo(() => duas.filter((d) => (d.ar || d.de) && (admin || !d.hidden)).map((d) => ({ ...d, cat: duaCategoryOf(d), ...splitGermanText(d.textDe) })), [admin, duas]);
  const inCat = (c: DuaCategory) => managedEntries.filter((e) => e.cat === c);
  const shrines: Shrine[] = [
    { id: "karbala", ar: "كربلاء المقدسة", de: "Kerbela", image: shrineImage, entries: inCat("karbala") },
    { id: "najaf", ar: "النجف الأشرف", de: "Nadschaf", image: najafShrine, entries: inCat("najaf") },
    { id: "kazimiyya", ar: "الكاظمية المقدسة", de: "Al-Kazimiyya", image: kazimiyyaShrine, entries: inCat("kazimiyya") },
    { id: "samarra", ar: "سامراء", de: "Samarra", image: samarraShrine, entries: inCat("samarra") },
    { id: "mashhad", ar: "مشهد المقدسة", de: "Maschhad", image: mashhadShrine, entries: inCat("mashhad") },
    { id: "qom", ar: "قم المقدسة", de: "Qom", image: qomShrine, entries: inCat("qom") },
    { id: "mecca-medina", ar: "مكة والمدينة", de: "Mekka & Medina", image: meccaMedinaShrine, entries: inCat("mecca-medina") },
  ];
  const generalEntries = inCat("general");
  const [shrineId, setShrineId] = useState<string | null>(null);
  const shrine = shrines.find((s) => s.id === shrineId) ?? null;
  const [reader, setReader] = useState<ReaderItem | null>(null);
  if (reader) return <ZiyaratReader item={reader} onBack={() => setReader(null)} />;
  if (shrine) return <ShrineDetail shrine={shrine} onBack={() => setShrineId(null)} onRead={setReader} admin={admin} />;
  return (
    <div className="screen-enter px-4 py-7">
      <ScreenTitle icon={BookOpen} ar="العتبات المقدسة" de="Heilige Stätten" />
      <div className="grid grid-cols-2 gap-3">
        {shrines.map((item) => (
          <Button key={item.id} variant="outline" onClick={() => setShrineId(item.id)} className="group relative aspect-[4/5] h-auto overflow-hidden border-0 p-0 shadow-md">
            <img src={item.image} alt={`${item.ar} | ${item.de}`} loading="lazy" width={768} height={1024} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <span className="shrine-card-shade absolute inset-0" />
            <span className="absolute inset-x-0 bottom-0 p-3 text-primary-foreground"><Pair ar={item.ar} de={item.de} align="center" inverse /></span>
          </Button>
        ))}
      </div>
      {(generalEntries.length > 0 || admin) && <section className="mt-7"><div className="flex items-start justify-between gap-2"><ScreenTitle icon={ScrollText} ar="الأدعية العامة والتعقيبات" de="Allgemeine Bittgebete" />{admin && <DuaAddButton category="general" password={admin.password} content={admin.content} />}</div><div className="space-y-3">{generalEntries.map((entry) => <ReaderListButton key={entry.id} item={entry} onRead={setReader} admin={admin} />)}</div></section>}
    </div>
  );
}

function LayerToggle({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return <Button variant={active ? "secondary" : "outline"} size="icon" onClick={onClick} aria-pressed={active} aria-label={label} title={label} className={active ? "" : "bg-transparent opacity-60"}>{children}</Button>;
}

function ReaderListButton({ item, onRead, admin }: { item: ReaderItem; onRead: (item: ReaderItem) => void; admin?: AdminCtx }) {
  const fav = useFavorites();
  const on = fav.has(item.id);
  return <div className={`space-y-2 ${item.hidden ? "opacity-55" : ""}`}>{admin && <DuaAdminActions id={item.id} password={admin.password} content={admin.content} />}<div className="flex items-stretch gap-2"><Button variant="outline" onClick={() => onRead(item)} className="h-auto min-h-20 min-w-0 flex-1 justify-start gap-3 whitespace-normal bg-card p-4 text-right shadow-sm"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent text-primary"><BookOpen className="h-5 w-5" /></span><span className="min-w-0 flex-1 text-primary"><Pair ar={item.ar} de={item.de} /></span><ChevronLeft className="h-5 w-5 shrink-0 text-secondary" /></Button><Button variant="outline" onClick={() => fav.toggle(item.id)} aria-pressed={on} aria-label="المفضلة | Favorit" className="h-auto w-12 shrink-0 bg-card p-0"><Star className={`h-5 w-5 text-secondary ${on ? "fill-current" : ""}`} /></Button></div></div>;
}

function ShrineDetail({ shrine, onBack, onRead, admin }: { shrine: Shrine; onBack: () => void; onRead: (item: ReaderItem) => void; admin: AdminCtx }) {
  return <div className="screen-enter pb-7"><div className="relative h-56 overflow-hidden"><img src={shrine.image} alt={`${shrine.ar} | ${shrine.de}`} loading="lazy" width={768} height={1024} className="h-full w-full object-cover" /><span className="shrine-card-shade absolute inset-0" /><Button variant="secondary" size="icon" onClick={onBack} aria-label="العودة | Zurück" className="absolute right-4 top-4"><ArrowLeft className="rotate-180" /></Button><h2 className="absolute inset-x-5 bottom-5 text-xl text-primary-foreground"><Pair ar={shrine.ar} de={shrine.de} inverse /></h2></div><div className="px-4 pt-6"><div className="flex items-start justify-between gap-2"><ScreenTitle icon={ScrollText} ar="الزيارات والأعمال" de="Ziyarat & Andachtswerke" />{admin && <DuaAddButton category={shrine.id as DuaCategory} password={admin.password} content={admin.content} />}</div><div className="space-y-3">{shrine.entries.map((entry) => <ReaderListButton key={entry.id} item={entry} onRead={onRead} admin={admin} />)}</div></div></div>;
}

function ZiyaratReader({ item, onBack }: { item: ReaderItem; onBack: () => void }) {
  const { lang: readerLang } = useLang();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAr, setShowAr] = useState(true);
  const [showLatin, setShowLatin] = useState(true);
  const [showTr, setShowTr] = useState(true);
  const [arabicScale, setArabicScale] = useState(110);
  const [germanScale, setGermanScale] = useState(100);
  const [alignment, setAlignment] = useState<"right" | "center">("right");
  const [theme, setTheme] = useState<"navy" | "white" | "warm">("warm");
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("ziyarat-reader-settings") ?? "{}");
      if (typeof saved.arabicScale === "number") setArabicScale(Math.min(150, Math.max(80, saved.arabicScale)));
      if (typeof saved.germanScale === "number") setGermanScale(Math.min(150, Math.max(80, saved.germanScale)));
      if (saved.alignment === "right" || saved.alignment === "center") setAlignment(saved.alignment);
      if (saved.theme === "navy" || saved.theme === "white" || saved.theme === "warm") setTheme(saved.theme);
    } catch { /* Keep the reader defaults when saved preferences are invalid. */ }
  }, []);
  useEffect(() => {
    window.localStorage.setItem("ziyarat-reader-settings", JSON.stringify({ arabicScale, germanScale, alignment, theme }));
  }, [arabicScale, germanScale, alignment, theme]);
  const night = theme === "navy";
  const bump = (d: number) => { setArabicScale((v) => Math.min(150, Math.max(80, v + d))); setGermanScale((v) => Math.min(150, Math.max(80, v + d))); };
  const trFirst = readerLang === "de" || readerLang === "en";
  const trText = readerLang === "en" && item.textEn ? item.textEn : item.translation;
  const trBlock = <p lang={readerLang === "en" ? "en" : "de"} dir="ltr" className={`reader-de whitespace-pre-line leading-relaxed ${trFirst ? "font-semibold" : "mt-5 italic opacity-75"} ${alignment === "center" ? "text-center" : "text-left"}`}>{trText}</p>;
  const [progress, setProgress] = useState(0);
  useEffect(() => { const on = () => { const h = document.documentElement.scrollHeight - window.innerHeight; setProgress(h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0); }; on(); window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on); }, []);
  const [focus, setFocus] = useState(false);
  useEffect(() => { document.body.classList.toggle("focus-mode", focus); return () => document.body.classList.remove("focus-mode"); }, [focus]);
  return <div className="reader-shell screen-enter min-h-[calc(100vh-11rem)] pb-44" data-reader-theme={theme} data-ar-scale={arabicScale} data-de-scale={germanScale}>
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-current/10 bg-inherit px-4 py-3 backdrop-blur-md"><Button variant="ghost" size="icon" onClick={onBack} aria-label="العودة | Zurück"><ArrowLeft className="rotate-180" /></Button><h2 className="min-w-0 flex-1 px-2 text-center text-sm"><Pair ar={item.ar} de={item.de} align="center" inverse={theme === "navy"} /></h2><Button variant={focus ? "secondary" : "ghost"} size="icon" onClick={() => setFocus((v) => !v)} aria-pressed={focus} aria-label="وضع القراءة في الحرم | Lesemodus im Schrein">{focus ? <EyeOff /> : <Eye />}</Button><Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="إعدادات القراءة | Leseeinstellungen"><Settings /></Button></div>
    <div className="sticky top-[61px] z-20 flex flex-wrap items-center justify-center gap-2 border-b border-current/10 bg-inherit px-4 py-2">
      <LayerToggle active={showTr} onClick={() => setShowTr((v) => !v)} label="الترجمة | Übersetzung"><Globe /></LayerToggle>
      <LayerToggle active={showLatin} onClick={() => setShowLatin((v) => !v)} label="القراءة اللاتينية | Lautschrift"><TypeIcon /></LayerToggle>
      <LayerToggle active={showAr} onClick={() => setShowAr((v) => !v)} label="النص العربي | Arabisch"><span className="text-base font-extrabold leading-none">ع</span></LayerToggle>
      <span className="mx-1 h-6 w-px bg-current/20" />
      <Button variant="outline" size="icon" className="bg-transparent" onClick={() => bump(-10)} disabled={arabicScale <= 80 && germanScale <= 80} aria-label="تصغير الخط | Schrift kleiner"><Minus /></Button>
      <Button variant="outline" size="icon" className="bg-transparent" onClick={() => bump(10)} disabled={arabicScale >= 150 && germanScale >= 150} aria-label="تكبير الخط | Schrift größer"><Plus /></Button>
      <Button variant={night ? "secondary" : "outline"} size="icon" className={night ? "" : "bg-transparent"} onClick={() => setTheme(night ? "warm" : "navy")} aria-pressed={night} aria-label="الوضع الليلي | Nachtmodus">{night ? <Sun /> : <Moon />}</Button>
      <div className="pointer-events-none absolute inset-x-0 -bottom-[5px] h-[5px] bg-current/10"><div className="h-full rounded-full bg-secondary shadow-[0_0_10px_var(--color-secondary)] transition-[width] duration-150" style={{ width: `${progress}%` }} /></div>
    </div>
    <article className={`reader-copy px-5 py-8 ${alignment === "center" ? "text-center" : "text-right"}`}>{showTr && trFirst && <>{trBlock}{(showAr || showLatin) && <div className="my-7 border-t border-current/15" />}</>}{showAr && <p lang="ar" dir="rtl" className="reader-ar whitespace-pre-line font-bold leading-[2.25]">{item.textAr}</p>}{showAr && (showLatin || showTr) && <div className="my-7 border-t border-current/15" />}{showLatin && <p lang="de-Latn" dir="ltr" className={`reader-de whitespace-pre-line font-semibold leading-relaxed ${alignment === "center" ? "text-center" : "text-left"}`}>{item.latin}</p>}{showTr && !trFirst && trBlock}{!showAr && !showLatin && !showTr && <p className="py-10 text-center text-sm opacity-60"><Pair ar="فعّل أحد أزرار العرض أعلاه لإظهار النص." de="Aktivieren Sie oben eine Ebene, um den Text anzuzeigen." align="center" /></p>}{item.link && <Button asChild variant="outline" className="mt-8 h-12 w-full"><a href={item.link} target="_blank" rel="noreferrer"><Download /><Pair ar="تحميل النص الكامل" de="Vollständigen Text herunterladen" align="center" /></a></Button>}</article>
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent className="w-[calc(100%-24px)] max-w-[396px]" dir="rtl"><DialogHeader className="text-right"><DialogTitle><Pair ar="إعدادات القراءة" de="Leseeinstellungen" /></DialogTitle><DialogDescription><Pair ar="خصّص النص بما يناسب قراءتك." de="Passen Sie die Darstellung an Ihre Leseweise an." /></DialogDescription></DialogHeader><div className="space-y-5 pt-2"><ScaleControl ar="حجم النص العربي" de="Arabische Schriftgröße" value={arabicScale} onChange={setArabicScale} /><ScaleControl ar="حجم النص الألماني" de="Deutsche Schriftgröße" value={germanScale} onChange={setGermanScale} /><div><Pair ar="محاذاة النص" de="Textausrichtung" /><div className="mt-2 grid grid-cols-2 gap-2"><Button variant={alignment === "right" ? "default" : "outline"} onClick={() => setAlignment("right")}><AlignRight /><Pair ar="يمين" de="Rechts" align="center" inverse={alignment === "right"} /></Button><Button variant={alignment === "center" ? "default" : "outline"} onClick={() => setAlignment("center")}><AlignCenter /><Pair ar="وسط" de="Zentriert" align="center" inverse={alignment === "center"} /></Button></div></div><div><Pair ar="خلفية القراءة" de="Lesefläche" /><div className="mt-2 grid grid-cols-3 gap-2"><ThemeButton active={theme === "navy"} theme="navy" ar="كحلي" de="Dunkelblau" onClick={() => setTheme("navy")} /><ThemeButton active={theme === "white"} theme="white" ar="أبيض" de="Weiß" onClick={() => setTheme("white")} /><ThemeButton active={theme === "warm"} theme="warm" ar="دافئ" de="Warm" onClick={() => setTheme("warm")} /></div></div></div></DialogContent></Dialog>
    {(item.reciters?.length ?? 0) > 0 && <ReciterPlayer key={item.id} itemId={item.id} reciters={item.reciters ?? []} />}
  </div>;
}

function ScaleControl({ ar, de, value, onChange }: { ar: string; de: string; value: number; onChange: (value: number) => void }) {
  return <div><div className="flex items-center justify-between gap-3"><Pair ar={ar} de={de} /><span dir="ltr" className="text-sm font-bold text-secondary">{value}%</span></div><input aria-label={`${ar} | ${de}`} type="range" min="80" max="150" step="10" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-secondary" /></div>;
}

function ThemeButton({ active, theme, ar, de, onClick }: { active: boolean; theme: "navy" | "white" | "warm"; ar: string; de: string; onClick: () => void }) {
  return <Button variant={active ? "default" : "outline"} onClick={onClick} className="h-auto flex-col gap-2 px-1 py-2"><span className="reader-theme-swatch h-6 w-6 rounded-full border border-border" data-swatch={theme} /><Pair ar={ar} de={de} align="center" inverse={active} /></Button>;
}

function VisaView({ content, admin }: { content: SiteContent; admin: AdminProps }) {
  const saveContent = useSaveContent(admin?.password ?? "");
  const visa = content.visa;
  return (
    <div className="screen-enter px-4 py-7">
      <ScreenTitle icon={IdCard} ar="الفيزا والمطارات" de="Visum & Flughäfen" />
      {admin && <div className="mb-3"><ItemActions fields={visaFields} item={{ ...visa }} onSave={(row) => saveContent({ ...content, visa: row as SiteContent["visa"] })} onDelete={() => saveContent({ ...content, visa: { eu: "", nonEu: "" } })} /></div>}
      <section className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm shadow-sm">
        <Pair ar="الفيزا حسب نوع جواز السفر:" de="Visum je nach Reisepass:" />
        <Pair ar={`• جواز أوروبي — ${visa.eu ? `رسوم الفيزا: ${visa.eu}` : "سيتم تحديد رسوم الفيزا لاحقاً."}`} de={`• EU-Reisepass — ${visa.eu ? `Visumgebühr: ${visa.eu}` : "Visumgebühr wird noch bekannt gegeben."}`} />
        <Pair ar={`• جواز غير أوروبي — ${visa.nonEu ? `رسوم الفيزا: ${visa.nonEu}` : "سيتم تحديد رسوم الفيزا لاحقاً."}`} de={`• Nicht-EU-Reisepass — ${visa.nonEu ? `Visumgebühr: ${visa.nonEu}` : "Visumgebühr wird noch bekannt gegeben."}`} />
        <div className="whitespace-pre-line border-t border-border pt-3">
          <Pair ar={visa.airportsAr || "المطارات المتاحة للانطلاق: فرانكفورت، هامبورغ، برلين، دوسلدورف (وغيرها حسب الطلب)."} de={visa.airportsDe || "Verfügbare Abflughäfen: Frankfurt, Hamburg, Berlin, Düsseldorf (weitere auf Anfrage)."} />
        </div>
      </section>
    </div>
  );
}

function FaqView({ content, admin }: { content: SiteContent; admin: AdminProps }) {
  const saveContent = useSaveContent(admin?.password ?? "");
  const { lang } = useLang();
  const faqs = content.faqs ?? defaultContent.faqs;
  const visibleFaqs = faqs.filter((f) => !f.hidden);
  return (
    <div className="screen-enter px-4 py-7">
      <ScreenTitle icon={HelpCircle} ar="الأسئلة الشائعة" de="Häufige Fragen (FAQ)" />
      {admin && <div className="mb-3"><AddButton label={{ ar: "إضافة سؤال", de: "Frage hinzufügen" }} fields={faqFields} blank={{ qAr: "", qDe: "", qEn: "", aAr: "", aDe: "", aEn: "" }} onAdd={(row) => saveContent({ ...content, faqs: [...faqs, { ...(row as FaqEntry), id: `f${Date.now()}` }] })} /></div>}
      {admin ? (
        <div className="space-y-3">
          {faqs.map((f) => <div key={f.id} className={`rounded-lg border border-border bg-card p-3 ${f.hidden ? "opacity-55" : ""}`}><ItemActions fields={faqFields} item={f} hidden={f.hidden ?? false} onVisibilityChange={(hidden) => saveContent({ ...content, faqs: faqs.map((x) => (x.id === f.id ? { ...x, hidden } : x)) })} onSave={(row) => saveContent({ ...content, faqs: faqs.map((x) => (x.id === f.id ? { ...(row as FaqEntry), id: x.id, hidden: x.hidden ?? false } : x)) })} onDelete={() => saveContent({ ...content, faqs: faqs.filter((x) => x.id !== f.id) })} /><div className="text-sm font-bold"><Pair ar={f.qAr} de={f.qDe} /></div><div className="mt-2 whitespace-pre-line text-sm"><Pair ar={f.aAr} de={f.aDe} /></div></div>)}
        </div>
      ) : visibleFaqs.length > 0 && (
        <Accordion type="single" collapsible className="overflow-hidden rounded-lg border border-border bg-card px-4 shadow-sm">
          {visibleFaqs.map((f) => <FaqItem key={f.id} value={f.id} questionAr={f.qAr} questionDe={lang === "en" && f.qEn ? f.qEn : f.qDe} answerAr={f.aAr} answerDe={lang === "en" && f.aEn ? f.aEn : f.aDe} />)}
        </Accordion>
      )}
    </div>
  );
}

function DonationsView() {
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={HandHeart} ar="المساهمة بتيسير أمر زائر" de="Spenden für einen Pilger" /><section className="rounded-lg bg-primary p-6 text-primary-foreground shadow-md"><HandHeart className="mb-5 h-10 w-10 text-secondary" aria-hidden="true" /><p className="text-sm"><Pair ar="ساهم في تيسير أمر زوار غير قادرين على تغطية تكاليف الزيارة، وفي دعم استمرار الحملة." de="Helfen Sie Pilgern, die ihre Reisekosten nicht selbst tragen können, und unterstützen Sie den Fortbestand der Reisegruppe." inverse /></p><Button asChild className="mt-6 h-14 w-full whitespace-normal bg-secondary text-secondary-foreground hover:bg-secondary/90"><a href="https://wa.me/49015773055365" target="_blank" rel="noreferrer"><MessageCircle /><Pair ar="للمساهمة تواصل مع الحاج ياسر الدر" de="Für Spenden Hajj Yasser Aldor kontaktieren" align="center" /></a></Button></section></div>;
}

const bottomItems: Array<{ view: View; ar: string; de: string; icon: IconType }> = [
  { view: "home", ar: "الرئيسية", de: "Start", icon: Home },
  { view: "trips", ar: "الرحلات", de: "Reisen", icon: Luggage },
  { view: "registration", ar: "التسجيل", de: "Anmeldung", icon: ScrollText },
  { view: "contacts", ar: "التواصل", de: "Kontakt", icon: Phone },
  { view: "news", ar: "الأخبار", de: "Aktuelles", icon: Megaphone },
];

function Index() {
  const { data: content } = useSuspenseQuery(contentQuery);
  return <LangProvider><CampaignApp content={content} /></LangProvider>;
}

function CampaignApp({ content }: { content: SiteContent }) {
  const [view, setView] = useState<View>("home");
  const [welcomed, setWelcomed] = useState(false);
  const adminPw = useAdminPassword();
  const admin: AdminProps = adminPw ? { password: adminPw, content } : null;
  const go = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  useEffect(() => { setWelcomed(window.localStorage.getItem("welcome-seen") === "true"); }, []);
  useEffect(() => { const open = () => go("favorites"); window.addEventListener("open-favorites", open); return () => window.removeEventListener("open-favorites", open); }, []);
  return (
    <div className="min-h-screen bg-muted">
      {!welcomed && <WelcomeScreen onEnter={() => setWelcomed(true)} canGoBack={typeof window !== "undefined" && window.localStorage.getItem("welcome-seen") === "true"} />}
      <main className="mx-auto min-h-screen w-full max-w-[420px] overflow-x-hidden bg-background pb-24 text-foreground shadow-xl">
        <AppHeader view={view} onHome={() => go("home")} />
        <AlertBanner alert={content.alert} />
        {view === "home" && <HomeView go={go} content={content} admin={admin} payment={content.payment ?? defaultContent.payment} />}
        {view === "trips" && <TripsView content={content} admin={admin} />}
        {view === "registration" && <RegistrationView />}
        {view === "contacts" && <ContactsView content={content} admin={admin} />}
        {view === "news" && <NewsView content={content} admin={admin} />}
        {view === "donations" && <DonationsView />}
        {view === "duas" && <DuasView content={content} />}
        {view === "itinerary" && <ItineraryView content={content} admin={admin} />}
        {view === "guide" && <GuideView content={content} admin={admin} />}
        {view === "tasbeeh" && <TasbeehView />}
        {view === "qibla" && <QiblaView />}
        {view === "occasions" && <ResourcesView content={content} admin={admin} kind="occasions" />}
        {view === "hadiths" && <ResourcesView content={content} admin={admin} kind="hadiths" />}
        {view === "faqs" && <FaqView content={content} admin={admin} />}
        {view === "visa" && <VisaView content={content} admin={admin} />}
        {view === "favorites" && <FavoritesView content={content} go={go} />}
        <footer className="space-y-4 px-4 pb-6 pt-4 text-center">
          <button type="button" onClick={() => { setWelcomed(false); window.scrollTo({ top: 0 }); }} className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-secondary px-4 py-2 text-xs font-bold text-primary hover:bg-accent"><Pair ar="شاشة البداية وتغيير اللغة" de="Startbildschirm & Sprache" align="center" /></button>
          <PushButton />
          <ShareButton />
          <SocialLinks />
          <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:border-secondary hover:text-primary"><Pair ar="الإدارة" de="Verwaltung" align="center" /></Link>
        </footer>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto grid h-20 w-full max-w-[420px] grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-xl backdrop-blur-md" aria-label="التنقل الرئيسي | Hauptnavigation">
        {bottomItems.map(({ view: itemView, ar, de, icon: Icon }) => <Button key={itemView} variant="ghost" onClick={() => go(itemView)} aria-current={view === itemView ? "page" : undefined} className={`h-full min-w-0 flex-col gap-1 rounded-none px-0.5 ${view === itemView ? "bg-accent text-primary" : "text-muted-foreground"}`}><Icon className="h-5 w-5" aria-hidden="true" /><NavLabel ar={ar} de={de} /></Button>)}
      </nav>
    </div>
  );
}