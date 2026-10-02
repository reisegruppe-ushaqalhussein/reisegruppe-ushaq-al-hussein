import { useEffect, useMemo, useState } from "react";
import { BedDouble, CalendarClock, Landmark, MapPin, Navigation, Phone, RotateCcw, Users, Vibrate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, toEnglish } from "@/lib/i18n";
import { AddButton, ItemActions, useSaveContent, type FieldDef } from "@/components/inline-admin";
import { useShowHidden } from "@/lib/admin-session";
import type { ItineraryEntry, LocationEntry, LocationKind, SiteContent } from "@/lib/site-content";

type Admin = { password: string; content: SiteContent } | null;

function P({ ar, de, inverse }: { ar: string; de: string; inverse?: boolean }) {
  const { lang } = useLang();
  const sub = inverse ? "text-primary-foreground/70" : "text-muted-foreground";
  if (lang === "ar") return <span className="block">{ar || de}</span>;
  if (lang === "de" || lang === "en") return <span dir="ltr" className="block">{lang === "en" ? toEnglish(de || ar) : de || ar}</span>;
  return <span className="block">{ar && <span className="block">{ar}</span>}{de && <span lang="de" dir="ltr" className={`block text-[0.8em] italic ${sub}`}>{de}</span>}</span>;
}

function Title({ icon: Icon, ar, de }: { icon: typeof MapPin; ar: string; de: string }) {
  return <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span><h2 className="text-xl text-primary"><P ar={ar} de={de} /></h2></div>;
}

const telHref = (p: string) => `tel:${p.replace(/[^+\d]/g, "")}`;
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtDate = (iso: string) => { const [y, m, d] = iso.split("-"); return y && m && d ? `${d}.${m}.${y}` : iso; };

const itineraryFields: FieldDef[] = [
  { key: "date", ar: "التاريخ", de: "Datum", type: "date" },
  { key: "time", ar: "الوقت", de: "Uhrzeit", type: "time" },
  { key: "titleAr", ar: "الفعالية (عربي)", de: "Programmpunkt (AR)" },
  { key: "titleDe", ar: "الفعالية (ألماني)", de: "Programmpunkt (DE)", ltr: true },
  { key: "place", ar: "مكان التجمع", de: "Treffpunkt" },
  { key: "notes", ar: "ملاحظات", de: "Hinweise", multiline: true },
  { key: "gathering", ar: "موعد تجمّع", de: "Sammelzeit", checkbox: true },
];

