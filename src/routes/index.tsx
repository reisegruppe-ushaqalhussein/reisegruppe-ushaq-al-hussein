import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  CircleDollarSign,
  HeartHandshake,
  Landmark,
  MapPin,
  MessageCircle,
  MoonStar,
  Newspaper,
  Phone,
  Plane,
  ScrollText,
  Users,
} from "lucide-react";
import shrineImage from "@/assets/karbala-shrine.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "حملة عشاق الحسين - ألمانيا | Reisegruppe Ushaq al-Hussein" },
      { name: "description", content: "رحلات الزيارة الدينية من ألمانيا إلى العراق ومكة وإيران | Pilgerreisen aus Deutschland in den Irak, nach Mekka und Iran" },
      { property: "og:title", content: "حملة عشاق الحسين - ألمانيا | Reisegruppe Ushaq al-Hussein" },
      { property: "og:description", content: "رحلات إيمانية منظّمة بعناية | Sorgfältig organisierte Pilgerreisen" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const trips = [
  { ar: "زيارة العراق", de: "Pilgerreise in den Irak", detailAr: "النجف · كربلاء · الكاظمية · سامراء", detailDe: "Nadschaf · Kerbela · Kadhimiya · Samarra", icon: Landmark },
  { ar: "العمرة", de: "Umra", detailAr: "مكة المكرمة · المدينة المنورة", detailDe: "Mekka · Medina", icon: MoonStar },
  { ar: "زيارة إيران", de: "Pilgerreise in den Iran", detailAr: "مشهد · قم · طهران", detailDe: "Maschhad · Qom · Teheran", icon: MapPin },
  { ar: "الحج", de: "Hadsch", detailAr: "برنامج متكامل لخدمة ضيوف الرحمن", detailDe: "Umfassendes Programm für die Pilger", icon: Users },
];

const contacts = [
  { ar: "الحاج ياسر الدر", de: "Hajj Yasser Aldor", roleAr: "إدارة الحملة", roleDe: "Reiseleitung" },
  { ar: "الحجة سامية فقيه", de: "Hajja Samia Fakih", roleAr: "التسجيل والاستفسار", roleDe: "Anmeldung und Auskunft" },
  { ar: "الحجة خديجة إسماعيل", de: "Hajja Khadija Ismail", roleAr: "التسجيل والاستفسار", roleDe: "Anmeldung und Auskunft" },
];

function Pair({ ar, de, align = "right" }: { ar: string; de: string; align?: "right" | "center" }) {
  return (
    <span className={align === "center" ? "block text-center" : "block text-right"}>
      <span lang="ar" dir="rtl" className="block font-bold leading-relaxed">{ar}</span>
      <span lang="de" dir="ltr" className="mt-0.5 block text-[0.78em] font-medium leading-snug opacity-70">{de}</span>
    </span>
  );
}

function SectionHeading({ ar, de }: { ar: string; de: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <h2 className="shrink-0 text-xl text-primary"><Pair ar={ar} de={de} align="center" /></h2>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Index() {
  return (
    <main className="min-h-screen bg-background pb-24 text-foreground">
      <header className="relative min-h-[620px] overflow-hidden bg-primary text-primary-foreground">
        <img src={shrineImage} alt="مرقد الإمام الحسين في كربلاء | Imam-Hussein-Schrein in Kerbela" width={1200} height={900} className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="hero-shade absolute inset-0" />
        <div className="relative mx-auto flex min-h-[620px] max-w-6xl flex-col px-5 pb-10 pt-6">
          <nav className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3" aria-label="التنقل الرئيسي | Hauptnavigation">
            <a href="#reisen" className="min-w-0 text-xs font-semibold opacity-90"><Pair ar="الرحلات المتاحة" de="Verfügbare Reisen" /></a>
            <a href="#anmeldung" className="shrink-0 rounded-md border border-secondary/60 bg-primary/50 px-3 py-2 text-xs backdrop-blur-sm"><Pair ar="التسجيل" de="Anmeldung" align="center" /></a>
          </nav>

          <div className="mt-auto text-center">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-secondary/60 bg-primary/65 shadow-lg backdrop-blur-sm">
              <MoonStar className="h-8 w-8 text-secondary" aria-hidden="true" />
            </div>
            <p className="mb-2 text-sm font-semibold text-secondary"><Pair ar="معاً في طريق الزيارة" de="Gemeinsam auf dem Weg der Ziyara" align="center" /></p>
            <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-[1.45] sm:text-5xl">
              <span lang="ar" dir="rtl" className="block">حملة عشاق الحسين - ألمانيا</span>
              <span lang="de" dir="ltr" className="mt-2 block text-xl font-semibold leading-tight sm:text-3xl">Reisegruppe Ushaq al-Hussein</span>
            </h1>
            <div className="gold-line mx-auto my-6 h-px w-52" />
            <p className="text-sm"><Pair ar="بإدارة الحاج ياسر الدر" de="Geleitet von Hajj Yasser Aldor" align="center" /></p>
            <a href="#reisen" className="mx-auto mt-8 inline-flex items-center gap-2 rounded-md bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground shadow-lg transition-transform active:scale-95">
              <Pair ar="استكشف الرحلات" de="Reisen entdecken" align="center" />
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <section id="reisen" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionHeading ar="الرحلات المتاحة" de="Verfügbare Reisen" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trips.map((trip) => {
            const Icon = trip.icon;
            return (
              <article key={trip.de} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-border bg-primary p-4 text-primary-foreground">
                  <Pair ar={trip.ar} de={trip.de} />
                  <Icon className="mt-1 h-6 w-6 shrink-0 text-secondary" aria-hidden="true" />
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground"><Pair ar={trip.detailAr} de={trip.detailDe} /></p>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4 shrink-0 text-secondary" /><Pair ar="الموعد قريباً" de="Termin folgt" /></span>
                    <ChevronLeft className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="anmeldung" className="bg-primary px-4 py-14 text-primary-foreground sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollText className="mx-auto mb-4 h-9 w-9 text-secondary" aria-hidden="true" />
          <h2 className="text-2xl"><Pair ar="استمارة التسجيل" de="Anmeldeformular" align="center" /></h2>
          <p className="mx-auto mt-4 max-w-xl text-sm opacity-75"><Pair ar="اختر رحلتك وسجّل بياناتك، وسيتواصل معك فريق الحملة لإتمام التفاصيل." de="Wählen Sie Ihre Reise und tragen Sie Ihre Daten ein. Unser Team meldet sich anschließend bei Ihnen." align="center" /></p>
          <a href="#kontakt" className="mt-7 inline-flex items-center gap-3 rounded-md bg-secondary px-6 py-3 font-bold text-secondary-foreground transition-transform active:scale-95">
            <Pair ar="التسجيل والاستفسار" de="Anmeldung und Auskunft" align="center" />
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </a>
          <p className="mt-4 text-xs opacity-60"><Pair ar="سيتم نشر رابط الاستمارة هنا فور اعتماده" de="Der Formularlink wird nach Freigabe hier veröffentlicht" align="center" /></p>
        </div>
      </section>

      <section id="kontakt" className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <SectionHeading ar="أرقام التواصل" de="Kontaktnummern" />
        <div className="grid gap-3 md:grid-cols-3">
          {contacts.map((contact) => (
            <article key={contact.de} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-primary"><Phone className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <Pair ar={contact.ar} de={contact.de} />
                <p className="mt-1 text-xs text-muted-foreground"><Pair ar={contact.roleAr} de={contact.roleDe} /></p>
              </div>
              <span className="col-span-2 mt-1 flex items-center justify-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <Pair ar="يُضاف الرقم قريباً" de="Nummer folgt" align="center" />
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          <article className="rounded-lg border border-border p-5">
            <Newspaper className="mb-4 h-7 w-7 text-secondary" aria-hidden="true" />
            <h2 className="text-lg text-primary"><Pair ar="آخر الأخبار" de="Neuigkeiten" /></h2>
            <p className="mt-3 text-sm text-muted-foreground"><Pair ar="ترقبوا هنا مواعيد الرحلات والتنبيهات الجديدة." de="Hier finden Sie bald neue Reisetermine und Hinweise." /></p>
          </article>
          <article className="rounded-lg border border-border p-5">
            <HeartHandshake className="mb-4 h-7 w-7 text-secondary" aria-hidden="true" />
            <h2 className="text-lg text-primary"><Pair ar="المساهمات" de="Spenden" /></h2>
            <p className="mt-3 text-sm text-muted-foreground"><Pair ar="ساهم في دعم برامج الحملة وخدمة زوار الإمام الحسين." de="Unterstützen Sie die Reiseprogramme und den Dienst an den Pilgern." /></p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary"><CircleDollarSign className="h-4 w-4 text-secondary" /><Pair ar="تفاصيل المساهمة قريباً" de="Spendendetails folgen" /></span>
          </article>
        </div>
      </section>

      <footer className="bg-primary px-5 py-9 text-center text-primary-foreground">
        <Plane className="mx-auto mb-3 h-5 w-5 text-secondary" aria-hidden="true" />
        <p className="text-sm font-bold"><Pair ar="حملة عشاق الحسين - ألمانيا" de="Reisegruppe Ushaq al-Hussein" align="center" /></p>
        <p className="mt-3 text-xs opacity-60"><Pair ar="نسأل الله لكم زيارة مقبولة وسفراً آمناً" de="Wir wünschen Ihnen eine gesegnete Pilgerreise und eine sichere Fahrt" align="center" /></p>
      </footer>
    </main>
  );
}
