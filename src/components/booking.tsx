import { createContext, useContext, useEffect, useId, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Baby, Bell, CheckCircle2, ChevronLeft, ChevronRight, Download, FileText,
  Loader2, MessageCircle, Pencil, Plane, Plus, RefreshCw, Trash2, User, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminSession, useStaffSession } from "@/lib/admin-session";
import {
  addManualBooking, bookingFileUrl, listBookings, submitBooking, updateBooking,
  type BookingRow, type FileData,
} from "@/lib/bookings.functions";
import { enablePush } from "@/lib/push";
import {
  biFor, LangText, useLang, type SiteContent,
} from "@/lib/i18n";
import { saveOrQueue } from "@/lib/offline";
import { buildXlsx, type XSheet } from "@/lib/xlsx";
import { useSectionEditMode } from "./cms";

const AIRPORTS = ["Berlin (BER)", "Düsseldorf (DUS)", "Frankfurt (FRA)", "Hannover (HAJ)", "Hamburg (HAM)", "München (MUC)"];
const OTHER = "__other__";

type Cat = "adult" | "child" | "infant";
const cats: Array<{ id: Cat; ar: string; de: string }> = [
  { id: "adult", ar: "بالغ (12+)", de: "Erwachsene/r (12+)" },
  { id: "child", ar: "طفل (2–11)", de: "Kind (2–11)" },
  { id: "infant", ar: "رضيع (أقل من سنتين)", de: "Kleinkind (unter 2)" },
];
const rooms = [
  { id: "single", ar: "منفردة (غرفة خاصة)", de: "Einzelzimmer (privat)" },
  { id: "double", ar: "ثنائية", de: "Doppelzimmer" },
  { id: "triple", ar: "ثلاثية", de: "Dreibettzimmer" },
  { id: "quad", ar: "رباعية", de: "Vierbettzimmer" },
  { id: "family", ar: "عائلية", de: "Familienzimmer" },
  { id: "leader", ar: "حسب ما يراه الحاج ياسر مناسباً", de: "Nach Ermessen der Reiseleitung" },
];

function waLink(raw: string) {
  let d = (raw || "").replace(/[^0-9]/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "49" + d.slice(1);
  return `https://wa.me/${d}`;
}

function age(birth: string) {
  const b = new Date(birth), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
const catOf = (birth: string): Cat => { const a = age(birth); return a < 2 ? "infant" : a < 12 ? "child" : "adult"; };

async function readFile(f: File): Promise<FileData> {
  if (f.size > 10 * 1024 * 1024) throw new Error("الملف أكبر من 10MB | Datei größer als 10 MB");
  if (f.type.startsWith("image/")) {
    const img = await createImageBitmap(f);
    const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", 0.88);
    return { name: f.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", data: url.split(",")[1]! };
  }
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { name: f.name, type: f.type, data: btoa(bin) };
}

type Traveler = {
  category: Cat;
  relation: string;
  firstName: string;
  lastName: string;
  arabicName?: string;
  gender: "m" | "f" | "";
  birthDate: string;
  nationality: string;
  passportNo: string;
  passportExpiry: string;
  passportFile?: FileData;
  photoFile?: FileData;
};

const blank = (cat: Cat = "adult"): Traveler => ({
  category: cat, relation: "", firstName: "", lastName: "", arabicName: "", gender: "",
  birthDate: "", nationality: "DEUTSCH", passportNo: "", passportExpiry: "",
});

function travelerErrors(t: Traveler, i: number): string[] {
  const n = `#${i + 1}`;
  const e: string[] = [];
  const latin = /^[A-Za-z][A-Za-z '\-]*$/;
  if (!latin.test(t.firstName.trim()) || !latin.test(t.lastName.trim())) e.push(`${n}: الاسم بالأحرف اللاتينية كما في الجواز | Name in lateinischen Buchstaben wie im Pass`);
  if (!t.gender) e.push(`${n}: الجنس | Geschlecht`);
  if (!t.birthDate) e.push(`${n}: تاريخ الميلاد | Geburtsdatum`);
  else if (catOf(t.birthDate) !== t.category) e.push(`${n}: الفئة العمرية لا تطابق تاريخ الميلاد | Altersgruppe passt nicht zum Geburtsdatum`);
  if (t.nationality.trim().length < 2) e.push(`${n}: الجنسية | Staatsangehörigkeit`);
  if (!/^[A-Za-z0-9]{5,20}$/.test(t.passportNo.trim())) e.push(`${n}: رقم الجواز (حروف وأرقام فقط) | Passnummer`);
  if (!t.passportExpiry) e.push(`${n}: تاريخ انتهاء الجواز | Ablaufdatum`);
  else { const six = new Date(); six.setMonth(six.getMonth() + 6); if (new Date(t.passportExpiry) < six) e.push(`${n}: الجواز يجب أن يكون صالحاً 6 أشهر على الأقل | Pass muss mind. 6 Monate gültig sein`); }
  if (!t.passportFile) e.push(`${n}: صورة الجواز | Passkopie`);
  if (!t.photoFile) e.push(`${n}: الصورة البيومترية | Biometrisches Foto`);
  return e;
}

const RegCtx = createContext<SiteContent | null>(null);
function L({ ar, de }: { ar: string; de: string }) {
  const content = useContext(RegCtx);
  const o = content ? regOf(content).labels?.[ar] : undefined;
  const cur = { ar: o?.ar || ar, de: o?.de || de };
  return <><LangText ar={cur.ar} de={cur.de} />{content && <LabelPen content={content} id={ar} cur={cur} renamed={!!o} />}</>;
}

type RegCfg = {
  titleAr?: string; titleDe?: string; introAr?: string; introDe?: string; noteAr?: string; noteDe?: string;
  ocrOff?: boolean; ocrPublic?: boolean; ocrNoteAr?: string; ocrNoteDe?: string;
  closed?: boolean; labels?: Record<string, { ar?: string; de?: string }>;
  hotels?: Record<string, string>;
};
const regOf = (c: SiteContent): RegCfg => ((c.cms?.registration as RegCfg | undefined) ?? {});

function LabelPen({ content, id, cur, renamed }: { content: SiteContent; id: string; cur: { ar: string; de: string }; renamed: boolean }) {
  const adminS = useAdminSession();
  const qc = useQueryClient();
  const reg = regOf(content);
  const [open, setOpen] = useState(false);
  const [ar, setAr] = useState(cur.ar);
  const [de, setDe] = useState(cur.de);
  const isEditing = useSectionEditMode();
  if (adminS?.role !== "admin" || !isEditing) return null;
  const save = async (a: string, d: string) => {
    const next = { ...(reg.labels ?? {}) };
    if (!a.trim() && !d.trim()) delete next[id];
    else next[id] = { ar: a.trim() || undefined, de: d.trim() || undefined };
    try { await saveOrQueue(adminS.password, { ...content, cms: { ...(content.cms ?? {}), registration: { ...reg, labels: next } } as never }, "التسجيل | Anmeldung", qc); setOpen(false); }
    catch (e) { window.alert(`تعذّر الحفظ | Fehler\n${e instanceof Error ? e.message : e}`); }
  };
  if (!open) return <button type="button" aria-label={`تعديل: ${id}`} title={`تعديل التسمية: ${id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAr(cur.ar); setDe(cur.de); setOpen(true); }} className={`ms-1 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full align-middle text-[10px] shadow-sm ${renamed ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}><Pencil className="h-2.5 w-2.5" /></button>;
  return <div className="my-1.5 space-y-1.5 rounded-md border-2 border-secondary bg-card p-2 text-xs text-foreground shadow-md" onClick={(e) => e.stopPropagation()}>
    <p className="font-bold text-primary">✏️ تسمية مخصصة</p>
    <input dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} placeholder="عربي" className={inputCls} />
    <input dir="ltr" value={de} onChange={(e) => setDe(e.target.value)} placeholder="Deutsch" className={inputCls} />
    <div className="flex gap-1.5"><Button size="sm" className="flex-1" onClick={() => void save(ar, de)}>حفظ</Button><Button size="sm" variant="outline" onClick={() => void save("", "")}>افتراضي</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>✕</Button></div>
  </div>;
}

function Sugg({ id, items }: { id: string; items: string[] }) {
  if (!items.length) return null;
  return <datalist id={id}>{items.map((v, i) => <option key={i} value={v} />)}</datalist>;
}

function ExtraFields({ content, step, values, onChange }: { content: SiteContent; step: 1 | 3; values: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const all = content.cms?.registration?.extraFields ?? [];
  const fields = all.filter((f) => (f.step ?? 1) === step);
  if (!fields.length) return null;
  return <div className="space-y-2 rounded-md border border-dashed border-secondary/60 bg-accent/20 p-2.5">
    {fields.map((f) => <label key={f.id} className="block font-bold">
      <span><LangText ar={f.labelAr} de={f.labelDe} />{f.required && <span className="ms-1 text-destructive">*</span>}</span>
      {f.type === "textarea" ? <textarea rows={2} value={values[f.id] ?? ""} onChange={(e) => onChange({ ...values, [f.id]: e.target.value })} className={inputCls} />
        : f.type === "select" ? <select value={values[f.id] ?? ""} onChange={(e) => onChange({ ...values, [f.id]: e.target.value })} className={inputCls}><option value="">—</option>{(f.options ?? []).map((o, i) => <option key={i} value={o.de || o.ar}>{o.ar} / {o.de}</option>)}</select>
        : <input type={f.type === "number" ? "number" : "text"} value={values[f.id] ?? ""} onChange={(e) => onChange({ ...values, [f.id]: e.target.value })} className={inputCls} />}
    </label>)}
  </div>;
}

const inputCls = "mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function FileField({ label, value, onChange, photo }: { label: { ar: string; de: string }; value?: FileData; onChange: (f?: FileData) => void; photo?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputId = useId();
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true); setErr("");
    try { const data = await readFile(f); onChange(data); }
    catch (e) { setErr(e instanceof Error ? e.message : "تعذر قراءة الملف"); }
    finally { setBusy(false); }
  };
  return <div className="space-y-1">
    <label htmlFor={inputId} className="block font-bold"><L ar={label.ar} de={label.de} /></label>
    <div className="flex items-center gap-2">
      <input id={inputId} type="file" accept={photo ? "image/*" : "image/*,application/pdf"} capture={photo ? "user" : undefined} onChange={(e) => void pick(e.target.files?.[0])} className="block w-full text-xs file:me-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-primary/90" />
      {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange(undefined)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
    </div>
    {busy && <p className="text-xs text-muted-foreground"><Loader2 className="me-1 inline h-3 w-3 animate-spin" /><L ar="جاري معالجة الملف..." de="Wird verarbeitet..." /></p>}
    {value && <p className="text-xs text-secondary">✓ {value.name}</p>}
    {err && <p className="text-xs text-destructive">{err}</p>}
  </div>;
}

function ScanButton({ reg, onFill, pen }: { reg: RegCfg; onFill: (p: Partial<Traveler>) => void; pen?: React.ReactNode }) {
  const adminS = useAdminSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (reg.ocrOff) return null;
  if (!reg.ocrPublic && adminS?.role !== "admin") return null;
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true); setErr("");
    try {
      const data = await readFile(f);
      const res = await fetch("/api/public/scan-passport", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file: data }) });
      if (!res.ok) throw new Error("تعذر المسح الضوئي للجواز");
      const json = await res.json();
      if (json.traveler) onFill({ ...json.traveler, passportFile: data });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "فشل المسح");
    } finally { setBusy(false); }
  };
  return <div className="space-y-1">
    <div className="flex items-center gap-1.5">
      <label className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-secondary bg-accent/30 text-xs font-bold text-primary hover:bg-accent/50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>📷</span>}
        <L ar="مسح الجواز ضوئياً للتعبئة التلقائية" de="Pass scannen zum Auto-Ausfüllen" />
        <input type="file" accept="image/*" onChange={(e) => void pick(e.target.files?.[0])} className="hidden" />
      </label>
      {pen}
    </div>
    {reg.ocrNoteAr && <p className="text-[11px] text-muted-foreground"><LangText ar={reg.ocrNoteAr} de={reg.ocrNoteDe ?? ""} /></p>}
    {err && <p className="text-xs text-destructive">{err}</p>}
  </div>;
}

