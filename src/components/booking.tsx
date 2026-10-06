import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Baby, Bell, Camera, CheckCircle2, ChevronLeft, ChevronRight, Download, FileText, Loader2, Plane, Plus, RefreshCw, Settings, Trash2, Upload, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LangText, display, useLang } from "@/lib/i18n";
import { useAdminSession, useStaffSession } from "@/lib/admin-session";
import { useQueryClient } from "@tanstack/react-query";
import { saveOrQueue } from "@/lib/offline";
import { enablePush } from "@/lib/push";
import { bookingFileUrl, listBookings, scanPassport, submitBooking, updateBooking, type BookingRow } from "@/lib/bookings.functions";
import type { SiteContent } from "@/lib/site-content";

type Cat = "adult" | "child" | "infant";
type FileData = { name: string; type: string; data: string };
type Traveler = { category: Cat; relation: string; firstName: string; lastName: string; gender: "m" | "f" | ""; birthDate: string; nationality: string; passportNo: string; passportExpiry: string; passportFile?: FileData | undefined; photoFile?: FileData | undefined };
const blank = (category: Cat = "adult", relation = ""): Traveler => ({ category, relation, firstName: "", lastName: "", gender: "", birthDate: "", nationality: "", passportNo: "", passportExpiry: "" });
const OTHER = "__other";
const inputCls = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const cats: Array<{ id: Cat; ar: string; de: string }> = [
  { id: "adult", ar: "بالغ (12 سنة فأكثر)", de: "Erwachsener (ab 12)" },
  { id: "child", ar: "طفل (2 – 11 سنة)", de: "Kind (2–11 Jahre)" },
  { id: "infant", ar: "رضيع (أقل من سنتين)", de: "Kleinkind (unter 2)" },
];
const rooms = [
  { id: "double", ar: "ثنائية", de: "Doppelzimmer" }, { id: "triple", ar: "ثلاثية", de: "Dreibettzimmer" },
  { id: "quad", ar: "رباعية", de: "Vierbettzimmer" }, { id: "family", ar: "عائلية", de: "Familienzimmer" },
];

function age(birth: string) {
  const b = new Date(birth), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
const catOf = (birth: string): Cat => { const a = age(birth); return a < 2 ? "infant" : a < 12 ? "child" : "adult"; };

/** Images are downscaled to keep uploads fast; PDFs pass through unchanged. */
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

function L({ ar, de }: { ar: string; de: string }) { return <LangText ar={ar} de={de} />; }

/** Splits legacy "ar | de" strings and shows them per language mode (both lines in dual mode). */
const biFor = (lang: Parameters<typeof display>[0]) => (t: string) => {
  const k = t.indexOf(" | ");
  if (k < 0) return t;
  const d = display(lang, t.slice(0, k), t.slice(k + 3));
  return d.sub ? `${d.main} | ${d.sub}` : d.main;
};

/** Marks that a file/camera picker is open so the app's back-button handler ignores the return from the camera. */
export const markPicking = () => { (window as unknown as { __picking?: number }).__picking = Date.now(); };
async function checkFile(f: File, photo: boolean) {
  const head = new Uint8Array(await f.slice(0, 12).arrayBuffer());
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
  const isJpg = head[0] === 0xff && head[1] === 0xd8;
  const isPng = head[0] === 0x89 && head[1] === 0x50;
  const isHeic = String.fromCharCode(...head.slice(4, 12)).startsWith("ftyp");
  const isWebp = String.fromCharCode(...head.slice(8, 12)) === "WEBP";
  if (!isPdf && !isJpg && !isPng && !isHeic && !isWebp) throw new Error("هذا الملف ليس صورة أو PDF صالحاً — اختر صورة الجواز أو ملف PDF | Keine gültige Bild- oder PDF-Datei");
  if (f.size < 15000) throw new Error("الملف صغير جداً وغير واضح — أعد التصوير | Datei zu klein / unscharf – bitte neu aufnehmen");
  if (photo && isPdf) throw new Error("الصورة البيومترية يجب أن تكون صورة (JPG/PNG) وليس PDF | Biometrisches Foto bitte als Bild (JPG/PNG)");
  if (!isPdf && (isJpg || isPng || isWebp)) {
    const dim = await new Promise<{ w: number; h: number } | null>((ok) => { const u = URL.createObjectURL(f); const im = new Image(); im.onload = () => { ok({ w: im.naturalWidth, h: im.naturalHeight }); URL.revokeObjectURL(u); }; im.onerror = () => ok(null); im.src = u; });
    if (dim && Math.min(dim.w, dim.h) < 400) throw new Error("دقة الصورة منخفضة جداً — أعد التصوير بوضوح | Auflösung zu niedrig – bitte schärfer aufnehmen");
    if (photo && dim && dim.w > dim.h * 1.15) throw new Error("الصورة البيومترية يجب أن تكون طولية (وجه فقط) — يبدو أنها صورة جواز | Passfoto muss Hochformat sein – das sieht nach der Passseite aus");
  }
}

function FileField({ label, value, onChange, photo = false }: { label: { ar: string; de: string }; value?: FileData | undefined; onChange: (f: FileData | undefined) => void; photo?: boolean }) {
  const { lang } = useLang();
  const [busy, setBusy] = useState(false);
  return <label className={`flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 text-sm ${value ? "border-secondary bg-accent" : "border-input bg-card"}`}>
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-secondary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : value ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}</span>
    <span className="min-w-0 flex-1"><span className="block font-bold"><L {...label} /></span><span className="block truncate text-xs text-muted-foreground">{value ? value.name : photo ? "JPG / PNG — max 10 MB" : "JPG / PNG / PDF — max 10 MB"}</span></span>
    <input type="file" accept={photo ? "image/*" : "image/*,application/pdf,.pdf"} className="hidden" onClick={markPicking} onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setBusy(true); try { await checkFile(f, photo); onChange(await readFile(f)); } catch (err) { window.alert(biFor(lang)(err instanceof Error ? err.message : String(err))); } finally { setBusy(false); } }} />
  </label>;
}

