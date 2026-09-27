import { createFileRoute } from "@tanstack/react-router";
import { useState, type ComponentType } from "react";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  CircleCheck,
  HandHeart,
  Home,
  Hotel,
  Landmark,
  Luggage,
  Megaphone,
  MessageCircle,
  MoonStar,
  Phone,
  Plane,
  ScrollText,
  Soup,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import shrineImage from "@/assets/karbala-shrine.jpg";

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
  component: Index,
});

const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdpuQ5tU5kNJL7Pp8f-vwALemNfp8NF2qRWazP5yb1UP2nDeg/viewform";

type View = "home" | "trips" | "registration" | "contacts" | "news" | "donations";
type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
type PairProps = { ar: string; de: string; align?: "right" | "center"; inverse?: boolean };

function Pair({ ar, de, align = "right", inverse = false }: PairProps) {
  return (
    <span className={`block ${align === "center" ? "text-center" : "text-right"}`}>
      <span lang="ar" dir="rtl" className="block font-bold leading-relaxed">{ar}</span>
      <span lang="de" dir="ltr" className={`mt-0.5 block text-[0.72em] font-medium italic leading-snug ${inverse ? "text-primary-foreground/65" : "text-muted-foreground"}`}>{de}</span>
    </span>
  );
}

const trips = [
  { id: "iraq", ar: "زيارة الإمام الحسين (ع)", de: "Ziyara zu Imam Hussein (as)", date: "01.12 – 09.12.2026", statusAr: "التسجيل مفتوح", statusDe: "Anmeldung offen", icon: Landmark, open: true, poster: true },
  { id: "winter", ar: "زيارة عطلة الشتاء / رأس السنة", de: "Ziyara in den Winterferien / Neujahr", date: "23.12.2026 – 01.01.2027", statusAr: "التسجيل مفتوح", statusDe: "Anmeldung offen", icon: Landmark, open: true, poster: true },
  { id: "umrah", ar: "العمرة", de: "Umrah", date: "13.01 – 22.01.2027", statusAr: "موعد معلن", statusDe: "Termin angekündigt", icon: MoonStar, open: true, poster: true },
  { id: "iran", ar: "إيران — زيارة الإمام الرضا (ع)", de: "Iran — Ziyara zu Imam Rida (as)", date: null, statusAr: "سيُعلن قريباً", statusDe: "Wird bald bekannt gegeben", icon: Sparkles, open: false, poster: false },
  { id: "hajj", ar: "الحج", de: "Hadsch", date: null, statusAr: "سيُعلن قريباً", statusDe: "Wird bald bekannt gegeben", icon: Star, open: false, poster: false },
];

const contacts = [
  { ar: "الحاج ياسر الدر", de: "Hajj Yasser Aldor", roleAr: "المسؤول العام — خادم حملة عشاق الحسين - ألمانيا", roleDe: "Allgemeiner Verantwortlicher der Reisegruppe", displayPhone: "+49 1577 3055365", phone: "tel:+4915773055365", whatsapp: "https://wa.me/49015773055365" },
  { ar: "الحجة سامية فقيه", de: "Hajje Samia Fakih", roleAr: "للأخوات فقط — عند الاستفسار", roleDe: "Nur für Schwestern – bei Rückfragen", displayPhone: "+49 1578 5616843", phone: "tel:+4915785616843", whatsapp: "https://wa.me/49015785616843" },
  { ar: "الحجة خديجة إسماعيل", de: "Hajje Khadije Ismail", roleAr: "للأخوات فقط — عند الاستفسار", roleDe: "Nur für Schwestern – bei Rückfragen", displayPhone: "+49 176 63409995", phone: "tel:+4917663409995", whatsapp: "https://wa.me/49017663409995" },
];

const news = [
  { ar: "فتح باب التسجيل لزيارة العتبات المقدسة", de: "Anmeldung für den Besuch der heiligen Stätten geöffnet", bodyAr: "يمكنكم الآن التسجيل في الرحلات المعلنة عبر استمارة التسجيل.", bodyDe: "Sie können sich jetzt über das Anmeldeformular für die angekündigten Reisen anmelden." },
  { ar: "تفاصيل السكن والفنادق جاهزة", de: "Unterkunfts- und Hoteldetails stehen fest", bodyAr: "تم إعداد برنامج السكن بين الكاظمية وكربلاء والنجف.", bodyDe: "Das Unterkunftsprogramm für Kadhimiya, Kerbela und Nadschaf steht fest." },
  { ar: "انضمام خطيب حسيني للحملة", de: "Ein Khatib Housseini begleitet die Reisegruppe", bodyAr: "يرافق الحملة خطيب ورادود حسيني لإحياء المجالس خلال الرحلة.", bodyDe: "Ein Khatib und Radud Housseini begleiten die Majlis während der Reise." },
];

