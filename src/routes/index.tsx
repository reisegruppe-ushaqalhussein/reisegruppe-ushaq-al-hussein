import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getSiteContent } from "@/lib/site-content.functions";
import { defaultContent, duaCategoryOf, type DuaCategory, type SiteContent } from "@/lib/site-content";
import { LangProvider, toEnglish, useLang, type AppLang } from "@/lib/i18n";
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
  HandHeart,
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
});

const contentQuery = queryOptions({ queryKey: ["site-content"], queryFn: () => getSiteContent() });

const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdpuQ5tU5kNJL7Pp8f-vwALemNfp8NF2qRWazP5yb1UP2nDeg/viewform";
const officialEmail = "ushaqalhussein.contact@gmail.com";
const socialLinks = [
  { href: "https://www.instagram.com/reisegruppe_ushaq_al_hussein", label: "إنستغرام | Instagram", icon: Instagram },
  { href: "https://www.facebook.com/share/1KF3URwHzk/", label: "فيسبوك | Facebook", icon: Facebook },
  { href: "https://www.tiktok.com/@reise_ushaq_alhussein", label: "تيك توك | TikTok", icon: Music2 },
];

type View = "home" | "trips" | "registration" | "contacts" | "news" | "donations" | "duas";
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


const generalTrips = [
  { id: "iraq", ar: "زيارة العراق", de: "Irak-Reise", icon: Landmark, statusAr: "عرض التفاصيل", statusDe: "Details anzeigen" },
  { id: "umrah", ar: "العمرة", de: "Umrah", icon: MoonStar, statusAr: "زيارة عامة", statusDe: "Allgemeine Reiseart" },
  { id: "iran", ar: "إيران — زيارة الإمام الرضا (ع)", de: "Iran — Zyarat Imam Rida (as)", icon: Sparkles, statusAr: "سيُعلن قريباً", statusDe: "Wird bald bekannt gegeben" },
  { id: "hajj", ar: "الحج", de: "Hadsch", icon: Star, statusAr: "سيُعلن قريباً", statusDe: "Wird bald bekannt gegeben" },
];

const contacts = [
  { ar: "الحاج ياسر الدر", de: "Hajj Yasser Aldor", roleAr: "المسؤول العام — خادم حملة عشاق الحسين - ألمانيا", roleDe: "Allgemeiner Verantwortlicher der Reisegruppe", displayPhone: "+49 1577 3055365", phone: "tel:+4915773055365", whatsapp: "https://wa.me/49015773055365" },
  { ar: "الحجة سامية فقيه", de: "Hajje Samia Fakih", roleAr: "للأخوات فقط — عند الاستفسار", roleDe: "Nur für Schwestern – bei Rückfragen", displayPhone: "+49 1578 5616843", phone: "tel:+4915785616843", whatsapp: "https://wa.me/49015785616843" },
  { ar: "الحجة خديجة إسماعيل", de: "Hajje Khadije Ismail", roleAr: "للأخوات فقط — عند الاستفسار", roleDe: "Nur für Schwestern – bei Rückfragen", displayPhone: "+49 176 63409995", phone: "tel:+4917663409995", whatsapp: "https://wa.me/49017663409995" },
];


const viewTitles: Record<View, { ar: string; de: string }> = {
  home: { ar: "الرئيسية", de: "Start" },
  trips: { ar: "الرحلات", de: "Reisen" },
  registration: { ar: "التسجيل", de: "Anmeldung" },
  contacts: { ar: "التواصل", de: "Kontakt" },
  news: { ar: "الأخبار", de: "Neuigkeiten" },
  donations: { ar: "المساهمة", de: "Spenden" },
  duas: { ar: "الأدعية والزيارات", de: "Bittgebete & Ziyarat" },
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
        <span className="grid h-9 w-9 place-items-center rounded-md border border-secondary/50 text-secondary"><MoonStar className="h-5 w-5" aria-hidden="true" /></span>
      </div>
      <LanguageSwitcher />
    </header>
  );
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