/** Camera/photo passport scan: fills the fields, attaches the page as passport copy; user reviews everything. */
function ScanButton({ reg, onFill }: { reg: RegCfg; onFill: (p: Partial<Traveler>) => void }) {
  const staff = useStaffSession();
  const scan = useServerFn(scanPassport);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; ar: string; de: string } | null>(null);
  if (reg.ocrOff || (!staff && !reg.ocrPublic)) return null;
  const run = async (f: File) => {
    setBusy(true); setMsg(null);
    try {
      if (!f.type.startsWith("image/")) throw new Error("img");
      const file = await readFile(f);
      onFill({ passportFile: file });
      const r = await scan({ data: { image: file.data, type: "image/jpeg" } });
      if (!r.ok) { setMsg({ ok: false, ar: "تعذّرت قراءة الجواز بوضوح — أُرفقت الصورة، أدخل البيانات يدوياً أو أعد التصوير بإضاءة جيدة.", de: "Pass nicht lesbar – Foto angehängt, bitte Daten manuell eintragen oder neu fotografieren." }); return; }
      const v = r.fields; const patch: Partial<Traveler> = {};
      (["firstName", "lastName", "birthDate", "nationality", "passportNo", "passportExpiry"] as const).forEach((k) => { if (v[k]) patch[k] = v[k]; });
      if (v.gender) patch.gender = v.gender;
      if (v.birthDate) patch.category = catOf(v.birthDate);
      onFill(patch);
      setMsg({ ok: true, ar: "تمت التعبئة ✓ — راجع كل حرف مقابل الجواز قبل الإرسال.", de: "Ausgefüllt ✓ – bitte jeden Buchstaben mit dem Pass vergleichen." });
    } catch { setMsg({ ok: false, ar: "يرجى اختيار صورة (JPG/PNG).", de: "Bitte ein Foto (JPG/PNG) wählen." }); }
    finally { setBusy(false); }
  };
  return <div className="space-y-1.5">
    <label className={`flex cursor-pointer items-center gap-3 rounded-md border-2 border-secondary bg-primary p-3 text-primary-foreground ${busy ? "opacity-70" : ""}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}</span>
      <span className="min-w-0 flex-1 text-sm font-bold"><LangText ar="مسح الجواز وتعبئة البيانات تلقائياً" de="Pass scannen & automatisch ausfüllen" inverse /><span className="block text-[11px] font-normal opacity-80"><LangText ar={reg.ocrNoteAr || "صوّر صفحة البيانات كاملة مع السطرين السفليين، بدون فلاش ولمعان."} de={reg.ocrNoteDe || "Ganze Datenseite inkl. der zwei unteren Zeilen, ohne Blitz und Spiegelung."} inverse /></span></span>
      <input type="file" accept="image/*" className="hidden" disabled={busy} onClick={markPicking} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void run(f); }} />
    </label>
    {msg && <p className={`rounded-md p-2 text-xs ${msg.ok ? "bg-accent text-primary" : "bg-destructive/10 text-destructive"}`}><L ar={msg.ar} de={msg.de} /></p>}
  </div>;
}

const AIRPORTS = ["Frankfurt (FRA)", "Berlin (BER)", "Düsseldorf (DUS)", "München (MUC)", "Hamburg (HAM)", "Hannover (HAJ)", "Köln/Bonn (CGN)", "Stuttgart (STR)"];
type RegCfg = { closed?: boolean; noteAr?: string; noteDe?: string; ocrOff?: boolean; ocrPublic?: boolean; titleAr?: string; titleDe?: string; introAr?: string; introDe?: string; ocrNoteAr?: string; ocrNoteDe?: string };
const DRAFT_KEY = "booking-draft";
const PROFILE_KEY = "booking-profile";
const regOf = (c: SiteContent): RegCfg => ((c.cms as { registration?: RegCfg } | undefined)?.registration ?? {});

/** Bilingual multi-step registration form replacing the external form. */
export function BookingForm({ content }: { content: SiteContent }) {
  const submit = useServerFn(submitBooking);
  const { lang } = useLang();
  const bi = biFor(lang);
  const trips = content.trips.filter((t) => t.visible !== false && !t.hidden);
  const reg = regOf(content);
  const [step, setStep] = useState(0);
  const [trip, setTrip] = useState("");
  const [otherTrip, setOtherTrip] = useState("");
  const [otherDate, setOtherDate] = useState("");
  const [airportSel, setAirportSel] = useState("");
  const [otherAirport, setOtherAirport] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [travelers, setTravelers] = useState<Traveler[]>([blank("adult", "صاحب الطلب | Antragsteller")]);
  const [roomPref, setRoomPref] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const rtl = lang === "ar" || lang === "both";
  const [profile, setProfile] = useState<{ email?: string; phone?: string; travelers?: Traveler[] } | null>(null);
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
      if (d && Date.now() - d.at < 6 * 3600e3) { setStep(d.step ?? 0); setTrip(d.trip ?? ""); setOtherTrip(d.otherTrip ?? ""); setOtherDate(d.otherDate ?? ""); setAirportSel(d.airportSel ?? ""); setOtherAirport(d.otherAirport ?? ""); setEmail(d.email ?? ""); setPhone(d.phone ?? ""); if (d.travelers?.length) setTravelers(d.travelers); setRoomPref(d.roomPref ?? ""); setNotes(d.notes ?? ""); }
      setProfile(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null"));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (done) { localStorage.removeItem(DRAFT_KEY); return; }
    const strip = travelers.map(({ passportFile: _a, photoFile: _b, ...t }) => t);
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ at: Date.now(), step, trip, otherTrip, otherDate, airportSel, otherAirport, email, phone, travelers: strip, roomPref, notes })); } catch { /* quota */ }
  }, [done, step, trip, otherTrip, otherDate, airportSel, otherAirport, email, phone, travelers, roomPref, notes]);

  const chosen = trips.find((t) => t.id === trip);
  const tripName = trip === OTHER ? otherTrip.trim() : chosen ? `${chosen.ar} | ${chosen.de}` : "";
  const tripDate = trip === OTHER ? otherDate.trim() : chosen?.date ?? "";
  const airport = airportSel === OTHER ? otherAirport.trim() : airportSel;
  const setT = (i: number, patch: Partial<Traveler>) => setTravelers((l) => l.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const validate = (s: number): string[] => {
    if (s === 0) { const e: string[] = []; if (!tripName) e.push("اختر الرحلة أو اكتب الوجهة | Bitte Reise wählen oder Reiseziel eingeben"); else if (trip === OTHER && !tripDate) e.push("اكتب التاريخ المطلوب | Bitte Wunschdatum angeben"); if (airport.length < 2) e.push("اختر مطار الانطلاق | Bitte Abflughafen wählen"); return e; }
    if (s === 1) { const e: string[] = []; if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.push("البريد الإلكتروني | E-Mail"); if (!/^[+0-9 ()-]{6,30}$/.test(phone.trim())) e.push("رقم الواتساب | WhatsApp-Nummer"); return e; }
    if (s === 2) { const e = travelers.flatMap(travelerErrors); if (!travelers.some((t) => t.category === "adult")) e.push("يجب وجود بالغ واحد على الأقل | Mindestens ein Erwachsener"); return e; }
    if (s === 3) return consent ? [] : ["الرجاء تأكيد صحة البيانات | Bitte Richtigkeit bestätigen"];
    return [];
  };
  const next = () => { const e = validate(step); setErrors(e); if (!e.length) { setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  const send = async () => {
    const all = [0, 1, 2, 3].flatMap(validate);
    setErrors(all);
    if (all.length) return;
    setBusy(true);
    try {
      const r = await submit({ data: { trip: tripName, tripDate, airport, email: email.trim(), phone: phone.trim(), roomPref, notes, consent: true, travelers: travelers.map((t) => ({ ...t, gender: t.gender as "m" | "f", firstName: t.firstName.trim(), lastName: t.lastName.trim(), passportNo: t.passportNo.trim() })) } });
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ email: email.trim(), phone: phone.trim(), travelers: travelers.map(({ passportFile: _a, photoFile: _b, ...t }) => t) })); } catch { /* ignore */ }
      setDone(r.ref);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErrors([`تعذّر الإرسال، حاول مجدداً | Senden fehlgeschlagen: ${e instanceof Error ? e.message.slice(0, 200) : ""}`]);
    } finally { setBusy(false); }
  };

  const settings = <RegSettings content={content} />;
  const note = (reg.noteAr || reg.noteDe) && <div className="mb-3 rounded-md border border-secondary bg-accent p-3 text-sm"><LangText ar={reg.noteAr ?? ""} de={reg.noteDe ?? ""} /></div>;
  if (reg.closed) return <>{settings}{note}<section className="rounded-lg border border-secondary bg-primary px-5 py-8 text-center text-primary-foreground shadow-md"><h2 className="text-lg"><LangText ar="التسجيل مغلق حالياً" de="Anmeldung vorübergehend geschlossen" inverse center /></h2></section></>;

  if (done) return <section className="rounded-lg border border-secondary bg-primary px-5 py-8 text-center text-primary-foreground shadow-md">
    <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
    <h2 className="mt-4 text-xl"><LangText ar="تم استلام طلبكم بنجاح" de="Ihre Anmeldung ist eingegangen" inverse center /></h2>
    <p dir="ltr" className="mx-auto mt-4 w-fit rounded-full border border-secondary px-5 py-2 font-mono text-lg font-bold text-secondary">{done}</p>
    <p className="mt-4 text-sm"><LangText ar="أرسلنا تأكيد الاستلام إلى بريدكم. هذا ليس تأكيداً نهائياً للحجز، وستتواصل معكم إدارة الحملة عبر الواتساب." de="Eine Eingangsbestätigung wurde per E-Mail gesendet. Dies ist keine endgültige Buchung – die Reiseleitung meldet sich per WhatsApp." inverse center /></p>
    <p className="mt-5 text-xs leading-relaxed text-secondary">Reisegruppe Ushaq al-Hussein DE<br />حملة عشاق الحسين - ألمانيا · بإدارة الحاج ياسر الدر</p>
  </section>;

  const steps = [{ ar: "الرحلة", de: "Reise" }, { ar: "التواصل", de: "Kontakt" }, { ar: "المسافرون", de: "Reisende" }, { ar: "التأكيد", de: "Abschluss" }];
  const fillProfile = () => { if (!profile) return; if (profile.email) setEmail(profile.email); if (profile.phone) setPhone(profile.phone); if (profile.travelers?.length) setTravelers(profile.travelers.map((t) => ({ ...blank(), ...t, passportFile: undefined, photoFile: undefined }))); };
  return <>{settings}{note}<section dir={rtl ? "rtl" : "ltr"} className={`overflow-hidden ${rtl ? "text-right" : "text-left"} rounded-lg border border-secondary/60 bg-card shadow-md">
    <div className="bg-primary px-4 py-4 text-primary-foreground">
      <div className="flex items-center gap-2 text-secondary"><Plane className="h-5 w-5" /><span className="text-sm font-bold"><LangText ar={reg.titleAr || "استمارة التسجيل"} de={reg.titleDe || "Anmeldeformular"} inverse /></span></div>
      <ol className="mt-3 grid grid-cols-4 gap-1.5">{steps.map((s, i) => <li key={i} className="text-center"><span className={`block h-1.5 rounded-full ${i <= step ? "bg-secondary" : "bg-primary-foreground/20"}`} /><span className={`mt-1 block text-[10px] ${i === step ? "font-bold text-secondary" : "opacity-70"}`}><LangText ar={s.ar} de={s.de} inverse center /></span></li>)}</ol>
    </div>
    <div className="space-y-4 p-4 text-sm">
      {(reg.introAr || reg.introDe) && <p className="rounded-md bg-muted p-3 text-xs"><LangText ar={reg.introAr ?? ""} de={reg.introDe ?? ""} /></p>}
      {profile && step <= 2 && <button type="button" onClick={fillProfile} className="w-full rounded-md border border-secondary bg-accent p-2.5 text-xs font-bold text-primary"><L ar="↺ تعبئة بياناتي من تسجيلي السابق على هذا الهاتف" de="↺ Meine Daten der letzten Anmeldung auf diesem Handy übernehmen" /></button>}
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
        <label className="block font-bold"><L ar="البريد الإلكتروني (لاستلام التأكيد)" de="E-Mail (für die Bestätigung)" /><input dir="ltr" type="email" autoComplete="email" list="bk-emails" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} className={inputCls} /><datalist id="bk-emails">{profile?.email && <option value={profile.email} />}</datalist></label>
        <label className="block font-bold"><L ar="رقم الواتساب مع رمز الدولة" de="WhatsApp-Nummer mit Ländervorwahl" /><input dir="ltr" type="tel" autoComplete="tel" list="bk-phones" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 …" maxLength={30} className={inputCls} /><datalist id="bk-phones">{profile?.phone && <option value={profile.phone} />}</datalist></label>
        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground"><L ar="للاستفسار: ushaqalhussein.contact@gmail.com" de="Fragen: ushaqalhussein.contact@gmail.com" /></p>
      </>}

      {step === 2 && <>
        <p className="rounded-md bg-muted p-3 text-xs leading-relaxed"><L ar="أدخل كل مسافر بما فيهم الأطفال والرضّع. الأسماء بالأحرف اللاتينية حرفياً كما في الجواز، لأن تذاكر الخطوط التركية (ألمانيا ← إسطنبول ← بغداد) تصدر بالاسم المطابق للجواز." de="Bitte jede reisende Person inkl. Kinder und Kleinkinder eintragen. Namen exakt wie im Reisepass – Turkish-Airlines-Tickets (Deutschland → Istanbul → Bagdad) werden passgenau ausgestellt." /></p>
        {travelers.map((t, i) => <article key={i} className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-secondary">{t.category === "infant" ? <Baby className="h-4 w-4" /> : <User className="h-4 w-4" />}</span>
            <span className="flex-1 font-bold text-primary">{i === 0 ? <L ar="صاحب الطلب" de="Antragsteller/in" /> : <><L ar="مرافق" de="Begleitperson" /> {i}</>}</span>
            {i > 0 && <button type="button" aria-label="حذف | Entfernen" onClick={() => setTravelers((l) => l.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-full border border-border text-destructive"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <div className="grid grid-cols-3 gap-1.5">{cats.map((c) => <button key={c.id} type="button" onClick={() => setT(i, { category: c.id })} className={`rounded-md border px-1 py-2 text-[11px] font-bold ${t.category === c.id ? "border-secondary bg-accent text-primary" : "border-border"}`}><LangText ar={c.ar} de={c.de} center /></button>)}</div>
          <ScanButton reg={reg} onFill={(p) => setT(i, p)} />
          {i > 0 && <label className="block font-bold"><L ar="صلة القرابة" de="Verwandtschaft" /><input value={t.relation} onChange={(e) => setT(i, { relation: e.target.value })} maxLength={60} className={inputCls} /></label>}
          <div className="grid grid-cols-2 gap-2">
            <label className="block font-bold"><L ar="الاسم الأول (لاتيني)" de="Vorname" /><input dir="ltr" autoComplete="given-name" value={t.firstName} onChange={(e) => setT(i, { firstName: e.target.value })} maxLength={80} autoCapitalize="characters" className={inputCls + " uppercase"} /></label>
            <label className="block font-bold"><L ar="اسم العائلة (لاتيني)" de="Nachname" /><input dir="ltr" autoComplete="family-name" value={t.lastName} onChange={(e) => setT(i, { lastName: e.target.value })} maxLength={80} autoCapitalize="characters" className={inputCls + " uppercase"} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["m", "f"] as const).map((g) => <button key={g} type="button" onClick={() => setT(i, { gender: g })} className={`rounded-md border py-2 font-bold ${t.gender === g ? "border-secondary bg-accent text-primary" : "border-border"}`}>{g === "m" ? <L ar="ذكر" de="Männlich" /> : <L ar="أنثى" de="Weiblich" />}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block font-bold"><L ar="تاريخ الميلاد" de="Geburtsdatum" /><input dir="ltr" type="date" value={t.birthDate} onChange={(e) => setT(i, { birthDate: e.target.value, ...(e.target.value ? { category: catOf(e.target.value) } : {}) })} className={inputCls} /></label>
            <label className="block font-bold"><L ar="الجنسية" de="Staatsangehörigkeit" /><input value={t.nationality} onChange={(e) => setT(i, { nationality: e.target.value })} maxLength={60} className={inputCls} /></label>
            <label className="block font-bold"><L ar="رقم الجواز" de="Passnummer" /><input dir="ltr" value={t.passportNo} onChange={(e) => setT(i, { passportNo: e.target.value.replace(/\s/g, "") })} maxLength={20} className={inputCls + " uppercase"} /></label>
            <label className="block font-bold"><L ar="انتهاء الجواز" de="Pass gültig bis" /><input dir="ltr" type="date" value={t.passportExpiry} onChange={(e) => setT(i, { passportExpiry: e.target.value })} className={inputCls} /></label>
          </div>
          <FileField label={{ ar: "صورة صفحة الجواز", de: "Kopie der Passseite" }} value={t.passportFile} onChange={(f) => setT(i, { passportFile: f })} />
          <FileField label={{ ar: "صورة شخصية بيومترية للفيزا", de: "Biometrisches Passfoto (Visum)" }} value={t.photoFile} onChange={(f) => setT(i, { photoFile: f })} photo />
        </article>)}
        {travelers.length < 15 && <Button type="button" variant="outline" className="h-11 w-full border-dashed border-secondary" onClick={() => setTravelers((l) => [...l, blank()])}><Plus /><L ar="إضافة مرافق" de="Begleitperson hinzufügen" /></Button>}
      </>}

      {step === 3 && <>
        <div className="rounded-md bg-muted p-3"><p className="font-bold text-primary">{tripName}</p>{tripDate && <p dir="ltr" className="text-xs text-muted-foreground">{tripDate}</p>}<p className="mt-1 text-xs"><Users className="me-1 inline h-3.5 w-3.5" />{travelers.length} — <L ar={`بالغ ${travelers.filter((t) => t.category === "adult").length}، طفل ${travelers.filter((t) => t.category === "child").length}، رضيع ${travelers.filter((t) => t.category === "infant").length}`} de={`Erw. ${travelers.filter((t) => t.category === "adult").length}, Kind ${travelers.filter((t) => t.category === "child").length}, Kleinkind ${travelers.filter((t) => t.category === "infant").length}`} /></p></div>
        <div><p className="mb-1 font-bold"><L ar="تفضيل الغرفة" de="Zimmerwunsch" /></p><div className="grid grid-cols-2 gap-1.5">{rooms.map((r) => <button key={r.id} type="button" onClick={() => setRoomPref(r.id)} className={`rounded-md border py-2 text-xs font-bold ${roomPref === r.id ? "border-secondary bg-accent text-primary" : "border-border"}`}><LangText ar={r.ar} de={r.de} center /></button>)}</div></div>
        <label className="block font-bold"><L ar="ملاحظات (حالة صحية، كرسي متحرك، طعام…)" de="Hinweise (Gesundheit, Rollstuhl, Essen …)" /><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} className={inputCls} /></label>
        <label className="flex items-start gap-2 rounded-md border border-border p-3"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-secondary" /><span className="text-xs leading-relaxed"><L ar="أؤكد أن جميع البيانات مطابقة للجوازات، وأوافق على استخدامها لحجز الطيران والفندق وطلب التأشيرة فقط." de="Ich bestätige, dass alle Angaben den Reisepässen entsprechen, und stimme der Nutzung nur für Flug, Hotel und Visum zu." /></span></label>
      </>}

      {errors.length > 0 && <ul role="alert" className="space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">{errors.map((e, i) => <li key={i}>• {bi(e)}</li>)}</ul>}
      <div className="flex gap-2">
        {step > 0 && <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => { setErrors([]); setStep(step - 1); }}><ChevronRight className="rtl:rotate-0 ltr:rotate-180" /><L ar="السابق" de="Zurück" /></Button>}
        {step < 3 ? <Button type="button" className="h-12 flex-[2]" onClick={next}><L ar="التالي" de="Weiter" /><ChevronLeft className="ltr:rotate-180" /></Button>
          : <Button type="button" disabled={busy} className="h-12 flex-[2] bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={send}>{busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}<L ar="تأكيد وإرسال الطلب" de="Anmeldung absenden" /></Button>}
      </div>
    </div>
  </section></>;
}

const statusLabels: Record<string, string> = { new: "جديد | Neu", confirmed: "مؤكد | Bestätigt", cancelled: "ملغى | Storniert" };
const payLabels: Record<string, string> = { unpaid: "غير مدفوع | Offen", partial: "دفعة جزئية | Teilweise", paid: "مدفوع | Bezahlt" };

function csv(rows: BookingRow[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["REF", "TRIP", "TRIP_DATE", "STATUS", "PAYMENT", "PAID", "TOTAL", "NO", "TITLE", "LAST_NAME", "FIRST_NAME", "GENDER", "DOB", "PAX_TYPE", "NATIONALITY", "PASSPORT", "PASSPORT_EXPIRY", "DEP_AIRPORT", "RELATION", "EMAIL", "PHONE", "ROOM", "NOTES"];
  const lines = rows.flatMap((r) => r.travelers.map((t, i) => {
    const title = t["category"] === "infant" ? "INF" : t["category"] === "child" ? "CHD" : t["gender"] === "f" ? "MRS" : "MR";
    const pax = t["category"] === "infant" ? "INF" : t["category"] === "child" ? "CHD" : "ADT";
    return [r.ref, r.trip, r.trip_date, r.status, r.payment_status, r.paid_amount, r.total_amount, i + 1, title, t["lastName"], t["firstName"], (t["gender"] ?? "").toUpperCase(), t["birthDate"], pax, t["nationality"], t["passportNo"], t["passportExpiry"], t["airport"], t["relation"], r.contact_email, r.contact_phone, r.room_pref, r.notes].map(esc).join(",");
  }));
  return "\uFEFF" + [head.join(","), ...lines].join("\r\n");
}

/** Staff-only list of incoming registrations with status, payment and flight-list export. */
export function BookingsPanel({ content }: { content: SiteContent }) {
  const s = useStaffSession();
  const adminS = useAdminSession();
  const qc = useQueryClient();
  const { lang } = useLang();
  const bi = biFor(lang);
  const list = useServerFn(listBookings);
  const update = useServerFn(updateBooking);
  const fileUrl = useServerFn(bookingFileUrl);
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [push, setPush] = useState("");
  useEffect(() => { if (localStorage.getItem("push-enabled") === "1" && "Notification" in window && Notification.permission === "granted") setPush(bi("✓ التنبيهات مفعّلة على هذا الهاتف | Aktiv")); }, []);
  const load = async () => { if (!s) return; const r = await list({ data: { password: s.password } }); setRows(r.rows); };
  useEffect(() => { void load(); }, [s?.password]); // eslint-disable-line react-hooks/exhaustive-deps
  const trips = useMemo(() => [...new Set((rows ?? []).map((r) => r.trip))], [rows]);
  if (!s) return null;
  const shown = (rows ?? []).filter((r) => filter === "all" || r.trip === filter);
  const patch = async (r: BookingRow, p: Partial<BookingRow> & { remove?: boolean }) => {
    try { await update({ data: { password: s.password, id: r.id, ...p } as never }); await load(); } catch (e) { window.alert(String(e)); }
  };
  const download = () => { const blob = new Blob([csv(shown)], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `flight-list-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); };
  const pax = shown.reduce((n, r) => n + r.travelers.length, 0);
  return <section className="mb-6 rounded-lg border-2 border-secondary bg-card p-3 shadow-sm">
    <div className="flex items-center gap-2"><h2 className="flex-1 text-base font-bold text-primary">{bi("📋 الحجوزات | Buchungen ")}<span className="text-xs text-muted-foreground">({shown.length} / {pax} pax)</span></h2>
      <button type="button" aria-label="تحديث | Aktualisieren" onClick={() => void load()} className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary"><RefreshCw className="h-4 w-4" /></button>
      <button type="button" aria-label="تصدير | Export" onClick={download} className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary"><Download className="h-4 w-4" /></button>
    </div>
    <Button variant="outline" size="sm" className="mt-2 w-full whitespace-normal text-xs" onClick={async () => { setPush("…"); try { const r = await enablePush(); setPush(r === "registered" ? "✓ التنبيهات مفعّلة على هذا الهاتف | Aktiv" : r === "open-in-new-tab" ? "افتح التطبيق مباشرة (خارج المعاينة) ثم فعّل | Bitte App direkt öffnen" : r === "denied" ? "الإذن مرفوض — اسمح بالإشعارات في إعدادات الهاتف | Erlaubnis verweigert" : r === "unsupported" ? "على الآيفون: أضف التطبيق للشاشة الرئيسية أولاً | iPhone: zum Home-Bildschirm hinzufügen" : r); } catch { setPush("✗"); } }}><Bell className="h-3.5 w-3.5" />{bi(push || "تفعيل تنبيهات الحجوزات على هذا الهاتف | Buchungsalarm aktivieren")}</Button>
    <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls}><option value="all">{bi("كل الرحلات | Alle Reisen")}</option>{trips.map((t) => <option key={t} value={t}>{t}</option>)}</select>
    {rows === null ? <Loader2 className="mx-auto mt-3 animate-spin" /> : <ul className="mt-2 space-y-2">{shown.map((r) => {
      const lead = r.travelers[0] ?? {};
      return <li key={r.id} className="rounded-md border border-border p-2 text-xs">
        <button type="button" className="w-full text-start" onClick={() => setOpen(open === r.id ? null : r.id)}>
          <span dir="ltr" className="font-mono font-bold text-primary">{r.ref}</span> · <span className="font-bold">{lead["lastName"]} {lead["firstName"]}</span> · {r.travelers.length} pax
          <span className="mt-1 flex flex-wrap gap-1"><span className="rounded-full bg-accent px-2">{bi(statusLabels[r.status] ?? "")}</span><span className="rounded-full bg-muted px-2">{bi(payLabels[r.payment_status] ?? "")} {r.paid_amount}/{r.total_amount}€</span><span className="text-muted-foreground">{r.trip} {r.trip_date}</span></span>
        </button>
        {open === r.id && <div className="mt-2 space-y-2 border-t border-border pt-2">
          <p dir="ltr" className="text-start">{r.contact_email} · <a className="underline" href={`https://wa.me/${r.contact_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">{r.contact_phone}</a></p>
          {r.travelers.map((t, i) => <div key={i} className="rounded bg-muted p-2" dir="ltr"><b>{i + 1}. {t["lastName"]}/{t["firstName"]}</b> — {t["category"]?.toUpperCase()} {t["gender"]?.toUpperCase()} — {t["birthDate"]} — {t["nationality"]} — {t["passportNo"]} ({t["passportExpiry"]}) {t["airport"] && `✈ ${t["airport"]}`} {t["relation"] && `— ${t["relation"]}`}
            <span className="mt-1 flex gap-2">{(["passportFile", "photoFile"] as const).map((k) => t[k] && <button key={k} type="button" className="inline-flex items-center gap-1 underline" onClick={async () => { const w = window.open("", "_blank"); const u = await fileUrl({ data: { password: s.password, path: t[k]! } }); if (w) w.location.href = u.url; }}><FileText className="h-3 w-3" />{k === "passportFile" ? "Pass" : "Foto"}</button>)}</span></div>)}
          {(r.room_pref || r.notes) && <p>🛏 {r.room_pref} · {r.notes}</p>}
          <div className="grid grid-cols-2 gap-1">
            <select value={r.status} onChange={(e) => void patch(r, { status: e.target.value })} className={inputCls + " mt-0 py-1.5 text-xs"}>{Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{bi(v)}</option>)}</select>
            <select value={r.payment_status} onChange={(e) => void patch(r, { payment_status: e.target.value })} className={inputCls + " mt-0 py-1.5 text-xs"}>{Object.entries(payLabels).map(([k, v]) => <option key={k} value={k}>{bi(v)}</option>)}</select>
            <label>{bi("مدفوع | Bezahlt")} € <input type="number" min={0} defaultValue={r.paid_amount} onBlur={(e) => Number(e.target.value) !== r.paid_amount && void patch(r, { paid_amount: Number(e.target.value) })} className={inputCls + " mt-0 py-1.5"} /></label>
            <label>{bi("المجموع | Gesamt")} € <input type="number" min={0} defaultValue={r.total_amount} onBlur={(e) => Number(e.target.value) !== r.total_amount && void patch(r, { total_amount: Number(e.target.value) })} className={inputCls + " mt-0 py-1.5"} /></label>
          </div>
          <p>{bi("المتبقي | Rest: ")}<b>{Math.max(0, r.total_amount - r.paid_amount)}€</b></p>
          <textarea rows={2} defaultValue={r.admin_notes ?? ""} placeholder={bi("ملاحظات الإدارة | Interne Notiz")} onBlur={(e) => e.target.value !== (r.admin_notes ?? "") && void patch(r, { admin_notes: e.target.value })} className={inputCls} />
          <button type="button" className="text-destructive underline" onClick={() => { if (window.confirm("حذف الحجز نهائياً؟ | Endgültig löschen?")) void patch(r, { remove: true }); }}>{bi("حذف | Löschen")}</button>
        </div>}
      </li>;
    })}{!shown.length && <li className="py-3 text-center text-muted-foreground">{bi("لا توجد حجوزات بعد | Noch keine Buchungen")}</li>}</ul>}
  </section>;
}