export function ItineraryView({ content, admin }: { content: SiteContent; admin: Admin }) {
  const save = useSaveContent(admin?.password ?? "");
  const showHidden = useShowHidden();
  const all = content.itinerary;
  const available = showHidden ? all : all.filter((item) => !item.hidden);
  const commit = (next: ItineraryEntry[]) => save({ ...content, itinerary: next });
  const dates = useMemo(() => [...new Set(available.map((e) => e.date))].sort(), [available]);
  const [day, setDay] = useState<string>("");
  useEffect(() => { const t = todayIso(); setDay(dates.includes(t) ? t : dates.find((d) => d >= t) ?? dates[dates.length - 1] ?? ""); }, [dates.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const events = available.filter((e) => e.date === day).sort((a, b) => a.time.localeCompare(b.time));
  return (
    <div className="screen-enter px-4 py-7">
      <Title icon={CalendarClock} ar="جدول الرحلة والفعاليات" de="Tagesprogramm" />
      {admin && <AddButton label={{ ar: "إضافة فعالية", de: "Programmpunkt hinzufügen" }} fields={itineraryFields} blank={{ id: "", date: day || todayIso(), time: "08:00", titleAr: "", titleDe: "", place: "", notes: "", gathering: false, hidden: false }} onAdd={(row) => commit([...all, { ...(row as ItineraryEntry), id: `e${Date.now()}` }])} />}
      {dates.length === 0 ? <p className="rounded-lg border border-border bg-card p-5 text-center text-sm text-muted-foreground"><P ar="سيتم نشر جدول الرحلة هنا قريباً." de="Das Tagesprogramm wird hier bald veröffentlicht." /></p> : <>
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1" dir="ltr">
          {dates.map((d) => <button key={d} onClick={() => setDay(d)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${d === day ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-primary"}`}>{d === todayIso() ? "اليوم · Heute" : fmtDate(d)}</button>)}
        </div>
        <ol className="relative space-y-3 border-r-2 border-secondary/40 pr-4">
          {events.map((e) => (
             <li key={e.id} className={`relative ${e.hidden ? "opacity-55" : ""}`}>
              <span className={`absolute -right-[23px] top-4 h-3 w-3 rounded-full ${e.gathering ? "bg-secondary ring-4 ring-secondary/25" : "bg-primary"}`} />
               {admin && <ItemActions fields={itineraryFields} item={e} hidden={e.hidden ?? false} onVisibilityChange={(hidden) => commit(all.map((x) => (x.id === e.id ? { ...x, hidden } : x)))} onSave={(row) => commit(all.map((x) => (x.id === e.id ? { ...(row as ItineraryEntry), id: x.id, hidden: x.hidden ?? false } : x)))} onDelete={() => commit(all.filter((x) => x.id !== e.id))} />}
              <article className={`rounded-lg border bg-card p-4 shadow-sm ${e.gathering ? "border-secondary" : "border-border"}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span dir="ltr" className="text-lg font-extrabold text-primary">{e.time}</span>
                  {e.gathering && <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-extrabold text-secondary-foreground">موعد تجمّع | Sammelzeit</span>}
                </div>
                <h3 className="font-bold text-primary"><P ar={e.titleAr} de={e.titleDe} /></h3>
                {e.place && <p className="mt-2 flex items-center gap-1.5 text-sm"><MapPin className="h-4 w-4 shrink-0 text-secondary" />{e.place}</p>}
                {e.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{e.notes}</p>}
              </article>
            </li>
          ))}
        </ol>
      </>}
    </div>
  );
}

const kinds: Array<{ id: LocationKind; ar: string; de: string; icon: typeof MapPin }> = [
  { id: "hotel", ar: "الفنادق", de: "Hotels", icon: BedDouble },
  { id: "shrine", ar: "العتبات المقدسة", de: "Heilige Stätten", icon: Landmark },
  { id: "gathering", ar: "نقاط التجمع", de: "Treffpunkte", icon: Users },
];
const locationFields: FieldDef[] = [
  { key: "kind", ar: "النوع", de: "Art", options: kinds.map((k) => ({ value: k.id, label: `${k.ar} | ${k.de}` })) },
  { key: "ar", ar: "الاسم (عربي)", de: "Name (AR)" },
  { key: "de", ar: "الاسم (ألماني)", de: "Name (DE)", ltr: true },
  { key: "address", ar: "العنوان", de: "Adresse" },
  { key: "mapsUrl", ar: "رابط خرائط Google (اختياري)", de: "Google-Maps-Link (optional)", ltr: true },
];
const mapsHref = (l: LocationEntry) => l.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address || l.ar || l.de)}`;

export function GuideView({ content, admin }: { content: SiteContent; admin: Admin }) {
  const save = useSaveContent(admin?.password ?? "");
  const showHidden = useShowHidden();
  const all = content.locations;
  const available = showHidden ? all : all.filter((item) => !item.hidden);
  const commit = (next: LocationEntry[]) => save({ ...content, locations: next });
  const emergencyContacts = showHidden ? content.contacts : content.contactsVisible ? content.contacts.filter((contact) => contact.visible !== false && !contact.hidden).sort((a, b) => Number(b.ar.includes("ياسر")) - Number(a.ar.includes("ياسر"))).slice(0, 1) : [];
  return (
    <div className="screen-enter px-4 py-7">
      <Title icon={MapPin} ar="دليل الإقامة والمواقع" de="Unterkunft & Orte" />
      {emergencyContacts.length > 0 && <section className="mb-6 rounded-lg bg-primary p-4 text-primary-foreground shadow-md">
        <h3 className="mb-3 text-sm font-extrabold text-secondary"><P ar="أرقام الطوارئ للحملة" de="Notfallnummern der Reisegruppe" inverse /></h3>
        <div className="space-y-2">
          {emergencyContacts.map((c) => (
            <a key={c.id} href={telHref(c.phone)} className="flex items-center justify-between gap-3 rounded-md bg-primary-foreground/10 px-3 py-2.5 hover:bg-primary-foreground/15">
              <span className="min-w-0 text-sm font-bold"><P ar={c.ar} de={c.de} inverse /></span>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-extrabold text-secondary-foreground"><Phone className="h-3.5 w-3.5" />اتصال</span>
            </a>
          ))}
        </div>
      </section>}
      {admin && <AddButton label={{ ar: "إضافة موقع", de: "Ort hinzufügen" }} fields={locationFields} blank={{ id: "", kind: "hotel", ar: "", de: "", address: "", mapsUrl: "", hidden: false }} onAdd={(row) => commit([...all, { ...(row as LocationEntry), id: `l${Date.now()}` }])} />}
      {kinds.map((k) => {
        const items = available.filter((l) => l.kind === k.id);
        return (
          <section key={k.id} className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-primary"><k.icon className="h-5 w-5 text-secondary" /><P ar={k.ar} de={k.de} /></h3>
            {items.length === 0 ? <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground"><P ar="سيتم الإعلان عنها لاحقاً" de="Wird noch bekannt gegeben" /></p> : (
              <div className="space-y-3">{items.map((l) => (
                 <div key={l.id} className={l.hidden ? "opacity-55" : ""}>
                   {admin && <ItemActions fields={locationFields} item={l} hidden={l.hidden ?? false} onVisibilityChange={(hidden) => commit(all.map((x) => (x.id === l.id ? { ...x, hidden } : x)))} onSave={(row) => commit(all.map((x) => (x.id === l.id ? { ...(row as LocationEntry), id: x.id, hidden: x.hidden ?? false } : x)))} onDelete={() => commit(all.filter((x) => x.id !== l.id))} />}
                  <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <h4 className="font-bold text-primary"><P ar={l.ar} de={l.de} /></h4>
                    {l.address && <p className="mt-1 text-sm text-muted-foreground">{l.address}</p>}
                    <Button asChild variant="outline" size="sm" className="mt-3 w-full"><a href={mapsHref(l)} target="_blank" rel="noreferrer"><Navigation />فتح في خرائط Google <span className="text-xs italic">| In Google Maps öffnen</span></a></Button>
                  </article>
                </div>
              ))}</div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const dhikrs = [
  { id: "subhan", ar: "سُبْحَانَ اللهِ", de: "Subḥān Allāh", target: 33 },
  { id: "hamd", ar: "الْحَمْدُ للهِ", de: "Al-ḥamdu li-llāh", target: 33 },
  { id: "akbar", ar: "اللهُ أَكْبَرُ", de: "Allāhu akbar", target: 34 },
  { id: "salawat", ar: "اللّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ", de: "Allāhumma ṣalli ʿalā Muḥammad wa āli Muḥammad", target: 100 },
  { id: "istighfar", ar: "أَسْتَغْفِرُ اللهَ رَبِّي وَأَتُوبُ إِلَيْهِ", de: "Astaghfiru llāha rabbī wa atūbu ilayh", target: 100 },
  { id: "tahlil", ar: "لَا إِلٰهَ إِلَّا اللهُ", de: "Lā ilāha illā llāh", target: 100 },
];

export function TasbeehView() {
  const [sel, setSel] = useState(dhikrs[0]!.id);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem("tasbeeh") ?? "{}"); if (s.counts) setCounts(s.counts); if (typeof s.total === "number") setTotal(s.total); if (s.sel) setSel(s.sel); } catch { /* ignore */ } }, []);
  useEffect(() => { localStorage.setItem("tasbeeh", JSON.stringify({ counts, total, sel })); }, [counts, total, sel]);
  const d = dhikrs.find((x) => x.id === sel) ?? dhikrs[0]!;
  const count = counts[d.id] ?? 0;
  const tap = () => {
    const next = count + 1;
    setCounts((c) => ({ ...c, [d.id]: next }));
    setTotal((t) => t + 1);
    navigator.vibrate?.(next % d.target === 0 ? [60, 40, 60] : 15);
  };
  const pct = ((count % d.target) / d.target) * 100;
  return (
    <div className="screen-enter px-4 py-7">
      <Title icon={Vibrate} ar="السبحة الإلكترونية" de="Digitale Tasbih" />
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {dhikrs.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${x.id === sel ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-primary"}`}>{x.ar}</button>)}
      </div>
      <p className="text-center text-2xl font-extrabold leading-loose text-primary">{d.ar}</p>
      <p lang="de" dir="ltr" className="mb-6 text-center text-sm italic text-muted-foreground">{d.de}</p>
      <button onClick={tap} aria-label="تسبيحة | Zählen" className="mx-auto grid h-60 w-60 select-none place-items-center rounded-full bg-primary text-primary-foreground shadow-xl ring-8 ring-secondary/30 transition-transform active:scale-95" style={{ background: `conic-gradient(var(--secondary) ${pct}%, var(--primary) ${pct}%)` }}>
        <span className="grid h-52 w-52 place-items-center rounded-full bg-primary"><span><span className="block text-6xl font-extrabold">{count}</span><span dir="ltr" className="block text-xs text-primary-foreground/70">/ {d.target} · {Math.floor(count / d.target)}×</span></span></span>
      </button>
      <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <span className="text-sm"><P ar="المجموع الكلي" de="Gesamtzahl" /></span>
        <span className="text-2xl font-extrabold text-secondary">{total}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setCounts((c) => ({ ...c, [d.id]: 0 }))}><RotateCcw />تصفير <span className="text-xs italic">| Zurücksetzen</span></Button>
        <Button variant="outline" className="text-destructive" onClick={() => { if (window.confirm("تصفير الكل؟ | Alles zurücksetzen?")) { setCounts({}); setTotal(0); } }}><RotateCcw />تصفير الكل <span className="text-xs italic">| Alles</span></Button>
      </div>
    </div>
  );
}
