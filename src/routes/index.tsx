import { createPortal } from "react-dom";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { fetchContentOfflineFirst, OfflineMissingError } from "@/lib/offline";
import { OfflineFallback } from "@/components/offline-status";
import { defaultContacts, defaultContent, defaultIraqItems, type IraqItem, duaCategoryOf, labelOf, type ContactEntry, type TripEntry, type FaqEntry, type NewsEntry, type DuaCategory, type SiteContent, type TripTypeEntry, type ShrineEntry, type NoteEntry, type DonationEntry } from "@/lib/site-content";
import { LangProvider, display, isArabic, useLang, type AppLang } from "@/lib/i18n";
import { DuaAddButton, DuaAdminActions, useAdminPassword } from "@/components/dua-admin";
import { ReciterPlayer } from "@/components/audio-player";
import { MemoriesView } from "@/components/memories";
import { PilgrimIdView, ScrollToTop } from "@/components/pilgrim-id";
import { FolderCard, FullPage, GuidelinesFolders, RenameTitle } from "@/components/final-group";
import misbahaCard from "@/assets/misbaha-card.jpg.asset.json";
import { GuideView, ItineraryView, TasbeehView } from "@/components/extras";
import { WelcomeScreen } from "@/components/welcome-screen";
import { CustomSectionView, HomeBanner, TileGrid, pathOf, type Tile } from "@/components/cms";
import { LanguageSwitcher } from "@/components/lang-switcher";
import { LangText } from "@/lib/i18n";
import { AccessGateway, AdminBar, openGateway } from "@/components/admin-bar";
import { useShowHidden } from "@/lib/admin-session";
import { enablePush } from "@/lib/push";
import { BookingForm, BookingsPanel } from "@/components/booking";
import { Bell, CalendarClock, Compass, Eye, EyeOff, Feather, MapPin, Minus, Moon, Plus, Sun, Vibrate } from "lucide-react";
import { FavStar, QiblaView, ResourcesView, useFavorites } from "@/components/group2";
import { AddButton, GearMenu, IconBtn, ItemActions, useSaveContent, type FieldDef } from "@/components/inline-admin";
import { Trash2 as TrashIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
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
  Share2, Share, Smartphone, SquarePlus,
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
import { IraqIcon, KaabaIcon, IranIcon, HajjIcon } from "@/components/trip-icons";

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

if (typeof window !== "undefined") window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); (window as unknown as { __installEvt?: Event }).__installEvt = e; });

const contentQuery = queryOptions({ queryKey: ["site-content"], queryFn: fetchContentOfflineFirst, networkMode: "offlineFirst", retry: 1 });

const officialEmail = "ushaqalhussein.contact@gmail.com";
const socialLinks = [
  { href: "https://www.instagram.com/reisegruppe_ushaq_al_hussein", label: "إنستغرام | Instagram", icon: Instagram },
  { href: "https://www.facebook.com/share/1KF3URwHzk/", label: "فيسبوك | Facebook", icon: Facebook },
  { href: "https://www.tiktok.com/@reise_ushaq_alhussein", label: "تيك توك | TikTok", icon: Music2 },
];

type View = "custom" | "home" | "trips" | "registration" | "contacts" | "news" | "donations" | "duas" | "itinerary" | "guide" | "tasbeeh" | "qibla" | "occasions" | "hadiths" | "faqs" | "visa" | "favorites" | "memories" | "pilgrimId";
type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
type PairProps = { ar: string; de: string; align?: "right" | "center"; inverse?: boolean };

function Pair({ ar, de, align = "right", inverse = false }: PairProps) {
  const { lang } = useLang();
  const { main, sub } = display(lang, ar, de);
  const center = align === "center";
  const rtl = isArabic(main);
  const own = center ? "text-center" : rtl ? "text-right" : "text-left";
  if (!sub) return <span lang={rtl ? "ar" : lang === "en" ? "en" : "de"} dir={rtl ? "rtl" : "ltr"} className={`block font-bold ${rtl ? "leading-relaxed" : "leading-snug"} ${own}`}>{main}</span>;
  return (
    <span className={`block ${center ? "text-center" : "text-right"}`}>
      <span lang="ar" dir="rtl" className="block font-bold leading-relaxed">{main}</span>
      <span lang="de" dir="ltr" className={`mt-0.5 block text-[0.72em] font-medium italic leading-snug ${inverse ? "text-primary-foreground/65" : "text-muted-foreground"}`}>{sub}</span>
    </span>
  );
}

const tripMeta: Record<string, { statusAr: string; statusDe: string; icon: IconType; image: string | null }> = {
  iraq: { statusAr: "التسجيل مفتوح", statusDe: "Anmeldung offen", icon: IraqIcon, image: iraqInvitation.url },
  winter: { statusAr: "التسجيل مفتوح", statusDe: "Anmeldung offen", icon: IraqIcon, image: winterInvitation.url },
  umrah: { statusAr: "موعد معلن", statusDe: "Termin angekündigt", icon: KaabaIcon, image: umrahInvitation.url },
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


const tripIcons: Record<string, IconType> = { iraq: IraqIcon, winter: IraqIcon, umrah: KaabaIcon, iran: IranIcon, hajj: HajjIcon };
const tripTypeFields: FieldDef[] = [
  { key: "ar", ar: "الاسم", de: "Name (AR)" }, { key: "de", ar: "الاسم بالألمانية", de: "Name (DE)", ltr: true },
  { key: "statusAr", ar: "الحالة (مثل: زيارة عامة، سيُعلن قريباً)", de: "Status (AR)" }, { key: "statusDe", ar: "الحالة بالألمانية", de: "Status (DE)", ltr: true },
];
const shrineFields: FieldDef[] = [
  { key: "ar", ar: "اسم العتبة", de: "Name (AR)" }, { key: "de", ar: "الاسم بالألمانية", de: "Name (DE)", ltr: true },
  { key: "imageUrl", ar: "رابط صورة (اختياري)", de: "Bild-Link (optional)", ltr: true },
];
const noteFields: FieldDef[] = [
  { key: "ar", ar: "النص", de: "Text (AR)", multiline: true }, { key: "de", ar: "النص بالألمانية", de: "Text (DE)", ltr: true, multiline: true },
];
const donationFields: FieldDef[] = [
  { key: "ar", ar: "العنوان / الوصف", de: "Titel (AR)" }, { key: "de", ar: "العنوان بالألمانية", de: "Titel (DE)", ltr: true },
  { key: "value", ar: "الرقم / الحساب / IBAN / رابط", de: "Nummer / Konto / Link", ltr: true },
];
const shrineImages: Record<string, string> = { karbala: shrineImage, najaf: najafShrine, kazimiyya: kazimiyyaShrine, samarra: samarraShrine, mashhad: mashhadShrine, qom: qomShrine, "mecca-medina": meccaMedinaShrine };



const viewTitles: Record<View, { ar: string; de: string }> = {
  custom: { ar: "", de: "" },
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
  memories: { ar: "ذكريات الزيارة", de: "Reiseerinnerungen" }, pilgrimId: { ar: "هويتي والطوارئ", de: "Ausweis & Notfall" }, favorites: { ar: "محفوظاتي", de: "Meine Favoriten" },
};

function useLongPress(cb: () => void, ms = 3000) {
  const t = useRef<number | null>(null);
  const clear = () => { if (t.current) window.clearTimeout(t.current); t.current = null; };
  return { onPointerDown: () => { clear(); t.current = window.setTimeout(() => { navigator.vibrate?.(40); cb(); }, ms); }, onPointerUp: clear, onPointerLeave: clear, onPointerCancel: clear, onContextMenu: (e: React.MouseEvent) => e.preventDefault() };
}

function AppHeader({ view, onHome, title, crumbs, onCrumb }: { view: View; onHome: () => void; title?: { ar: string; de: string } | undefined; crumbs: Tile[]; onCrumb: (id: string) => void }) {
  const longPress = useLongPress(openGateway);
  const t = title ?? viewTitles[view];
  return (
    <header className="bg-primary px-5 pb-5 pt-6 text-primary-foreground">
      <div className="flex items-center justify-between gap-4">
        {view !== "home" ? (
          <Button variant="ghost" size="icon" onClick={() => (crumbs.length ? onCrumb(crumbs[crumbs.length - 1]!.id) : onHome())} aria-label="رجوع | Zurück" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
            <ArrowLeft className="rotate-180" />
          </Button>
        ) : <span className="h-9 w-9" />}
        <div className="min-w-0 flex-1 text-center">
          <p {...longPress} className="select-none text-sm font-extrabold [-webkit-touch-callout:none]">حملة عشاق الحسين (ع) — ألمانيا</p>
          <p lang="de" dir="ltr" className="mt-1 text-[10px] font-medium text-primary-foreground/65">Reisegruppe Ushaq al-Hussein (as) — Deutschland</p>
          <div className="gold-line mx-auto my-3 h-px w-24" />
          <LangText ar={t.ar} de={t.de} inverse center />
        </div>
        <DarkModeToggle />
      </div>
      <LanguageSwitcher />
      {view !== "home" && crumbs.length > 0 && <nav aria-label="المسار | Pfad" className="mt-3 flex flex-wrap items-center justify-center gap-1 text-[11px]">
        <button type="button" onClick={onHome} className="rounded-full px-2 py-0.5 text-primary-foreground/75 hover:bg-primary-foreground/10"><LangText ar="الرئيسية" de="Start" inverse /></button>
        {crumbs.map((c) => <span key={c.id} className="flex items-center gap-1"><ChevronLeft className="h-3 w-3 text-secondary" aria-hidden="true" /><button type="button" onClick={() => onCrumb(c.id)} className="rounded-full px-2 py-0.5 text-primary-foreground/75 hover:bg-primary-foreground/10"><LangText ar={c.ar} de={c.de} inverse /></button></span>)}
      </nav>}
    </header>
  );
}

function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { const on = localStorage.getItem("dark-mode") === "1"; setDark(on); document.documentElement.classList.toggle("dark", on); }, []);
  const flip = () => { const on = !dark; setDark(on); localStorage.setItem("dark-mode", on ? "1" : "0"); document.documentElement.classList.toggle("dark", on); navigator.vibrate?.(10); };
  return <button type="button" onClick={flip} aria-pressed={dark} aria-label="الوضع الليلي | Nachtmodus" className="grid h-9 w-9 place-items-center rounded-md border border-secondary/50 text-secondary transition-colors hover:bg-secondary/15">{dark ? <Sun className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}</button>;
}