function OcrNote({ reg, save, bi }: { reg: RegCfg; save: (p: RegCfg) => Promise<void>; bi: (t: string) => string }) {
  const [ar, setAr] = useState(reg.ocrNoteAr ?? "");
  const [de, setDe] = useState(reg.ocrNoteDe ?? "");
  return <div className="space-y-1 rounded-md bg-muted p-2">
    <p className="font-bold">{bi("إرشاد تصوير الجواز | Hinweis zum Pass-Foto")}</p>
    <textarea rows={2} dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} placeholder="عربي" className={inputCls} />
    <textarea rows={2} dir="ltr" value={de} onChange={(e) => setDe(e.target.value)} placeholder="Deutsch" className={inputCls} />
    <div className="flex gap-2"><Button size="sm" className="flex-1" onClick={() => void save({ ocrNoteAr: ar.trim(), ocrNoteDe: de.trim() })}>{bi("حفظ | Speichern")}</Button>
    <Button size="sm" variant="outline" onClick={() => { setAr(""); setDe(""); void save({ ocrNoteAr: "", ocrNoteDe: "" }); }}>{bi("افتراضي | Standard")}</Button></div>
  </div>;
}

/** Admin controls placed directly above the registration form. */
function RegSettings({ content }: { content: SiteContent }) {
  const adminS = useAdminSession();
  const qc = useQueryClient();
  const { lang } = useLang();
  const bi = biFor(lang);
  const reg = regOf(content);
  const [open, setOpen] = useState(false);
  const [t, setT] = useState({ noteAr: reg.noteAr ?? "", noteDe: reg.noteDe ?? "", titleAr: reg.titleAr ?? "", titleDe: reg.titleDe ?? "", introAr: reg.introAr ?? "", introDe: reg.introDe ?? "" });
  if (adminS?.role !== "admin") return null;
  const saveReg = async (patch: RegCfg) => {
    try { await saveOrQueue(adminS.password, { ...content, cms: { ...(content.cms ?? {}), registration: { ...reg, ...patch } } as never }, "التسجيل | Anmeldung", qc); }
    catch (e) { window.alert(`تعذّر الحفظ | Fehler\n${e instanceof Error ? e.message : e}`); }
  };
  const txt = (k: keyof typeof t, label: string, ltr = false) => <label className="block">{bi(label)}<textarea dir={ltr ? "ltr" : "rtl"} rows={2} value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })} maxLength={1000} className={inputCls} /></label>;
  return <div className="mb-3 rounded-md border-2 border-secondary bg-card p-2 text-xs">
    <div className="grid grid-cols-2 gap-1.5">
      <Button size="sm" variant={reg.closed ? "default" : "outline"} onClick={() => void saveReg({ closed: !reg.closed })}>{bi(reg.closed ? "🔓 فتح التسجيل | Anmeldung öffnen" : "🔒 قفل التسجيل | Anmeldung schließen")}</Button>
      <Button size="sm" variant={reg.ocrOff ? "outline" : "default"} onClick={() => void saveReg({ ocrOff: !reg.ocrOff })}>{bi(reg.ocrOff ? "📷 تفعيل المسح | Scan an" : "📷 إيقاف المسح | Scan aus")}</Button>
    </div>
    {!reg.ocrOff && <Button size="sm" variant={reg.ocrPublic ? "default" : "outline"} className="mt-1.5 w-full whitespace-normal" onClick={() => void saveReg({ ocrPublic: !reg.ocrPublic })}>{bi(reg.ocrPublic ? "👥 المسح متاح للزوار — اضغط لحصره بالإدارة والحاج | Scan für alle – nur Leitung" : "🔐 المسح للإدارة والحاج فقط — اضغط لإتاحته للزوار | Scan nur Leitung – für alle öffnen")}</Button>}
    <button type="button" className="mt-2 flex w-full items-center gap-2 font-bold text-primary" onClick={() => setOpen(!open)}><Settings className="h-4 w-4" />{bi("تعديل نصوص الاستمارة | Formulartexte bearbeiten")}</button>
    {open && <div className="mt-2 space-y-2">
      {txt("titleAr", "عنوان الاستمارة (عربي) | Titel (Arabisch)")}{txt("titleDe", "عنوان الاستمارة (ألماني) | Titel (Deutsch)", true)}
      {txt("introAr", "نص تعريفي داخل الاستمارة (عربي) | Einleitung (Arabisch)")}{txt("introDe", "نص تعريفي (ألماني) | Einleitung (Deutsch)", true)}
      {txt("noteAr", "ملاحظة أعلى الاستمارة (عربي) | Hinweis (Arabisch)")}{txt("noteDe", "ملاحظة أعلى الاستمارة (ألماني) | Hinweis (Deutsch)", true)}
      <Button size="sm" className="w-full" onClick={() => void saveReg(Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.trim()])) as RegCfg)}>{bi("حفظ النصوص | Texte speichern")}</Button>
      <OcrNote reg={reg} save={saveReg} bi={bi} />
    </div>}
  </div>;
}
