import { useEffect, useMemo, useState } from "react";
import { BedDouble, CalendarClock, Landmark, MapPin, Navigation, Phone, RotateCcw, Settings, Users, Vibrate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang, LangText } from "@/lib/i18n";
import { AddButton, ItemActions, ManageRow, SectionAdminBar, useSaveContent, useSectionEditMode, type FieldDef } from "@/components/inline-admin";
import { defaultContent } from "@/lib/site-content";
import { useShowHidden } from "@/lib/admin-session";
import { FavStar } from "@/components/group2";
import type { ContactEntry, EmergencyEntry, ItineraryEntry, LocationEntry, LocationKind, SiteContent } from "@/lib/site-content";

type Admin = { password: string; content: SiteContent } | null;

const P = LangText;

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
const emergencyFields: FieldDef[] = [
  { key: "ar", ar: "الاسم / الجهة", de: "Name (AR)" }, { key: "de", ar: "الاسم بالألمانية", de: "Name (DE)", ltr: true },
  { key: "phone", ar: "رقم الهاتف", de: "Telefonnummer", ltr: true },
];
const contactFields: FieldDef[] = [
  { key: "ar", ar: "الاسم / الجهة", de: "Name (AR)" }, { key: "de", ar: "الاسم بالألمانية", de: "Name (DE)", ltr: true },
  { key: "roleAr", ar: "الصفة بالعربية", de: "Rolle (AR)" }, { key: "roleDe", ar: "الصفة بالألمانية", de: "Rolle (DE)", ltr: true },
  { key: "phone", ar: "رقم الهاتف", de: "Telefonnummer", ltr: true }, { key: "whatsapp", ar: "رابط واتساب", de: "WhatsApp-Link", ltr: true },
];
const mapsHref = (l: LocationEntry) => l.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address || l.ar || l.de)}`;

export function GuideView({ content, admin }: { content: SiteContent; admin: Admin }) {
  const save = useSaveContent(admin?.password ?? "");
  const showHidden = useShowHidden();
  const isEditing = useSectionEditMode();
  const all = content.locations;
  const available = showHidden ? all : all.filter((item) => !item.hidden);
  const commit = (next: LocationEntry[]) => save({ ...content, locations: next });
  const emergencyContacts = showHidden ? content.contacts : content.contactsVisible ? content.contacts.filter((contact) => contact.visible !== false && !contact.hidden).sort((a, b) => Number(b.ar.includes("ياسر")) - Number(a.ar.includes("ياسر"))).slice(0, 1) : [];
  const emergency = content.emergency.filter((e) => showHidden || !e.hidden);
  const [manage, setManage] = useState(false);
  return (
        <div className="screen-enter px-4 py-7">
      <div className="flex items-start justify-between gap-2">
        <Title icon={MapPin} ar="دليل الإقامة والمواقع" de="Unterkunft & Orte" />
        {admin && (
          <SectionAdminBar
            addLabel={{ ar: "إضافة موقع جديد", de: "Ort hinzufügen" }}
            addFields={locationFields}
            addBlank={{ id: "", kind: "hotel", ar: "", de: "", address: "", mapsUrl: "", hidden: false }}
            onAdd={(row) => commit([...all, { ...(row as LocationEntry), id: `l${Date.now()}` }])}
            onRestore={() => commit(defaultContent.locations)}
          />
        )}
      </div>
      {(emergencyContacts.length > 0 || emergency.length > 0 || admin) && <section className="mb-6 rounded-lg bg-primary p-4 text-primary-foreground shadow-md">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="min-w-0 text-sm font-extrabold text-secondary"><P ar="أرقام الطوارئ للحملة" de="Notfallnummern der Reisegruppe" inverse /></h3>
      {admin && isEditing && <button type="button" onClick={() => setManage(true)} aria-label="إدارة الأرقام | Nummern verwalten" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-secondary/60 text-secondary hover:bg-secondary/15"><Settings className="h-4 w-4" /></button>}
        </div>
        <div className="space-y-2">
          {[...emergencyContacts.map((c) => ({ id: c.id, ar: c.ar, de: c.de, phone: c.phone, hidden: c.hidden })), ...emergency.map((c) => ({ id: c.id, ar: c.ar || "رقم طوارئ الحملة", de: c.de || "Notfallnummer der Reisegruppe", phone: c.phone, hidden: c.hidden }))].map((c) => (
            <a key={c.id} href={telHref(c.phone)} className={`flex min-w-0 items-center gap-2 rounded-md bg-primary-foreground/10 px-3 py-2.5 hover:bg-primary-foreground/15 ${c.hidden ? "opacity-55" : ""}`}>
              <span className="min-w-0 flex-1 text-sm font-bold"><P ar={c.ar} de={c.de} inverse /><span dir="ltr" className="block break-all text-xs text-secondary">{c.phone}</span></span>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1.5 text-xs font-extrabold text-secondary-foreground"><Phone className="h-3.5 w-3.5" />اتصال</span>
            </a>
          ))}
        </div>
      </section>}
      {admin && <Dialog open={manage} onOpenChange={setManage}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right"><DialogTitle>أرقام الطوارئ <span className="text-sm italic text-muted-foreground">| Notfallnummern</span></DialogTitle><DialogDescription className="sr-only">Notfallnummern</DialogDescription></DialogHeader>
          <div className="space-y-2">
            {content.contacts.map((c) => <ManageRow key={c.id} title={c.ar || c.de} subtitle={c.phone} fields={contactFields} item={c} hidden={c.hidden ?? false} onVisibilityChange={(hidden) => save({ ...content, contacts: content.contacts.map((x) => (x.id === c.id ? { ...x, hidden } : x)) })} onSave={(row) => save({ ...content, contacts: content.contacts.map((x) => (x.id === c.id ? { ...x, ...(row as ContactEntry), id: x.id, hidden: x.hidden ?? false } : x)) })} onDelete={() => save({ ...content, contacts: content.contacts.filter((x) => x.id !== c.id) })} />)}
            {content.emergency.map((c) => <ManageRow key={c.id} title={c.ar || c.de || "رقم طوارئ"} subtitle={c.phone} fields={emergencyFields} item={c} hidden={c.hidden ?? false} onVisibilityChange={(hidden) => save({ ...content, emergency: content.emergency.map((x) => (x.id === c.id ? { ...x, hidden } : x)) })} onSave={(row) => save({ ...content, emergency: content.emergency.map((x) => (x.id === c.id ? { ...(row as EmergencyEntry), id: x.id, hidden: x.hidden ?? false } : x)) })} onDelete={() => save({ ...content, emergency: content.emergency.filter((x) => x.id !== c.id) })} />)}
          </div>
          <AddButton label={{ ar: "إضافة رقم طوارئ", de: "Notfallnummer hinzufügen" }} fields={emergencyFields} blank={{ ar: "", de: "", phone: "" }} onAdd={(row) => save({ ...content, emergency: [...content.emergency, { ...(row as EmergencyEntry), id: `em${Date.now()}` }] })} />
        </DialogContent>
      </Dialog>}
     {kinds.map((k) => {
        const items = available.filter((l) => l.kind === k.id);
        return (
          <section key={k.id} className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-primary"><k.icon className="h-5 w-5 text-secondary" /><P ar={k.ar} de={k.de} /></h3>
            {admin && <AddButton label={{ ar: `إضافة — ${k.ar}`, de: `Hinzufügen — ${k.de}` }} fields={locationFields} blank={{ id: "", kind: k.id, ar: "", de: "", address: "", mapsUrl: "", hidden: false }} onAdd={(row) => commit([...all, { ...(row as LocationEntry), kind: k.id, id: `l${Date.now()}` }])} />}
            {items.length === 0 ? <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground"><P ar="سيتم الإعلان عنها لاحقاً" de="Wird noch bekannt gegeben" /></p> : (
              <div className="space-y-3">{items.map((l) => (
                 <div key={l.id} className={l.hidden ? "opacity-55" : ""}>
                  {admin && isEditing && <ItemActions fields={locationFields} item={l} hidden={l.hidden ?? false} onVisibilityChange={(hidden) => commit(all.map((x) => (x.id === l.id ? { ...x, hidden } : x)))} onSave={(row) => commit(all.map((x) => (x.id === l.id ? { ...(row as LocationEntry), id: x.id, hidden: x.hidden ?? false } : x)))} onDelete={() => commit(all.filter((x) => x.id !== l.id))} />}
                  <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start gap-2"><h4 className="min-w-0 flex-1 font-bold text-primary"><P ar={l.ar} de={l.de} /></h4><FavStar id={`loc:${l.id}`} /></div>
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

const tawafDuas = [
  { ar: "اللّهُمَّ إِنِّي أَسْأَلُكَ بِاسْمِكَ الَّذِي يُمْشَى بِهِ عَلَى طَلَلِ الْمَاءِ، كَمَا يُمْشَى بِهِ عَلَى جَدَدِ الْأَرْضِ.", de: "O Allah, ich bitte Dich bei Deinem Namen, mit dem man über das Wasser geht, wie man über festen Boden geht." },
  { ar: "سُبْحَانَ اللهِ وَالْحَمْدُ للهِ وَلَا إِلٰهَ إِلَّا اللهُ وَاللهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيمِ.", de: "Gepriesen sei Allah, Lob sei Allah, es gibt keinen Gott außer Allah, Allah ist größer; keine Kraft und Macht außer bei Allah." },
  { ar: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.", de: "Unser Herr, gib uns im Diesseits Gutes und im Jenseits Gutes und bewahre uns vor der Strafe des Feuers." },
  { ar: "اللّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ، وَاغْفِرْ لِي وَارْحَمْنِي وَتَقَبَّلْ مِنِّي، إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ.", de: "O Allah, segne Muhammad und seine Familie, vergib mir, erbarme Dich meiner und nimm von mir an." },
  { ar: "اللّهُمَّ إِنِّي إِلَيْكَ فَقِيرٌ، وَإِنِّي خَائِفٌ مُسْتَجِيرٌ، فَلَا تُغَيِّرْ جِسْمِي وَلَا تُبَدِّلِ اسْمِي.", de: "O Allah, ich bin auf Dich angewiesen, ich fürchte mich und suche Schutz bei Dir." },
  { ar: "يَا ذَا الْمَنِّ وَالطَّوْلِ وَالْجُودِ وَالْكَرَمِ، إِنَّ عَمَلِي ضَعِيفٌ فَضَاعِفْهُ لِي وَتَقَبَّلْهُ مِنِّي.", de: "O Herr der Gnade und Großzügigkeit, meine Taten sind schwach – vervielfache sie und nimm sie an." },
  { ar: "اللّهُمَّ الْبَيْتُ بَيْتُكَ وَالْعَبْدُ عَبْدُكَ، وَهٰذَا مَقَامُ الْعَائِذِ بِكَ مِنَ النَّارِ، فَأَعْتِقْنِي وَوَالِدَيَّ مِنَ النَّارِ.", de: "O Allah, das Haus ist Dein Haus, der Diener Dein Diener; befreie mich und meine Eltern vom Feuer." },
];

export function TawafView() {
  const [mode, setMode] = useState<"tawaf" | "sai">("tawaf");
  const [counts, setCounts] = useState({ tawaf: 0, sai: 0 });
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem("tawaf-counter") ?? "{}"); if (s.counts) setCounts(s.counts); if (s.mode) setMode(s.mode); } catch { /* ignore */ } }, []);
  useEffect(() => { localStorage.setItem("tawaf-counter", JSON.stringify({ counts, mode })); }, [counts, mode]);
  const n = counts[mode];
  const done = n >= 7;
  const cur = Math.min(n + 1, 7);
  const dua = tawafDuas[(done ? 6 : n)]!;
  const set = (v: number) => setCounts((c) => ({ ...c, [mode]: Math.max(0, Math.min(7, v)) }));
  const tap = () => { if (done) return; set(n + 1); navigator.vibrate?.(n + 1 === 7 ? [80, 50, 80, 50, 80] : 40); };
  const route = mode === "sai" ? (cur % 2 === 1 ? { ar: "من الصفا إلى المروة", de: "Von Safa nach Marwa" } : { ar: "من المروة إلى الصفا", de: "Von Marwa nach Safa" }) : { ar: "من الحجر الأسود إلى الحجر الأسود", de: "Vom Schwarzen Stein zum Schwarzen Stein" };
  return (
    <div className="screen-enter px-4 py-7">
      <Title icon={RotateCcw} ar="عداد الطواف والسعي" de="Tawaf- & Sa‘i-Zähler" />
      <div className="mb-5 grid grid-cols-2 gap-2">
        {(["tawaf", "sai"] as const).map((m) => <Button key={m} variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>{m === "tawaf" ? "الطواف | Tawaf" : "السعي | Sa‘i"}</Button>)}
      </div>
      <p className="mb-4 text-center text-sm font-bold text-primary"><P ar={done ? "تم بحمد الله" : `الشوط ${cur} — ${route.ar}`} de={done ? "Vollendet, Gott sei Dank" : `Runde ${cur} — ${route.de}`} /></p>
      <button onClick={tap} aria-label="تسجيل شوط | Runde zählen" className="mx-auto grid h-56 w-56 select-none place-items-center rounded-full text-primary-foreground shadow-xl ring-8 ring-secondary/30 transition-transform active:scale-95" style={{ background: `conic-gradient(var(--secondary) ${(n / 7) * 100}%, var(--primary) ${(n / 7) * 100}%)` }}>
        <span className="grid h-48 w-48 place-items-center rounded-full bg-primary"><span><span className="block text-6xl font-extrabold">{n}</span><span dir="ltr" className="block text-xs text-primary-foreground/70">/ 7</span></span></span>
      </button>
      {done ? (
        <div className="mt-6 rounded-lg border border-secondary bg-card p-4 text-center text-sm"><P ar={mode === "tawaf" ? "أتممت 7 أشواط. صلِّ ركعتي الطواف خلف مقام إبراهيم (ع)." : "أتممت السعي 7 أشواط وانتهيت عند المروة. تقبّل الله."} de={mode === "tawaf" ? "7 Runden vollendet. Bete zwei Rak‘at hinter dem Maqam Ibrahim." : "Sa‘i mit 7 Runden bei Marwa vollendet. Möge Allah annehmen."} /></div>
      ) : (
        <article className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="mb-2 text-xs font-bold text-secondary"><P ar={`دعاء الشوط ${cur}`} de={`Bittgebet Runde ${cur}`} /></p>
          <p lang="ar" dir="rtl" className="text-lg font-bold leading-loose text-primary">{dua.ar}</p>
          <p lang="de" dir="ltr" className="mt-2 text-left text-sm italic text-muted-foreground">{dua.de}</p>
        </article>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => set(n - 1)} disabled={n === 0}>تراجع شوط <span className="text-xs italic">| Zurück</span></Button>
        <Button variant="outline" className="text-destructive" onClick={() => { if (window.confirm("تصفير العداد؟ | Zähler zurücksetzen?")) set(0); }}><RotateCcw />تصفير <span className="text-xs italic">| Reset</span></Button>
      </div>
    </div>
  );
}

const packingGroups: { ar: string; de: string; items: { id: string; ar: string; de: string }[] }[] = [
  { ar: "الوثائق والأوراق", de: "Dokumente", items: [
    { id: "passport", ar: "جواز السفر", de: "Reisepass" }, { id: "visa", ar: "التأشيرة", de: "Visum" }, { id: "idcard", ar: "بطاقة الهوية", de: "Personalausweis" }, { id: "tickets", ar: "تذاكر الطيران", de: "Flugtickets" }, { id: "cash", ar: "النقود والبطاقة البنكية", de: "Bargeld & Bankkarte" }, { id: "insurance", ar: "التأمين الصحي", de: "Krankenversicherung" } ] },
  { ar: "العبادات والمناسك", de: "Gottesdienst", items: [
    { id: "ihram", ar: "ثوب الإحرام", de: "Ihram-Kleidung" }, { id: "sandals", ar: "نعل مريح", de: "Bequeme Sandalen" }, { id: "turba", ar: "التربة الحسينية", de: "Turba" }, { id: "misbaha", ar: "المسبحة", de: "Gebetskette" }, { id: "duabook", ar: "كتاب الأدعية", de: "Bittgebetsbuch" } ] },
  { ar: "الصحة والأدوية", de: "Gesundheit", items: [
    { id: "meds", ar: "الأدوية الشخصية", de: "Persönliche Medikamente" }, { id: "pain", ar: "مسكنات", de: "Schmerzmittel" }, { id: "plasters", ar: "لصقات جروح", de: "Pflaster" }, { id: "sanitizer", ar: "معقم ومستلزمات النظافة", de: "Desinfektion & Hygiene" }, { id: "mask", ar: "كمامات", de: "Masken" } ] },
  { ar: "مستلزمات عامة", de: "Allgemeines", items: [
    { id: "charger", ar: "الشاحن", de: "Ladegerät" }, { id: "powerbank", ar: "بنك الطاقة", de: "Powerbank" }, { id: "adapter", ar: "محول الكهرباء", de: "Reiseadapter" }, { id: "clothes", ar: "ملابس مريحة", de: "Bequeme Kleidung" }, { id: "bag", ar: "حقيبة ظهر صغيرة", de: "Kleiner Rucksack" } ] },
];

export function PackingView() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [custom, setCustom] = useState<{ id: string; text: string }[]>([]);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem("packing-list") ?? "{}"); if (s.checked) setChecked(s.checked); if (s.custom) setCustom(s.custom); } catch { /* ignore */ } setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem("packing-list", JSON.stringify({ checked, custom })); }, [checked, custom, ready]);
  const allIds = [...packingGroups.flatMap((g) => g.items.map((i) => i.id)), ...custom.map((c) => c.id)];
  const done = allIds.filter((id) => checked[id]).length;
  const pct = allIds.length ? Math.round((done / allIds.length) * 100) : 0;
  const toggle = (id: string) => { setChecked((c) => ({ ...c, [id]: !c[id] })); navigator.vibrate?.(15); };
  const row = (id: string, label: React.ReactNode, onDelete?: () => void) => (
    <li key={id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-0">
      <label className="flex flex-1 cursor-pointer items-center gap-3">
        <input type="checkbox" checked={!!checked[id]} onChange={() => toggle(id)} className="h-5 w-5 accent-[var(--secondary)]" />
        <span className={checked[id] ? "text-muted-foreground line-through" : "text-foreground"}>{label}</span>
      </label>
      {onDelete && <button onClick={onDelete} aria-label="حذف | Löschen" className="text-xs text-destructive">✕</button>}
    </li>
  );
  return (
    <div className="screen-enter px-4 py-7">
      <Title icon={Landmark} ar="حقيبة السفر" de="Reise-Checkliste" />
      <div className="mb-5 rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex justify-between text-sm font-bold text-primary"><P ar="جاهزية الحقيبة" de="Koffer bereit" /><span dir="ltr">{pct}%</span></div>
        <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-secondary transition-all" style={{ width: `${pct}%` }} /></div>
        <p dir="ltr" className="mt-1 text-center text-xs text-muted-foreground">{done} / {allIds.length}</p>
      </div>
      {packingGroups.map((g) => (
        <section key={g.de} className="mb-4 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-secondary"><P ar={g.ar} de={g.de} /></h3>
          <ul>{g.items.map((i) => row(i.id, <P ar={i.ar} de={i.de} />))}</ul>
        </section>
      ))}
      <section className="mb-4 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
        <h3 className="mb-1 text-sm font-bold text-secondary"><P ar="أغراضي الخاصة" de="Eigene Gegenstände" /></h3>
        <ul>{custom.map((c) => row(c.id, c.text, () => setCustom((l) => l.filter((x) => x.id !== c.id))))}</ul>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (!t) return; setCustom((l) => [...l, { id: `c-${Date.now()}`, text: t }]); setText(""); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="أضف غرضاً | Hinzufügen" className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <Button type="submit">+</Button>
        </form>
      </section>
      <Button variant="outline" className="w-full text-destructive" onClick={() => { if (window.confirm("تفريغ الإشارات لرحلة جديدة؟ | Liste zurücksetzen?")) setChecked({}); }}><RotateCcw />إعادة ضبط <span className="text-xs italic">| Zurücksetzen</span></Button>
    </div>
  );
}