const viewTitles: Record<View, { ar: string; de: string }> = {
  home: { ar: "الرئيسية", de: "Start" },
  trips: { ar: "الرحلات", de: "Reisen" },
  registration: { ar: "التسجيل", de: "Anmeldung" },
  contacts: { ar: "التواصل", de: "Kontakt" },
  news: { ar: "الأخبار", de: "Neuigkeiten" },
  donations: { ar: "المساهمة", de: "Spenden" },
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

function HomeView({ go }: { go: (view: View) => void }) {
  const actions: Array<{ view: View; ar: string; de: string; icon: IconType }> = [
    { view: "trips", ar: "الرحلات", de: "Reisen", icon: Luggage },
    { view: "registration", ar: "التسجيل", de: "Anmeldung", icon: ScrollText },
    { view: "contacts", ar: "التواصل", de: "Kontakt", icon: Phone },
    { view: "news", ar: "الأخبار", de: "Neuigkeiten", icon: Megaphone },
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
        {actions.map(({ view, ar, de, icon: Icon }, index) => (
          <Button key={view} variant="outline" onClick={() => go(view)} className={`h-32 flex-col gap-3 whitespace-normal bg-card px-3 shadow-sm hover:border-secondary hover:bg-card ${index === actions.length - 1 ? "col-span-2" : ""}`}>
            <span className="grid h-11 w-11 place-items-center rounded-md bg-accent text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <Pair ar={ar} de={de} align="center" />
          </Button>
        ))}
      </div>
    </div>
  );
}

function TripsView() {
  const [selected, setSelected] = useState<(typeof trips)[number] | null>(null);
  return (
    <div className="screen-enter px-4 py-7">
      <ScreenTitle icon={Luggage} ar="الرحلات المتاحة" de="Verfügbare Reisen" />
      <div className="space-y-3">
        {trips.map((trip) => {
          const Icon = trip.icon;
          return (
            <Button key={trip.id} variant="outline" onClick={() => setSelected(trip)} className="h-auto min-h-32 w-full whitespace-normal bg-card p-4 text-right shadow-sm hover:border-secondary hover:bg-card">
              <span className="flex w-full items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-muted text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <Pair ar={trip.ar} de={trip.de} />
                  {trip.date && <span dir="ltr" className="mt-3 flex items-center justify-end gap-2 text-sm font-bold text-foreground"><CalendarDays className="h-4 w-4 text-secondary" aria-hidden="true" />{trip.date}</span>}
                  <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${trip.open ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>{trip.open && <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />}<Pair ar={trip.statusAr} de={trip.statusDe} /></span>
                </span>
                <ChevronLeft className="mt-2 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
              </span>
            </Button>
          );
        })}
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto rounded-lg p-0" dir="rtl">
          {selected && (
            <>
              {selected.poster ? (
                <img src={shrineImage} alt={`دعوة ${selected.ar} | Einladung ${selected.de}`} className="aspect-[4/3] w-full rounded-t-lg object-cover" />
              ) : (
                <div className="grid aspect-[4/2] place-items-center rounded-t-lg bg-primary text-secondary"><selected.icon className="h-12 w-12" aria-hidden="true" /></div>
              )}
              <div className="px-5 pb-5">
                <DialogHeader className="text-right">
                  <DialogTitle className="text-xl text-primary"><Pair ar={selected.ar} de={selected.de} /></DialogTitle>
                  <DialogDescription asChild><div>{selected.date && <p dir="ltr" className="mt-2 text-right text-sm font-bold text-foreground">{selected.date}</p>}</div></DialogDescription>
                </DialogHeader>
                <div className="mt-5 grid gap-3">
                  <Detail icon={Plane} ar="الطيران" de="Flug" detailAr="الوصول عبر مطار بغداد." detailDe="Ankunft über den Flughafen Bagdad." />
                  <Detail icon={Hotel} ar="السكن" de="Unterkunft" detailAr="ليلة في الكاظمية، وفنادق في كربلاء والنجف." detailDe="Eine Nacht in Kadhimiya sowie Hotels in Kerbela und Nadschaf." />
                  <Detail icon={BedDouble} ar="المجالس" de="Majlis" detailAr="مجالس حسينية بمرافقة خطيب ورادود." detailDe="Husseinitische Majlis mit Khatib und Radud." />
                  <Detail icon={Soup} ar="الطعام" de="Verpflegung" detailAr="ثلاث وجبات يومياً من المطبخ اللبناني." detailDe="Drei libanesische Mahlzeiten täglich." />
                </div>
                {selected.open && <Button asChild className="mt-5 h-14 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"><a href={formUrl} target="_blank" rel="noreferrer"><ScrollText /><Pair ar="سجّل في الرحلة" de="Zur Reise anmelden" align="center" /></a></Button>}
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
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={Phone} ar="أرقام التواصل" de="Kontaktnummern" /><div className="space-y-3">{contacts.map((contact) => <article key={contact.de} className="rounded-lg border border-border bg-card p-4 shadow-sm"><h3 className="text-primary"><Pair ar={contact.ar} de={contact.de} /></h3><p className="mt-2 text-sm"><Pair ar={contact.roleAr} de={contact.roleDe} /></p><p dir="ltr" className="mt-3 text-right text-sm font-bold">{contact.displayPhone}</p><div className="mt-4 grid grid-cols-2 gap-2"><Button asChild className="h-12"><a href={contact.phone}><Phone /><Pair ar="اتصال" de="Anrufen" align="center" /></a></Button><Button asChild className="h-12 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"><a href={contact.whatsapp} target="_blank" rel="noreferrer"><MessageCircle /><Pair ar="واتساب" de="WhatsApp" align="center" /></a></Button></div></article>)}</div></div>;
}

function NewsView() {
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={Megaphone} ar="آخر الأخبار" de="Neuigkeiten" /><div className="space-y-3">{news.map((item) => <article key={item.de} className="rounded-lg border border-border bg-card p-4 shadow-sm"><span className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-accent text-primary"><Megaphone className="h-4 w-4" aria-hidden="true" /></span><h3 className="text-primary"><Pair ar={item.ar} de={item.de} /></h3><p className="mt-3 border-t border-border pt-3 text-sm"><Pair ar={item.bodyAr} de={item.bodyDe} /></p></article>)}</div></div>;
}

function DonationsView() {
  return <div className="screen-enter px-4 py-7"><ScreenTitle icon={HandHeart} ar="المساهمة بتيسير أمر زائر" de="Spenden für einen Pilger" /><section className="rounded-lg bg-primary p-6 text-primary-foreground shadow-md"><HandHeart className="mb-5 h-10 w-10 text-secondary" aria-hidden="true" /><p className="text-sm"><Pair ar="ساهم في تيسير أمر زوار غير قادرين على تغطية تكاليف الزيارة، وفي دعم استمرار الحملة." de="Helfen Sie Pilgern, die ihre Reisekosten nicht selbst tragen können, und unterstützen Sie den Fortbestand der Reisegruppe." inverse /></p><Button asChild className="mt-6 h-14 w-full whitespace-normal bg-secondary text-secondary-foreground hover:bg-secondary/90"><a href="https://wa.me/49015773055365" target="_blank" rel="noreferrer"><MessageCircle /><Pair ar="للمساهمة تواصل مع الحاج ياسر الدر" de="Für Spenden Hajj Yasser Aldor kontaktieren" align="center" /></a></Button></section></div>;
}

const bottomItems: Array<{ view: Exclude<View, "donations">; ar: string; de: string; icon: IconType }> = [
  { view: "home", ar: "الرئيسية", de: "Start", icon: Home },
  { view: "trips", ar: "الرحلات", de: "Reisen", icon: Luggage },
  { view: "registration", ar: "التسجيل", de: "Anmeldung", icon: ScrollText },
  { view: "contacts", ar: "التواصل", de: "Kontakt", icon: Phone },
  { view: "news", ar: "الأخبار", de: "Aktuelles", icon: Megaphone },
];

function Index() {
  const [view, setView] = useState<View>("home");
  const go = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <div className="min-h-screen bg-muted">
      <main className="mx-auto min-h-screen w-full max-w-[420px] bg-background pb-24 text-foreground shadow-xl">
        <AppHeader view={view} onHome={() => go("home")} />
        {view === "home" && <HomeView go={go} />}
        {view === "trips" && <TripsView />}
        {view === "registration" && <RegistrationView />}
        {view === "contacts" && <ContactsView />}
        {view === "news" && <NewsView />}
        {view === "donations" && <DonationsView />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto grid h-20 w-full max-w-[420px] grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-xl backdrop-blur-md" aria-label="التنقل الرئيسي | Hauptnavigation">
        {bottomItems.map(({ view: itemView, ar, de, icon: Icon }) => <Button key={itemView} variant="ghost" onClick={() => go(itemView)} aria-current={view === itemView ? "page" : undefined} className={`h-full min-w-0 flex-col gap-1 rounded-none px-0.5 ${view === itemView ? "bg-accent text-primary" : "text-muted-foreground"}`}><Icon className="h-5 w-5" aria-hidden="true" /><span className="text-[10px] font-bold leading-none">{ar}</span><span lang="de" dir="ltr" className="max-w-full truncate text-[8px] italic leading-none">{de}</span></Button>)}
      </nav>
    </div>
  );
}