export function RegistrationView({ content }: { content: SiteContent }) {
  const { lang } = useLang();
  const bi = biFor(lang);
  const reg = regOf(content);
  const trips = useMemo(() => content.trips.filter((t) => !t.hidden), [content.trips]);
  const [step, setStep] = useState(0);
  const [trip, setTrip] = useState<string>(trips[0]?.id ?? OTHER);
  const [otherTrip, setOtherTrip] = useState("");
  const [otherDate, setOtherDate] = useState("");
  const [airportSel, setAirportSel] = useState(AIRPORTS[0]!);
  const [otherAirport, setOtherAirport] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [roomPref, setRoomPref] = useState("leader");
  const [travelers, setTravelers] = useState<Traveler[]>([blank()]);
  const [consent, setConsent] = useState(false);
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [doneRef, setDoneRef] = useState<string | null>(null);

  const hist = useMemo(() => {
    try {
      const raw = localStorage.getItem("ushaq_reg_hist");
      return raw ? JSON.parse(raw) : { email: [], phone: [], firstName: [], lastName: [], nationality: [], passportNo: [], relation: [] };
    } catch { return { email: [], phone: [], firstName: [], lastName: [], nationality: [], passportNo: [], relation: [] }; }
  }, []);

  const saveHist = () => {
    try {
      const add = (arr: string[], v?: string) => v && !arr.includes(v) ? [v, ...arr].slice(0, 8) : arr;
      const next = { ...hist, email: add(hist.email, email), phone: add(hist.phone, phone) };
      travelers.forEach((t) => {
        next.firstName = add(next.firstName, t.firstName);
        next.lastName = add(next.lastName, t.lastName);
        next.nationality = add(next.nationality, t.nationality);
        next.passportNo = add(next.passportNo, t.passportNo);
        if (t.relation) next.relation = add(next.relation, t.relation);
      });
      localStorage.setItem("ushaq_reg_hist", JSON.stringify(next));
    } catch { /* ignore */ }
  };

  const setT = (i: number, patch: Partial<Traveler>) => setTravelers((prev) => prev.map((t, j) => j === i ? { ...t, ...patch } : t));

  const chosenTrip = trips.find((t) => t.id === trip);
  const tripName = chosenTrip ? `${chosenTrip.ar} | ${chosenTrip.de}` : otherTrip;
  const tripDate = chosenTrip ? (chosenTrip.date ?? "") : otherDate;
  const finalAirport = airportSel === OTHER ? otherAirport : airportSel;

  const next = () => {
    const e: string[] = [];
    if (step === 0) {
      if (!trip) e.push("اختر الرحلة | Reise wählen");
      if (trip === OTHER && !otherTrip.trim()) e.push("أدخل اسم وجهة الرحلة | Reiseziel angeben");
      if (!finalAirport.trim()) e.push("اختر مطار الانطلاق | Abflughafen wählen");
    } else if (step === 1) {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.push("البريد الإلكتروني غير صحيح | E-Mail ungültig");
      if (!phone.trim() || phone.replace(/[^0-9]/g, "").length < 7) e.push("رقم الواتساب غير مكتمل | WhatsApp-Nummer unvollständig");
    } else if (step === 2) {
      travelers.forEach((t, i) => e.push(...travelerErrors(t, i)));
    }
    setErrors(e);
    if (!e.length) setStep((s) => s + 1);
  };

  const submit = useServerFn(submitBooking);
  const send = async () => {
    const e: string[] = [];
    if (!consent) e.push("يرجى الموافقة على صحة البيانات | Bitte bestätigen Sie die Richtigkeit der Daten");
    setErrors(e);
    if (e.length) return;
    setBusy(true);
    try {
      const res = await submit({
        data: {
          trip: tripName, tripDate, airport: finalAirport, email, phone, roomPref,
          notes: [notes, Object.entries(extras).map(([k, v]) => `${k}: ${v}`).join(" · ")].filter(Boolean).join("\n"),
          travelers: travelers as never, consent: true,
        },
      });
      saveHist();
      setDoneRef((res as { ref?: string })?.ref ?? "OK");
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "تعذر إرسال الطلب، حاول مجدداً"]);
    } finally { setBusy(false); }
  };

  if (reg.closed) {
    return <section className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
      <RegSettings content={content} />
      <h2 className="text-base font-bold text-primary"><LangText ar="التسجيل في الرحلات مغلق حالياً" de="Anmeldung zurzeit geschlossen" /></h2>
      <p className="mt-2 text-xs text-muted-foreground"><LangText ar="يرجى التواصل مع إدارة الحملة عبر الواتساب للاستفسار عن الحجوزات القادمة." de="Bitte kontaktieren Sie uns für zukünftige Reisen per WhatsApp." /></p>
      <a href="https://wa.me/4915773055365" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><MessageCircle className="h-4 w-4" />WhatsApp</a>
    </section>;
  }

  if (doneRef) {
    return <section className="rounded-lg border border-secondary bg-card p-6 text-center shadow-md">
      <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
      <h2 className="mt-3 text-lg font-bold text-primary"><LangText ar="تم استلام طلب التسجيل بنجاح!" de="Anmeldung erfolgreich eingereicht!" /></h2>
      <p className="mt-1 text-xs text-muted-foreground"><LangText ar="رقم مرجع الحجز الخاص بك:" de="Ihre Buchungsreferenz:" /></p>
      <p dir="ltr" className="mt-1 font-mono text-base font-bold text-secondary">{doneRef}</p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground"><LangText ar="تم إرسال بريد إلكتروني بتفاصيل طلبك، وسنتواصل معكم عبر الواتساب قريباً لإكمال إجراءات التأشيرة." de="Eine Bestätigung wurde per E-Mail versendet. Wir melden uns in Kürze per WhatsApp." /></p>
      <Button className="mt-4" onClick={() => { setDoneRef(null); setStep(0); setTravelers([blank()]); }}><LangText ar="تسجيل حجز جديد" de="Neue Anmeldung" /></Button>
    </section>;
  }

  const rtl = lang === "ar" || lang === "both";
  const steps = [{ ar: "الرحلة", de: "Reise" }, { ar: "التواصل", de: "Kontakt" }, { ar: "المسافرون", de: "Reisende" }, { ar: "التأكيد", de: "Abschluss" }];

  return <RegCtx.Provider value={content}>
    <RegSettings content={content} />
    <section dir={rtl ? "rtl" : "ltr"} className={`overflow-hidden ${rtl ? "text-right" : "text-left"} rounded-lg border border-secondary/60 bg-card shadow-md`}>
      <div className="bg-primary px-4 py-4 text-primary-foreground">
        <div className="flex items-center gap-2 text-secondary"><Plane className="h-5 w-5" /><span className="text-sm font-bold"><LangText ar={reg.titleAr || "استمارة التسجيل"} de={reg.titleDe || "Anmeldeformular"} inverse /></span><EditPen content={content} k="title" label="عنوان الاستمارة" /></div>
        <ol className="mt-3 grid grid-cols-4 gap-1.5">{steps.map((s, i) => <li key={i} className="text-center"><span className={`block h-1.5 rounded-full ${i <= step ? "bg-secondary" : "bg-primary-foreground/20"}`} /><span className={`mt-1 block text-[10px] ${i === step ? "font-bold text-secondary" : "opacity-70"}`}><LangText ar={s.ar} de={s.de} inverse center /></span></li>)}</ol>
      </div>
      <div className="space-y-4 p-4 text-sm">
        {(reg.introAr || reg.introDe) ? <div className="flex items-start gap-1 rounded-md bg-muted p-3 text-xs"><span className="min-w-0 flex-1"><LangText ar={reg.introAr ?? ""} de={reg.introDe ?? ""} /></span><EditPen content={content} k="intro" label="النص التعريفي" /></div> : <EditPen content={content} k="intro" label="النص التعريفي" />}

        {step === 0 && <>
          <p className="font-bold text-primary"><L ar="اختر الرحلة" de="Reise auswählen" /></p>
          <div className="space-y-2">
            {trips.map((t) => <button key={t.id} type="button" onClick={() => setTrip(t.id)} className={`w-full rounded-md border p-3 text-start ${trip === t.id ? "border-secondary bg-accent ring-1 ring-secondary" : "border-border bg-card"}`}><span className="block font-bold text-primary"><LangText ar={t.ar} de={t.de} /></span>{t.date && <span dir="ltr" className="mt-1 block text-xs text-muted-foreground">{t.date}</span>}</button>)}
            <button type="button" onClick={() => setTrip(OTHER)} className={`w-full rounded-md border border-dashed p-3 text-start ${trip === OTHER ? "border-secondary bg-accent" : "border-border"}`}><span className="font-bold text-primary"><L ar="رحلة أخرى / تاريخ مخصص" de="Andere Reise / Wunschdatum" /></span></button>
          </div>
          {trip === OTHER && <div className="space-y-3 rounded-md bg-muted p-3">
            <label className="block font-bold"><L ar="الوجهة (العراق، إيران، العمرة…)" de="Reiseziel (Irak, Iran, Umrah …)" /><input value={otherTrip} onChange={(e) => setOtherTrip(e.target.value)} maxLength={150} className={inputCls} /></label>
            <label className="block font-bold"><L ar="التاريخ أو الفترة المطلوبة" de="Gewünschtes Datum / Zeitraum" /><input value={otherDate} onChange={(e) => setOtherDate(e.target.value)} maxLength={90} placeholder="z.B. 20.12.2026 – 03.01.2027" className={inputCls} /></label>
          </div>}
          <p className="pt-2 font-bold text-primary"><L ar="مطار الانطلاق في ألمانيا" de="Abflughafen in Deutschland" /></p>
          <div className="grid grid-cols-2 gap-1.5">
            {AIRPORTS.map((a) => <button key={a} type="button" onClick={() => setAirportSel(a)} dir="ltr" className={`rounded-md border px-2 py-2 text-xs font-bold ${airportSel === a ? "border-secondary bg-accent text-primary ring-1 ring-secondary" : "border-border"}`}>{a}</button>)}
            <button type="button" onClick={() => setAirportSel(OTHER)} className={`col-span-2 rounded-md border border-dashed px-2 py-2 text-xs font-bold ${airportSel === OTHER ? "border-secondary bg-accent text-primary" : "border-border"}`}><L ar="مطار آخر" de="Anderer Flughafen" /></button>
          </div>
          {airportSel === OTHER && <input value={otherAirport} onChange={(e) => setOtherAirport(e.target.value)} maxLength={80} placeholder="z.B. Leipzig (LEJ)" className={inputCls} />}
        </>}

        {step === 1 && <>
          <label className="block font-bold"><L ar="البريد الإلكتروني (لاستلام التأكيد)" de="E-Mail (für die Bestätigung)" /><input dir="ltr" type="email" autoComplete="email" list="bk-emails" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} className={inputCls} /><Sugg id="bk-emails" items={hist.email} /></label>
          <label className="block font-bold"><L ar="رقم الواتساب مع رمز الدولة" de="WhatsApp-Nummer mit Ländervorwahl" /><input dir="ltr" type="tel" autoComplete="tel" list="bk-phones" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 …" maxLength={30} className={inputCls} /><Sugg id="bk-phones" items={hist.phone} /></label>
          <ExtraFields content={content} step={1} values={extras} onChange={setExtras} />
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground"><L ar="للاستفسار: ushaqalhussein.contact@gmail.com" de="Fragen: ushaqalhussein.contact@gmail.com" /></p>
        </>}

        {step === 2 && <>
          <p className="rounded-md bg-muted p-3 text-xs leading-relaxed"><L ar="أدخل كل مسافر بما فيهم الأطفال والرضّع. الأسماء بالأحرف اللاتينية حرفياً كما في الجواز لتذاكر الطيران، مع كتابة الاسم بالعربية لبطاقات الأمتعة." de="Bitte jede reisende Person inkl. Kinder eintragen. Lateinisch wie im Pass für Tickets, auf Arabisch für Kofferanhänger." /></p>
          {travelers.map((t, i) => <article key={i} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-secondary">{t.category === "infant" ? <Baby className="h-4 w-4" /> : <User className="h-4 w-4" />}</span>
              <span className="flex-1 font-bold text-primary">{i === 0 ? <L ar="صاحب الطلب" de="Antragsteller/in" /> : <><L ar="مرافق" de="Begleitperson" /> {i}</>}</span>
              {i > 0 && <button type="button" aria-label="حذف | Entfernen" onClick={() => setTravelers((l) => l.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-full border border-border text-destructive"><Trash2 className="h-4 w-4" /></button>}
            </div>
            <div className="grid grid-cols-3 gap-1.5">{cats.map((c) => <button key={c.id} type="button" onClick={() => setT(i, { category: c.id })} className={`rounded-md border px-1 py-2 text-[11px] font-bold ${t.category === c.id ? "border-secondary bg-accent text-primary" : "border-border"}`}><LangText ar={c.ar} de={c.de} center /></button>)}</div>
            <ScanButton reg={reg} onFill={(p) => setT(i, p)} pen={i === 0 ? <EditPen content={content} k="ocrNote" label="إرشاد تصوير الجواز" /> : null} />
            {i > 0 && <label className="block font-bold"><L ar="صلة القرابة" de="Verwandtschaft" /><input list="bk-rel" autoComplete="off" value={t.relation} onChange={(e) => setT(i, { relation: e.target.value })} maxLength={60} className={inputCls} /></label>}
            <div className="grid grid-cols-2 gap-2">
              <label className="block font-bold"><L ar="الاسم الأول (لاتيني)" de="Vorname (Latein)" /><input dir="ltr" autoComplete="off" list="bk-first" value={t.firstName} onChange={(e) => setT(i, { firstName: e.target.value })} maxLength={80} autoCapitalize="characters" className={inputCls + " uppercase"} /></label>
              <label className="block font-bold"><L ar="اسم العائلة (لاتيني)" de="Nachname (Latein)" /><input dir="ltr" autoComplete="off" list="bk-last" value={t.lastName} onChange={(e) => setT(i, { lastName: e.target.value })} maxLength={80} autoCapitalize="characters" className={inputCls + " uppercase"} /></label>
            </div>
            <label className="block font-bold">
              <L ar="الاسم الكامل بالعربية (لطباعة كروت الأمتعة)" de="Vollständiger Name auf Arabisch (für Kofferanhänger)" />
              <input dir="rtl" value={t.arabicName ?? ""} onChange={(e) => setT(i, { arabicName: e.target.value })} maxLength={120} placeholder="مثال: علي حسن محمد (يرجى كتابة الاسم الثلاثي تجنباً لتشابه الأسماء)" className={inputCls} />
              <span className="mt-0.5 block text-[10px] text-muted-foreground"><L ar="(تنبيه: يرجى كتابة الاسم الثلاثي أو الرباعي لتجنب تشابه الأسماء على بطاقات الحقائب)" de="(Hinweis: Bitte vollständigen Namen eintragen, um Verwechslungen bei Kofferanhängern zu vermeiden)" /></span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["m", "f"] as const).map((g) => <button key={g} type="button" onClick={() => setT(i, { gender: g })} className={`rounded-md border py-2 font-bold ${t.gender === g ? "border-secondary bg-accent text-primary" : "border-border"}`}>{g === "m" ? <L ar="ذكر" de="Männlich" /> : <L ar="أنثى" de="Weiblich" />}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block font-bold"><L ar="تاريخ الميلاد" de="Geburtsdatum" /><input dir="ltr" type="date" value={t.birthDate} onChange={(e) => setT(i, { birthDate: e.target.value, ...(e.target.value ? { category: catOf(e.target.value) } : {}) })} className={inputCls} /></label>
              <label className="block font-bold"><L ar="الجنسية" de="Staatsangehörigkeit" /><input list="bk-nat" autoComplete="off" value={t.nationality} onChange={(e) => setT(i, { nationality: e.target.value })} maxLength={60} className={inputCls} /></label>
              <label className="block font-bold"><L ar="رقم الجواز" de="Passnummer" /><input dir="ltr" list="bk-pass" autoComplete="off" value={t.passportNo} onChange={(e) => setT(i, { passportNo: e.target.value.replace(/\s/g, "") })} maxLength={20} className={inputCls + " uppercase"} /></label>
              <label className="block font-bold"><L ar="انتهاء الجواز" de="Pass gültig bis" /><input dir="ltr" type="date" value={t.passportExpiry} onChange={(e) => setT(i, { passportExpiry: e.target.value })} className={inputCls} /></label>
            </div>
            <FileField label={{ ar: "صورة صفحة الجواز", de: "Kopie der Passseite" }} value={t.passportFile} onChange={(f) => setT(i, { passportFile: f })} />
            <FileField label={{ ar: "صورة شخصية بيومترية للفيزا", de: "Biometrisches Passfoto (Visum)" }} value={t.photoFile} onChange={(f) => setT(i, { photoFile: f })} photo />
          </article>)}
          <Sugg id="bk-rel" items={hist.relation} /><Sugg id="bk-first" items={hist.firstName} /><Sugg id="bk-last" items={hist.lastName} /><Sugg id="bk-nat" items={hist.nationality} /><Sugg id="bk-pass" items={hist.passportNo} />
          {travelers.length < 15 && <Button type="button" variant="outline" className="h-11 w-full border-dashed border-secondary" onClick={() => setTravelers((l) => [...l, blank()])}><Plus /><L ar="إضافة مرافق" de="Begleitperson hinzufügen" /></Button>}
        </>}

        {step === 3 && <>
          <div className="rounded-md bg-muted p-3"><p className="font-bold text-primary">{tripName}</p>{tripDate && <p dir="ltr" className="text-xs text-muted-foreground">{tripDate}</p>}<p className="mt-1 text-xs"><Users className="me-1 inline h-3.5 w-3.5" />{travelers.length} — <LangText ar={`بالغ ${travelers.filter((t) => t.category === "adult").length}، طفل ${travelers.filter((t) => t.category === "child").length}، رضيع ${travelers.filter((t) => t.category === "infant").length}`} de={`Erw. ${travelers.filter((t) => t.category === "adult").length}, Kind ${travelers.filter((t) => t.category === "child").length}, Kleinkind ${travelers.filter((t) => t.category === "infant").length}`} /></p></div>
          <div><p className="mb-1 font-bold"><L ar="تفضيل الغرفة" de="Zimmerwunsch" /></p><div className="grid grid-cols-2 gap-1.5">{rooms.map((r) => <button key={r.id} type="button" onClick={() => setRoomPref(r.id)} className={`rounded-md border py-2 text-xs font-bold ${roomPref === r.id ? "border-secondary bg-accent text-primary" : "border-border"}`}><LangText ar={r.ar} de={r.de} center /></button>)}</div><p className="mt-1 text-[11px] text-muted-foreground"><L ar="(يختلف السعر الإضافي بحسب نوع الغرفة المختارة، مثل الغرفة المنفردة أو غرفة كاملة خاصة، وبالتنسيق مع إدارة الحملة)" de="(Der Aufpreis richtet sich nach der gewählten Zimmerart, z. B. Einzel- oder eigenes Zimmer – in Absprache mit der Reiseleitung)" /></p></div>
          <label className="block font-bold"><L ar="ملاحظات (حالة صحية، كرسي متحرك، طعام…)" de="Hinweise (Gesundheit, Rollstuhl, Essen …)" /><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1500} className={inputCls} /></label>
          <ExtraFields content={content} step={3} values={extras} onChange={setExtras} />
          <label className="flex items-start gap-2 rounded-md border border-border p-3"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-secondary" /><span className="text-xs leading-relaxed"><L ar="أؤكد أن جميع البيانات مطابقة للجوازات، وأوافق على استخدامها لحجز الطيران والفندق وطلب التأشيرة فقط." de="Ich bestätige, dass alle Angaben den Reisepässen entsprechen, und stimme der Nutzung nur für Flug, Hotel und Visum zu." /></span></label>
        </>}

        {errors.length > 0 && <ul role="alert" className="space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">{errors.map((e, i) => <li key={i}>• {bi(e)}</li>)}</ul>}
        <div className="flex gap-2">
          {step > 0 && <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => { setErrors([]); setStep(step - 1); }}><ChevronRight className="rtl:rotate-0 ltr:rotate-180" /><L ar="السابق" de="Zurück" /></Button>}
          {step < 3 ? <Button type="button" className="h-12 flex-[2]" onClick={next}><L ar="التالي" de="Weiter" /><ChevronLeft className="ltr:rotate-180" /></Button>
            : <Button type="button" disabled={busy} className="h-12 flex-[2] bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={send}>{busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}<L ar="تأكيد وإرسال الطلب" de="Anmeldung absenden" /></Button>}
        </div>
      </div>
    </section>
  </RegCtx.Provider>;
}

const statusLabels: Record<string, string> = { new: "جديد | Neu", confirmed: "مؤكد | Bestätigt", cancelled: "ملغى | Storniert" };
const payLabels: Record<string, string> = { unpaid: "غير مدفوع | Offen", partial: "دفعة جزئية | Teilweise", paid: "مدفوع | Bezahlt" };
const visaLabels: Record<string, string> = { none: "⏳ لم يُقدَّم بعد | Noch nicht eingereicht", processing: "🔄 قيد المعاملة | In Bearbeitung", approved: "✅ صدرت الفيزا | Visum erteilt", rejected: "❌ مرفوضة / تحتاج تعديل | Abgelehnt / Korrektur" };
const visaCls: Record<string, string> = { none: "bg-muted text-muted-foreground", processing: "bg-accent text-accent-foreground", approved: "bg-primary text-primary-foreground", rejected: "bg-destructive text-destructive-foreground" };
function destOf(trip: string) { const s = trip.toLowerCase(); return /عمر|umrah|umra|mekka|mecca|مكة/.test(s) ? "umrah" : /ايران|إيران|iran|مشهد|mashhad|قم|qom/.test(s) ? "iran" : "iraq"; }
function visaType(trip: string) { const d = destOf(trip); return d === "umrah" ? "🕋 العمرة: تأشيرة عبر منصة نسك | Umrah: Visum über Nusuk" : d === "iran" ? "🇮🇷 إيران: تأشيرة إيرانية | Iran: Iranisches Visum" : "🇮🇶 العراق: فيزا إلكترونية | Irak: E-Visum"; }
const paxOf = (t: Record<string, string>) => t["category"] === "infant" ? "INF" : t["category"] === "child" ? "CHD" : "ADT";
const paxMark: Record<string, string> = { ADT: "ADT", CHD: "CHD ⚠ CHILD", INF: "INF ⚠ INFANT (lap)" };
const roomName = (id: string | null) => { const r = rooms.find((x) => x.id === id); return r ? `${r.de} / ${r.ar}` : id ?? ""; };
const roomLabel = (id: string | null, bi: (s: string) => string) => { const r = rooms.find((x) => x.id === (id || "leader")); return r ? bi(`${r.ar} | ${r.de}`) : id ?? ""; };
const tripLabel = (t: string, bi: (s: string) => string) => { const [name = "", ...rest] = t.split(" — "); const n = name.replace(/\s*\|\s*$/, "").trim(); const d = rest.join(" — ").trim(); return `${/ \| \S/.test(n) ? bi(n) : n}${d ? ` — ${d}` : ""}`; };
const norm = (v: string | null | undefined) => (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const groupKey = (r: BookingRow) => `${r.trip}${r.trip_date ? ` — ${r.trip_date}` : ""}`;

type Kind = "flight" | "visa" | "rooms";
type Sheet = { title: string; head: string[]; widths: number[]; info: string[]; body: Array<{ cells: unknown[]; pax: string; band?: boolean }>; tall?: number };
const live = (rows: BookingRow[]) => rows.filter((r) => r.status !== "cancelled" && r.status !== "deleted");
const hotelsFor = (trip: string) => { const d = destOf(trip); return d === "umrah" ? ["مكة / Mekka", "المدينة / Medina"] : d === "iran" ? ["مشهد / Mashhad", "قم / Qom"] : ["الكاظمية / Kadhimiya", "كربلاء / Karbala", "النجف / Najaf"]; };
const groupOf = (r: BookingRow) => r.travelers.length > 1 ? 0 : r.travelers[0]?.["gender"] === "f" ? 2 : 1;
const groupNames = ["👪 عائلات ومجموعات / Familien & Gruppen", "👨 شباب منفردون / Einzelreisende Männer", "🧕 نساء منفردات / Einzelreisende Frauen"];

export const personKey = (t: Record<string, string | undefined>) => {
  const k = [t["lastName"], t["firstName"], t["birthDate"], t["passportNo"]].map((v) => (v ?? "").trim().toUpperCase().replace(/\s+/g, " "));
  return k[0] && k[1] && (k[2] || k[3]) ? k.join("|") : "";
};
const uniqTravelers = (rows: BookingRow[]) => { const seen = new Set<string>(); return rows.map((r) => ({ ...r, travelers: r.travelers.filter((t) => { const k = personKey(t); if (!k) return true; if (seen.has(k)) return false; seen.add(k); return true; }) })).filter((r) => r.travelers.length > 0); };

function sheetOf(kind: Kind, rows: BookingRow[], hotelMap: Record<string, string> = {}): Sheet {
  const lv = uniqTravelers(live(rows));
  const all = lv.flatMap((r) => r.travelers);
  const cnt = (p: string) => all.filter((t) => paxOf(t) === p).length;
  const total = `TOTAL ${all.length} PAX — ADT ${cnt("ADT")} · CHD ${cnt("CHD")} · INF ${cnt("INF")}`;
  let n = 0;
  if (kind === "visa") return { title: "VISA APPLICATION LIST", info: [total], widths: [5, 32, 16, 14, 16, 14, 16, 16],
    head: ["NO", "FULL NAME", "NATIONALITY", "DATE OF BIRTH", "PASSPORT NO", "PASSPORT TYPE", "PASSPORT EXPIRY", "PAX"],
    body: lv.flatMap((r) => r.travelers.map((t) => ({ pax: paxOf(t), cells: [++n, `${t["firstName"] ?? ""} ${t["lastName"] ?? ""}`.trim(), t["nationality"], t["birthDate"], t["passportNo"], "ORDINARY", t["passportExpiry"], paxMark[paxOf(t)]] }))) };
  if (kind === "flight") return { title: "PASSENGER LIST", info: [total], widths: [5, 18, 22, 8, 14, 18, 16, 16, 16, 14],
    head: ["NO", "SURNAME", "GIVEN NAMES", "GENDER", "DATE OF BIRTH", "PAX TYPE", "PASSPORT NO", "NATIONALITY", "PASSPORT EXPIRY", "DEP. AIRPORT"],
    body: lv.flatMap((r) => r.travelers.map((t) => { const p = paxOf(t); return { pax: p, cells: [++n, t["lastName"], t["firstName"], (t["gender"] ?? "").toUpperCase(), t["birthDate"], paxMark[p], t["passportNo"], t["nationality"], t["passportExpiry"], t["airport"]] }; })) };

  const hotels = hotelsFor(lv[0]?.trip ?? "");
  const air = new Map<string, number>();
  all.forEach((t) => air.set(t["airport"] || "?", (air.get(t["airport"] || "?") ?? 0) + 1));
  const body: Sheet["body"] = [];
  [0, 1, 2].forEach((g) => {
    const list = lv.filter((r) => groupOf(r) === g);
    if (!list.length) return;
    body.push({ band: true, pax: "", cells: [`${groupNames[g]} (${list.length})`] });
    list.forEach((r) => {
      const c = { ADT: 0, CHD: 0, INF: 0 } as Record<string, number>;
      r.travelers.forEach((t) => c[paxOf(t)]!++);
      const pax = c["INF"] ? "INF" : c["CHD"] ? "CHD" : "ADT";
      body.push({ pax, cells: [++n, r.travelers.map((t) => `${t["firstName"] ?? ""} ${t["lastName"] ?? ""}${t["relation"] ? ` (${t["relation"]})` : ""}${paxOf(t) !== "ADT" ? ` ⚠${paxOf(t)}` : ""}`).join("\n"), r.travelers.length, `ADT ${c["ADT"]}${c["CHD"] ? ` · CHD ${c["CHD"]}` : ""}${c["INF"] ? ` · INF ${c["INF"]}` : ""}`, r.contact_phone, r.travelers[0]?.["airport"] ?? "", roomName(r.room_pref), r.notes ?? "", ...hotels.map(() => ""), ""] });
    });
  });
  const gc = [0, 1, 2].map((g) => lv.filter((r) => groupOf(r) === g).length);
  return { title: "قائمة الحاج — التجمّع والتسكين / Leiterliste", tall: 42, widths: [5, 30, 7, 16, 16, 12, 22, 28, ...hotels.map(() => 18), 26],
    info: [total, `✈ ${[...air].map(([a, k]) => `${a}: ${k}`).join(" · ")}`, `👪 ${gc[0]} · 👨 ${gc[1]} · 🧕 ${gc[2]}`, ...hotels.filter((h) => hotelMap[h]).map((h) => `🏨 ${h}: ${hotelMap[h]}`)],
    head: ["NO", "الأسماء / Namen", "العدد / Anz.", "الفئة / Pax", "الهاتف / Telefon", "المطار / Flughafen", "الغرفة المطلوبة / Zimmerwunsch", "ملاحظات الزائر / Hinweise", ...hotels.map((h) => `${h}${hotelMap[h] ? `\n🏨 ${hotelMap[h]}` : ""}\nرقم الغرفة / Zimmer-Nr.`), "ملاحظات الحاج / Notizen"],
    body };
}

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
function printHtml(s: Sheet, group: string) {
  const tr = s.body.map((b) => b.band ? `<tr><td colspan="${s.head.length}" style="background:#e8dfc8;font-weight:bold;padding:6px">${esc(b.cells[0])}</td></tr>` : `<tr style="background:${b.pax === "INF" ? "#fde2e2" : b.pax === "CHD" ? "#fff3c4" : "#fff"};${s.tall ? "height:44px" : ""}">${b.cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.title)} – ${esc(group)}</title><style>@page{size:A4 landscape;margin:8mm}body{font-family:Arial;font-size:11px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #777;padding:4px;vertical-align:top}th{background:#1f2a44;color:#fff}button{font-size:16px;padding:10px 18px;margin:8px 0}@media print{button{display:none}}</style></head><body>
<button onclick="window.print()">🖨 طباعة / PDF – Drucken</button>
<h2 style="margin:4px 0">${esc(s.title)} — Reisegruppe Ushaq al-Hussein DE</h2><p style="margin:2px 0"><b>${esc(group)}</b></p>${s.info.map((i) => `<p style="margin:2px 0">${esc(i)}</p>`).join("")}
<table><tr>${s.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>${tr}</table></body></html>`;
}

function sheetXlsx(s: Sheet, group: string): XSheet {
  const rows: XSheet["rows"] = [
    [{ v: `${s.title} — Reisegruppe Ushaq al-Hussein DE`, s: 2 }], [{ v: group, s: 2 }],
    ...s.info.map((i) => [{ v: i }]), [{ v: `${new Date().toISOString().slice(0, 10)}` }],
    s.head.map((h) => ({ v: h, s: 1 })),
    ...s.body.map((b) => b.band ? [{ v: b.cells[0], s: 6 }] : b.cells.map((c) => ({ v: c, s: b.pax === "INF" ? 4 : b.pax === "CHD" ? 3 : 5 }))),
  ];
  return { name: s.title.includes("VISA") ? "Visa" : s.title.includes("PASSENGER") ? "Airline" : "Leader", widths: s.widths, rows, tall: s.tall };
}

function issuesOf(r: BookingRow): string[] {
  if (r.status === "deleted" || r.status === "cancelled") return [];
  const out: string[] = [];
  const ref = r.trip_date && !Number.isNaN(Date.parse(r.trip_date)) ? new Date(r.trip_date) : new Date();
  const limit = new Date(ref); limit.setMonth(limit.getMonth() + 6);
  r.travelers.forEach((t, i) => {
    const who = `${i + 1}. ${t["lastName"] ?? ""} ${t["firstName"] ?? ""}`.trim();
    const v = t["visa"] || "none";
    if (r.status === "confirmed" && v === "none") out.push(`${who}: الحجز مؤكد لكن الفيزا لم تُقدَّم | Bestätigt, aber Visum nicht eingereicht`);
    if (v === "rejected") out.push(`${who}: الفيزا مرفوضة / تحتاج تعديل | Visum abgelehnt`);
    if (r.status === "confirmed" && v === "approved" && r.payment_status === "unpaid") out.push(`${who}: الفيزا صدرت والحجز غير مدفوع | Visum erteilt, aber unbezahlt`);
    if (!t["passportNo"] || !t["birthDate"] || !t["lastName"] || !t["firstName"]) out.push(`${who}: بيانات الجواز ناقصة | Passdaten unvollständig`);
    if (t["passportExpiry"] && new Date(t["passportExpiry"]) < limit) out.push(`${who}: الجواز ينتهي قبل 6 أشهر من السفر | Pass läuft < 6 Monate ab`);
    if (!t["passportFile"] && !(r.admin_notes ?? "").startsWith("[يدوي")) out.push(`${who}: صورة الجواز غير مرفوعة | Passkopie fehlt`);
  });
  return out;
}
const fileSafe = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60);

export function BookingsPanel({ content }: { content: SiteContent }) {
  const s = useStaffSession();
  const { lang } = useLang();
  const bi = biFor(lang);
  const rtl = lang === "ar" || lang === "both";
  const list = useServerFn(listBookings);
  const update = useServerFn(updateBooking);
  const fileUrl = useServerFn(bookingFileUrl);
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(60);
  const [showLists, setShowLists] = useState(false);
  const [push, setPush] = useState("");

  useEffect(() => { if (localStorage.getItem("push-enabled") === "1" && "Notification" in window && Notification.permission === "granted") setPush(bi("✓ التنبيهات مفعّلة على هذا الهاتف | Aktiv")); }, []);
  const load = async () => { if (!s) return; const r = await list({ data: { password: s.password } }); setRows(r.rows); };
  useEffect(() => { void load(); }, [s?.password]);

  const trips = useMemo(() => [...new Set((rows ?? []).filter((r) => r.status !== "deleted").map(groupKey))], [rows]);
  const [trashView, setTrashView] = useState(false);
  const [editing, setEditing] = useState<BookingRow | "new" | null>(null);
  const tripOptions = useMemo(() => {
    const m = new Map<string, { trip: string; date: string }>();
    content.trips.filter((t) => !t.hidden).forEach((t) => m.set(`${t.ar} | ${t.de}`, { trip: `${t.ar} | ${t.de}`, date: t.date ?? "" }));
    (rows ?? []).forEach((r) => { if (!m.has(r.trip)) m.set(r.trip, { trip: r.trip, date: r.trip_date ?? "" }); });
    return [...m.values()];
  }, [rows, content.trips]);

  if (!s) return null;
  const trashed = (rows ?? []).filter((r) => r.status === "deleted");
  const tripFiltered = trashView ? trashed : (rows ?? []).filter((r) => r.status !== "deleted" && (filter === "all" || groupKey(r) === filter));
  const shown = tripFiltered;
  const patch = async (r: BookingRow, p: Partial<BookingRow> & { remove?: boolean }) => {
    try { await update({ data: { password: s.password, id: r.id, ...p } as never }); await load(); } catch (e) { window.alert(String(e)); }
  };
  const problems = shown.filter((r) => issuesOf(r).length > 0).length;
  const fname = (kind: Kind) => `${kind === "visa" ? "Visa" : kind === "flight" ? "Airline" : "Leiterliste"}-${fileSafe(filter)}`;
  const hotelMap = regOf(content).hotels ?? {};

  const xls = (kind: Kind) => {
    const blob = buildXlsx([sheetXlsx(sheetOf(kind, shown, hotelMap), filter)]);
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${fname(kind)}.xlsx`; document.body.appendChild(a); a.click(); a.remove();
  };

  const printList = (kind: Kind) => {
    const cleanTripName = filter.replace(/\s*\|\s*/g, " — ");
    const html = printHtml(sheetOf(kind, shown, hotelMap), cleanTripName);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const ql = norm(q);
  const qw = ql.split(" ").filter(Boolean);
  const listed = qw.length ? shown.filter((r) => qw.every((w) => [r.ref, r.contact_phone.replace(/[^0-9]/g, ""), r.contact_email, ...r.travelers.map((t) => `${t["firstName"] ?? ""} ${t["lastName"] ?? ""} ${t["arabicName"] ?? ""}`)].some((v) => norm(v).includes(w)))) : shown;
  const openRow = (rows ?? []).find((r) => r.id === open) ?? null;
  const pax = shown.reduce((n, r) => n + r.travelers.length, 0);

  return <section className="mb-6 rounded-lg border-2 border-secondary bg-card p-3 shadow-sm">
    <div className="flex items-center gap-2">
      <h2 className="flex-1 text-base font-bold text-primary">{bi(trashView ? "🗑 سلة الحجوزات | Papierkorb " : "📋 الحجوزات | Buchungen ")}<span className="text-xs text-muted-foreground">({shown.length} / {pax} pax)</span></h2>
      <button type="button" aria-label="تحديث | Aktualisieren" title="تحديث القائمة | Aktualisieren" onClick={() => void load()} className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary"><RefreshCw className="h-4 w-4" /></button>
      <button type="button" aria-label="سلة المحذوفات | Papierkorb" title="سلة المحذوفات | Papierkorb" onClick={() => setTrashView(!trashView)} className={`relative grid h-8 w-8 place-items-center rounded-full border border-border ${trashView ? "bg-primary text-primary-foreground" : "text-primary"}`}><Trash2 className="h-4 w-4" />{trashed.length > 0 && <span className="absolute -end-1 -top-1 rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{trashed.length}</span>}</button>
    </div>
    <Button variant="outline" size="sm" className="mt-2 w-full whitespace-normal text-xs" onClick={async () => { setPush("…"); try { const r = await enablePush(); setPush(r === "registered" ? "✓ التنبيهات مفعّلة على هذا الهاتف | Aktiv" : r === "open-in-new-tab" ? "افتح التطبيق مباشرة (خارج المعاينة) ثم فعّل | Bitte App direkt öffnen" : r === "denied" ? "الإذن مرفوض — اسمح بالإشعارات في إعدادات الهاتف | Erlaubnis verweigert" : r === "unsupported" ? "على الآيفون: أضف التطبيق للشاشة الرئيسية أولاً | iPhone: zum Home-Bildschirm hinzufügen" : r); } catch { setPush("✗"); } }}><Bell className="h-3.5 w-3.5" />{bi(push || "تفعيل تنبيهات الحجوزات على هذا الهاتف | Buchungsalarm aktivieren")}</Button>
    
    <select value={filter} onChange={(e) => { setFilter(e.target.value); setLimit(60); setShowLists(false); }} className={inputCls}>
      <option value="all">{bi("اختر الرحلة لعرض حجوزاتها | Reise wählen...")}</option>
      {trips.map((t) => {
        const count = (rows ?? []).filter((r) => r.status !== "deleted" && groupKey(r) === t).length;
        const paxCount = (rows ?? []).filter((r) => r.status !== "deleted" && groupKey(r) === t).reduce((sum, r) => sum + r.travelers.length, 0);
        return <option key={t} value={t}>{tripLabel(t, bi)} ({count} حجز · {paxCount} فرد)</option>;
      })}
    </select>

    {problems > 0 && !trashView && <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs font-bold text-destructive">⚠️ {bi(`يوجد ${problems} حجز بحاجة لمراجعة — افتحه لرؤية التفاصيل | ${problems} Buchung(en) prüfen`)}</p>}
    {!trashView && <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} placeholder={bi("🔍 الاسم أو الهاتف أو رقم الحجز | Name, Telefon, Buchungsnr.")} className={inputCls} />}

    {filter === "all" && !trashView ? (
      <div className="mt-3 rounded-lg border border-dashed border-border bg-accent/20 p-4 text-center text-xs text-muted-foreground">
        {bi("👆 يرجى اختيار الرحلة من القائمة أعلاه لعرض كشف حجوزاتها | Bitte oben eine Reise wählen")}
      </div>
    ) : rows === null ? (
      <Loader2 className="mx-auto mt-3 animate-spin" />
    ) : (
      <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border">
        {listed.slice(0, limit).map((r) => {
          const lead = r.travelers[0] ?? {};
          const extra = r.travelers.length - 1;
          const displayLeadName = lead["arabicName"] ? `${lead["arabicName"]} (${lead["lastName"]} ${lead["firstName"]})` : `${lead["lastName"]} ${lead["firstName"]}`;
          return <li key={r.id}>
            <button type="button" onClick={() => setOpen(r.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-card px-3 py-2.5 text-start active:bg-accent">
              <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-sm font-bold text-primary">{displayLeadName}</span>{issuesOf(r).length > 0 && <span className="shrink-0 text-xs">⚠️</span>}</span>
              <span className="shrink-0 rounded-full bg-secondary/20 px-2 py-0.5 text-[11px] font-bold">{extra > 0 ? `+${extra}` : bi("فرد | allein")}</span>
            </button>
          </li>;
        })}
        {!listed.length && <li className="py-3 text-center text-muted-foreground">{bi(trashView ? "السلة فارغة | Papierkorb leer" : ql ? "لا توجد نتائج مطابقة | Keine Treffer" : "لا توجد حجوزات بعد | Noch keine Buchungen")}</li>}
      </ul>
    )}

    {listed.length > limit && <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => setLimit(limit + 60)}>{bi(`عرض المزيد (${listed.length - limit}) | Mehr anzeigen`)}</Button>}
    {!trashView && <Button size="sm" className="mt-2 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => setEditing("new")}><Plus className="h-4 w-4" />{bi("إضافة حجز يدوي (من الدفتر) | Manuelle Buchung")}</Button>}
    {editing && <ManualBooking key={editing === "new" ? "new" : editing.id} row={editing === "new" ? null : editing} trips={tripOptions} rows={rows ?? []} password={s.password} onDone={async () => { setEditing(null); await load(); }} />}

    {filter !== "all" && !trashView && <div className="mt-2 rounded-md border border-secondary bg-accent/40 p-2 text-xs">
      <button type="button" onClick={() => setShowLists(!showLists)} className="flex w-full items-center justify-between font-bold text-primary"><span>{bi("📑 كشوفات الطباعة وتصدير الإكسل للشركات | Listen & Export")}</span><span>{showLists ? "▲" : "▼"}</span></button>
      {showLists && <div className="mt-2 space-y-1.5">
        <HotelNames content={content} trip={filter} />
        {([["flight", "✈️ قائمة شركة الطيران | Airline-Liste"], ["visa", "🛂 قائمة الفيز | Visum-Liste"], ["rooms", "🧭 قائمة الحاج: التجمّع والتسكين | Leiterliste"]] as const).map(([k, label]) => <div key={k} className="grid grid-cols-[1fr_auto_auto] items-center gap-1.5">
          <span className="font-bold">{bi(label)}</span>
          <Button size="sm" variant="outline" onClick={() => xls(k)}><Download className="h-3.5 w-3.5" />Excel</Button>
          <Button size="sm" variant="outline" onClick={() => printList(k)}>🖨 PDF</Button>
        </div>)}
        <p className="text-muted-foreground">{bi("🟨 طفل CHD · 🟥 رضيع INF — الملغى والمحذوف لا يظهر · الكشوفات دائماً بالأحرف اللاتينية | Kinder gelb, Kleinkinder rot markiert")}</p>
      </div>}
    </div>}

    <Dialog open={!!openRow} onOpenChange={(v) => { if (!v) setOpen(null); }}>
      <DialogContent dir={rtl ? "rtl" : "ltr"} className={`max-h-[90vh] overflow-y-auto ${rtl ? "text-right" : "text-left"}`}>
        {openRow && (() => {
          const r = openRow;
          const lead = r.travelers[0] ?? {};
          return <>
            <DialogHeader>
              <DialogTitle className={`text-primary ${rtl ? "text-right" : "text-left"}`}>
                {lead["arabicName"] ? `${lead["arabicName"]} — ` : ""}{lead["lastName"]} {lead["firstName"]} <span className="text-xs text-muted-foreground">({r.travelers.length} pax)</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span dir="ltr" className="font-mono text-muted-foreground">{r.ref}</span>
              <span className="rounded-full bg-accent px-2 py-0.5 font-medium">{bi(statusLabels[r.status] ?? "")}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{bi(payLabels[r.payment_status] ?? "")} {r.paid_amount}/{r.total_amount}€</span>
              <span className="text-muted-foreground">{tripLabel(groupKey(r), bi)}</span>
            </div>
            {r.contact_phone && <a href={waLink(r.contact_phone)} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"><MessageCircle className="h-4 w-4" />{bi("مراسلة عبر واتساب | WhatsApp")}</a>}
            <div className="space-y-2 text-xs">
              <p dir="ltr" className={rtl ? "text-right" : "text-left"}>{r.contact_email} · <a className="underline" href={waLink(r.contact_phone)} target="_blank" rel="noreferrer">{r.contact_phone}</a></p>
              {r.travelers.map((t, i) => {
                const rel = (t["relation"] ?? "").trim();
                const row = (label: string, v?: string, ltr = true) => v ? <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 border-b border-border/60 py-1 last:border-0"><span className="text-muted-foreground">{bi(label)}</span><span dir={ltr ? "ltr" : undefined} className={`break-words font-medium ${rtl ? "text-right" : "text-left"}`}>{v}</span></div> : null;
                return <div key={i} className="rounded-md bg-muted p-2">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">{bi(i === 0 ? "👤 صاحب الطلب | Antragsteller/in" : `👥 مرافق ${i} | Begleitperson ${i}`)}</span>
                    <b className="text-primary">{t["arabicName"] ? `${t["arabicName"]} · ` : ""}<span dir="ltr">{t["lastName"]} {t["firstName"]}</span></b>
                  </div>
                  {t["arabicName"] && row("الاسم بالعربية | Name (Ar)", t["arabicName"], false)}
                  {row("الفئة | Kategorie", `${paxOf(t)} · ${bi(`${cats.find((c) => c.id === t["category"])?.ar ?? ""} | ${cats.find((c) => c.id === t["category"])?.de ?? ""}`)}`, false)}
                  {row("الجنس | Geschlecht", t["gender"] ? bi(t["gender"] === "f" ? "أنثى | weiblich" : "ذكر | männlich") : "", false)}
                  {row("تاريخ الميلاد | Geburtsdatum", t["birthDate"])}
                  {row("الجنسية | Nationalität", t["nationality"])}
                  {row("رقم الجواز | Passnummer", t["passportNo"])}
                  {row("انتهاء الجواز | Pass gültig bis", t["passportExpiry"])}
                  {row("المطار | Flughafen", t["airport"])}
                  {i > 0 && row("صلة القرابة | Beziehung", rel.includes(" | ") ? bi(rel) : rel, false)}
                  <span className="mt-1 flex gap-2">{(["passportFile", "photoFile"] as const).map((k) => t[k] && <button key={k} type="button" className="inline-flex items-center gap-1 underline" onClick={async () => { const w = window.open("", "_blank"); const u = await fileUrl({ data: { password: s.password, path: t[k]! } }); if (w) w.location.href = u.url; }}><FileText className="h-3 w-3" />{bi(k === "passportFile" ? "الجواز | Pass" : "الصورة | Foto")}</button>)}</span>
                  <label className="mt-1.5 flex items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 font-bold ${visaCls[t["visa"] || "none"]}`}>🛂</span>
                    <select value={t["visa"] || "none"} onChange={(e) => void patch(r, { travelers: r.travelers.map((x, j) => j === i ? { ...x, visa: e.target.value } : x) })} className={inputCls + " mt-0 flex-1 py-1 text-xs"}>{Object.entries(visaLabels).map(([k, v]) => <option key={k} value={k}>{bi(v)}</option>)}</select>
                  </label>
                </div>;
              })}
              <p className="text-muted-foreground">{bi(visaType(r.trip))}</p>
              {issuesOf(r).length > 0 && <ul className="rounded-md border-2 border-destructive bg-destructive/10 p-2 font-bold text-destructive">{issuesOf(r).map((x, k) => <li key={k}>⚠️ {bi(x)}</li>)}</ul>}
              {r.room_pref && <p>🛏 <b>{bi("الغرفة | Zimmer")}:</b> {roomLabel(r.room_pref, bi)}</p>}
              {r.notes && <p className="whitespace-pre-line">📝 {r.notes}</p>}
              <div className="grid grid-cols-2 gap-1">
                <select value={r.status} onChange={(e) => void patch(r, { status: e.target.value })} className={inputCls + " mt-0 py-1.5 text-xs"}>{Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{bi(v)}</option>)}</select>
                <select value={r.payment_status} onChange={(e) => void patch(r, { payment_status: e.target.value })} className={inputCls + " mt-0 py-1.5 text-xs"}>{Object.entries(payLabels).map(([k, v]) => <option key={k} value={k}>{bi(v)}</option>)}</select>
                <label>{bi("مدفوع | Bezahlt")} € <input type="number" min={0} defaultValue={r.paid_amount} onBlur={(e) => Number(e.target.value) !== r.paid_amount && void patch(r, { paid_amount: Number(e.target.value) })} className={inputCls + " mt-0 py-1.5"} /></label>
                <label>{bi("المجموع | Gesamt")} € <input type="number" min={0} defaultValue={r.total_amount} onBlur={(e) => Number(e.target.value) !== r.total_amount && void patch(r, { total_amount: Number(e.target.value) })} className={inputCls + " mt-0 py-1.5"} /></label>
              </div>
              <p>{bi("المتبقي | Rest: ")}<b>{Math.max(0, r.total_amount - r.paid_amount)}€</b></p>
              <textarea rows={2} defaultValue={r.admin_notes ?? ""} placeholder={bi("ملاحظات الإدارة | Interne Notiz")} onBlur={(e) => e.target.value !== (r.admin_notes ?? "") && void patch(r, { admin_notes: e.target.value })} className={inputCls} />
              {!trashView && <Button size="sm" variant="outline" className="w-full" onClick={() => { setOpen(null); setEditing(r); }}><Pencil className="h-3.5 w-3.5" />{bi("تعديل بيانات الحجز والمسافرين | Buchung bearbeiten")}</Button>}
              {trashView
                ? <div className="flex gap-3"><button type="button" className="font-bold text-primary underline" onClick={() => void patch(r, { status: "new" })}>{bi("↩️ استرجاع | Wiederherstellen")}</button><button type="button" className="text-destructive underline" onClick={() => { if (window.confirm("حذف نهائي بلا رجعة؟ | Endgültig löschen?")) void patch(r, { remove: true }); }}>{bi("حذف نهائي | Endgültig löschen")}</button></div>
                : <button type="button" className="text-destructive underline" onClick={() => { if (window.confirm("نقل الحجز إلى سلة المحذوفات؟ | In den Papierkorb?")) void patch(r, { status: "deleted" }); }}>{bi("🗑 نقل للسلة | In den Papierkorb")}</button>}
            </div>
          </>;
        })()}
      </DialogContent>
    </Dialog>
  </section>;
}

