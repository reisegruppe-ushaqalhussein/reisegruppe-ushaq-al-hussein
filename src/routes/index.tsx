import { createFileRoute } from "@tanstack/react-router";
import {
  BedDouble,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  HandHeart,
  Home,
  Hotel,
  Landmark,
  Megaphone,
  MessageCircle,
  MoonStar,
  Phone,
  Plane,
  ScrollText,
  Soup,
  Sparkles,
  Star,
  Luggage,
} from "lucide-react";
import shrineImage from "@/assets/karbala-shrine.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "حملة عشاق الحسين - ألمانيا | Reisegruppe Ushaq al-Hussein (as)" },
      { name: "description", content: "رحلات دينية إلى العراق وإيران والعمرة والحج | Religiöse Reisen in den Irak, Iran, zur Umrah und zum Hadsch" },
      { property: "og:title", content: "حملة عشاق الحسين - ألمانيا | Reisegruppe Ushaq al-Hussein (as)" },
      { property: "og:description", content: "كل رحلاتنا الدينية بمكان واحد | Alle unsere religiösen Reisen an einem Ort" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type PairProps = {
  ar: string;
  de: string;
  align?: "right" | "center";
  germanClassName?: string;
};

function Pair({ ar, de, align = "right", germanClassName = "" }: PairProps) {
  return (
    <span className={`block ${align === "center" ? "text-center" : "text-right"}`}>
      <span lang="ar" dir="rtl" className="block font-bold leading-relaxed">{ar}</span>
      <span lang="de" dir="ltr" className={`mt-0.5 block text-[0.76em] font-medium italic leading-snug opacity-65 ${germanClassName}`}>{de}</span>
    </span>
  );
}

const trips = [
  {
    ar: "زيارة الإمام الحسين (ع)",
    de: "Zyarat Imam Hussein (as)",
    date: "01.12 – 09.12.2026",
    statusAr: "التسجيل مفتوح",
    statusDe: "Anmeldung offen",
    icon: Landmark,
    open: true,
  },
  {
    ar: "زيارة الإمام الحسين (ع) — عطلة الشتاء / رأس السنة",
    de: "Zyarat Imam Hussein (as) — Winterferien / Neujahr",
    date: "23.12.2026 – 01.01.2027",
    statusAr: "التسجيل مفتوح",
    statusDe: "Anmeldung offen",
    icon: Landmark,
    open: true,
  },
  {
    ar: "العمرة",
    de: "Umrah",
    date: "13.01 – 22.01.2027",
    statusAr: "موعد معلن",
    statusDe: "Termin angekündigt",
    icon: MoonStar,
    open: false,
  },
  {
    ar: "إيران (زيارة الإمام الرضا ع)",
    de: "Iran (Zyarat Imam Rida as)",
    date: null,
    statusAr: "سيُعلن قريباً",
    statusDe: "Wird in Kürze bekannt gegeben",
    icon: Sparkles,
    open: false,
  },
  {
    ar: "الحج",
    de: "Hadsch",
    date: null,
    statusAr: "سيُعلن قريباً",
    statusDe: "Wird in Kürze bekannt gegeben",
    icon: Star,
    open: false,
  },
];

const tripDetails = [
  { ar: "الطيران", de: "Flug", detailAr: "الوصول عبر مطار بغداد.", detailDe: "Ankunft über den Flughafen Bagdad.", icon: Plane },
  { ar: "السكن", de: "Unterkunft", detailAr: "ليلة في الكاظمية، وفندق في كربلاء، وفندق في النجف.", detailDe: "Eine Nacht in Kadhimiya sowie Hotels in Kerbela und Nadschaf.", icon: Hotel },
  { ar: "المجالس", de: "Majlis", detailAr: "مجلس عزاء حسيني ومجلس عزاء ولطم بمرافقة خطيب ورادود حسيني.", detailDe: "Trauer- und Latm-Majlis in Begleitung eines Khatib und Radud Housseini.", icon: BedDouble },
  { ar: "الطعام", de: "Verpflegung", detailAr: "أكل لبناني بامتياز — ثلاث وجبات يومياً.", detailDe: "Hervorragende libanesische Küche — drei Mahlzeiten täglich.", icon: Soup },
];

const contacts = [
  {
    ar: "الحاج ياسر الدر",
    de: "Hajj Yasser Aldor",
    roleAr: "المسؤول العام — خادم حملة عشاق الحسين - ألمانيا",
    roleDe: "Allgemeiner Verantwortlicher – Khadem der Reisegruppe",
    displayPhone: "+49 1577 3055365",
    phone: "tel:+4915773055365",
    whatsapp: "https://wa.me/49015773055365",
  },
  {
    ar: "الحجة سامية فقيه",
    de: "Hajje Samia Fakih",
    roleAr: "للأخوات فقط — عند الاستفسار",
    roleDe: "Nur für Schwestern – bei Rückfragen",
    displayPhone: "+49 1578 5616843",
    phone: "tel:+4915785616843",
    whatsapp: "https://wa.me/49015785616843",
  },
  {
    ar: "الحجة خديجة إسماعيل",
    de: "Hajje Khadije Ismail",
    roleAr: "للأخوات فقط — عند الاستفسار",
    roleDe: "Nur für Schwestern – bei Rückfragen",
    displayPhone: "+49 176 63409995",
    phone: "tel:+4917663409995",
    whatsapp: "https://wa.me/49017663409995",
  },
];

const news = [
  {
    ar: "فتح باب التسجيل لزيارة العتبات المقدسة",
    de: "Anmeldung für den Besuch der heiligen Stätten geöffnet",
    bodyAr: "يمكنكم الآن التسجيل في الرحلات المعلنة عبر استمارة التسجيل.",
    bodyDe: "Sie können sich jetzt über das Anmeldeformular für die angekündigten Reisen anmelden.",
  },
  {
    ar: "تفاصيل السكن والفنادق جاهزة",
    de: "Unterkunfts- und Hoteldetails stehen fest",
    bodyAr: "تم إعداد برنامج السكن بين الكاظمية وكربلاء والنجف.",
    bodyDe: "Das Unterkunftsprogramm für Kadhimiya, Kerbela und Nadschaf steht fest.",
  },
  {
    ar: "انضمام خطيب حسيني للحملة",
    de: "Ein Khatib Housseini begleitet die Reisegruppe",
    bodyAr: "يرافق الحملة خطيب ورادود حسيني لإحياء المجالس خلال الرحلة.",
    bodyDe: "Ein Khatib und Radud Housseini begleiten die Majlis während der Reise.",
  },
];

function SectionHeading({ ar, de, icon: Icon }: { ar: string; de: string; icon: typeof Home }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="min-w-0 text-xl text-primary"><Pair ar={ar} de={de} /></h2>
    </div>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-muted">
      <main className="mx-auto min-h-screen w-full max-w-[420px] overflow-hidden bg-background pb-24 text-foreground shadow-xl">
        <header id="home" className="relative min-h-[560px] overflow-hidden bg-primary text-primary-foreground">
          <img src={shrineImage} alt="مرقد الإمام الحسين في كربلاء | Imam-Hussein-Schrein in Kerbela" width={1200} height={900} className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="hero-shade absolute inset-0" />
          <div className="relative flex min-h-[560px] flex-col px-5 pb-9 pt-7">
            <div className="flex items-center justify-between border-b border-primary-foreground/20 pb-4">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-secondary/70 bg-primary/60 backdrop-blur-sm">
                <MoonStar className="h-6 w-6 text-secondary" aria-hidden="true" />
              </span>
              <p className="text-xs text-primary-foreground"><Pair ar="معاً في طريق الزيارة" de="Gemeinsam auf dem Weg der Ziyara" /></p>
            </div>

            <div className="mt-auto text-center">
              <p className="mb-3 text-sm text-secondary"><Pair ar="بإدارة الحاج ياسر الدر" de="Geleitet von Hajj Yasser Aldor" align="center" /></p>
              <h1 className="text-3xl font-extrabold leading-[1.45]">
                <span lang="ar" dir="rtl" className="block">حملة عشاق الحسين - ألمانيا</span>
                <span lang="de" dir="ltr" className="mt-2 block text-xl font-semibold italic leading-tight opacity-85">Reisegruppe Ushaq al-Hussein (as)</span>
              </h1>
              <div className="gold-line mx-auto my-6 h-px w-44" />
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-primary-foreground/85">
                <Pair ar="كل رحلاتنا الدينية بمكان واحد: العراق، إيران، العمرة والحج." de="Alle unsere religiösen Reisen an einem Ort: Irak, Iran, Umrah und Hadsch." align="center" />
              </p>
              <a href="#registration" className="mx-auto mt-7 inline-flex min-h-12 items-center gap-3 rounded-md bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground shadow-lg transition-transform active:scale-95">
                <ScrollText className="h-5 w-5" aria-hidden="true" />
                <Pair ar="سجّل في الرحلة" de="Zur Reise anmelden" align="center" />
              </a>
            </div>
          </div>
        </header>

        <section id="trips" className="scroll-mt-4 px-4 py-10">
          <SectionHeading ar="الرحلات المتاحة" de="Verfügbare Reisen" icon={Luggage} />
          <div className="space-y-3">
            {trips.map((trip) => {
              const Icon = trip.icon;
              return (
                <article key={trip.de} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base text-primary"><Pair ar={trip.ar} de={trip.de} /></h3>
                      {trip.date && (
                        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground" dir="ltr">
                          <CalendarDays className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                          <span>{trip.date}</span>
                        </p>
                      )}
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${trip.open ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                    {trip.open && <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    <Pair ar={trip.statusAr} de={trip.statusDe} />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-8">
            <h3 className="mb-4 text-lg text-primary"><Pair ar="تفاصيل الرحلات" de="Reisedetails" /></h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {tripDetails.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.de} className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-3 flex items-center gap-3 text-primary">
                      <Icon className="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
                      <h4><Pair ar={item.ar} de={item.de} /></h4>
                    </div>
                    <p className="text-sm text-muted-foreground"><Pair ar={item.detailAr} de={item.detailDe} /></p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="registration" className="scroll-mt-4 bg-primary px-5 py-11 text-primary-foreground">
          <ScrollText className="mx-auto mb-4 h-9 w-9 text-secondary" aria-hidden="true" />
          <h2 className="text-xl"><Pair ar="للتسجيل في إحدى رحلاتنا" de="Für die Anmeldung zu einer unserer Reisen" align="center" /></h2>
          <p className="mx-auto mt-4 max-w-sm text-sm text-primary-foreground/70"><Pair ar="املأ الاستمارة، وسيتواصل معك فريق الحملة لإتمام التفاصيل." de="Füllen Sie das Formular aus. Unser Team meldet sich anschließend bei Ihnen." align="center" /></p>
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSdpuQ5tU5kNJL7Pp8f-vwALemNfp8NF2qRWazP5yb1UP2nDeg/viewform" target="_blank" rel="noreferrer" className="mt-7 flex min-h-14 w-full items-center justify-center gap-3 rounded-md bg-secondary px-5 py-3 font-bold text-secondary-foreground shadow-lg transition-transform active:scale-[0.98]">
            <ScrollText className="h-5 w-5" aria-hidden="true" />
            <Pair ar="فتح استمارة التسجيل" de="Anmeldeformular öffnen" align="center" />
          </a>
        </section>

        <section id="contacts" className="scroll-mt-4 px-4 py-10">
          <SectionHeading ar="أرقام التواصل" de="Kontaktnummern" icon={Phone} />
          <div className="space-y-3">
            {contacts.map((contact) => (
              <article key={contact.de} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <h3 className="text-base text-primary"><Pair ar={contact.ar} de={contact.de} /></h3>
                <p className="mt-2 text-sm text-muted-foreground"><Pair ar={contact.roleAr} de={contact.roleDe} /></p>
                <p className="mt-3 text-left text-sm font-bold text-foreground" dir="ltr">{contact.displayPhone}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a href={contact.phone} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-3 py-2 text-primary-foreground">
                    <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <Pair ar="اتصال" de="Anrufen" align="center" />
                  </a>
                  <a href={contact.whatsapp} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-whatsapp px-3 py-2 text-whatsapp-foreground">
                    <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <Pair ar="واتساب" de="WhatsApp" align="center" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="news" className="scroll-mt-4 border-y border-border bg-card px-4 py-10">
          <SectionHeading ar="آخر الأخبار" de="Neuigkeiten" icon={Megaphone} />
          <div className="space-y-3">
            {news.map((item, index) => (
              <details key={item.de} className="group rounded-lg border border-border bg-background p-4" open={index === 0}>
                <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <span className="min-w-0 text-sm text-primary"><Pair ar={item.ar} de={item.de} /></span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-secondary transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground"><Pair ar={item.bodyAr} de={item.bodyDe} /></p>
              </details>
            ))}
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="rounded-lg border border-border bg-primary p-5 text-primary-foreground shadow-sm">
            <HandHeart className="mb-4 h-8 w-8 text-secondary" aria-hidden="true" />
            <h2 className="text-xl"><Pair ar="المساهمة بتيسير أمر زائر" de="Spenden zur Unterstützung eines Pilgers" /></h2>
            <p className="mt-4 text-sm text-primary-foreground/75"><Pair ar="كثير من الأشخاص يساهمون أو يتبرعون لتيسير أمر زوار غير قادرين على تغطية تكاليف الزيارة، وكذلك لدعم استمرار الحملة." de="Viele Menschen spenden, um Pilgern zu helfen, die ihre Reisekosten nicht selbst tragen können, und um den Fortbestand der Reisegruppe zu unterstützen." /></p>
            <a href="https://wa.me/49015773055365" target="_blank" rel="noreferrer" className="mt-6 flex min-h-14 items-center justify-center gap-3 rounded-md bg-secondary px-4 py-3 text-secondary-foreground">
              <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <Pair ar="للمساهمة التواصل مع الحاج ياسر الدر" de="Für Spenden Hajj Yasser Aldor kontaktieren" align="center" />
            </a>
          </div>
        </section>

        <footer className="bg-primary px-5 py-8 text-center text-primary-foreground">
          <MoonStar className="mx-auto mb-3 h-5 w-5 text-secondary" aria-hidden="true" />
          <p className="text-sm"><Pair ar="حملة عشاق الحسين - ألمانيا" de="Reisegruppe Ushaq al-Hussein (as)" align="center" /></p>
        </footer>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto grid h-20 w-full max-w-[420px] grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-md" aria-label="التنقل الرئيسي | Hauptnavigation">
        {[
          { href: "#home", ar: "الرئيسية", de: "Start", icon: Home },
          { href: "#trips", ar: "الرحلات", de: "Reisen", icon: Luggage },
          { href: "#registration", ar: "التسجيل", de: "Anmeldung", icon: ScrollText },
          { href: "#contacts", ar: "التواصل", de: "Kontakt", icon: Phone },
          { href: "#news", ar: "الأخبار", de: "Aktuelles", icon: Megaphone },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.href} href={item.href} className="flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-muted-foreground transition-colors hover:text-primary focus:text-primary">
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="text-[10px] font-bold leading-none">{item.ar}</span>
              <span lang="de" dir="ltr" className="max-w-full truncate text-[8px] italic leading-none opacity-65">{item.de}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}