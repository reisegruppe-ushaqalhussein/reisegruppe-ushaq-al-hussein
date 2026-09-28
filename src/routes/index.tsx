import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getSiteContent } from "@/lib/site-content.functions";
import type { SiteContent } from "@/lib/site-content";
import { useEffect, useState, type ComponentType } from "react";
import {
  ArrowLeft,
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
  ScrollText,
  Share2,
  Soup,
  Sparkles,
  Star,
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
    </header>
  );
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
              <Detail icon={Hotel} ar="السكن" de="Unterkunft" detailAr="ليلة في الكاظمية، وفندق في كربلاء، وفندق في النجف." detailDe="Eine Nacht in Kadhimiya, ein Hotel in Kerbela und ein Hotel in Najaf." />
              {(hotels.kadhimiya || hotels.karbala || hotels.najaf) && <div className="rounded-md bg-muted p-3 text-sm">{hotels.kadhimiya && <Pair ar={`الكاظمية: ${hotels.kadhimiya}`} de={`Kadhimiya: ${hotels.kadhimiya}`} />}{hotels.karbala && <Pair ar={`كربلاء: ${hotels.karbala}`} de={`Kerbela: ${hotels.karbala}`} />}{hotels.najaf && <Pair ar={`النجف: ${hotels.najaf}`} de={`Najaf: ${hotels.najaf}`} />}</div>}
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

function DuasView({ duas }: { duas: SiteContent["duas"] }) {
  return (
    <div className="screen-enter px-4 py-7">
      <ScreenTitle icon={BookOpen} ar="الأدعية والزيارات" de="Bittgebete & Ziyarat" />
      <div className="space-y-3">
        {duas.filter((d) => d.ar || d.de).map((d) => (
          <details key={d.id} className="group rounded-lg border border-border bg-card p-4 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-primary"><BookOpen className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1 text-primary"><Pair ar={d.ar} de={d.de} /></span>
              <ChevronLeft className="h-5 w-5 shrink-0 text-secondary transition-transform group-open:-rotate-90" aria-hidden="true" />
            </summary>
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              {d.textAr && <p className="whitespace-pre-line text-lg leading-loose">{d.textAr}</p>}
              {d.textDe && <p lang="de" dir="ltr" className="whitespace-pre-line text-left text-sm italic text-muted-foreground">{d.textDe}</p>}
              {d.link ? (
                <Button asChild className="h-12 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <a href={d.link} target="_blank" rel="noreferrer"><Download /><Pair ar="تحميل النص الكامل" de="Vollständigen Text herunterladen" align="center" /></a>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground"><Pair ar="النسخة الكاملة ستتوفر قريباً" de="Vollständige Fassung folgt in Kürze" /></p>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
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
    <div className="min-h-screen bg-muted">
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
          <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:border-secondary hover:text-primary">الإدارة <span lang="de" className="italic">| Verwaltung</span></Link>
        </footer>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto grid h-20 w-full max-w-[420px] grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-xl backdrop-blur-md" aria-label="التنقل الرئيسي | Hauptnavigation">
        {bottomItems.map(({ view: itemView, ar, de, icon: Icon }) => <Button key={itemView} variant="ghost" onClick={() => go(itemView)} aria-current={view === itemView ? "page" : undefined} className={`h-full min-w-0 flex-col gap-1 rounded-none px-0.5 ${view === itemView ? "bg-accent text-primary" : "text-muted-foreground"}`}><Icon className="h-5 w-5" aria-hidden="true" /><span className="text-[10px] font-bold leading-none">{ar}</span><span lang="de" dir="ltr" className="max-w-full truncate text-[8px] italic leading-none">{de}</span></Button>)}
      </nav>
    </div>
  );
}