function NavLabel({ ar, de }: { ar: string; de: string }) {
  const { lang } = useLang();
  const { main, sub } = display(lang, ar, de);
  return <><span dir="auto" className="max-w-full truncate text-[10px] font-bold leading-none">{main}</span>{sub && <span lang="de" dir="ltr" className="max-w-full truncate text-[8px] italic leading-none">{sub}</span>}</>;
}

function ScreenTitle({ icon: Icon, ar, de }: { icon: IconType; ar: string; de: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <h2 className="text-xl text-primary"><Pair ar={ar} de={de} /></h2>
    </div>
  );
}

const homeTiles: Tile[] = [
    { builtin: true, id: "trips", ar: "الرحلات", de: "Reisen", icon: Luggage },
    { builtin: true, id: "registration", ar: "التسجيل", de: "Anmeldung", icon: ScrollText },
    { builtin: true, id: "contacts", ar: "التواصل", de: "Kontakt", icon: Phone },
    { builtin: true, id: "news", ar: "الأخبار", de: "Neuigkeiten", icon: Megaphone },
    { builtin: true, id: "duas", ar: "الأدعية والزيارات", de: "Bittgebete & Ziyarat", icon: BookOpen },
    { builtin: true, id: "itinerary", ar: "جدول الرحلة", de: "Tagesprogramm", icon: CalendarClock },
    { builtin: true, id: "guide", ar: "دليل الإقامة والمواقع", de: "Unterkunft & Orte", icon: MapPin },
    { builtin: true, id: "tasbeeh", ar: "السبحة الإلكترونية", de: "Digitale Tasbih", icon: Vibrate },
    { builtin: true, id: "qibla", ar: "اتجاه القبلة", de: "Qibla-Kompass", icon: Compass },
    { builtin: true, id: "occasions", ar: "المناسبات الخاصة", de: "Besondere Anlässe", icon: Sparkles },
    { builtin: true, id: "hadiths", ar: "الأحاديث والروايات", de: "Hadithe & Überlieferungen", icon: Feather },
    { builtin: true, id: "faqs", ar: "الأسئلة الشائعة", de: "Häufige Fragen (FAQ)", icon: HelpCircle },
    { builtin: true, id: "visa", ar: "الفيزا والمطارات", de: "Visum & Flughäfen", icon: IdCard },
    { builtin: true, id: "memories", ar: "ذكريات الزيارة", de: "Reiseerinnerungen", icon: Sparkles },
    { builtin: true, id: "pilgrimId", ar: "هويتي والطوارئ", de: "Ausweis & Notfall", icon: IdCard },
    { builtin: true, id: "favorites", ar: "محفوظاتي", de: "Meine Favoriten", icon: Star },
    { builtin: true, id: "donations", ar: "المساهمة", de: "Spenden", icon: HandHeart },
];