function EditPen({ content, k, label }: { content: SiteContent; k: "title" | "intro" | "note" | "ocrNote"; label: string }) {
  const adminS = useAdminSession();
  const qc = useQueryClient();
  const reg = regOf(content);
  const [open, setOpen] = useState(false);
  const [ar, setAr] = useState(""); const [de, setDe] = useState("");
  const isEditing = useSectionEditMode();
  if (adminS?.role !== "admin" || !isEditing) return null;
  const kA = `${k}Ar` as keyof RegCfg, kD = `${k}De` as keyof RegCfg;
  const save = async (a: string, d: string) => {
    try { await saveOrQueue(adminS.password, { ...content, cms: { ...(content.cms ?? {}), registration: { ...reg, [kA]: a.trim(), [kD]: d.trim() } } as never }, "التسجيل | Anmeldung", qc); setOpen(false); }
    catch (e) { window.alert(`تعذّر الحفظ | Fehler\n${e instanceof Error ? e.message : e}`); }
  };
  if (!open) return <button type="button" aria-label={`تعديل ${label}`} title={`تعديل ${label}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAr(String(reg[kA] ?? "")); setDe(String(reg[kD] ?? "")); setOpen(true); }} className="ms-1 inline-grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary align-middle text-secondary-foreground shadow-sm"><Pencil className="h-3 w-3" /></button>;
  return <div className="my-2 space-y-1.5 rounded-md border-2 border-secondary bg-card p-2 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
    <p className="font-bold text-primary">✏️ {label}</p>
    <textarea dir="rtl" rows={2} value={ar} onChange={(e) => setAr(e.target.value)} placeholder="عربي" className={inputCls} />
    <textarea dir="ltr" rows={2} value={de} onChange={(e) => setDe(e.target.value)} placeholder="Deutsch" className={inputCls} />
    <div className="flex gap-1.5"><Button size="sm" className="flex-1" onClick={() => void save(ar, de)}>حفظ | Speichern</Button><Button size="sm" variant="outline" onClick={() => void save("", "")}>افتراضي</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>✕</Button></div>
  </div>;
}

function RegSettings({ content }: { content: SiteContent }) {
  const adminS = useAdminSession();
  const isEditing = useSectionEditMode();
  const qc = useQueryClient();
  const { lang } = useLang();
  const bi = biFor(lang);
  const reg = regOf(content);
  if (adminS?.role !== "admin") return null;
  const saveReg = async (patch: RegCfg) => {
    try { await saveOrQueue(adminS.password, { ...content, cms: { ...(content.cms ?? {}), registration: { ...reg, ...patch } } as never }, "التسجيل | Anmeldung", qc); }
    catch (e) { window.alert(`تعذّر الحفظ | Fehler\n${e instanceof Error ? e.message : e}`); }
  };
  return <div className="mb-3 rounded-md border-2 border-secondary bg-card p-2 text-xs">
    <Button size="sm" variant={reg.closed ? "default" : "outline"} className="w-full" onClick={() => void saveReg({ closed: !reg.closed })}>
      {bi(reg.closed ? "🔓 فتح التسجيل للزوار | Anmeldung öffnen" : "🔒 قفل التسجيل مؤقتاً | Anmeldung schließen")}
    </Button>
    {isEditing && (
      <div className="mt-2 space-y-2 border-t border-border pt-2">
        <div className="grid grid-cols-2 gap-1.5">
          <Button size="sm" variant={reg.ocrOff ? "outline" : "default"} onClick={() => void saveReg({ ocrOff: !reg.ocrOff })}>
            {bi(reg.ocrOff ? "📷 تفعيل المسح | Scan an" : "📷 إيقاف المسح | Scan aus")}
          </Button>
          {!reg.ocrOff && (
            <Button size="sm" variant={reg.ocrPublic ? "default" : "outline"} onClick={() => void saveReg({ ocrPublic: !reg.ocrPublic })}>
              {bi(reg.ocrPublic ? "👥 متاح للجميع" : "🔐 للإدارة فقط")}
            </Button>
          )}
        </div>
      </div>
    )}
  </div>;
}

type MT = Record<string, string>;
const blankMT = (airport = ""): MT => ({ firstName: "", lastName: "", arabicName: "", gender: "", birthDate: "", nationality: "", passportNo: "", passportExpiry: "", airport, relation: "", category: "adult", visa: "none" });

function ManualBooking({ row, trips, rows, password, onDone }: { row: BookingRow | null; trips: Array<{ trip: string; date: string }>; rows: BookingRow[]; password: string; onDone: () => Promise<void> }) {
  const { lang } = useLang();
  const bi = biFor(lang);
  const add = useServerFn(addManualBooking);
  const update = useServerFn(updateBooking);
  const [trip, setTrip] = useState(row?.trip ?? trips[0]?.trip ?? "");
  const [tripDate, setTripDate] = useState(row?.trip_date ?? trips[0]?.date ?? "");
  const [phone, setPhone] = useState(row?.contact_phone ?? "");
  const [email, setEmail] = useState(row?.contact_email ?? "");
  const [room, setRoom] = useState(row?.room_pref ?? "leader");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [status, setStatus] = useState<"new" | "confirmed">(row ? (row.status === "confirmed" ? "confirmed" : "new") : "confirmed");
  const [pay, setPay] = useState<"unpaid" | "partial" | "paid">((row?.payment_status as "unpaid") ?? "unpaid");
  const [paid, setPaid] = useState(row?.paid_amount ?? 0);
  const [total, setTotal] = useState(row?.total_amount ?? 0);
  const [tr, setTr] = useState<MT[]>(row ? row.travelers.map((t) => ({ ...blankMT(), ...t })) : [blankMT()]);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);

  const setT = (i: number, k: string, v: string) => setTr((a) => a.map((t, j) => j !== i ? t : { ...t, [k]: v, ...(k === "birthDate" && v ? { category: catOf(v) } : {}) }));

  const save = async () => {
    const e: string[] = [];
    if (!trip.trim()) e.push("اختر الرحلة | Reise wählen");
    tr.forEach((t, i) => {
      if (!/^[A-Za-z][A-Za-z '\-]*$/.test(t["firstName"]!.trim()) || !/^[A-Za-z][A-Za-z '\-]*$/.test(t["lastName"]!.trim())) e.push(`#${i + 1}: الاسم واللقب بأحرف لاتينية كما في الجواز | Name lateinisch wie im Pass`);
      if (!t["gender"]) e.push(`#${i + 1}: الجنس | Geschlecht`);
      if (t["passportNo"] && !/^[A-Za-z0-9]{5,20}$/.test(t["passportNo"].trim())) e.push(`#${i + 1}: رقم الجواز غير صحيح | Passnummer ungültig`);
      const k = personKey(t);
      if (k && tr.some((o, j) => j < i && personKey(o) === k)) e.push(`#${i + 1}: هذا المسافر مكرر بنفس البيانات | Doppelte Person`);
      const dup = k && rows.find((b) => b.id !== row?.id && b.status !== "deleted" && b.status !== "cancelled" && b.trip === trip.trim() && b.travelers.some((o) => personKey(o) === k));
      if (dup) e.push(`#${i + 1}: مسجّل مسبقاً بنفس البيانات في الحجز ${dup.ref} | Bereits gebucht (${dup.ref})`);
    });
    setErrs(e); if (e.length) return;
    const travelers = tr.map((t) => Object.fromEntries(Object.entries({ ...t, firstName: t["firstName"]!.trim().toUpperCase(), lastName: t["lastName"]!.trim().toUpperCase(), passportNo: (t["passportNo"] ?? "").trim().toUpperCase() }).filter(([, v]) => typeof v === "string")) as MT);
    setBusy(true);
    try {
      const common = { trip: trip.trim(), trip_date: tripDate.trim(), contact_phone: phone.trim(), contact_email: email.trim(), room_pref: room, notes, travelers };
      if (row) await update({ data: { password, id: row.id, ...common, ...(row.status === "new" || row.status === "confirmed" ? { status } : {}), payment_status: pay, paid_amount: paid, total_amount: total } });
      else { const r = await add({ data: { password, ...common, status, payment_status: pay, paid_amount: paid, total_amount: total, admin_notes: "" } }); if (!r.ok) throw new Error("no access"); window.alert(bi(`✓ تم حفظ الحجز ${r.ref} | Gespeichert ${r.ref}`)); }
      await onDone();
    } catch (x) { window.alert(`تعذّر الحفظ | Fehler\n${x instanceof Error ? x.message : x}`); } finally { setBusy(false); }
  };

  const lbl = "block text-[11px] font-bold text-muted-foreground";
  const rtl = lang === "ar" || lang === "both";
  const tripList = trip && !trips.some((t) => t.trip === trip) ? [{ trip, date: tripDate }, ...trips] : trips;

  return <div dir={rtl ? "rtl" : "ltr"} className={`mt-2 space-y-2 rounded-md border-2 border-secondary bg-card p-2 text-xs ${rtl ? "text-right" : "text-left"}`}>
    <p className="text-sm font-bold text-primary">{bi(row ? `✏️ تعديل الحجز ${row.ref} | Buchung bearbeiten` : "➕ حجز يدوي من الدفتر | Manuelle Buchung")}</p>
    <p className="text-muted-foreground">{bi("الصور غير إلزامية ولا يُرسل أي إيميل. الحجز يدخل كل القوائم تلقائياً. | Fotos optional, keine E-Mail. Erscheint automatisch in allen Listen.")}</p>
    <label className={lbl}>{bi("الرحلة | Reise")}<select value={trip} onChange={(e) => { setTrip(e.target.value); const m = trips.find((t) => t.trip === e.target.value); if (m) setTripDate(m.date); }} className={inputCls}><option value="">—</option>{tripList.map((t) => <option key={t.trip} value={t.trip}>{t.trip.includes(" | ") ? bi(t.trip) : t.trip}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-1.5">
      <label className={lbl}>{bi("التاريخ | Datum")}<input value={tripDate} onChange={(e) => setTripDate(e.target.value)} className={inputCls} /></label>
      <label className={lbl}>{bi("الهاتف / واتساب | Telefon")}<input dir="ltr" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></label>
    </div>
    <label className={lbl}>{bi("الإيميل (اختياري) | E-Mail (optional)")}<input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></label>
    {tr.map((t, i) => <div key={i} className="space-y-1.5 rounded-md border border-border bg-muted/50 p-2">
      <div className="flex items-center justify-between"><b className="text-primary">{bi(i === 0 ? "👤 صاحب الحجز | Hauptperson" : `👥 مرافق ${i} | Begleitung ${i}`)} · {paxOf(t)}</b>{tr.length > 1 && <button type="button" className="text-destructive" onClick={() => { if (window.confirm("حذف هذا المسافر؟ | Entfernen?")) setTr(tr.filter((_, j) => j !== i)); }}><Trash2 className="h-4 w-4" /></button>}</div>
      <div className="grid grid-cols-2 gap-1.5">
        <label className={lbl}>{bi("الاسم الأول (لاتيني) | Vorname")}<input dir="ltr" value={t["firstName"]} onChange={(e) => setT(i, "firstName", e.target.value)} className={inputCls} /></label>
        <label className={lbl}>{bi("اللقب (لاتيني) | Nachname")}<input dir="ltr" value={t["lastName"]} onChange={(e) => setT(i, "lastName", e.target.value)} className={inputCls} /></label>
      </div>
      <label className={lbl}>{bi("الاسم بالعربية (لطباعة الحقائب) | Name auf Arabisch")}<input dir="rtl" value={t["arabicName"] ?? ""} onChange={(e) => setT(i, "arabicName", e.target.value)} placeholder="الاسم الثلاثي بالعربية" className={inputCls} /></label>
      <div className="grid grid-cols-2 gap-1.5">
        <label className={lbl}>{bi("الجنس | Geschlecht")}<select value={t["gender"]} onChange={(e) => setT(i, "gender", e.target.value)} className={inputCls}><option value="">—</option><option value="m">{bi("ذكر | männlich")}</option><option value="f">{bi("أنثى | weiblich")}</option></select></label>
        <label className={lbl}>{bi("تاريخ الميلاد | Geburtsdatum")}<input type="date" value={t["birthDate"]} onChange={(e) => setT(i, "birthDate", e.target.value)} className={inputCls} /></label>
        <label className={lbl}>{bi("الجنسية | Nationalität")}<input value={t["nationality"]} onChange={(e) => setT(i, "nationality", e.target.value)} className={inputCls} /></label>
        <label className={lbl}>{bi("رقم الجواز | Passnummer")}<input dir="ltr" value={t["passportNo"]} onChange={(e) => setT(i, "passportNo", e.target.value)} className={inputCls} /></label>
        <label className={lbl}>{bi("انتهاء الجواز | Pass gültig bis")}<input type="date" value={t["passportExpiry"]} onChange={(e) => setT(i, "passportExpiry", e.target.value)} className={inputCls} /></label>
        <label className={lbl}>{bi("المطار | Flughafen")}<input value={t["airport"]} onChange={(e) => setT(i, "airport", e.target.value)} className={inputCls} /></label>
        {!t["birthDate"] && <label className={lbl}>{bi("الفئة | Kategorie")}<select value={t["category"]} onChange={(e) => setT(i, "category", e.target.value)} className={inputCls}>{cats.map((c) => <option key={c.id} value={c.id}>{bi(`${c.ar} | ${c.de}`)}</option>)}</select></label>}
        {i > 0 && <label className={lbl}>{bi("صلة القرابة | Beziehung")}<input value={t["relation"]} onChange={(e) => setT(i, "relation", e.target.value)} className={inputCls} /></label>}
      </div>
    </div>)}
    <Button size="sm" variant="outline" className="w-full" onClick={() => setTr([...tr, blankMT(tr[0]?.["airport"] ?? "")])}><Plus className="h-3.5 w-3.5" />{bi("إضافة مرافق | Begleitperson hinzufügen")}</Button>
    <label className={lbl}>{bi("الغرفة المطلوبة | Zimmerwunsch")}<select value={room} onChange={(e) => setRoom(e.target.value)} className={inputCls}>{rooms.map((r) => <option key={r.id} value={r.id}>{bi(`${r.ar} | ${r.de}`)}</option>)}</select></label>
    <label className={lbl}>{bi("ملاحظات الزائر | Hinweise")}<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></label>
    <div className="grid grid-cols-2 gap-1.5">
      <select value={status} onChange={(e) => setStatus(e.target.value as "new")} className={inputCls}><option value="new">{bi(statusLabels["new"]!)}</option><option value="confirmed">{bi(statusLabels["confirmed"]!)}</option></select>
      <select value={pay} onChange={(e) => setPay(e.target.value as "unpaid")} className={inputCls}>{Object.entries(payLabels).map(([k, v]) => <option key={k} value={k}>{bi(v)}</option>)}</select>
      <label className={lbl}>{bi("مدفوع | Bezahlt")} €<input type="number" min={0} value={paid} onChange={(e) => setPaid(Number(e.target.value) || 0)} className={inputCls} /></label>
      <label className={lbl}>{bi("المجموع | Gesamt")} €<input type="number" min={0} value={total} onChange={(e) => setTotal(Number(e.target.value) || 0)} className={inputCls} /></label>
    </div>
    {errs.length > 0 && <ul className="rounded-md bg-destructive/10 p-2 font-bold text-destructive">{errs.map((x, k) => <li key={k}>⚠️ {bi(x)}</li>)}</ul>}
    <div className="flex gap-1.5"><Button className="flex-1" disabled={busy} onClick={() => void save()}>{busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{bi("حفظ | Speichern")}</Button><Button variant="ghost" onClick={() => void onDone()}>✕</Button></div>
  </div>;
}

function HotelNames({ content, trip }: { content: SiteContent; trip: string }) {
  const adminS = useAdminSession();
  const isEditing = useSectionEditMode();
  const qc = useQueryClient();
  const hotels = hotelsFor(trip);
  const reg = regOf(content);
  const map = reg.hotels ?? {};
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(map);
  if (adminS?.role !== "admin" || !isEditing) return null;
  const save = async () => {
    try { await saveOrQueue(adminS.password, { ...content, cms: { ...(content.cms ?? {}), registration: { ...reg, hotels: cur } } as never }, "الفنادق | Hotels", qc); setOpen(false); }
    catch (e) { window.alert(`تعذّر الحفظ | Fehler\n${e instanceof Error ? e.message : e}`); }
  };
  if (!open) return <button type="button" onClick={() => { setCur(map); setOpen(true); }} className="block text-xs font-bold text-primary underline">🏨 تعديل أسماء الفنادق لهذه الرحلة</button>;
  return <div className="space-y-1.5 rounded-md border border-border bg-card p-2 text-xs">
    <p className="font-bold text-primary">🏨 أسماء الفنادق (تظهر في قائمة التسكين)</p>
    {hotels.map((h) => <label key={h} className="block"><span className="text-muted-foreground">{h}</span><input value={cur[h] ?? ""} onChange={(e) => setCur({ ...cur, [h]: e.target.value })} placeholder="مثال: فندق الهدى 4★" className={inputCls} /></label>)}
    <div className="flex gap-1.5"><Button size="sm" onClick={() => void save()}>حفظ</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>✕</Button></div>
  </div>;
}

export function RoomCalcPanel() {
  const s = useStaffSession();
  const { lang } = useLang();
  const bi = biFor(lang);
  const list = useServerFn(listBookings);
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [trip, setTrip] = useState("all");
  const [room, setRoom] = useState("all");
  const [q, setQ] = useState("");
  const load = async () => { if (!s) return; const r = await list({ data: { password: s.password } }); setRows(r.rows); };
  useEffect(() => { void load(); }, [s?.password]);

  const active = useMemo(() => (rows ?? []).filter((r) => r.status !== "deleted" && r.status !== "cancelled"), [rows]);
  const trips = useMemo(() => [...new Set(active.map(groupKey))], [active]);
  if (!s) return null;

  const byTrip = trip === "all" ? active : active.filter((r) => groupKey(r) === trip);
  const words = norm(q).split(" ").filter(Boolean);
  const hit = (r: BookingRow) => words.every((w) => [r.ref, r.contact_phone.replace(/[^0-9]/g, ""), ...r.travelers.map((t) => `${t["firstName"] ?? ""} ${t["lastName"] ?? ""} ${t["arabicName"] ?? ""}`)].some((v) => norm(v).includes(w)));
  const shown = byTrip.filter((r) => (room === "all" || (r.room_pref || "leader") === room) && hit(r));
  const hiddenByRoom = words.length > 0 && room !== "all" ? byTrip.filter((r) => (r.room_pref || "leader") !== room && hit(r)).length : 0;
  const pax = byTrip.reduce((n, r) => n + r.travelers.length, 0);

  return <section className="mb-6 rounded-lg border-2 border-secondary bg-card p-3 shadow-sm">
    <div className="flex items-center gap-2"><h2 className="flex-1 text-base font-bold text-primary">{bi("🛏️ حاسبة وفرز الغرف | Zimmer-Rechner ")}<span className="text-xs text-muted-foreground">({byTrip.length} / {pax} pax)</span></h2>
      <button type="button" aria-label="تحديث | Aktualisieren" onClick={() => void load()} className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary"><RefreshCw className="h-4 w-4" /></button>
    </div>
    <select value={trip} onChange={(e) => setTrip(e.target.value)} className={inputCls}><option value="all">{bi("كل الرحلات | Alle Reisen")}</option>{trips.map((t) => <option key={t} value={t}>{tripLabel(t, bi)}</option>)}</select>
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {rooms.map((rm) => {
        const c = byTrip.filter((r) => (r.room_pref || "leader") === rm.id);
        const on = room === rm.id;
        return <button key={rm.id} type="button" onClick={() => setRoom(on ? "all" : rm.id)} className={`rounded-md border p-2 text-start text-xs ${on ? "border-secondary bg-primary text-primary-foreground" : "border-border bg-card text-primary"}`}>
          <span className="block font-bold">{roomLabel(rm.id, bi)}</span>
          <span className="mt-0.5 block"><b className="text-lg text-secondary">{c.length}</b> {bi("غرفة | Zimmer")} · {c.reduce((n, r) => n + r.travelers.length, 0)} pax</span>
        </button>;
      })}
    </div>
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={bi("🔍 اسم الزائر أو الهاتف أو رقم الحجز للتحقق | Name, Telefon, Nr.")} className={inputCls} />
    {room !== "all" && <button type="button" onClick={() => setRoom("all")} className="mt-1 text-xs font-bold text-primary underline">{bi("✕ إلغاء فلتر الغرفة | Zimmerfilter aufheben")}</button>}
    {hiddenByRoom > 0 && <p className="mt-1 rounded-md bg-accent p-2 text-xs">{bi(`يوجد ${hiddenByRoom} نتيجة بنوع غرفة آخر — ألغِ فلتر الغرفة لرؤيتها | ${hiddenByRoom} Treffer in anderer Zimmerart`)}</p>}
    {rows === null ? (
      <Loader2 className="mx-auto mt-3 animate-spin" />
    ) : words.length === 0 ? (
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {bi("💡 اكتب اسم الزائر في البحث أعلاه للتحقق من نوع غرفته | Namen eingeben zum Prüfen")}
      </p>
    ) : (
      <ul className="mt-2 space-y-1.5">
        {shown.map((r) => (
          <li key={r.id} className="rounded-md border border-border p-2 text-xs">
            <p className="text-start font-bold text-primary">
              {r.travelers.map((t) => t["arabicName"] ? `${t["arabicName"]} (${t["lastName"]} ${t["firstName"]})` : `${t["lastName"] ?? ""} ${t["firstName"] ?? ""}`.trim()).join(" · ")}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-primary px-2 py-0.5 font-bold text-primary-foreground">🛏 {roomLabel(r.room_pref, bi)}</span>
              <span className="text-muted-foreground">{r.travelers.length} pax · {tripLabel(r.trip, bi)}</span>
            </p>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-3 text-center text-xs text-muted-foreground">
            {bi("لا توجد نتائج مطابقة | Keine Treffer")}
          </li>
        )}
      </ul>
    )}
  </section>;
}