function HomeView({ go, visa, payment }: { go: (view: View) => void; visa: SiteContent["visa"]; payment: SiteContent["payment"] }) {
  const [visaOpen, setVisaOpen] = useState(false);
  const actions: Array<{ view: View; ar: string; de: string; icon: IconType }> = [
    { view: "trips", ar: "الرحلات", de: "Reisen", icon: Luggage },
    { view: "registration", ar: "التسجيل", de: "Anmeldung", icon: ScrollText },
    { view: "contacts", ar: "التواصل", de: "Kontakt", icon: Phone },
    { view: "news", ar: "الأخبار", de: "Neuigkeiten", icon: Megaphone },
    { view: "duas", ar: "الأدعية والزيارات", de: "Bittgebete & Ziyarat", icon: BookOpen },
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

      <PrayerTimesCard />

      <Button variant="outline" onClick={() => setVisaOpen(true)} className="mt-5 h-auto w-full justify-start gap-3 whitespace-normal bg-card p-4 text-right shadow-sm hover:border-secondary hover:bg-card">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-primary"><IdCard className="h-5 w-5" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1 text-primary"><Pair ar="الفيزا والمطارات" de="Visum & Flughäfen" /></span>
        <ChevronLeft className="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
      </Button>
      {payment?.visible && <PaymentCard payment={payment} />}
      <Dialog open={visaOpen} onOpenChange={setVisaOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto rounded-lg" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl text-primary"><Pair ar="الفيزا والمطارات" de="Visum & Flughäfen" /></DialogTitle>
            <DialogDescription asChild><div className="pt-2 text-sm text-foreground"><Pair ar="الفيزا حسب نوع جواز السفر:" de="Visum je nach Reisepass:" /></div></DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <Pair ar={`• جواز أوروبي — ${visa.eu ? `رسوم الفيزا: ${visa.eu}` : "سيتم تحديد رسوم الفيزا لاحقاً."}`} de={`• EU-Reisepass — ${visa.eu ? `Visumgebühr: ${visa.eu}` : "Visumgebühr wird noch bekannt gegeben."}`} />
            <Pair ar={`• جواز غير أوروبي — ${visa.nonEu ? `رسوم الفيزا: ${visa.nonEu}` : "سيتم تحديد رسوم الفيزا لاحقاً."}`} de={`• Nicht-EU-Reisepass — ${visa.nonEu ? `Visumgebühr: ${visa.nonEu}` : "Visumgebühr wird noch bekannt gegeben."}`} />
            <div className="border-t border-border pt-3">
              <Pair ar="المطارات المتاحة للانطلاق: فرانكفورت، هامبورغ، برلين، دوسلدورف (وغيرها حسب الطلب)." de="Verfügbare Abflughäfen: Frankfurt, Hamburg, Berlin, Düsseldorf (weitere auf Anfrage)." />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TripsView({ content }: { content: SiteContent }) {
  const upcomingTrips: UpcomingTrip[] = content.trips.filter((t) => t.visible).map((t) => ({ ...t, ...(tripMeta[t.id] ?? fallbackMeta) }));
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
      <div className="space-y-3">
        {upcomingTrips.map((trip) => {
          const Icon = trip.icon;
          return <Button key={trip.id} variant="outline" onClick={() => setSelected(trip)} className="h-auto min-h-32 w-full whitespace-normal bg-card p-4 text-right shadow-sm hover:border-secondary hover:bg-card"><span className="flex w-full items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-muted text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><Pair ar={trip.ar} de={trip.de} /><span dir="ltr" className="mt-3 flex items-center justify-end gap-2 text-sm font-bold text-foreground"><CalendarDays className="h-4 w-4 text-secondary" aria-hidden="true" />{trip.date}</span><span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-1 text-xs text-success-foreground"><CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /><Pair ar={trip.statusAr} de={trip.statusDe} /></span></span><ChevronLeft className="mt-2 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" /></span></Button>;
        })}
      </div>

      <section className="mt-7">
        <ScreenTitle icon={BookOpen} ar="الأسئلة الشائعة" de="Häufige Fragen (FAQ)" />
        <Accordion type="single" collapsible className="overflow-hidden rounded-lg border border-border bg-card px-4 shadow-sm">
          <FaqItem value="passport" questionAr="ما مدة صلاحية جواز السفر المطلوبة؟" questionDe="Wie lange muss der Reisepass gültig sein?" answerAr="يجب أن يكون جواز السفر صالحاً لمدة لا تقل عن ستة أشهر عند موعد السفر." answerDe="Der Reisepass muss zum Reisezeitpunkt noch mindestens sechs Monate gültig sein." />
          <FaqItem value="visa" questionAr="هل أحتاج إلى فيزا؟" questionDe="Benötige ich ein Visum?" answerAr="تعتمد الفيزا ورسومها على نوع جواز السفر والوجهة. تُنشر التفاصيل المؤكدة قبل الرحلة." answerDe="Visum und Gebühren richten sich nach Reisepass und Reiseziel. Bestätigte Angaben werden vor der Reise veröffentlicht." />
          <FaqItem value="baggage" questionAr="ما وزن الأمتعة المسموح؟" questionDe="Wie viel Gepäck ist erlaubt?" answerAr="يُحدد وزن الأمتعة حسب شركة الطيران والحجز، ويُعلن مع البرنامج النهائي للرحلة." answerDe="Die Freigepäckmenge richtet sich nach Fluggesellschaft und Buchung und wird mit dem endgültigen Reiseprogramm bekannt gegeben." />
        </Accordion>
      </section>

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
                  <div className="mt-3 text-sm"><Pair ar={program.ar} de={program.de} /></div>
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

function ContactsView() {
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={Phone} ar="أرقام التواصل" de="Kontaktnummern" /><SocialLinks showEmail /><div className="mt-5 space-y-3">{contacts.map((contact) => <article key={contact.de} className="rounded-lg border border-border bg-card p-4 shadow-sm"><h3 className="text-primary"><Pair ar={contact.ar} de={contact.de} /></h3><p className="mt-2 text-sm"><Pair ar={contact.roleAr} de={contact.roleDe} /></p><p dir="ltr" className="mt-3 text-right text-sm font-bold">{contact.displayPhone}</p><div className="mt-4 grid grid-cols-2 gap-2"><Button asChild className="h-12"><a href={contact.phone}><Phone /><Pair ar="اتصال" de="Anrufen" align="center" /></a></Button><Button asChild className="h-12 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"><a href={contact.whatsapp} target="_blank" rel="noreferrer"><MessageCircle /><Pair ar="واتساب" de="WhatsApp" align="center" /></a></Button></div></article>)}</div></div>;
}

function FaqItem({ value, questionAr, questionDe, answerAr, answerDe }: { value: string; questionAr: string; questionDe: string; answerAr: string; answerDe: string }) {
  return <AccordionItem value={value}><AccordionTrigger className="gap-3 text-right hover:no-underline"><Pair ar={questionAr} de={questionDe} /></AccordionTrigger><AccordionContent className="text-sm"><Pair ar={answerAr} de={answerDe} /></AccordionContent></AccordionItem>;
}

function SocialLinks({ showEmail = false }: { showEmail?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(officialEmail); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { window.location.href = `mailto:${officialEmail}`; }
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
    try { await navigator.clipboard.writeText(payment.iban.replace(/\s/g, "")); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  };
  return <section className="mt-5 rounded-lg border border-secondary bg-card p-4 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-primary"><CreditCard className="h-5 w-5" /></span><h2 className="text-primary"><Pair ar="طرق الدفع والتحويل" de="Zahlungsmethoden" /></h2></div><div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">{payment.accountName && <Pair ar={`اسم الحساب: ${payment.accountName}`} de={`Kontoinhaber: ${payment.accountName}`} />}{payment.bankName && <Pair ar={`اسم البنك: ${payment.bankName}`} de={`Bank: ${payment.bankName}`} />}{payment.iban && <div><p dir="ltr" className="break-all text-right font-bold">IBAN: {payment.iban}</p><Button variant="outline" size="sm" onClick={copyIban} className="mt-2 w-full">{copied ? <Check /> : <Copy />}<Pair ar={copied ? "تم نسخ رقم الحساب" : "نسخ رقم الحساب"} de={copied ? "IBAN kopiert" : "IBAN kopieren"} align="center" /></Button></div>}{payment.bic && <p dir="ltr" className="break-all text-right font-bold">BIC: {payment.bic}</p>}<div className="rounded-md bg-accent p-3 text-primary"><Pair ar="التحويل البنكي الفوري فقط — لا يتوفر خيار التقسيط" de="Nur Sofortüberweisung — Keine Ratenzahlung möglich" /></div></div></section>;
}

function ShareButton() {
  const share = () => {
    const url = window.location.origin;
    const text = `حملة عشاق الحسين (ع) — ألمانيا\nReisegruppe Ushaq al-Hussein — Deutschland\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };
  return <Button variant="outline" onClick={share} className="h-12 w-full"><Share2 /><Pair ar="مشاركة التطبيق" de="App teilen" align="center" /></Button>;
}

function NewsView({ news }: { news: SiteContent["news"] }) {
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={Megaphone} ar="آخر الأخبار" de="Neuigkeiten" /><div className="space-y-3">{news.filter((n) => n.ar || n.de).map((item, i) => <article key={i} className="rounded-lg border border-border bg-card p-4 shadow-sm"><span className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-accent text-primary"><Megaphone className="h-4 w-4" aria-hidden="true" /></span><h3 className="text-primary"><Pair ar={item.ar} de={item.de} /></h3><p className="mt-3 border-t border-border pt-3 text-sm"><Pair ar={item.bodyAr} de={item.bodyDe} /></p></article>)}</div></div>;
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

type ReaderItem = { id: string; ar: string; de: string; textAr: string; latin: string; translation: string; link?: string };
type Shrine = { id: string; ar: string; de: string; image: string; entries: ReaderItem[] };

const readerEntries = {
  imamAli: { id: "imam-ali", ar: "زيارة الإمام علي (ع)", de: "Ziyarat Imam Ali (as)", textAr: "السَّلامُ عَلَيْكَ يا أَميرَ الْمُؤْمِنينَ، السَّلامُ عَلَيْكَ يا وَصِيَّ رَسُولِ رَبِّ الْعالَمينَ.", latin: "As-salāmu ʿalayka yā Amīra l-muʾminīn, as-salāmu ʿalayka yā waṣiyya Rasūli Rabbi l-ʿālamīn.", translation: "Friede sei mit dir, o Fürst der Gläubigen. Friede sei mit dir, o Bevollmächtigter des Gesandten des Herrn der Welten." },
  kazimayn: { id: "kazimayn", ar: "زيارة الإمامين الكاظمين (ع)", de: "Ziyarat der beiden Imame al-Kazim (as)", textAr: "السَّلامُ عَلَيْكُما يا وَلِيَّيِ اللهِ، السَّلامُ عَلَيْكُما يا حُجَّتَيِ اللهِ.", latin: "As-salāmu ʿalaykumā yā waliyyayillāh, as-salāmu ʿalaykumā yā ḥujjatayillāh.", translation: "Friede sei mit euch beiden, o Freunde Gottes. Friede sei mit euch beiden, o Beweise Gottes." },
  askari: { id: "askari", ar: "زيارة الإمامين العسكريين (ع)", de: "Ziyarat der beiden Imame al-Askari (as)", textAr: "السَّلامُ عَلَيْكُما يا وَلِيَّيِ اللهِ، السَّلامُ عَلَيْكُما يا حُجَّتَيِ اللهِ وَخالصَتَيْهِ.", latin: "As-salāmu ʿalaykumā yā waliyyayillāh, as-salāmu ʿalaykumā yā ḥujjatayillāhi wa khāliṣatayh.", translation: "Friede sei mit euch beiden, o Freunde Gottes, Seine Beweise und Seine aufrichtigen Diener." },
  imamRida: { id: "imam-rida", ar: "زيارة الإمام الرضا (ع)", de: "Ziyarat Imam Rida (as)", textAr: "السَّلامُ عَلَيْكَ يا وَلِيَّ اللهِ وَابْنَ وَلِيِّهِ، السَّلامُ عَلَيْكَ يا حُجَّةَ اللهِ وَابْنَ حُجَّتِهِ.", latin: "As-salāmu ʿalayka yā waliyyallāhi wabna waliyyih, as-salāmu ʿalayka yā ḥujjatallāhi wabna ḥujjatih.", translation: "Friede sei mit dir, o Freund Gottes und Sohn Seines Freundes. Friede sei mit dir, o Beweis Gottes und Sohn Seines Beweises." },
  masumeh: { id: "masumeh", ar: "زيارة السيدة فاطمة المعصومة (ع)", de: "Ziyarat Sayyida Fatima Masuma (as)", textAr: "السَّلامُ عَلَيْكِ يا بِنْتَ رَسُولِ اللهِ، السَّلامُ عَلَيْكِ يا بِنْتَ فاطِمَةَ وَخَديجَةَ.", latin: "As-salāmu ʿalayki yā binta Rasūlillāh, as-salāmu ʿalayki yā binta Fāṭimata wa Khadīja.", translation: "Friede sei mit dir, o Tochter des Gesandten Gottes. Friede sei mit dir, o Tochter Fatimas und Khadijas." },
  prophet: { id: "prophet", ar: "زيارة النبي محمد (ص)", de: "Ziyarat des Propheten Muhammad (s)", textAr: "السَّلامُ عَلَيْكَ يا رَسُولَ اللهِ، السَّلامُ عَلَيْكَ يا نَبِيَّ اللهِ، السَّلامُ عَلَيْكَ يا مُحَمَّدُ بْنَ عَبْدِ اللهِ.", latin: "As-salāmu ʿalayka yā Rasūlallāh, as-salāmu ʿalayka yā Nabiyyallāh, as-salāmu ʿalayka yā Muḥammada bna ʿAbdillāh.", translation: "Friede sei mit dir, o Gesandter Gottes. Friede sei mit dir, o Prophet Gottes. Friede sei mit dir, o Muhammad, Sohn Abdullahs." },
} satisfies Record<string, ReaderItem>;

function splitGermanText(value: string) {
  const [latin, ...translation] = value.split(/\s+[—–-]\s+/);
  return { latin: latin ?? "", translation: translation.join(" — ") || value };
}

function DuasView({ duas }: { duas: SiteContent["duas"] }) {
  const managedEntries = useMemo(() => duas.filter((d) => d.ar || d.de).map((d) => ({ ...d, cat: duaCategoryOf(d), ...splitGermanText(d.textDe) })), [duas]);
  const inCat = (c: DuaCategory) => managedEntries.filter((e) => e.cat === c);
  const shrines: Shrine[] = [
    { id: "karbala", ar: "كربلاء المقدسة", de: "Kerbela", image: shrineImage, entries: inCat("karbala") },
    { id: "najaf", ar: "النجف الأشرف", de: "Nadschaf", image: najafShrine, entries: [readerEntries.imamAli, ...inCat("najaf")] },
    { id: "kazimiyya", ar: "الكاظمية المقدسة", de: "Al-Kazimiyya", image: kazimiyyaShrine, entries: [readerEntries.kazimayn, ...inCat("kazimiyya")] },
    { id: "samarra", ar: "سامراء", de: "Samarra", image: samarraShrine, entries: [readerEntries.askari, ...inCat("samarra")] },
    { id: "mashhad", ar: "مشهد المقدسة", de: "Maschhad", image: mashhadShrine, entries: [readerEntries.imamRida, ...inCat("mashhad")] },
    { id: "qom", ar: "قم المقدسة", de: "Qom", image: qomShrine, entries: [readerEntries.masumeh, ...inCat("qom")] },
    { id: "mecca-medina", ar: "مكة والمدينة", de: "Mekka & Medina", image: meccaMedinaShrine, entries: [readerEntries.prophet, ...inCat("mecca-medina")] },
  ];
  const generalEntries = inCat("general");
  const [shrine, setShrine] = useState<Shrine | null>(null);
  const [reader, setReader] = useState<ReaderItem | null>(null);
  if (reader) return <ZiyaratReader item={reader} onBack={() => setReader(null)} />;
  if (shrine) return <ShrineDetail shrine={shrine} onBack={() => setShrine(null)} onRead={setReader} />;
  return (
    <div className="screen-enter px-4 py-7">
      <ScreenTitle icon={BookOpen} ar="العتبات المقدسة" de="Heilige Stätten" />
      <div className="grid grid-cols-2 gap-3">
        {shrines.map((item) => (
          <Button key={item.id} variant="outline" onClick={() => setShrine(item)} className="group relative aspect-[4/5] h-auto overflow-hidden border-0 p-0 shadow-md">
            <img src={item.image} alt={`${item.ar} | ${item.de}`} loading="lazy" width={768} height={1024} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <span className="shrine-card-shade absolute inset-0" />
            <span className="absolute inset-x-0 bottom-0 p-3 text-primary-foreground"><Pair ar={item.ar} de={item.de} align="center" inverse /></span>
          </Button>
        ))}
      </div>
      {generalEntries.length > 0 && <section className="mt-7"><ScreenTitle icon={ScrollText} ar="الأدعية العامة والتعقيبات" de="Allgemeine Bittgebete" /><div className="space-y-3">{generalEntries.map((entry) => <ReaderListButton key={entry.id} item={entry} onRead={setReader} />)}</div></section>}
    </div>
  );
}

function LayerToggle({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return <Button variant={active ? "secondary" : "outline"} size="icon" onClick={onClick} aria-pressed={active} aria-label={label} title={label} className={active ? "" : "bg-transparent opacity-60"}>{children}</Button>;
}

function ReaderListButton({ item, onRead }: { item: ReaderItem; onRead: (item: ReaderItem) => void }) {
  return <Button variant="outline" onClick={() => onRead(item)} className="h-auto min-h-20 w-full justify-start gap-3 whitespace-normal bg-card p-4 text-right shadow-sm"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent text-primary"><BookOpen className="h-5 w-5" /></span><span className="min-w-0 flex-1 text-primary"><Pair ar={item.ar} de={item.de} /></span><ChevronLeft className="h-5 w-5 shrink-0 text-secondary" /></Button>;
}

function ShrineDetail({ shrine, onBack, onRead }: { shrine: Shrine; onBack: () => void; onRead: (item: ReaderItem) => void }) {
  return <div className="screen-enter pb-7"><div className="relative h-56 overflow-hidden"><img src={shrine.image} alt={`${shrine.ar} | ${shrine.de}`} loading="lazy" width={768} height={1024} className="h-full w-full object-cover" /><span className="shrine-card-shade absolute inset-0" /><Button variant="secondary" size="icon" onClick={onBack} aria-label="العودة | Zurück" className="absolute right-4 top-4"><ArrowLeft className="rotate-180" /></Button><h2 className="absolute inset-x-5 bottom-5 text-xl text-primary-foreground"><Pair ar={shrine.ar} de={shrine.de} inverse /></h2></div><div className="px-4 pt-6"><ScreenTitle icon={ScrollText} ar="الزيارات والأعمال" de="Ziyarat & Andachtswerke" /><div className="space-y-3">{shrine.entries.map((entry) => <ReaderListButton key={entry.id} item={entry} onRead={onRead} />)}</div></div></div>;
}

function ZiyaratReader({ item, onBack }: { item: ReaderItem; onBack: () => void }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAr, setShowAr] = useState(true);
  const [showLatin, setShowLatin] = useState(true);
  const [showTr, setShowTr] = useState(true);
  const [arabicScale, setArabicScale] = useState(110);
  const [germanScale, setGermanScale] = useState(100);
  const [alignment, setAlignment] = useState<"right" | "center">("right");
  const [theme, setTheme] = useState<"navy" | "white" | "warm">("warm");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const timerRef = useRef<number | null>(null);
  const spokenText = `${item.textAr}. ${item.translation}`;
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
  useEffect(() => {
    const loadVoices = () => {
      const next = window.speechSynthesis?.getVoices() ?? [];
      setVoices(next);
      if (!voiceName && next[0]) setVoiceName(next[0].name);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => { window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices); window.speechSynthesis?.cancel(); if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [voiceName]);
  const toggleAudio = () => {
    if (!("speechSynthesis" in window)) return;
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); if (timerRef.current) window.clearInterval(timerRef.current); return; }
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.voice = voices.find((voice) => voice.name === voiceName) ?? null;
    utterance.onend = () => { setPlaying(false); setProgress(100); if (timerRef.current) window.clearInterval(timerRef.current); };
    utterance.onerror = () => { setPlaying(false); if (timerRef.current) window.clearInterval(timerRef.current); };
    setProgress(0); setPlaying(true); window.speechSynthesis.speak(utterance);
    const estimate = Math.max(10000, spokenText.length * 80); const started = Date.now();
    timerRef.current = window.setInterval(() => setProgress(Math.min(96, ((Date.now() - started) / estimate) * 100)), 500);
  };
  return <div className="reader-shell screen-enter min-h-[calc(100vh-11rem)] pb-32" data-reader-theme={theme} data-ar-scale={arabicScale} data-de-scale={germanScale}>
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-current/10 bg-inherit px-4 py-3 backdrop-blur-md"><Button variant="ghost" size="icon" onClick={onBack} aria-label="العودة | Zurück"><ArrowLeft className="rotate-180" /></Button><h2 className="min-w-0 flex-1 px-2 text-center text-sm"><Pair ar={item.ar} de={item.de} align="center" inverse={theme === "navy"} /></h2><Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="إعدادات القراءة | Leseeinstellungen"><Settings /></Button></div>
    <div className="sticky top-[61px] z-20 flex items-center justify-center gap-2 border-b border-current/10 bg-inherit px-4 py-2">
      <LayerToggle active={showTr} onClick={() => setShowTr((v) => !v)} label="الترجمة | Übersetzung"><Globe /></LayerToggle>
      <LayerToggle active={showLatin} onClick={() => setShowLatin((v) => !v)} label="القراءة اللاتينية | Lautschrift"><TypeIcon /></LayerToggle>
      <LayerToggle active={showAr} onClick={() => setShowAr((v) => !v)} label="النص العربي | Arabisch"><span className="text-base font-extrabold leading-none">ع</span></LayerToggle>
    </div>
    <article className={`reader-copy px-5 py-8 ${alignment === "center" ? "text-center" : "text-right"}`}>{showAr && <p lang="ar" dir="rtl" className="reader-ar whitespace-pre-line font-bold leading-[2.25]">{item.textAr}</p>}{showAr && (showLatin || showTr) && <div className="my-7 border-t border-current/15" />}{showLatin && <p lang="de-Latn" dir="ltr" className={`reader-de whitespace-pre-line font-semibold leading-relaxed ${alignment === "center" ? "text-center" : "text-left"}`}>{item.latin}</p>}{showTr && <p lang="de" dir="ltr" className={`reader-de mt-5 whitespace-pre-line italic leading-relaxed opacity-75 ${alignment === "center" ? "text-center" : "text-left"}`}>{item.translation}</p>}{!showAr && !showLatin && !showTr && <p className="py-10 text-center text-sm opacity-60"><Pair ar="فعّل أحد أزرار العرض أعلاه لإظهار النص." de="Aktivieren Sie oben eine Ebene, um den Text anzuzeigen." align="center" /></p>}{item.link && <Button asChild variant="outline" className="mt-8 h-12 w-full"><a href={item.link} target="_blank" rel="noreferrer"><Download /><Pair ar="تحميل النص الكامل" de="Vollständigen Text herunterladen" align="center" /></a></Button>}</article>
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent className="w-[calc(100%-24px)] max-w-[396px]" dir="rtl"><DialogHeader className="text-right"><DialogTitle><Pair ar="إعدادات القراءة" de="Leseeinstellungen" /></DialogTitle><DialogDescription><Pair ar="خصّص النص بما يناسب قراءتك." de="Passen Sie die Darstellung an Ihre Leseweise an." /></DialogDescription></DialogHeader><div className="space-y-5 pt-2"><ScaleControl ar="حجم النص العربي" de="Arabische Schriftgröße" value={arabicScale} onChange={setArabicScale} /><ScaleControl ar="حجم النص الألماني" de="Deutsche Schriftgröße" value={germanScale} onChange={setGermanScale} /><div><Pair ar="محاذاة النص" de="Textausrichtung" /><div className="mt-2 grid grid-cols-2 gap-2"><Button variant={alignment === "right" ? "default" : "outline"} onClick={() => setAlignment("right")}><AlignRight /><Pair ar="يمين" de="Rechts" align="center" inverse={alignment === "right"} /></Button><Button variant={alignment === "center" ? "default" : "outline"} onClick={() => setAlignment("center")}><AlignCenter /><Pair ar="وسط" de="Zentriert" align="center" inverse={alignment === "center"} /></Button></div></div><div><Pair ar="خلفية القراءة" de="Lesefläche" /><div className="mt-2 grid grid-cols-3 gap-2"><ThemeButton active={theme === "navy"} theme="navy" ar="كحلي" de="Dunkelblau" onClick={() => setTheme("navy")} /><ThemeButton active={theme === "white"} theme="white" ar="أبيض" de="Weiß" onClick={() => setTheme("white")} /><ThemeButton active={theme === "warm"} theme="warm" ar="دافئ" de="Warm" onClick={() => setTheme("warm")} /></div></div></div></DialogContent></Dialog>
    <div className="fixed inset-x-0 bottom-20 z-30 mx-auto w-full max-w-[420px] border-t border-border bg-card/95 px-4 py-3 text-card-foreground shadow-xl backdrop-blur-md"><div className="flex items-center gap-3" dir="ltr"><Button size="icon" onClick={toggleAudio} aria-label={playing ? "إيقاف | Pause" : "تشغيل | Abspielen"}>{playing ? <Pause /> : <Play />}</Button><div className="min-w-0 flex-1"><progress aria-label="تقدم القراءة الصوتية | Fortschritt" value={progress} max="100" className="reader-progress h-1.5 w-full" /><div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{Math.round(progress)}%</span><span><Volume2 className="inline h-3 w-3" /> قراءة صوتية</span></div></div></div><label className="mt-2 block"><span className="sr-only">اختيار القارئ | Stimme auswählen</span><select value={voiceName} onChange={(event) => setVoiceName(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" dir="ltr">{voices.length ? voices.map((voice) => <option key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</option>) : <option>صوت الجهاز | Gerätestimme</option>}</select></label></div>
  </div>;
}

function ScaleControl({ ar, de, value, onChange }: { ar: string; de: string; value: number; onChange: (value: number) => void }) {
  return <div><div className="flex items-center justify-between gap-3"><Pair ar={ar} de={de} /><span dir="ltr" className="text-sm font-bold text-secondary">{value}%</span></div><input aria-label={`${ar} | ${de}`} type="range" min="80" max="150" step="10" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-secondary" /></div>;
}

function ThemeButton({ active, theme, ar, de, onClick }: { active: boolean; theme: "navy" | "white" | "warm"; ar: string; de: string; onClick: () => void }) {
  return <Button variant={active ? "default" : "outline"} onClick={onClick} className="h-auto flex-col gap-2 px-1 py-2"><span className="reader-theme-swatch h-6 w-6 rounded-full border border-border" data-swatch={theme} /><Pair ar={ar} de={de} align="center" inverse={active} /></Button>;
}

function DonationsView() {
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={HandHeart} ar="المساهمة بتيسير أمر زائر" de="Spenden für einen Pilger" /><section className="rounded-lg bg-primary p-6 text-primary-foreground shadow-md"><HandHeart className="mb-5 h-10 w-10 text-secondary" aria-hidden="true" /><p className="text-sm"><Pair ar="ساهم في تيسير أمر زوار غير قادرين على تغطية تكاليف الزيارة، وفي دعم استمرار الحملة." de="Helfen Sie Pilgern, die ihre Reisekosten nicht selbst tragen können, und unterstützen Sie den Fortbestand der Reisegruppe." inverse /></p><Button asChild className="mt-6 h-14 w-full whitespace-normal bg-secondary text-secondary-foreground hover:bg-secondary/90"><a href="https://wa.me/49015773055365" target="_blank" rel="noreferrer"><MessageCircle /><Pair ar="للمساهمة تواصل مع الحاج ياسر الدر" de="Für Spenden Hajj Yasser Aldor kontaktieren" align="center" /></a></Button></section></div>;
}

const bottomItems: Array<{ view: Exclude<View, "donations" | "duas">; ar: string; de: string; icon: IconType }> = [
  { view: "home", ar: "الرئيسية", de: "Start", icon: Home },
  { view: "trips", ar: "الرحلات", de: "Reisen", icon: Luggage },
  { view: "registration", ar: "التسجيل", de: "Anmeldung", icon: ScrollText },
  { view: "contacts", ar: "التواصل", de: "Kontakt", icon: Phone },
  { view: "news", ar: "الأخبار", de: "Aktuelles", icon: Megaphone },
];

function Index() {
  const { data: content } = useSuspenseQuery(contentQuery);
  const [view, setView] = useState<View>("home");
  const go = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <LangProvider><div className="min-h-screen bg-muted">
      <main className="mx-auto min-h-screen w-full max-w-[420px] bg-background pb-24 text-foreground shadow-xl">
        <AppHeader view={view} onHome={() => go("home")} />
        <AlertBanner alert={content.alert} />
        {view === "home" && <HomeView go={go} visa={content.visa} payment={content.payment ?? defaultContent.payment} />}
        {view === "trips" && <TripsView content={content} />}
        {view === "registration" && <RegistrationView />}
        {view === "contacts" && <ContactsView />}
        {view === "news" && <NewsView news={content.news} />}
        {view === "donations" && <DonationsView />}
        {view === "duas" && <DuasView duas={content.duas} />}
        <footer className="space-y-4 px-4 pb-6 pt-4 text-center">
          <ShareButton />
          <SocialLinks />
          <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:border-secondary hover:text-primary"><Pair ar="الإدارة" de="Verwaltung" align="center" /></Link>
        </footer>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto grid h-20 w-full max-w-[420px] grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-xl backdrop-blur-md" aria-label="التنقل الرئيسي | Hauptnavigation">
        {bottomItems.map(({ view: itemView, ar, de, icon: Icon }) => <Button key={itemView} variant="ghost" onClick={() => go(itemView)} aria-current={view === itemView ? "page" : undefined} className={`h-full min-w-0 flex-col gap-1 rounded-none px-0.5 ${view === itemView ? "bg-accent text-primary" : "text-muted-foreground"}`}><Icon className="h-5 w-5" aria-hidden="true" /><NavLabel ar={ar} de={de} /></Button>)}
      </nav>
    </div></LangProvider>
  );
}