function HomeView({ open, content, payment }: { open: (id: string) => void; content: SiteContent; payment: SiteContent["payment"] }) {
  return (
    <div className="screen-enter px-4 py-5">
      <HomeBanner content={content} fallbackImage={shrineImage} />

      <TileGrid content={content} builtins={homeTiles} onOpen={open} />

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

type FavTab = "all" | "trips" | "duas" | "contacts" | "info";
function FavoritesView({ content, go }: { content: SiteContent; go: (view: View) => void }) {
  const { ids } = useFavorites();
  const [reader, setReader] = useState<ReaderItem | null>(null);
  const [tab, setTab] = useState<FavTab>("all");
  const trips = content.trips.filter((t) => ids.includes(`trip:${t.id}`) && t.visible && !t.hidden);
  const duas = content.duas.filter((d) => ids.includes(d.id) && !d.hidden).map((d) => ({ ...d, cat: duaCategoryOf(d), ...splitGermanText(d.textDe) }));
  const contacts = content.contacts.filter((c) => ids.includes(`contact:${c.id}`) && !c.hidden && c.visible !== false);
  const info: Array<{ key: string; ar: string; de: string; bodyAr: string; bodyDe: string; view: View }> = [
    ...content.news.filter((n) => !n.hidden && ids.includes(`news:${n.ar || n.de}`)).map((n) => ({ key: `n${n.ar}${n.de}`, ar: n.ar, de: n.de, bodyAr: n.bodyAr, bodyDe: n.bodyDe, view: "news" as View })),
    ...content.faqs.filter((f) => !f.hidden && ids.includes(`faq:${f.id}`)).map((f) => ({ key: `f${f.id}`, ar: f.qAr, de: f.qDe, bodyAr: f.aAr, bodyDe: f.aDe, view: "faqs" as View })),
    ...content.locations.filter((l) => !l.hidden && ids.includes(`loc:${l.id}`)).map((l) => ({ key: `l${l.id}`, ar: l.ar, de: l.de, bodyAr: l.address, bodyDe: "", view: "guide" as View })),
    ...[...content.occasions.map((r) => ({ r, view: "occasions" as View })), ...content.hadiths.map((r) => ({ r, view: "hadiths" as View }))].filter(({ r }) => !r.hidden && ids.includes(`res:${r.id}`)).map(({ r, view }) => ({ key: `r${r.id}`, ar: r.ar, de: r.de, bodyAr: "", bodyDe: "", view })),
  ];
  if (reader) return <ZiyaratReader item={reader} onBack={() => setReader(null)} />;
  const total = trips.length + duas.length + contacts.length + info.length;
  const tabs: Array<{ id: FavTab; ar: string; de: string; n: number }> = [
    { id: "all", ar: "الكل", de: "Alle", n: total }, { id: "trips", ar: "✈️ الرحلات", de: "Reisen", n: trips.length }, { id: "duas", ar: "📖 الأدعية", de: "Gebete", n: duas.length }, { id: "contacts", ar: "📞 الاتصال", de: "Kontakte", n: contacts.length }, { id: "info", ar: "📌 إرشادات", de: "Hinweise", n: info.length },
  ];
  const show = (t: FavTab) => tab === "all" || tab === t;
  const H = ({ ar, de }: { ar: string; de: string }) => <h3 className="mb-3 text-sm font-bold text-primary"><Pair ar={ar} de={de} /></h3>;
  return <div className="screen-enter px-4 py-7">
    <ScreenTitle icon={Star} ar="محفوظاتي" de="Meine Favoriten" />
    <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">{tabs.map((t) => <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${tab === t.id ? "border-secondary bg-secondary text-secondary-foreground" : "border-border bg-card text-primary"}`}><Pair ar={`${t.ar} (${t.n})`} de={t.de} align="center" /></button>)}</div>
    {!total && <p className="rounded-lg border border-dashed border-secondary/50 bg-card p-6 text-center text-sm"><Pair ar="لم تضف شيئاً بعد — اضغط على النجمة ⭐ بجانب أي رحلة أو دعاء أو رقم أو معلومة لحفظها هنا." de="Noch nichts gespeichert — tippen Sie auf den Stern ⭐ bei einer Reise, einem Gebet, Kontakt oder Hinweis." align="center" /></p>}
    {show("trips") && trips.length > 0 && <section className="mb-7"><H ar="رحلاتي" de="Meine Reisen" /><div className="space-y-3">{trips.map((t) => { const days = (() => { const m = t.date.match(/(\d{2})\.(\d{2})\.(\d{4})/); if (!m) return null; const d = Math.ceil((new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime() - Date.now()) / 86400000); return d > 0 ? d : null; })(); return <div key={t.id} className="relative"><button type="button" onClick={() => go("trips")} className="w-full rounded-lg border border-secondary/50 bg-card p-4 pb-12 text-right shadow-sm"><Pair ar={t.ar} de={t.de} /><span dir="ltr" className="mt-2 flex items-center justify-end gap-2 text-sm font-bold"><CalendarDays className="h-4 w-4 text-secondary" />{t.date}</span>{days && <span className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary"><Pair ar={`متبقٍ ${days} يوماً على الانطلاق ✈️`} de={`Noch ${days} Tage bis zur Abreise ✈️`} /></span>}{(t.programAr || t.programDe) && <div className="mt-3 whitespace-pre-line rounded-md bg-accent p-3 text-sm"><Pair ar={t.programAr ?? ""} de={t.programDe ?? ""} /></div>}</button><TripFavButton id={t.id} /></div>; })}</div></section>}
    {show("duas") && duas.length > 0 && <section className="mb-7"><H ar="أدعيتي وزياراتي" de="Meine Gebete & Ziyarat" /><div className="space-y-3">{duas.map((d) => <ReaderListButton key={d.id} item={d} onRead={setReader} />)}</div></section>}
    {show("contacts") && contacts.length > 0 && <section className="mb-7"><H ar="أرقامي المهمة" de="Wichtige Kontakte" /><div className="space-y-3">{contacts.map((c) => <article key={c.id} className="rounded-lg border border-secondary/50 bg-card p-4 shadow-sm"><div className="flex items-start gap-2"><div className="min-w-0 flex-1 text-primary"><Pair ar={c.ar} de={c.de} /></div><FavStar id={`contact:${c.id}`} /></div><p className="mt-1 text-xs"><Pair ar={c.roleAr} de={c.roleDe} /></p><div className="mt-3 grid grid-cols-2 gap-2"><Button asChild className="h-11"><a href={telHref(c.phone)}><Phone /><span dir="ltr">{c.phone}</span></a></Button>{c.whatsapp && <Button asChild className="h-11 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"><a href={c.whatsapp} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button>}</div></article>)}</div></section>}
    {show("info") && info.length > 0 && <section className="mb-7"><H ar="إرشادات ومعلومات محفوظة" de="Gespeicherte Hinweise" /><div className="space-y-3">{info.map((i) => <button key={i.key} type="button" onClick={() => go(i.view)} className="w-full rounded-lg border border-secondary/50 bg-card p-4 text-right shadow-sm"><span className="text-primary"><Pair ar={i.ar} de={i.de} /></span>{(i.bodyAr || i.bodyDe) && <span className="mt-2 block whitespace-pre-line text-sm"><Pair ar={i.bodyAr} de={i.bodyDe || i.bodyAr} /></span>}</button>)}</div></section>}
  </div>;
}

function TripsView({ content, admin }: { content: SiteContent; admin: AdminProps }) {
  const saveContent = useSaveContent(admin?.password ?? "");
  const showHidden = useShowHidden();
  const upcomingTrips: UpcomingTrip[] = content.trips.filter((t) => showHidden || (t.visible && !t.hidden)).map((t) => { const m = tripMeta[t.id] ?? fallbackMeta; return { ...t, ...m, statusAr: t.statusAr || m.statusAr, statusDe: t.statusDe || m.statusDe }; });
  const saveTrips = (trips: TripEntry[]) => saveContent({ ...content, trips });
  const { hotels, program } = content;
  const [selected, setSelected] = useState<UpcomingTrip | null>(null);
  const [iraqOpen, setIraqOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const upTitle = labelOf(content, "upcoming", "الرحلات القادمة", "Kommende Reisen");
  const upHidden = content.labels?.["upcoming"]?.hidden ?? false;
  const toggleUp = () => saveContent({ ...content, labels: { ...(content.labels ?? {}), upcoming: { ar: content.labels?.["upcoming"]?.ar ?? "", de: content.labels?.["upcoming"]?.de ?? "", hidden: !upHidden } } });
  const upMenu = admin && <GearMenu>
    <RenameTitle content={content} labelKey="upcoming" ar={upTitle.ar} de={upTitle.de} />
    <AddButton inline label={{ ar: "إضافة رحلة جديدة", de: "Neue Reise hinzufügen" }} fields={tripFields} blank={{ ar: "", de: "", date: "", statusAr: "التسجيل مفتوح", statusDe: "Anmeldung offen", descAr: "", descDe: "", programAr: "", programDe: "", visible: true, hidden: false }} onAdd={(row) => saveTrips([...content.trips, { ...(row as TripEntry), id: `t${Date.now()}` }])} />
    {showHidden && <IconBtn label={upHidden ? "إرجاع | Wiederherstellen" : "إخفاء | Verbergen"} onClick={() => void toggleUp()}>{upHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>}
  </GearMenu>;
  const iraqTitle = labelOf(content, "iraq", "زيارة العراق", "Irak-Reise");
  const iraqHidden = content.labels?.["iraq"]?.hidden ?? false;
  const iraqAll = content.iraqItems ?? defaultIraqItems;
  const iraqVisible = iraqAll.filter((x) => showHidden || !x.hidden);
  const saveIraq = (iraqItems: IraqItem[]) => saveContent({ ...content, iraqItems });
  const toggleIraq = () => saveContent({ ...content, labels: { ...(content.labels ?? {}), iraq: { ar: content.labels?.["iraq"]?.ar ?? "", de: content.labels?.["iraq"]?.de ?? "", hidden: !iraqHidden } } });
  const iraqIcon = (x: IraqItem): IconType => (x.id === "flight" || /طير|flug/i.test(x.ar + x.de) ? Plane : x.id === "hotel" || /سكن|unterkunft|hotel/i.test(x.ar + x.de) ? Hotel : x.id === "majlis" || /مجالس|majlis/i.test(x.ar + x.de) ? BedDouble : x.id === "food" || /طعام|verpflegung/i.test(x.ar + x.de) ? Soup : CircleCheck);
  const iraqActions = (x: IraqItem) => admin && <ItemActions fields={iraqFields} item={x} hidden={x.hidden ?? false} onVisibilityChange={(hidden) => saveIraq(iraqAll.map((y) => (y.id === x.id ? { ...y, hidden } : y)))} onSave={(row) => saveIraq(iraqAll.map((y) => (y.id === x.id ? { ...y, ar: String(row["ar"] ?? ""), de: String(row["de"] ?? ""), bodyAr: String(row["bodyAr"] ?? ""), bodyDe: String(row["bodyDe"] ?? "") } : y)))} onDelete={() => saveIraq(iraqAll.filter((y) => y.id !== x.id))} />;
  const iraqMenu = admin && <GearMenu>
    <RenameTitle content={content} labelKey="iraq" ar={iraqTitle.ar} de={iraqTitle.de} />
    <AddButton inline label={{ ar: "إضافة نوع زيارة", de: "Zyarat-Art hinzufügen" }} fields={iraqFields} blank={{ ar: "", de: "", bodyAr: "", bodyDe: "" }} onAdd={(row) => saveIraq([...iraqAll, { id: `it${Date.now()}`, kind: "type", ar: String(row["ar"] ?? ""), de: String(row["de"] ?? ""), bodyAr: String(row["bodyAr"] ?? ""), bodyDe: String(row["bodyDe"] ?? "") }])} />
    <AddButton inline label={{ ar: "إضافة تفصيل للرحلة", de: "Reisedetail hinzufügen" }} fields={iraqFields} blank={{ ar: "", de: "", bodyAr: "", bodyDe: "" }} onAdd={(row) => saveIraq([...iraqAll, { id: `id${Date.now()}`, kind: "detail", ar: String(row["ar"] ?? ""), de: String(row["de"] ?? ""), bodyAr: String(row["bodyAr"] ?? ""), bodyDe: String(row["bodyDe"] ?? "") }])} />
    {showHidden && <IconBtn label={iraqHidden ? "إرجاع | Wiederherstellen" : "إخفاء | Verbergen"} onClick={() => void toggleIraq()}>{iraqHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>}
  </GearMenu>;
  return (
    <div className="screen-enter px-4 py-7">
      <ScreenTitle icon={Luggage} ar="أنواع الزيارة" de="Reisearten" />
      {admin && <AddButton label={{ ar: "إضافة نوع زيارة", de: "Reiseart hinzufügen" }} fields={tripTypeFields} blank={{ ar: "", de: "", statusAr: "سيُعلن قريباً", statusDe: "Wird bald bekannt gegeben" }} onAdd={(row) => saveContent({ ...content, tripTypes: [...content.tripTypes, { ...(row as TripTypeEntry), id: `tt${Date.now()}` }] })} />}
      <div className="grid grid-cols-2 gap-3">
        {content.tripTypes.filter((t) => showHidden || !t.hidden).map((trip) => {
          const Icon = tripIcons[trip.id] ?? Landmark;
          const list = content.tripTypes;
          const actions = admin && <ItemActions fields={tripTypeFields} item={trip} hidden={trip.hidden ?? false} onVisibilityChange={(hidden) => saveContent({ ...content, tripTypes: list.map((x) => (x.id === trip.id ? { ...x, hidden } : x)) })} onSave={(row) => saveContent({ ...content, tripTypes: list.map((x) => (x.id === trip.id ? { ...(row as TripTypeEntry), id: x.id, hidden: x.hidden ?? false } : x)) })} onDelete={() => saveContent({ ...content, tripTypes: list.filter((x) => x.id !== trip.id) })} />;
          const body = <><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-secondary/50 bg-accent text-primary"><Icon className="h-8 w-8" aria-hidden="true" /></span><span className="flex min-h-12 w-full items-center justify-center text-sm"><Pair ar={trip.ar} de={trip.de} align="center" /></span><span className="mt-auto rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"><Pair ar={trip.statusAr} de={trip.statusDe} align="center" /></span></>;
          return <div key={trip.id} className={`min-w-0 ${trip.hidden ? "opacity-55" : ""}`}>{actions}{(() => { const cls = "flex h-48 w-full flex-col items-center gap-2 whitespace-normal rounded-lg border border-border bg-card p-3 pt-4 text-center shadow-sm transition-colors"; return trip.id === "iraq" ? <button type="button" onClick={() => setIraqOpen(true)} className={`${cls} hover:border-secondary`}>{body}</button> : <article className={cls}>{body}</article>; })()}</div>;
        })}
      </div>

      <div className="my-7 border-t border-border" />
      {(!upHidden || showHidden) && <div className={upHidden ? "opacity-60" : ""}><FolderCard icon={CalendarDays} ar={upTitle.ar} de={upTitle.de} count={upcomingTrips.length} onOpen={() => setUpcomingOpen(true)} menu={upMenu} /></div>}
      {upcomingOpen && <FullPage title={upTitle} onBack={() => setUpcomingOpen(false)} menu={upMenu}>
      <div className="space-y-3">
        {upcomingTrips.map((trip) => {
          const Icon = tripIcons[trip.id] ?? (/عمر|umrah/i.test(trip.ar + trip.de) ? KaabaIcon : /حج|hadsch/i.test(trip.ar + trip.de) ? HajjIcon : /إيران|iran/i.test(trip.ar + trip.de) ? IranIcon : /عراق|حسين|irak|hussein/i.test(trip.ar + trip.de) ? IraqIcon : trip.icon);
          const raw = content.trips.find((t) => t.id === trip.id)!;
          return <div key={trip.id} className={`relative ${raw.hidden ? "opacity-55" : ""}`}>{admin && <ItemActions fields={tripFields} item={{ ...raw, statusAr: raw.statusAr ?? trip.statusAr, statusDe: raw.statusDe ?? trip.statusDe }} hidden={raw.hidden ?? false} onVisibilityChange={(hidden) => saveTrips(content.trips.map((t) => (t.id === trip.id ? { ...t, hidden, visible: hidden ? t.visible : true } : t)))} onSave={(row) => saveTrips(content.trips.map((t) => (t.id === trip.id ? { ...(row as TripEntry), id: t.id, hidden: t.hidden ?? false } : t)))} onDelete={() => saveTrips(content.trips.filter((t) => t.id !== trip.id))} />}<Button variant="outline" onClick={() => setSelected(trip)} className="h-auto min-h-32 w-full whitespace-normal bg-card p-4 text-right shadow-sm hover:border-secondary hover:bg-card"><span className="flex w-full items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-muted text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><Pair ar={trip.ar} de={trip.de} /><span dir="ltr" className="mt-3 flex items-center justify-end gap-2 text-sm font-bold text-foreground"><CalendarDays className="h-4 w-4 text-secondary" aria-hidden="true" />{trip.date}</span><span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-1 text-xs text-success-foreground"><CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /><Pair ar={trip.statusAr} de={trip.statusDe} /></span>{(trip.descAr || trip.descDe) && <span className="mt-3 block text-sm font-normal"><Pair ar={trip.descAr ?? ""} de={trip.descDe ?? ""} /></span>}</span><ChevronLeft className="h-5 w-5 shrink-0 self-center text-secondary" aria-hidden="true" /></span></Button><TripFavButton id={trip.id} /></div>;
        })}
        {upcomingTrips.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">لا توجد رحلات معلنة حالياً | Derzeit keine Reisen</p>}
      </div>
      </FullPage>}


      {iraqOpen && <FullPage title={iraqTitle} onBack={() => setIraqOpen(false)} menu={iraqMenu}>
        {(!iraqHidden || showHidden) && <div className={`space-y-5 ${iraqHidden ? "opacity-60" : ""}`}>
          {iraqVisible.filter((x) => x.kind === "intro").map((x) => <div key={x.id} className={x.hidden ? "opacity-55" : ""}>{iraqActions(x)}<div className="rounded-lg bg-accent p-4 pe-10 text-sm"><Pair ar={x.ar} de={x.de} /></div></div>)}
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="text-lg text-primary"><Pair ar="أنواع الزيارة ضمن هذه الرحلة" de="Arten der Zyarat bei dieser Reise" /></h3>
            <div className="mt-4 space-y-3 text-sm">{iraqVisible.filter((x) => x.kind === "type").map((x) => <div key={x.id} className={x.hidden ? "opacity-55" : ""}>{iraqActions(x)}<div className="rounded-md border border-border bg-background p-3 pe-10"><Pair ar={x.ar} de={x.de} />{(x.bodyAr || x.bodyDe) && <div className="mt-2"><Pair ar={x.bodyAr} de={x.bodyDe || x.bodyAr} /></div>}</div></div>)}</div>
          </section>
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="text-lg text-primary"><Pair ar="تفاصيل الرحلة" de="Reisedetails" /></h3>
            <div className="mt-4 grid gap-3">{iraqVisible.filter((x) => x.kind === "detail").map((x) => <div key={x.id} className={x.hidden ? "opacity-55" : ""}>{iraqActions(x)}<div className="pe-10"><Detail icon={iraqIcon(x)} ar={x.ar} de={x.de} detailAr={x.bodyAr} detailDe={x.bodyDe || x.bodyAr} /></div>{x.id === "hotel" && (hotels.kadhimiya || hotels.karbala || hotels.najaf) && <div className="rounded-md bg-muted p-3 text-sm">{hotels.kadhimiya && <Pair ar={`الكاظمية: ${hotels.kadhimiya}`} de={`al-Kazimiyya: ${hotels.kadhimiya}`} />}{hotels.karbala && <Pair ar={`كربلاء: ${hotels.karbala}`} de={`Kerbela: ${hotels.karbala}`} />}{hotels.najaf && <Pair ar={`النجف: ${hotels.najaf}`} de={`Nadschaf: ${hotels.najaf}`} />}</div>}</div>)}</div>
          </section>
        </div>}
      </FullPage>}

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
                {admin && <div className="mt-4 h-8"><ItemActions fields={programFields} item={{ programAr: content.trips.find((t) => t.id === selected.id)?.programAr ?? "", programDe: content.trips.find((t) => t.id === selected.id)?.programDe ?? "" }} onSave={(row) => saveTrips(content.trips.map((t) => (t.id === selected.id ? { ...t, programAr: String(row["programAr"] ?? ""), programDe: String(row["programDe"] ?? "") } : t)))} onDelete={() => saveTrips(content.trips.map((t) => (t.id === selected.id ? { ...t, programAr: "", programDe: "" } : t)))} /></div>}
                <div className={`${admin ? "mt-1" : "mt-5"} rounded-lg border border-border bg-muted p-4`}>
                  <h3 className="text-base text-primary"><Pair ar="برنامج الرحلة لهذا الموعد" de="Reiseprogramm für diesen Termin" /></h3>
                  <div className="mt-3 text-sm"><div className="whitespace-pre-line"><Pair ar={content.trips.find((t) => t.id === selected.id)?.programAr || program.ar} de={content.trips.find((t) => t.id === selected.id)?.programDe || program.de} /></div></div>
                </div>
                <Button className="mt-5 h-14 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => { setSelected(null); window.dispatchEvent(new CustomEvent("open-view", { detail: "registration" })); }}><ScrollText /><Pair ar="سجّل في الرحلة" de="Zur Reise anmelden" align="center" /></Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <GuidelinesFolders content={content} />
    </div>
  );
}

const iraqFields: FieldDef[] = [{ key: "ar", ar: "العنوان (عربي)", de: "Titel (AR)" }, { key: "de", ar: "العنوان (ألماني)", de: "Titel (DE)" }, { key: "bodyAr", ar: "النص (عربي)", de: "Text (AR)", multiline: true }, { key: "bodyDe", ar: "النص (ألماني)", de: "Text (DE)", multiline: true }];

function Detail({ icon: Icon, ar, de, detailAr, detailDe }: { icon: IconType; ar: string; de: string; detailAr: string; detailDe: string }) {
  const { lang } = useLang();
  const ltr = lang === "de" || lang === "en";
  return <div dir={ltr ? "ltr" : "rtl"} className="flex gap-3 border-b border-border pb-3 last:border-0"><Icon className="mt-1 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" /><div className="min-w-0 flex-1 text-start"><Pair ar={ar} de={de} /><div className="mt-1 text-sm"><Pair ar={detailAr} de={detailDe} /></div></div></div>;
}

function RegistrationView({ content }: { content: SiteContent }) {
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={ScrollText} ar="التسجيل في الرحلات" de="Anmeldung zu den Reisen" /><BookingsPanel content={content} /><BookingForm content={content} /></div>;
}

function ContactsView({ content, admin }: { content: SiteContent; admin: AdminProps }) {
  const saveContent = useSaveContent(admin?.password ?? "");
  const contacts = content.contacts ?? defaultContacts;
  const showHidden = useShowHidden();
  const shownContacts = showHidden ? contacts : contacts.filter((contact) => contact.visible !== false && !contact.hidden);
  const saveContacts = (next: ContactEntry[]) => saveContent({ ...content, contacts: next });
  if (!admin && !content.contactsVisible) return <div className="screen-enter px-4 py-7"><ScreenTitle icon={Phone} ar="أرقام التواصل" de="Kontaktnummern" /><p className="rounded-lg border border-border bg-card p-5 text-center text-sm text-muted-foreground"><Pair ar="جهات التواصل غير متاحة حالياً." de="Die Kontaktdaten sind derzeit nicht verfügbar." align="center" /></p></div>;
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={Phone} ar="أرقام التواصل" de="Kontaktnummern" /><SocialLinks showEmail /><div className="mt-5 space-y-3">
    {admin && <AddButton label={{ ar: "إضافة جهة تواصل", de: "Neuen Kontakt hinzufügen" }} fields={contactFields} blank={{ ar: "", de: "", roleAr: "", roleDe: "", phone: "", whatsapp: "", visible: true, hidden: false }} onAdd={(row) => saveContacts([...contacts, { ...(row as ContactEntry), id: `c${Date.now()}` }])} />}
    {shownContacts.map((contact) => <div key={contact.id} className={contact.hidden ? "opacity-55" : ""}>{admin && <ItemActions fields={contactFields} item={contact} hidden={contact.hidden ?? false} onVisibilityChange={(hidden) => saveContacts(contacts.map((c) => (c.id === contact.id ? { ...c, hidden, visible: hidden ? (c.visible ?? true) : true } : c)))} onSave={(row) => saveContacts(contacts.map((c) => (c.id === contact.id ? { ...(row as ContactEntry), id: c.id, hidden: c.hidden ?? false } : c)))} onDelete={() => saveContacts(contacts.filter((c) => c.id !== contact.id))} />}<article className="rounded-lg border border-border bg-card p-4 shadow-sm"><div className={`flex items-start gap-2 ${admin ? "pe-8" : ""}`}><h3 className="min-w-0 flex-1 text-primary"><Pair ar={contact.ar} de={contact.de} /></h3><FavStar id={`contact:${contact.id}`} /></div><p className="mt-2 text-sm"><Pair ar={contact.roleAr} de={contact.roleDe} /></p><p dir="ltr" className="mt-3 text-right text-sm font-bold">{contact.phone}</p><div className="mt-4 grid grid-cols-2 gap-2"><Button asChild className="h-12"><a href={telHref(contact.phone)}><Phone /><Pair ar="اتصال" de="Anrufen" align="center" /></a></Button>{contact.whatsapp && <Button asChild className="h-12 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"><a href={contact.whatsapp} target="_blank" rel="noreferrer"><MessageCircle /><Pair ar="واتساب" de="WhatsApp" align="center" /></a></Button>}</div></article></div>)}
  </div></div>;
}

function FaqItem({ value, questionAr, questionDe, answerAr, answerDe }: { value: string; questionAr: string; questionDe: string; answerAr: string; answerDe: string }) {
  return <AccordionItem value={value}><AccordionTrigger className="gap-3 text-right hover:no-underline"><Pair ar={questionAr} de={questionDe} /></AccordionTrigger><AccordionContent className="text-sm"><Pair ar={answerAr} de={answerDe} /><div className="mt-3 flex justify-end"><FavStar id={`faq:${value}`} /></div></AccordionContent></AccordionItem>;
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
    const early = (window as unknown as { __installEvt?: Event & { prompt: () => Promise<void> } }).__installEvt;
    if (early) setEvt(early);
    const h = (e: Event) => { e.preventDefault(); setEvt(e as Event & { prompt: () => Promise<void> }); };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", h); window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", done); };
  }, []);
  if (installed) return null;
  const click = async () => {
    const e = evt ?? (window as unknown as { __installEvt?: Event & { prompt: () => Promise<void> } }).__installEvt ?? null;
    if (e) { await e.prompt(); setEvt(null); (window as unknown as { __installEvt?: unknown }).__installEvt = undefined; return; }
    setIosHelp(true);
  };
  return <>
    <Button onClick={click} className="mt-5 h-14 w-full gap-2 bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/90"><Smartphone /><Pair ar="تثبيت التطبيق على هاتفك 📲" de="App auf dem Handy installieren" align="center" /></Button>
    <Dialog open={iosHelp} onOpenChange={setIosHelp}><DialogContent className="w-[calc(100%-24px)] max-w-[396px]" dir="rtl"><DialogHeader className="text-right"><DialogTitle><Pair ar="إضافة التطبيق للشاشة الرئيسية" de="Zum Home-Bildschirm hinzufügen" /></DialogTitle><DialogDescription><Pair ar="خطوتان فقط:" de="Nur zwei Schritte:" /></DialogDescription></DialogHeader>{typeof navigator !== "undefined" && /android/i.test(navigator.userAgent) ? <ol className="space-y-4 text-sm">
      <li className="flex items-start gap-3 rounded-md bg-accent p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground font-bold">⋮</span><Pair ar="1. اضغط قائمة ⋮ أعلى المتصفح (Chrome أو Samsung Internet ☰)." de="1. Tippen Sie oben auf das Menü ⋮ (Chrome bzw. Samsung Internet ☰)." /></li>
      <li className="flex items-start gap-3 rounded-md bg-accent p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><SquarePlus /></span><Pair ar="2. اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»." de="2. Wählen Sie „App installieren“ bzw. „Zum Startbildschirm hinzufügen“." /></li>
    </ol> : <ol className="space-y-4 text-sm">
      <li className="flex items-start gap-3 rounded-md bg-accent p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><Share /></span><Pair ar="1. اضغط زر المشاركة أسفل الشاشة في Safari (أو قائمة ⋮ في المتصفحات الأخرى)." de="1. Tippen Sie unten in Safari auf „Teilen“ (bzw. Menü ⋮ in anderen Browsern)." /></li>
      <li className="flex items-start gap-3 rounded-md bg-accent p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><SquarePlus /></span><Pair ar="2. اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة»." de="2. Wählen Sie „Zum Home-Bildschirm“ und dann „Hinzufügen“." /></li>
    </ol>}</DialogContent></Dialog>
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
  const showHidden = useShowHidden();
  const saveNews = (next: NewsEntry[]) => saveContent({ ...content, news: next });
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={Megaphone} ar="آخر الأخبار" de="Neuigkeiten" />
    {admin && <AddButton label={{ ar: "إضافة خبر جديد", de: "Neue Meldung hinzufügen" }} fields={newsFields} blank={{ ar: "", de: "", bodyAr: "", bodyDe: "", hidden: false }} onAdd={(row) => saveNews([row as NewsEntry, ...news])} />}
    <div className="space-y-3">{news.map((item, i) => (!item.hidden || showHidden) && (item.ar || item.de || admin) ? <div key={i} className={item.hidden ? "opacity-55" : ""}>{admin && <ItemActions fields={newsFields} item={item} hidden={item.hidden ?? false} onVisibilityChange={(hidden) => saveNews(news.map((n, j) => (j === i ? { ...n, hidden } : n)))} onSave={(row) => saveNews(news.map((n, j) => (j === i ? { ...(row as NewsEntry), hidden: n.hidden ?? false } : n)))} onDelete={() => saveNews(news.filter((_, j) => j !== i))} />}<article className="rounded-lg border border-border bg-card p-4 shadow-sm"><div className={`mb-3 flex items-start justify-between ${admin ? "pe-8" : ""}`}><span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-primary"><Megaphone className="h-4 w-4" aria-hidden="true" /></span><FavStar id={`news:${item.ar || item.de}`} /></div><h3 className="text-primary"><Pair ar={item.ar} de={item.de} /></h3><p className="mt-3 border-t border-border pt-3 text-sm"><Pair ar={item.bodyAr} de={item.bodyDe} /></p></article></div> : null)}</div></div>;
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
  const showHidden = useShowHidden();
  const managedEntries = useMemo(() => duas.filter((d) => (d.ar || d.de) && (showHidden || !d.hidden)).map((d) => ({ ...d, cat: duaCategoryOf(d), ...splitGermanText(d.textDe) })), [showHidden, duas]);
  const inCat = (c: DuaCategory) => managedEntries.filter((e) => e.cat === c);
  const saveContent = useSaveContent(adminPw ?? "");
  const shrineList = content.shrines;
  const shrines: Array<Shrine & { hidden?: boolean; raw: ShrineEntry }> = shrineList.filter((s) => showHidden || !s.hidden).map((s) => ({ id: s.id, ar: s.ar, de: s.de, image: s.imageUrl || shrineImages[s.id] || shrineImage, entries: inCat(s.id), hidden: s.hidden ?? false, raw: s }));
  const generalEntries = inCat("general");
  const [shrineId, setShrineId] = useState<string | null>(null);
  const shrine = shrines.find((s) => s.id === shrineId) ?? null;
  const [reader, setReader] = useState<ReaderItem | null>(null);
  const [generalOpen, setGeneralOpen] = useState(false);
  const gTitle = labelOf(content, "generalDuas", "الأدعية والتعقيبات", "Bittgebete & Taqibat");
  const gHidden = content.labels?.["generalDuas"]?.hidden ?? false;
  const setGLabel = (patch: { hidden?: boolean }) => saveContent({ ...content, labels: { ...(content.labels ?? {}), generalDuas: { ar: content.labels?.["generalDuas"]?.ar ?? "", de: content.labels?.["generalDuas"]?.de ?? "", hidden: gHidden, ...patch } } });
  const duaGear = admin && <GearMenu>
    <RenameTitle content={content} labelKey="generalDuas" ar={gTitle.ar} de={gTitle.de} />
    <DuaAddButton category="general" password={admin.password} content={admin.content} />
    {showHidden && <IconBtn label={gHidden ? "إرجاع | Wiederherstellen" : "إخفاء | Verbergen"} onClick={() => setGLabel({ hidden: !gHidden })}>{gHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>}
    <IconBtn label="حذف | Löschen" danger onClick={() => { if (!window.confirm("حذف جميع الأدعية والتعقيبات داخل المجلد؟ (يمكن إرجاعها من سلة المحذوفات)\nAlle Bittgebete in diesem Ordner löschen?")) return; void saveContent({ ...content, duas: content.duas.filter((d) => duaCategoryOf(d) !== "general") }); }}><TrashIcon className="h-3.5 w-3.5" /></IconBtn>
  </GearMenu>;
  if (reader) return <ZiyaratReader item={reader} onBack={() => setReader(null)} />;
  if (generalOpen) return <div className="screen-enter px-4 py-7"><div className="mb-2 flex items-start justify-between gap-2"><Button variant="outline" size="icon" onClick={() => setGeneralOpen(false)} aria-label="العودة | Zurück" className="h-8 w-8 shrink-0"><ArrowLeft className="h-4 w-4 rotate-180" /></Button>{duaGear}</div><ScreenTitle icon={ScrollText} ar={gTitle.ar} de={gTitle.de} /><div className="space-y-3">{generalEntries.map((entry) => <ReaderListButton key={entry.id} item={entry} onRead={setReader} admin={admin} />)}</div></div>;
  if (shrine) return <ShrineDetail shrine={shrine} onBack={() => setShrineId(null)} onRead={setReader} admin={admin} />;
  return (
    <div className="screen-enter px-4 py-7">
      <ScreenTitle icon={BookOpen} ar="العتبات المقدسة" de="Heilige Stätten" />
      {admin && <AddButton label={{ ar: "إضافة عتبة", de: "Heilige Stätte hinzufügen" }} fields={shrineFields} blank={{ ar: "", de: "", imageUrl: "" }} onAdd={(row) => saveContent({ ...content, shrines: [...shrineList, { ...(row as ShrineEntry), id: `s${Date.now()}` }] })} />}
      <div className="grid grid-cols-2 gap-3">
        {shrines.map((item) => (
          <div key={item.id} className={`min-w-0 ${item.hidden ? "opacity-55" : ""}`}>{admin && <ItemActions fields={shrineFields} item={item.raw} hidden={item.hidden ?? false} onVisibilityChange={(hidden) => saveContent({ ...content, shrines: shrineList.map((x) => (x.id === item.id ? { ...x, hidden } : x)) })} onSave={(row) => saveContent({ ...content, shrines: shrineList.map((x) => (x.id === item.id ? { ...(row as ShrineEntry), id: x.id, hidden: x.hidden ?? false } : x)) })} onDelete={() => saveContent({ ...content, shrines: shrineList.filter((x) => x.id !== item.id) })} />}
          <Button variant="outline" onClick={() => setShrineId(item.id)} className="group relative aspect-[4/5] h-auto w-full overflow-hidden border-0 p-0 shadow-md">
            <img src={item.image} alt={`${item.ar} | ${item.de}`} loading="lazy" width={768} height={1024} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <span className="shrine-card-shade absolute inset-0" />
            <span className="absolute inset-x-0 bottom-0 p-3 text-primary-foreground"><Pair ar={item.ar} de={item.de} align="center" inverse /></span>
          </Button></div>
        ))}
        {(generalEntries.length > 0 || admin) && (!gHidden || showHidden) && <div className={`relative min-w-0 ${gHidden ? "opacity-55" : ""}`}>{duaGear && <div className="absolute left-2 top-2 z-10">{duaGear}</div>}<Button variant="outline" onClick={() => setGeneralOpen(true)} className="group relative aspect-[4/5] h-auto w-full overflow-hidden border-0 p-0 shadow-md">
          <img src={misbahaCard.url} alt={`${gTitle.ar} | ${gTitle.de}`} loading="lazy" width={736} height={1307} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <span className="shrine-card-shade absolute inset-0" />
          <span className="absolute inset-x-0 bottom-0 p-3 text-primary-foreground"><Pair ar={gTitle.ar} de={gTitle.de} align="center" inverse /></span>
        </Button></div>}
      </div>
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
  const [font, setFont] = useState<ReaderFont>("amiri");
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("ziyarat-reader-settings") ?? "{}");
      if (typeof saved.arabicScale === "number") setArabicScale(Math.min(150, Math.max(80, saved.arabicScale)));
      if (typeof saved.germanScale === "number") setGermanScale(Math.min(150, Math.max(80, saved.germanScale)));
      if (saved.alignment === "right" || saved.alignment === "center") setAlignment(saved.alignment);
      if (saved.theme === "navy" || saved.theme === "white" || saved.theme === "warm") setTheme(saved.theme);
      if (readerFonts.some((f) => f.id === saved.font)) setFont(saved.font);
    } catch { /* Keep the reader defaults when saved preferences are invalid. */ }
  }, []);
  useEffect(() => {
    window.localStorage.setItem("ziyarat-reader-settings", JSON.stringify({ arabicScale, germanScale, alignment, theme, font }));
  }, [arabicScale, germanScale, alignment, theme, font]);
  const night = theme === "navy";
  const bump = (d: number) => { setArabicScale((v) => Math.min(150, Math.max(80, v + d))); setGermanScale((v) => Math.min(150, Math.max(80, v + d))); };
  const trFirst = readerLang === "de" || readerLang === "en";
  const trText = readerLang === "en" && item.textEn ? item.textEn : item.translation;
  const trBlock = <p lang={readerLang === "en" ? "en" : "de"} dir="ltr" className={`reader-de whitespace-pre-line leading-relaxed ${trFirst ? "font-semibold" : "mt-5 italic opacity-75"} ${alignment === "center" ? "text-center" : "text-left"}`}>{trText}</p>;
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const on = (e?: Event) => {
      const t = e?.target;
      const el = t instanceof HTMLElement ? t : (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
      const h = el.scrollHeight - el.clientHeight;
      if (h > 0) setProgress(Math.min(100, (el.scrollTop / h) * 100));
    };
    on(); document.addEventListener("scroll", on, { passive: true, capture: true });
    return () => document.removeEventListener("scroll", on, { capture: true });
  }, []);
  const [focus, setFocus] = useState(false);
  useEffect(() => { document.body.classList.toggle("focus-mode", focus); return () => document.body.classList.remove("focus-mode"); }, [focus]);
  return <div className="reader-shell screen-enter min-h-[calc(100vh-11rem)] pb-44" data-reader-theme={theme} data-reader-font={font} data-ar-scale={arabicScale} data-de-scale={germanScale}>
    {typeof document !== "undefined" && createPortal(<div dir={trFirst ? "ltr" : "rtl"} className="reader-progress-bar pointer-events-none fixed inset-x-0 top-0 z-[70] mx-auto h-1.5 w-full max-w-[420px]" aria-hidden><div className="reader-progress-fill h-full rounded-e-full transition-[width] duration-150" style={{ width: `${Math.max(progress, 1.5)}%` }} /></div>, document.body)}
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-current/10 bg-inherit px-4 py-3 backdrop-blur-md"><Button variant="ghost" size="icon" onClick={onBack} aria-label="العودة | Zurück"><ArrowLeft className="rotate-180" /></Button><h2 className="min-w-0 flex-1 px-2 text-center text-sm"><Pair ar={item.ar} de={item.de} align="center" inverse={theme === "navy"} /></h2><Button variant={focus ? "secondary" : "ghost"} size="icon" onClick={() => setFocus((v) => !v)} aria-pressed={focus} aria-label="وضع القراءة في الحرم | Lesemodus im Schrein">{focus ? <EyeOff /> : <Eye />}</Button><Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="إعدادات القراءة | Leseeinstellungen"><Settings /></Button></div>
    <div className="sticky top-[61px] z-20 flex flex-wrap items-center justify-center gap-2 border-b border-current/10 bg-inherit px-4 py-2">
      <LayerToggle active={showTr} onClick={() => setShowTr((v) => !v)} label="الترجمة | Übersetzung"><Globe /></LayerToggle>
      <LayerToggle active={showLatin} onClick={() => setShowLatin((v) => !v)} label="القراءة اللاتينية | Lautschrift"><TypeIcon /></LayerToggle>
      <LayerToggle active={showAr} onClick={() => setShowAr((v) => !v)} label="النص العربي | Arabisch"><span className="text-base font-extrabold leading-none">ع</span></LayerToggle>
      <span className="mx-1 h-6 w-px bg-current/20" />
      <Button variant="outline" size="icon" className="bg-transparent" onClick={() => bump(-10)} disabled={arabicScale <= 80 && germanScale <= 80} aria-label="تصغير الخط | Schrift kleiner"><Minus /></Button>
      <Button variant="outline" size="icon" className="bg-transparent" onClick={() => bump(10)} disabled={arabicScale >= 150 && germanScale >= 150} aria-label="تكبير الخط | Schrift größer"><Plus /></Button>
      <Button variant={night ? "secondary" : "outline"} size="icon" className={night ? "" : "bg-transparent"} onClick={() => setTheme(night ? "warm" : "navy")} aria-pressed={night} aria-label="الوضع الليلي | Nachtmodus">{night ? <Sun /> : <Moon />}</Button>
    </div>
    <article className={`reader-copy px-5 py-8 ${alignment === "center" ? "text-center" : "text-right"}`}>{showTr && trFirst && <>{trBlock}{(showAr || showLatin) && <div className="my-7 border-t border-current/15" />}</>}{showAr && <p lang="ar" dir="rtl" className="reader-ar whitespace-pre-line font-bold leading-[2.25]">{item.textAr}</p>}{showAr && (showLatin || showTr) && <div className="my-7 border-t border-current/15" />}{showLatin && <p lang="de-Latn" dir="ltr" className={`reader-de whitespace-pre-line font-semibold leading-relaxed ${alignment === "center" ? "text-center" : "text-left"}`}>{item.latin}</p>}{showTr && !trFirst && trBlock}{!showAr && !showLatin && !showTr && <p className="py-10 text-center text-sm opacity-60"><Pair ar="فعّل أحد أزرار العرض أعلاه لإظهار النص." de="Aktivieren Sie oben eine Ebene, um den Text anzuzeigen." align="center" /></p>}{item.link && <Button asChild variant="outline" className="mt-8 h-12 w-full"><a href={item.link} target="_blank" rel="noreferrer"><Download /><Pair ar="تحميل النص الكامل" de="Vollständigen Text herunterladen" align="center" /></a></Button>}</article>
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[360px] overflow-y-auto p-4" dir="rtl"><DialogHeader className="text-right"><DialogTitle><Pair ar="إعدادات القراءة" de="Leseeinstellungen" /></DialogTitle><DialogDescription><Pair ar="خصّص النص بما يناسب قراءتك." de="Passen Sie die Darstellung an Ihre Leseweise an." /></DialogDescription></DialogHeader><div className="space-y-4 pt-1"><ScaleControl ar="حجم النص العربي" de="Arabische Schriftgröße" value={arabicScale} onChange={setArabicScale} /><ScaleControl ar="حجم النص الألماني" de="Deutsche Schriftgröße" value={germanScale} onChange={setGermanScale} /><div><Pair ar="شكل الخط" de="Schriftart" /><div className="mt-2 grid grid-cols-2 gap-2">{readerFonts.map((f) => <Button key={f.id} variant={font === f.id ? "default" : "outline"} onClick={() => setFont(f.id)} className="h-auto flex-col gap-0.5 py-2" data-font-sample={f.id}><span className="reader-font-sample text-lg leading-tight">{f.sample}</span><span className="text-[10px] opacity-80">{f.ar} | {f.de}</span></Button>)}</div></div><div><Pair ar="محاذاة النص" de="Textausrichtung" /><div className="mt-2 grid grid-cols-2 gap-2"><Button variant={alignment === "right" ? "default" : "outline"} onClick={() => setAlignment("right")}><AlignRight /><Pair ar="يمين" de="Rechts" align="center" inverse={alignment === "right"} /></Button><Button variant={alignment === "center" ? "default" : "outline"} onClick={() => setAlignment("center")}><AlignCenter /><Pair ar="وسط" de="Zentriert" align="center" inverse={alignment === "center"} /></Button></div></div><div><Pair ar="خلفية القراءة" de="Lesefläche" /><div className="mt-2 grid grid-cols-3 gap-2"><ThemeButton active={theme === "navy"} theme="navy" ar="كحلي" de="Dunkelblau" onClick={() => setTheme("navy")} /><ThemeButton active={theme === "white"} theme="white" ar="أبيض" de="Weiß" onClick={() => setTheme("white")} /><ThemeButton active={theme === "warm"} theme="warm" ar="دافئ" de="Warm" onClick={() => setTheme("warm")} /></div></div><Button className="h-11 w-full" onClick={() => setSettingsOpen(false)}><Pair ar="حفظ وإغلاق" de="Speichern & schließen" align="center" inverse /></Button></div></DialogContent></Dialog>
    {(item.reciters?.length ?? 0) > 0 && <ReciterPlayer key={item.id} itemId={item.id} reciters={item.reciters ?? []} />}
  </div>;
}

type ReaderFont = "amiri" | "naskh" | "scheherazade" | "cairo";
const readerFonts: Array<{ id: ReaderFont; ar: string; de: string; sample: string }> = [
  { id: "amiri", ar: "مصحفي كلاسيكي", de: "Klassisch", sample: "بِسْمِ اللهِ" },
  { id: "naskh", ar: "نسخ واضح", de: "Naskh klar", sample: "بِسْمِ اللهِ" },
  { id: "scheherazade", ar: "عثماني تقليدي", de: "Traditionell", sample: "بِسْمِ اللهِ" },
  { id: "cairo", ar: "حديث بسيط", de: "Modern", sample: "بِسْمِ اللهِ" },
];

function ScaleControl({ ar, de, value, onChange }: { ar: string; de: string; value: number; onChange: (value: number) => void }) {
  return <div><div className="flex items-center justify-between gap-3"><Pair ar={ar} de={de} /><span dir="ltr" className="text-sm font-bold text-secondary">{value}%</span></div><input aria-label={`${ar} | ${de}`} type="range" min="80" max="150" step="10" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-secondary" /></div>;
}

function ThemeButton({ active, theme, ar, de, onClick }: { active: boolean; theme: "navy" | "white" | "warm"; ar: string; de: string; onClick: () => void }) {
  return <Button variant={active ? "default" : "outline"} onClick={onClick} className="h-auto flex-col gap-2 px-1 py-2"><span className="reader-theme-swatch h-6 w-6 rounded-full border border-border" data-swatch={theme} /><Pair ar={ar} de={de} align="center" inverse={active} /></Button>;
}

function VisaView({ content, admin }: { content: SiteContent; admin: AdminProps }) {
  const saveContent = useSaveContent(admin?.password ?? "");
  const visa = content.visa;
  const showHidden = useShowHidden();
  return (
    <div className="screen-enter px-4 py-7">
      <ScreenTitle icon={IdCard} ar="الفيزا والمطارات" de="Visum & Flughäfen" />
      {admin && <AddButton label={{ ar: "إضافة معلومة", de: "Hinweis hinzufügen" }} fields={noteFields} blank={{ ar: "", de: "" }} onAdd={(row) => saveContent({ ...content, visaNotes: [...content.visaNotes, { ...(row as NoteEntry), id: `v${Date.now()}` }] })} />}
      {admin && <div className="mb-3"><ItemActions fields={visaFields} item={{ ...visa }} onSave={(row) => saveContent({ ...content, visa: row as SiteContent["visa"] })} onDelete={() => saveContent({ ...content, visa: { eu: "", nonEu: "" } })} /></div>}
      <section className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm shadow-sm">
        <Pair ar="الفيزا حسب نوع جواز السفر:" de="Visum je nach Reisepass:" />
        <Pair ar={`• جواز أوروبي — ${visa.eu ? `رسوم الفيزا: ${visa.eu}` : "سيتم تحديد رسوم الفيزا لاحقاً."}`} de={`• EU-Reisepass — ${visa.eu ? `Visumgebühr: ${visa.eu}` : "Visumgebühr wird noch bekannt gegeben."}`} />
        <Pair ar={`• جواز غير أوروبي — ${visa.nonEu ? `رسوم الفيزا: ${visa.nonEu}` : "سيتم تحديد رسوم الفيزا لاحقاً."}`} de={`• Nicht-EU-Reisepass — ${visa.nonEu ? `Visumgebühr: ${visa.nonEu}` : "Visumgebühr wird noch bekannt gegeben."}`} />
        <div className="whitespace-pre-line border-t border-border pt-3">
          <Pair ar={visa.airportsAr || "المطارات المتاحة للانطلاق: فرانكفورت، هامبورغ، برلين، دوسلدورف (وغيرها حسب الطلب)."} de={visa.airportsDe || "Verfügbare Abflughäfen: Frankfurt, Hamburg, Berlin, Düsseldorf (weitere auf Anfrage)."} />
        </div>
      </section>
      <div className="mt-3 space-y-3">{content.visaNotes.filter((n) => showHidden || !n.hidden).map((n) => <div key={n.id} className={n.hidden ? "opacity-55" : ""}>{admin && <ItemActions fields={noteFields} item={n} hidden={n.hidden ?? false} onVisibilityChange={(hidden) => saveContent({ ...content, visaNotes: content.visaNotes.map((x) => (x.id === n.id ? { ...x, hidden } : x)) })} onSave={(row) => saveContent({ ...content, visaNotes: content.visaNotes.map((x) => (x.id === n.id ? { ...(row as NoteEntry), id: x.id, hidden: x.hidden ?? false } : x)) })} onDelete={() => saveContent({ ...content, visaNotes: content.visaNotes.filter((x) => x.id !== n.id) })} />}<section className="whitespace-pre-line rounded-lg border border-border bg-card p-4 text-sm shadow-sm"><Pair ar={n.ar} de={n.de} /></section></div>)}</div>
    </div>
  );
}

function FaqView({ content, admin }: { content: SiteContent; admin: AdminProps }) {
  const saveContent = useSaveContent(admin?.password ?? "");
  const { lang } = useLang();
  const faqs = content.faqs ?? defaultContent.faqs;
  const visibleFaqs = faqs.filter((f) => !f.hidden);
  const showHidden = useShowHidden();
  return (
    <div className="screen-enter px-4 py-7">
      <ScreenTitle icon={HelpCircle} ar="الأسئلة الشائعة" de="Häufige Fragen (FAQ)" />
      {admin && <div className="mb-3"><AddButton label={{ ar: "إضافة سؤال", de: "Frage hinzufügen" }} fields={faqFields} blank={{ qAr: "", qDe: "", qEn: "", aAr: "", aDe: "", aEn: "" }} onAdd={(row) => saveContent({ ...content, faqs: [...faqs, { ...(row as FaqEntry), id: `f${Date.now()}` }] })} /></div>}
      {admin ? (
        <div className="space-y-3">
          {faqs.filter((f) => showHidden || !f.hidden).map((f) => <div key={f.id} className={`rounded-lg border border-border bg-card p-3 ${f.hidden ? "opacity-55" : ""}`}><ItemActions fields={faqFields} item={f} hidden={f.hidden ?? false} onVisibilityChange={(hidden) => saveContent({ ...content, faqs: faqs.map((x) => (x.id === f.id ? { ...x, hidden } : x)) })} onSave={(row) => saveContent({ ...content, faqs: faqs.map((x) => (x.id === f.id ? { ...(row as FaqEntry), id: x.id, hidden: x.hidden ?? false } : x)) })} onDelete={() => saveContent({ ...content, faqs: faqs.filter((x) => x.id !== f.id) })} /><div className="text-sm font-bold"><Pair ar={f.qAr} de={f.qDe} /></div><div className="mt-2 whitespace-pre-line text-sm"><Pair ar={f.aAr} de={f.aDe} /></div></div>)}
        </div>
      ) : visibleFaqs.length > 0 && (
        <Accordion type="single" collapsible className="overflow-hidden rounded-lg border border-border bg-card px-4 shadow-sm">
          {visibleFaqs.map((f) => <FaqItem key={f.id} value={f.id} questionAr={f.qAr} questionDe={lang === "en" && f.qEn ? f.qEn : f.qDe} answerAr={f.aAr} answerDe={lang === "en" && f.aEn ? f.aEn : f.aDe} />)}
        </Accordion>
      )}
    </div>
  );
}

function DonationsView({ content, admin }: { content: SiteContent; admin: AdminProps }) {
  const saveContent = useSaveContent(admin?.password ?? "");
  const showHidden = useShowHidden();
  const list = content.donations;
  const intro = content.donationIntro ?? { ar: "ساهم في تيسير أمر زوار غير قادرين على تغطية تكاليف الزيارة، وفي دعم استمرار الحملة.", de: "Helfen Sie Pilgern, die ihre Reisekosten nicht selbst tragen können, und unterstützen Sie den Fortbestand der Reisegruppe." };
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={HandHeart} ar="المساهمة بتيسير أمر زائر" de="Spenden für einen Pilger" /><section className="relative rounded-lg bg-primary p-6 text-primary-foreground shadow-md"><HandHeart className="mb-5 h-10 w-10 text-secondary" aria-hidden="true" />{admin && <div className="absolute left-2 top-2 z-10"><ItemActions fields={noteFields} item={intro} onSave={(row) => saveContent({ ...content, donationIntro: { ar: String(row["ar"] ?? ""), de: String(row["de"] ?? "") } })} onDelete={() => saveContent({ ...content, donationIntro: { ar: "", de: "" } })} /></div>}{(intro.ar || intro.de) && <p className="whitespace-pre-line text-sm"><Pair ar={intro.ar} de={intro.de} inverse /></p>}<Button asChild className="mt-6 h-14 w-full whitespace-normal bg-secondary text-secondary-foreground hover:bg-secondary/90"><a href="https://wa.me/49015773055365" target="_blank" rel="noreferrer"><MessageCircle /><Pair ar="للمساهمة تواصل مع الحاج ياسر الدر" de="Für Spenden Hajj Yasser Aldor kontaktieren" align="center" /></a></Button></section>
    <div className="mt-5">{admin && <AddButton label={{ ar: "إضافة رقم أو حساب", de: "Nummer/Konto hinzufügen" }} fields={donationFields} blank={{ ar: "", de: "", value: "" }} onAdd={(row) => saveContent({ ...content, donations: [...list, { ...(row as DonationEntry), id: `d${Date.now()}` }] })} />}
    <div className="space-y-3">{list.filter((d) => showHidden || !d.hidden).map((d) => <div key={d.id} className={d.hidden ? "opacity-55" : ""}>{admin && <ItemActions fields={donationFields} item={d} hidden={d.hidden ?? false} onVisibilityChange={(hidden) => saveContent({ ...content, donations: list.map((x) => (x.id === d.id ? { ...x, hidden } : x)) })} onSave={(row) => saveContent({ ...content, donations: list.map((x) => (x.id === d.id ? { ...(row as DonationEntry), id: x.id, hidden: x.hidden ?? false } : x)) })} onDelete={() => saveContent({ ...content, donations: list.filter((x) => x.id !== d.id) })} />}<section className="rounded-lg border border-border bg-card p-4 text-sm shadow-sm"><div className="font-bold text-primary"><Pair ar={d.ar} de={d.de} /></div>{d.value && <div className="mt-2 flex items-center gap-2"><p dir="ltr" className="min-w-0 flex-1 break-all text-left font-bold">{d.value}</p><Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(d.value).then(() => navigator.vibrate?.(30)).catch(() => {}); }}><Copy />نسخ</Button></div>}</section></div>)}</div></div>
  </div>;
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
  const [welcomed, setWelcomed] = useState<boolean | null>(null);
  const [customId, setCustomId] = useState<string | null>(null);
  useEffect(() => { if (customId) sessionStorage.setItem("custom-id", customId); }, [customId]);
  useEffect(() => { document.documentElement.dataset["theme"] = content.cms?.theme ?? ""; }, [content.cms?.theme]);
  useLayoutEffect(() => {
    setWelcomed(sessionStorage.getItem("welcomed") === "1" || localStorage.getItem("welcome-seen") === "true");
    const v = sessionStorage.getItem("view") as View | null;
    if (v && v in viewTitles) setView(v);
    setCustomId(sessionStorage.getItem("custom-id"));
  }, []);
  useEffect(() => { if (welcomed !== null) sessionStorage.setItem("view", view); }, [view, welcomed]);
  useEffect(() => { if (welcomed) sessionStorage.setItem("welcomed", "1"); }, [welcomed]);
  const adminPw = useAdminPassword();
  const admin: AdminProps = adminPw ? { password: adminPw, content } : null;
  const go = (next: View) => {
    if (window.history.state?.view !== next) window.history.pushState({ view: next }, "");
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  /** Opens a built-in section or an admin-created one ("c:<id>"). */
  const open = (id: string) => {
    if (id.startsWith("c:")) {
      const cid = id.slice(2);
      window.history.pushState({ view: "custom", custom: cid }, "");
      setCustomId(cid);
      setView("custom");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else go(id as View);
  };
  const customSec = view === "custom" ? content.cms?.sections?.find((x) => x.id === customId) : undefined;
  const customTitle = customSec ? { ar: content.labels?.[`tile:c:${customSec.id}`]?.ar || customSec.ar, de: customSec.de } : undefined;
  // Phone back button / back gesture: close an open window first, otherwise return to the previous section.
  useEffect(() => {
    if (!window.history.state?.view) window.history.replaceState({ ...(window.history.state ?? {}), view: "home" }, "");
    const onPop = (e: PopStateEvent) => {
      const dlg = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
      if (dlg) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        dlg.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        window.history.pushState({ view: e.state?.view ?? "home" }, "");
        return;
      }
      const next = (e.state?.view as View | undefined) ?? "home";
      if (next === "custom") setCustomId((e.state?.custom as string | undefined) ?? null);
      setView(next in viewTitles ? next : "home");
      window.scrollTo({ top: 0 });
    };
    const onOpen = (e: Event) => open(String((e as CustomEvent).detail));
    window.addEventListener("popstate", onPop);
    window.addEventListener("open-view", onOpen);
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("open-view", onOpen); };
  }, []);
  useEffect(() => { const open = () => go("favorites"); window.addEventListener("open-favorites", open); return () => window.removeEventListener("open-favorites", open); }, []);
  if (welcomed === null) return <div className="min-h-screen bg-muted" />;
  return (
    <div className="min-h-screen bg-muted">
      {welcomed === false && <WelcomeScreen onEnter={() => setWelcomed(true)} />}
      <main className="mx-auto min-h-screen w-full max-w-[420px] overflow-x-hidden bg-background pb-24 text-foreground shadow-xl">
        <AppHeader view={view} onHome={() => go("home")} title={customTitle} crumbs={view === "home" ? [] : pathOf(content, homeTiles, view === "custom" ? `c:${customId ?? ""}` : view)} onCrumb={open} />
        {view !== "home" && view !== "custom" && <div className="px-4"><TileGrid content={content} builtins={homeTiles} parentId={view} onOpen={open} /></div>}
        {view === "home" && <AdminBar content={content} />}
        <AlertBanner alert={content.alert} />
        {view === "home" && <HomeView open={open} content={content} payment={content.payment ?? defaultContent.payment} />}
        {view === "custom" && customId && <CustomSectionView key={customId} content={content} id={customId} builtins={homeTiles} onOpen={open} />}
        {view === "trips" && <TripsView content={content} admin={admin} />}
        {view === "registration" && <RegistrationView content={content} />}
        {view === "contacts" && <ContactsView content={content} admin={admin} />}
        {view === "news" && <NewsView content={content} admin={admin} />}
        {view === "donations" && <DonationsView content={content} admin={admin} />}
        {view === "duas" && <DuasView content={content} />}
        {view === "itinerary" && <ItineraryView content={content} admin={admin} />}
        {view === "guide" && <GuideView content={content} admin={admin} />}
        {view === "tasbeeh" && <TasbeehView />}
        {view === "qibla" && <QiblaView />}
        {view === "occasions" && <ResourcesView content={content} admin={admin} kind="occasions" />}
        {view === "hadiths" && <ResourcesView content={content} admin={admin} kind="hadiths" />}
        {view === "faqs" && <FaqView content={content} admin={admin} />}
        {view === "visa" && <VisaView content={content} admin={admin} />}
        {view === "memories" && <MemoriesView content={content} admin={admin} />}
        {view === "pilgrimId" && <PilgrimIdView content={content} />}
        <ScrollToTop />
        {view === "favorites" && <FavoritesView content={content} go={go} />}
        <footer className="space-y-4 px-4 pb-6 pt-4 text-center">
          <button type="button" onClick={() => { setWelcomed(false); window.scrollTo({ top: 0 }); }} className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-secondary px-4 py-2 text-xs font-bold text-primary hover:bg-accent"><Pair ar="شاشة البداية وتغيير اللغة" de="Startbildschirm & Sprache" align="center" /></button>
          <PushButton />
          <ShareButton />
          <SocialLinks />
          <p onClick={openGateway} className="cursor-default select-none text-[10px] text-muted-foreground">© 2026 حملة عشاق الحسين (ع) — جميع الحقوق محفوظة<br /><span dir="ltr">Reisegruppe Ushaq al-Hussein · Alle Rechte vorbehalten</span></p>
        </footer>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto grid h-20 w-full max-w-[420px] grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-xl backdrop-blur-md" aria-label="التنقل الرئيسي | Hauptnavigation">
        {bottomItems.map(({ view: itemView, ar, de, icon: Icon }) => <Button key={itemView} variant="ghost" onClick={() => go(itemView)} aria-current={view === itemView ? "page" : undefined} className={`h-full min-w-0 flex-col gap-1 rounded-none px-0.5 ${view === itemView ? "bg-accent text-primary" : "text-muted-foreground"}`}><Icon className="h-5 w-5" aria-hidden="true" /><NavLabel ar={ar} de={de} /></Button>)}
      </nav>
      <AccessGateway />
    </div>
  );
}