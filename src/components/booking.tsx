import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Baby, Bell, Camera, CheckCircle2, ChevronLeft, ChevronRight, Download, FileText, Loader2, MessageCircle, Plane, Pencil, Plus, RefreshCw, Trash2, Upload, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LangText, display, useLang } from "@/lib/i18n";
import { useSectionEditMode } from "@/components/inline-admin";
import { useAdminSession, useStaffSession } from "@/lib/admin-session";
import { useQueryClient } from "@tanstack/react-query";
import { saveOrQueue } from "@/lib/offline";
import { enablePush } from "@/lib/push";
import { addManualBooking, bookingFileUrl, listBookings, scanPassport, submitBooking, updateBooking, type BookingRow } from "@/lib/bookings.functions";
import { buildXlsx, type XSheet } from "@/lib/xlsx";
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
  { id: "single", ar: "منفردة (غرفة خاصة)", de: "Einzelzimmer (privat)" },
  { id: "double", ar: "ثنائية", de: "Doppelzimmer" }, { id: "triple", ar: "ثلاثية", de: "Dreibettzimmer" },
  { id: "quad", ar: "رباعية", de: "Vierbettzimmer" }, { id: "family", ar: "عائلية", de: "Familienzimmer" },
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

/** Form content for label overrides; null outside the registration form. */
const RegCtx = createContext<SiteContent | null>(null);
/** Every form label: shows the admin's renamed text (keyed by its Arabic default) and a pencil for the admin. */
function L({ ar, de }: { ar: string; de: string }) {
  const content = useContext(RegCtx);
  const o = content ? regOf(content).labels?.[ar] : undefined;
  const cur = { ar: o?.ar || ar, de: o?.de || de };
  return <><LangText ar={cur.ar} de={cur.de} />{content && <LabelPen content={content} id={ar} cur={cur} renamed={!!o} />}</>;
}

/** Saves a patch of the registration settings (admin only). */
function useRegSave(content: SiteContent) {
  const adminS = useAdminSession();
  const isEditing = useSectionEditMode();
  const qc = useQueryClient();
  if (adminS?.role !== "admin" || !isEditing) return null;
  return async (patch: (reg: RegCfg) => RegCfg) => {
    const reg = regOf(content);
    try { await saveOrQueue(adminS.password, { ...content, cms: { ...(content.cms ?? {}), registration: patch(reg) } } as never, "التسجيل | Anmeldung", qc); return true; }
    catch (e) { window.alert(`تعذّر الحفظ | Fehler\n${e instanceof Error ? e.message : e}`); return false; }
  };
}

/** Pencil right beside a field name: opens the editor for exactly that field, pre-filled with its current name. */
function LabelPen({ content, id, cur, renamed }: { content: SiteContent; id: string; cur: Lbl; renamed: boolean }) {
  const save = useRegSave(content);
  const isEditing = useSectionEditMode();
  const [open, setOpen] = useState(false);
  const [ar, setAr] = useState(cur.ar); const [de, setDe] = useState(cur.de);
  if (!save || !isEditing) return null;
  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };
  const commit = async (v: Lbl | null) => { if (await save((r) => { const labels = { ...(r.labels ?? {}) }; if (v) labels[id] = v; else delete labels[id]; return { ...r, labels }; })) setOpen(false); };
  if (!open) return <span role="button" tabIndex={0} aria-label="تعديل اسم الخانة | Feldname bearbeiten" onClick={(e) => { stop(e); setAr(cur.ar); setDe(cur.de); setOpen(true); }} className="ms-1 inline-grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full bg-secondary align-middle text-secondary-foreground shadow-sm"><Pencil className="h-2.5 w-2.5" /></span>;
  return <span className="my-1.5 block space-y-1.5 rounded-md border-2 border-secondary bg-card p-2 text-xs font-normal text-foreground" onClick={(e) => e.stopPropagation()}>
    <span className="block font-bold text-primary">✏️ تعديل هذه الخانة | Dieses Feld umbenennen</span>
    <input dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} placeholder="الاسم بالعربي" className={inputCls + " mt-0"} />
    <input dir="ltr" value={de} onChange={(e) => setDe(e.target.value)} placeholder="Name auf Deutsch" className={inputCls + " mt-0"} />
    <span className="flex gap-1.5"><Button type="button" size="sm" className="flex-1" onClick={(e) => { stop(e); void commit({ ar: ar.trim(), de: de.trim() }); }}>حفظ | Speichern</Button>{renamed && <Button type="button" size="sm" variant="outline" onClick={(e) => { stop(e); void commit(null); }}>↩️ الأصلي</Button>}<Button type="button" size="sm" variant="ghost" onClick={(e) => { stop(e); setOpen(false); }}>✕</Button></span>
  </span>;
}

/** City + admin-added fields for one form step, with add / delete / required controls for the admin. */
function ExtraFields({ content, step, values, onChange }: { content: SiteContent; step: 1 | 3; values: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const reg = regOf(content);
  const save = useRegSave(content);
  const [adding, setAdding] = useState(false);
  const [ar, setAr] = useState(""); const [de, setDe] = useState(""); const [req, setReq] = useState(false);
  const list = extraFields(reg).filter((f) => f.step === step);
  const add = async () => {
    if (!ar.trim() && !de.trim()) return;
    const f: ExtraField = { id: `f${Date.now()}`, ar: ar.trim() || de.trim(), de: de.trim() || ar.trim(), step, ...(req ? { required: true } : {}) };
    if (save && await save((r) => ({ ...r, extra: [...(r.extra ?? []), f] }))) { setAdding(false); setAr(""); setDe(""); setReq(false); }
  };
  const remove = (f: ExtraField) => { if (!save || !window.confirm("حذف هذه الخانة من الاستمارة؟ | Feld entfernen?")) return; void save((r) => f.id === "city" ? { ...r, cityOff: true } : { ...r, extra: (r.extra ?? []).filter((x) => x.id !== f.id) }); };
  const toggleReq = (f: ExtraField) => save && f.id !== "city" && void save((r) => ({ ...r, extra: (r.extra ?? []).map((x) => x.id === f.id ? { ...x, required: !x.required } : x) }));
  return <>
    {list.map((f) => <div key={f.id}>
      <label className="block font-bold"><L ar={f.ar} de={f.de} />{f.required && <span className="text-destructive"> *</span>}<input value={values[f.id] ?? ""} onChange={(e) => onChange({ ...values, [f.id]: e.target.value })} maxLength={200} className={inputCls} /></label>
      {save && <span className="mt-1 flex gap-3 text-[11px]">{f.id !== "city" && <button type="button" className="text-primary underline" onClick={() => toggleReq(f)}>{f.required ? "إجباري ✓ | Pflicht" : "اختياري | Optional"}</button>}<button type="button" className="text-destructive underline" onClick={() => remove(f)}>🗑 حذف الخانة | Feld löschen</button></span>}
    </div>)}
    {save && step === 1 && reg.cityOff && <button type="button" className="text-[11px] text-primary underline" onClick={() => void save((r) => ({ ...r, cityOff: false }))}>↩️ إرجاع خانة مدينة السكن | Wohnort-Feld zurück</button>}
    {save && (adding
      ? <div className="space-y-1.5 rounded-md border-2 border-dashed border-secondary p-2 text-xs">
          <p className="font-bold text-primary">➕ خانة جديدة | Neues Feld</p>
          <input dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} placeholder="اسم الخانة بالعربي" className={inputCls + " mt-0"} />
          <input dir="ltr" value={de} onChange={(e) => setDe(e.target.value)} placeholder="Feldname auf Deutsch" className={inputCls + " mt-0"} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={req} onChange={(e) => setReq(e.target.checked)} className="h-4 w-4 accent-secondary" />إجباري | Pflichtfeld</label>
          <div className="flex gap-1.5"><Button type="button" size="sm" className="flex-1" onClick={() => void add()}>حفظ | Speichern</Button><Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>✕</Button></div>
        </div>
      : <Button type="button" size="sm" variant="outline" className="w-full border-dashed border-secondary text-xs" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" />إضافة خانة جديدة هنا | Neues Feld hier</Button>)}
  </>;
}

/** Admin enters the hotel name per city for this trip; names appear in the leader's rooming list. */
function HotelNames({ content, trip }: { content: SiteContent; trip: string }) {
  const save = useRegSave(content);
  const map = regOf(content).hotels ?? {};
  const cities = hotelsFor(trip);
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  if (!save) return cities.some((c) => map[c]) ? <p className="text-muted-foreground">🏨 {cities.filter((c) => map[c]).map((c) => `${c}: ${map[c]}`).join(" · ")}</p> : null;
  if (!edit) return <button type="button" className="w-full rounded-md border border-dashed border-secondary p-1.5 text-start font-bold text-primary" onClick={() => setEdit(Object.fromEntries(cities.map((c) => [c, map[c] ?? ""])))}>🏨 أسماء الفنادق | Hotels: {cities.map((c) => `${c.split(" / ")[0]}: ${map[c] || "—"}`).join(" · ")} <Pencil className="inline h-3 w-3" /></button>;
  return <div className="space-y-1 rounded-md border-2 border-secondary bg-card p-2">
    {cities.map((c) => <label key={c} className="block font-bold">{c}<input value={edit[c] ?? ""} onChange={(e) => setEdit({ ...edit, [c]: e.target.value })} maxLength={80} className={inputCls + " mt-0.5 py-1.5"} /></label>)}
    <div className="flex gap-1.5"><Button type="button" size="sm" className="flex-1" onClick={async () => { if (await save((r) => ({ ...r, hotels: { ...(r.hotels ?? {}), ...Object.fromEntries(Object.entries(edit).map(([k, v]) => [k, v.trim()])) } }))) setEdit(null); }}>حفظ | Speichern</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEdit(null)}>✕</Button></div>
  </div>;
}

/** Splits legacy "ar | de" strings and shows them per language mode (both lines in dual mode). */
const biFor = (lang: Parameters<typeof display>[0]) => (t: string) => {
  const k = t.indexOf(" | ");
  if (k < 0) return t;
  const d = display(lang, t.slice(0, k), t.slice(k + 3));
  return d.sub ? `${d.main} | ${d.sub}` : d.main;
};

const PICK_KEY = "booking-picking-at";
/** Marks that a file/camera picker is open: the back handler ignores the camera return, and the form is saved in case the phone reloads the page. */
export const markPicking = () => {
  (window as unknown as { __picking?: number }).__picking = Date.now();
  try { localStorage.setItem(PICK_KEY, String(Date.now())); localStorage.setItem("picking-view", sessionStorage.getItem("view") ?? "registration"); } catch { /* ignore */ }
  window.dispatchEvent(new Event("booking-picking"));
};
/** Picker returned normally: no reload happened, so nothing should be restored later. */
const donePicking = () => { window.setTimeout(() => { try { localStorage.removeItem(PICK_KEY); localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }, 1500); };
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
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ""; donePicking(); if (!f) return; setBusy(true); try { await checkFile(f, photo); onChange(await readFile(f)); } catch (err) { window.alert(biFor(lang)(err instanceof Error ? err.message : String(err))); } finally { setBusy(false); } };
  const btn = "flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-secondary bg-card px-2 py-2 text-xs font-bold text-primary";
  return <div className={`rounded-md border border-dashed p-3 text-sm ${value ? "border-secondary bg-accent" : "border-input bg-card"}`}>
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-secondary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : value ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}</span>
      <span className="min-w-0 flex-1"><span className="block font-bold"><L {...label} /></span><span className="block truncate text-xs text-muted-foreground">{value ? value.name : photo ? "JPG / PNG — max 10 MB" : "JPG / PNG / PDF — max 10 MB"}</span></span>
    </div>
    <div className={`mt-2 grid gap-1.5 ${photo ? "grid-cols-1" : "grid-cols-2"}`}>
      <label className={btn}><Camera className="h-3.5 w-3.5" /><L ar="صورة / كاميرا" de="Foto / Kamera" /><input type="file" accept="image/*" className="hidden" onClick={markPicking} onChange={pick} /></label>
      {!photo && <label className={btn}><FileText className="h-3.5 w-3.5" /><L ar="ملف PDF" de="PDF-Datei" /><input type="file" accept="application/pdf,.pdf" className="hidden" onClick={markPicking} onChange={pick} /></label>}
    </div>
  </div>;
}

/** Camera/photo passport scan: fills the fields, attaches the page as passport copy; user reviews everything. */
function ScanButton({ reg, onFill, pen }: { reg: RegCfg; onFill: (p: Partial<Traveler>) => void; pen?: React.ReactNode }) {
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
    <div className="flex flex-wrap items-start gap-1"><label className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md border-2 border-secondary bg-primary p-3 text-primary-foreground ${busy ? "opacity-70" : ""}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}</span>
      <span className="min-w-0 flex-1 text-sm font-bold"><LangText ar="مسح الجواز وتعبئة البيانات تلقائياً" de="Pass scannen & automatisch ausfüllen" inverse /><span className="block text-[11px] font-normal opacity-80"><LangText ar={reg.ocrNoteAr || "صوّر صفحة البيانات كاملة مع السطرين السفليين، بدون فلاش ولمعان."} de={reg.ocrNoteDe || "Ganze Datenseite inkl. der zwei unteren Zeilen, ohne Blitz und Spiegelung."} inverse /></span></span>
      <input type="file" accept="image/*" className="hidden" disabled={busy} onClick={markPicking} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; donePicking(); if (f) void run(f); }} />
    </label>{pen}</div>
    {msg && <p className={`rounded-md p-2 text-xs ${msg.ok ? "bg-accent text-primary" : "bg-destructive/10 text-destructive"}`}><L ar={msg.ar} de={msg.de} /></p>}
  </div>;
}

const AIRPORTS = ["Frankfurt (FRA)", "Berlin (BER)", "Düsseldorf (DUS)", "München (MUC)", "Hamburg (HAM)", "Hannover (HAJ)", "Köln/Bonn (CGN)", "Stuttgart (STR)"];
type Lbl = { ar: string; de: string };
type ExtraField = { id: string; ar: string; de: string; step: 1 | 3; required?: boolean };
type RegCfg = { closed?: boolean; noteAr?: string; noteDe?: string; ocrOff?: boolean; ocrPublic?: boolean; titleAr?: string; titleDe?: string; introAr?: string; introDe?: string; ocrNoteAr?: string; ocrNoteDe?: string; labels?: Record<string, Lbl>; extra?: ExtraField[]; cityOff?: boolean; hotels?: Record<string, string> };
const CITY: ExtraField = { id: "city", ar: "مدينة / منطقة السكن في ألمانيا", de: "Wohnort / Region in Deutschland", step: 1 };
const extraFields = (reg: RegCfg) => [...(reg.cityOff ? [] : [CITY]), ...(reg.extra ?? [])];
const labelOf = (reg: RegCfg, f: ExtraField): Lbl => { const o = reg.labels?.[f.ar]; return { ar: o?.ar || f.ar, de: o?.de || f.de }; };
const DRAFT_KEY = "booking-draft";
const HIST_KEY = "booking-history";
type History = Partial<Record<"email" | "phone" | "firstName" | "lastName" | "nationality" | "passportNo" | "relation", string[]>>;
/** Remembers previously typed values so they appear as suggestions under the field while typing. */
function remember(h: History, add: History): History {
  const out: History = { ...h };
  (Object.keys(add) as Array<keyof History>).forEach((k) => { const vals = (add[k] ?? []).map((v) => v.trim()).filter(Boolean); out[k] = [...new Set([...vals, ...(h[k] ?? [])])].slice(0, 12); });
  return out;
}
const Sugg = ({ id, items }: { id: string; items?: string[] | undefined }) => <datalist id={id}>{(items ?? []).map((v) => <option key={v} value={v} />)}</datalist>;
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
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const rtl = lang === "ar" || lang === "both";
  const [hist, setHist] = useState<History>({});
  // Restore typed data ONLY when the phone reloaded the page while the camera/file picker was open.
  useEffect(() => {
    try {
      setHist(JSON.parse(localStorage.getItem(HIST_KEY) ?? "{}"));
      const at = Number(localStorage.getItem(PICK_KEY) ?? 0);
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
      if (d && at && Date.now() - at < 10 * 60e3) { setStep(d.step ?? 0); setTrip(d.trip ?? ""); setOtherTrip(d.otherTrip ?? ""); setOtherDate(d.otherDate ?? ""); setAirportSel(d.airportSel ?? ""); setOtherAirport(d.otherAirport ?? ""); setEmail(d.email ?? ""); setPhone(d.phone ?? ""); if (d.travelers?.length) setTravelers(d.travelers); setRoomPref(d.roomPref ?? ""); setNotes(d.notes ?? ""); setExtras(d.extras ?? {}); }
      localStorage.removeItem(PICK_KEY); localStorage.removeItem(DRAFT_KEY); localStorage.removeItem("booking-profile");
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const save = () => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, trip, otherTrip, otherDate, airportSel, otherAirport, email, phone, travelers, roomPref, notes, extras })); } catch { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, trip, otherTrip, otherDate, airportSel, otherAirport, email, phone, travelers: travelers.map(({ passportFile: _a, photoFile: _b, ...t }) => t), roomPref, notes, extras })); } catch { /* quota */ } } };
    window.addEventListener("booking-picking", save);
    return () => window.removeEventListener("booking-picking", save);
  }, [step, trip, otherTrip, otherDate, airportSel, otherAirport, email, phone, travelers, roomPref, notes, extras]);

  const chosen = trips.find((t) => t.id === trip);
  const tripName = trip === OTHER ? otherTrip.trim() : chosen ? `${chosen.ar} | ${chosen.de}` : "";
  const tripDate = trip === OTHER ? otherDate.trim() : chosen?.date ?? "";
  const airport = airportSel === OTHER ? otherAirport.trim() : airportSel;
  const setT = (i: number, patch: Partial<Traveler>) => setTravelers((l) => l.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const fields = extraFields(reg);
  const missingExtra = (st: number) => fields.filter((f) => f.step === st && f.required && !(extras[f.id] ?? "").trim()).map((f) => `${labelOf(reg, f).ar} | ${labelOf(reg, f).de}`);
  const validate = (s: number): string[] => {
    if (s === 0) { const e: string[] = []; if (!tripName) e.push("اختر الرحلة أو اكتب الوجهة | Bitte Reise wählen oder Reiseziel eingeben"); else if (trip === OTHER && !tripDate) e.push("اكتب التاريخ المطلوب | Bitte Wunschdatum angeben"); if (airport.length < 2) e.push("اختر مطار الانطلاق | Bitte Abflughafen wählen"); return e; }
    if (s === 1) { const e: string[] = []; if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.push("البريد الإلكتروني | E-Mail"); if (!/^[+0-9 ()-]{6,30}$/.test(phone.trim())) e.push("رقم الواتساب | WhatsApp-Nummer"); return [...e, ...missingExtra(1)]; }
    if (s === 2) { const e = travelers.flatMap(travelerErrors); if (!travelers.some((t) => t.category === "adult")) e.push("يجب وجود بالغ واحد على الأقل | Mindestens ein Erwachsener"); return e; }
    if (s === 3) return [...missingExtra(3), ...(consent ? [] : ["الرجاء تأكيد صحة البيانات | Bitte Richtigkeit bestätigen"])];
    return [];
  };
  const next = () => { const e = validate(step); setErrors(e); if (!e.length) { setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  const send = async () => {
    const all = [0, 1, 2, 3].flatMap(validate);
    setErrors(all);
    if (all.length) return;
    setBusy(true);
    try {
      // Extra answers (city + admin-added fields) travel inside the notes, so they reach emails, lists and exports.
      const extraLines = fields.filter((f) => (extras[f.id] ?? "").trim()).map((f) => `${f.id === "city" ? "📍" : "•"} ${labelOf(reg, f).ar} / ${labelOf(reg, f).de}: ${extras[f.id]!.trim()}`);
      const fullNotes = [...extraLines, notes.trim()].filter(Boolean).join("\n").slice(0, 2000);
      const r = await submit({ data: { trip: tripName, tripDate, airport, email: email.trim(), phone: phone.trim(), roomPref, notes: fullNotes, consent: true, travelers: travelers.map((t) => ({ ...t, gender: t.gender as "m" | "f", firstName: t.firstName.trim(), lastName: t.lastName.trim(), passportNo: t.passportNo.trim() })) } });
      try { localStorage.setItem(HIST_KEY, JSON.stringify(remember(hist, { email: [email], phone: [phone], firstName: travelers.map((t) => t.firstName), lastName: travelers.map((t) => t.lastName), nationality: travelers.map((t) => t.nationality), passportNo: travelers.map((t) => t.passportNo), relation: travelers.map((t) => t.relation) }))); } catch { /* ignore */ }
      setDone(r.ref);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErrors([`تعذّر الإرسال، حاول مجدداً | Senden fehlgeschlagen: ${e instanceof Error ? e.message.slice(0, 200) : ""}`]);
    } finally { setBusy(false); }
  };

  const settings = <RegSettings content={content} />;
  const note = (reg.noteAr || reg.noteDe) ? <div className="mb-3 flex items-start gap-1 rounded-md border border-secondary bg-accent p-3 text-sm"><span className="min-w-0 flex-1"><LangText ar={reg.noteAr ?? ""} de={reg.noteDe ?? ""} /></span><EditPen content={content} k="note" label="ملاحظة أعلى الاستمارة" /></div> : <div className="mb-2"><EditPen content={content} k="note" label="ملاحظة أعلى الاستمارة" /></div>;
  if (reg.closed) return <>{settings}{note}<section className="rounded-lg border border-secondary bg-primary px-5 py-8 text-center text-primary-foreground shadow-md"><h2 className="text-lg"><LangText ar="التسجيل مغلق حالياً" de="Anmeldung vorübergehend geschlossen" inverse center /></h2></section></>;

  if (done) return <section className="rounded-lg border border-secondary bg-primary px-5 py-8 text-center text-primary-foreground shadow-md">
    <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
    <h2 className="mt-4 text-xl"><LangText ar="تم استلام طلبكم بنجاح" de="Ihre Anmeldung ist eingegangen" inverse center /></h2>
    <p dir="ltr" className="mx-auto mt-4 w-fit rounded-full border border-secondary px-5 py-2 font-mono text-lg font-bold text-secondary">{done}</p>
    <p className="mt-4 text-sm"><LangText ar="أرسلنا تأكيد الاستلام إلى بريدكم. هذا ليس تأكيداً نهائياً للحجز، وستتواصل معكم إدارة الحملة عبر الواتساب." de="Eine Eingangsbestätigung wurde per E-Mail gesendet. Dies ist keine endgültige Buchung – die Reiseleitung meldet sich per WhatsApp." inverse center /></p>
    <p className="mt-5 text-xs leading-relaxed text-secondary">Reisegruppe Ushaq al-Hussein DE<br />حملة عشاق الحسين - ألمانيا · بإدارة الحاج ياسر الدر</p>
  </section>;

  const steps = [{ ar: "الرحلة", de: "Reise" }, { ar: "التواصل", de: "Kontakt" }, { ar: "المسافرون", de: "Reisende" }, { ar: "التأكيد", de: "Abschluss" }];
  return <RegCtx.Provider value={content}>{settings}{note}<section dir={rtl ? "rtl" : "ltr"} className={`overflow-hidden ${rtl ? "text-right" : "text-left"} rounded-lg border border-secondary/60 bg-card shadow-md`}>
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
        <p className="rounded-md bg-muted p-3 text-xs leading-relaxed"><L ar="أدخل كل مسافر بما فيهم الأطفال والرضّع. الأسماء بالأحرف اللاتينية حرفياً كما في الجواز، لأن تذاكر الخطوط التركية (ألمانيا ← إسطنبول ← بغداد) تصدر بالاسم المطابق للجواز." de="Bitte jede reisende Person inkl. Kinder und Kleinkinder eintragen. Namen exakt wie im Reisepass – Turkish-Airlines-Tickets (Deutschland → Istanbul → Bagdad) werden passgenau ausgestellt." /></p>
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
            <label className="block font-bold"><L ar="الاسم الأول (لاتيني)" de="Vorname" /><input dir="ltr" autoComplete="off" list="bk-first" value={t.firstName} onChange={(e) => setT(i, { firstName: e.target.value })} maxLength={80} autoCapitalize="characters" className={inputCls + " uppercase"} /></label>
            <label className="block font-bold"><L ar="اسم العائلة (لاتيني)" de="Nachname" /><input dir="ltr" autoComplete="off" list="bk-last" value={t.lastName} onChange={(e) => setT(i, { lastName: e.target.value })} maxLength={80} autoCapitalize="characters" className={inputCls + " uppercase"} /></label>
          </div>
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
  </section></RegCtx.Provider>;
}

const statusLabels: Record<string, string> = { new: "جديد | Neu", confirmed: "مؤكد | Bestätigt", cancelled: "ملغى | Storniert" };
const payLabels: Record<string, string> = { unpaid: "غير مدفوع | Offen", partial: "دفعة جزئية | Teilweise", paid: "مدفوع | Bezahlt" };
const visaLabels: Record<string, string> = { none: "⏳ لم يُقدَّم بعد | Noch nicht eingereicht", processing: "🔄 قيد المعاملة | In Bearbeitung", approved: "✅ صدرت الفيزا | Visum erteilt", rejected: "❌ مرفوضة / تحتاج تعديل | Abgelehnt / Korrektur" };
const visaCls: Record<string, string> = { none: "bg-muted text-muted-foreground", processing: "bg-accent text-accent-foreground", approved: "bg-primary text-primary-foreground", rejected: "bg-destructive text-destructive-foreground" };
const visaEn: Record<string, string> = { none: "NOT SUBMITTED", processing: "IN PROCESS", approved: "APPROVED", rejected: "REJECTED" };
function destOf(trip: string) { const s = trip.toLowerCase(); return /عمر|umrah|umra|mekka|mecca|مكة/.test(s) ? "umrah" : /ايران|إيران|iran|مشهد|mashhad|قم|qom/.test(s) ? "iran" : "iraq"; }
function visaType(trip: string) { const d = destOf(trip); return d === "umrah" ? "🕋 العمرة: تأشيرة عبر منصة نسك | Umrah: Visum über Nusuk" : d === "iran" ? "🇮🇷 إيران: تأشيرة إيرانية | Iran: Iranisches Visum" : "🇮🇶 العراق: فيزا إلكترونية | Irak: E-Visum"; }
const paxOf = (t: Record<string, string>) => t["category"] === "infant" ? "INF" : t["category"] === "child" ? "CHD" : "ADT";
const paxMark: Record<string, string> = { ADT: "ADT", CHD: "CHD ⚠ CHILD", INF: "INF ⚠ INFANT (lap)" };
const roomName = (id: string | null) => { const r = rooms.find((x) => x.id === id); return r ? `${r.de} / ${r.ar}` : id ?? ""; };
/** One group per trip + date so each journey gets its own list. */
const groupKey = (r: BookingRow) => `${r.trip}${r.trip_date ? ` — ${r.trip_date}` : ""}`;

type Kind = "flight" | "visa" | "rooms";
type Sheet = { title: string; head: string[]; widths: number[]; info: string[]; body: Array<{ cells: unknown[]; pax: string; band?: boolean }>; tall?: number };
const live = (rows: BookingRow[]) => rows.filter((r) => r.status !== "cancelled" && r.status !== "deleted");
const hotelsFor = (trip: string) => { const d = destOf(trip); return d === "umrah" ? ["مكة / Mekka", "المدينة / Medina"] : d === "iran" ? ["مشهد / Mashhad", "قم / Qom"] : ["الكاظمية / Kadhimiya", "كربلاء / Karbala", "النجف / Najaf"]; };
const groupOf = (r: BookingRow) => r.travelers.length > 1 ? 0 : r.travelers[0]?.["gender"] === "f" ? 2 : 1;
const groupNames = ["👪 عائلات ومجموعات / Familien & Gruppen", "👨 شباب منفردون / Einzelreisende Männer", "🧕 نساء منفردات / Einzelreisende Frauen"];
/** Same person = same names + birth date + passport no. (name alone is not enough). */
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
  // Leader's rooming / gathering sheet: one row per booking, grouped families / men / women.
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
/** Mismatch / missing-data warnings shown to staff on each booking. */
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
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(60);
  const [push, setPush] = useState("");
  useEffect(() => { if (localStorage.getItem("push-enabled") === "1" && "Notification" in window && Notification.permission === "granted") setPush(bi("✓ التنبيهات مفعّلة على هذا الهاتف | Aktiv")); }, []);
  const load = async () => { if (!s) return; const r = await list({ data: { password: s.password } }); setRows(r.rows); };
  useEffect(() => { void load(); }, [s?.password]); // eslint-disable-line react-hooks/exhaustive-deps
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
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(printHtml(sheetOf(kind, shown, hotelMap), filter)); w.document.close();
  };
  const ql = q.trim().toLowerCase();
  const listed = ql ? shown.filter((r) => [r.ref, r.contact_phone, r.contact_email, ...r.travelers.map((t) => `${t["firstName"] ?? ""} ${t["lastName"] ?? ""}`)].join(" ").toLowerCase().includes(ql)) : shown;
  const openRow = (rows ?? []).find((r) => r.id === open) ?? null;
  const pax = shown.reduce((n, r) => n + r.travelers.length, 0);
  return <section className="mb-6 rounded-lg border-2 border-secondary bg-card p-3 shadow-sm">
    <div className="flex items-center gap-2"><h2 className="flex-1 text-base font-bold text-primary">{bi(trashView ? "🗑 سلة الحجوزات | Papierkorb " : "📋 الحجوزات | Buchungen ")}<span className="text-xs text-muted-foreground">({shown.length} / {pax} pax)</span></h2>
      <button type="button" aria-label="تحديث | Aktualisieren" title="تحديث القائمة | Aktualisieren" onClick={() => void load()} className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary"><RefreshCw className="h-4 w-4" /></button>
      <button type="button" aria-label="سلة المحذوفات | Papierkorb" title="سلة المحذوفات | Papierkorb" onClick={() => setTrashView(!trashView)} className={`relative grid h-8 w-8 place-items-center rounded-full border border-border ${trashView ? "bg-primary text-primary-foreground" : "text-primary"}`}><Trash2 className="h-4 w-4" />{trashed.length > 0 && <span className="absolute -end-1 -top-1 rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{trashed.length}</span>}</button>
    </div>
    <Button variant="outline" size="sm" className="mt-2 w-full whitespace-normal text-xs" onClick={async () => { setPush("…"); try { const r = await enablePush(); setPush(r === "registered" ? "✓ التنبيهات مفعّلة على هذا الهاتف | Aktiv" : r === "open-in-new-tab" ? "افتح التطبيق مباشرة (خارج المعاينة) ثم فعّل | Bitte App direkt öffnen" : r === "denied" ? "الإذن مرفوض — اسمح بالإشعارات في إعدادات الهاتف | Erlaubnis verweigert" : r === "unsupported" ? "على الآيفون: أضف التطبيق للشاشة الرئيسية أولاً | iPhone: zum Home-Bildschirm hinzufügen" : r); } catch { setPush("✗"); } }}><Bell className="h-3.5 w-3.5" />{bi(push || "تفعيل تنبيهات الحجوزات على هذا الهاتف | Buchungsalarm aktivieren")}</Button>
    <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls}><option value="all">{bi("كل الرحلات | Alle Reisen")}</option>{trips.map((t) => <option key={t} value={t}>{t}</option>)}</select>
    {!trashView && <Button size="sm" className="mt-2 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => setEditing("new")}><Plus className="h-4 w-4" />{bi("إضافة حجز يدوي (من الدفتر) | Manuelle Buchung")}</Button>}
    {editing && <ManualBooking key={editing === "new" ? "new" : editing.id} row={editing === "new" ? null : editing} trips={tripOptions} rows={rows ?? []} password={s.password} onDone={async () => { setEditing(null); await load(); }} />}
    {filter !== "all" && !trashView && <div className="mt-2 space-y-1.5 rounded-md border border-secondary bg-accent/40 p-2 text-xs">
      <HotelNames content={content} trip={filter} />
      <p className="font-bold text-primary">{bi("قوائم هذه الرحلة فقط | Listen nur für diese Reise")}</p>
      {([["flight", "✈️ قائمة شركة الطيران | Airline-Liste"], ["visa", "🛂 قائمة الفيز | Visum-Liste"], ["rooms", "🧭 قائمة الحاج: التجمّع والتسكين | Leiterliste"]] as const).map(([k, label]) => <div key={k} className="grid grid-cols-[1fr_auto_auto] items-center gap-1.5">
        <span className="font-bold">{bi(label)}</span>
        <Button size="sm" variant="outline" onClick={() => xls(k)}><Download className="h-3.5 w-3.5" />Excel</Button>
        <Button size="sm" variant="outline" onClick={() => printList(k)}>🖨 PDF</Button>
      </div>)}
      <p className="text-muted-foreground">{bi("🟨 طفل CHD · 🟥 رضيع INF — الملغى والمحذوف لا يظهر | Kinder gelb, Kleinkinder rot markiert")}</p>
    </div>}
    {filter === "all" && !trashView && <p className="mt-1 text-xs text-muted-foreground">{bi("اختر رحلة من القائمة لتحميل قوائم الطيران والفيز وقائمة الحاج الخاصة بها | Reise wählen, um Listen zu laden")}</p>}
    {problems > 0 && !trashView && <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs font-bold text-destructive">⚠️ {bi(`يوجد ${problems} حجز بحاجة لمراجعة — افتحه لرؤية التفاصيل | ${problems} Buchung(en) prüfen`)}</p>}
    {!trashView && <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} placeholder={bi("🔍 بحث بالاسم أو الهاتف أو رقم الحجز | Suche: Name, Telefon, Nr.")} className={inputCls} />}
    {rows === null ? <Loader2 className="mx-auto mt-3 animate-spin" /> : <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border">{listed.slice(0, limit).map((r) => {
      const lead = r.travelers[0] ?? {};
      const extra = r.travelers.length - 1;
      return <li key={r.id}><button type="button" onClick={() => setOpen(r.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-card px-3 py-2.5 text-start active:bg-accent">
        <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-sm font-bold text-primary">{lead["lastName"]} {lead["firstName"]}</span>{issuesOf(r).length > 0 && <span className="shrink-0 text-xs">⚠️</span>}</span>
        <span className="shrink-0 rounded-full bg-secondary/20 px-2 py-0.5 text-[11px] font-bold">{extra > 0 ? `+${extra}` : bi("فرد | allein")}</span>
      </button></li>;
    })}{!listed.length && <li className="py-3 text-center text-muted-foreground">{bi(trashView ? "السلة فارغة | Papierkorb leer" : "لا توجد حجوزات بعد | Noch keine Buchungen")}</li>}</ul>}
    {listed.length > limit && <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => setLimit(limit + 60)}>{bi(`عرض المزيد (${listed.length - limit}) | Mehr anzeigen`)}</Button>}
    <Dialog open={!!openRow} onOpenChange={(v) => { if (!v) setOpen(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {openRow && (() => { const r = openRow; const lead = r.travelers[0] ?? {}; return <>
          <DialogHeader><DialogTitle className="text-start text-primary">{lead["lastName"]} {lead["firstName"]} <span className="text-xs text-muted-foreground">({r.travelers.length} pax)</span></DialogTitle></DialogHeader>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span dir="ltr" className="font-mono text-muted-foreground">{r.ref}</span>
            <span className="rounded-full bg-accent px-2 py-0.5 font-medium">{bi(statusLabels[r.status] ?? "")}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{bi(payLabels[r.payment_status] ?? "")} {r.paid_amount}/{r.total_amount}€</span>
            <span className="text-muted-foreground">{r.trip}</span>
          </div>
          {r.contact_phone && <a href={waLink(r.contact_phone)} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"><MessageCircle className="h-4 w-4" />{bi("مراسلة عبر واتساب | WhatsApp")}</a>}
          <div className="space-y-2 text-xs">
          <p dir="ltr" className="text-start">{r.contact_email} · <a className="underline" href={waLink(r.contact_phone)} target="_blank" rel="noreferrer">{r.contact_phone}</a></p>
          {r.travelers.map((t, i) => <div key={i} className="rounded bg-muted p-2" dir="ltr"><b>{i + 1}. {t["lastName"]}/{t["firstName"]}</b> — {t["category"]?.toUpperCase()} {t["gender"]?.toUpperCase()} — {t["birthDate"]} — {t["nationality"]} — {t["passportNo"]} ({t["passportExpiry"]}) {t["airport"] && `✈ ${t["airport"]}`} {t["relation"] && `— ${t["relation"]}`}
            <span className="mt-1 flex gap-2">{(["passportFile", "photoFile"] as const).map((k) => t[k] && <button key={k} type="button" className="inline-flex items-center gap-1 underline" onClick={async () => { const w = window.open("", "_blank"); const u = await fileUrl({ data: { password: s.password, path: t[k]! } }); if (w) w.location.href = u.url; }}><FileText className="h-3 w-3" />{k === "passportFile" ? "Pass" : "Foto"}</button>)}</span>
            <label className="mt-1.5 flex items-center gap-1.5" dir={lang === "ar" || lang === "both" ? "rtl" : "ltr"}>
              <span className={`rounded-full px-2 py-0.5 font-bold ${visaCls[t["visa"] || "none"]}`}>🛂</span>
              <select value={t["visa"] || "none"} onChange={(e) => void patch(r, { travelers: r.travelers.map((x, j) => j === i ? { ...x, visa: e.target.value } : x) })} className={inputCls + " mt-0 flex-1 py-1 text-xs"}>{Object.entries(visaLabels).map(([k, v]) => <option key={k} value={k}>{bi(v)}</option>)}</select>
            </label></div>)}
          <p className="text-muted-foreground">{bi(visaType(r.trip))}</p>
          {issuesOf(r).length > 0 && <ul className="rounded-md border-2 border-destructive bg-destructive/10 p-2 font-bold text-destructive">{issuesOf(r).map((x, k) => <li key={k}>⚠️ {bi(x)}</li>)}</ul>}
          {(r.room_pref || r.notes) && <p>🛏 {roomName(r.room_pref)} · {r.notes}</p>}
          <div className="grid grid-cols-2 gap-1">
            <select value={r.status} onChange={(e) => void patch(r, { status: e.target.value })} className={inputCls + " mt-0 py-1.5 text-xs"}>{Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{bi(v)}</option>)}</select>
            <select value={r.payment_status} onChange={(e) => void patch(r, { payment_status: e.target.value })} className={inputCls + " mt-0 py-1.5 text-xs"}>{Object.entries(payLabels).map(([k, v]) => <option key={k} value={k}>{bi(v)}</option>)}</select>
            <label>{bi("مدفوع | Bezahlt")} € <input type="number" min={0} defaultValue={r.paid_amount} onBlur={(e) => Number(e.target.value) !== r.paid_amount && void patch(r, { paid_amount: Number(e.target.value) })} className={inputCls + " mt-0 py-1.5"} /></label>
            <label>{bi("المجموع | Gesamt")} € <input type="number" min={0} defaultValue={r.total_amount} onBlur={(e) => Number(e.target.value) !== r.total_amount && void patch(r, { total_amount: Number(e.target.value) })} className={inputCls + " mt-0 py-1.5"} /></label>
          </div>
          <p>{bi("المتبقي | Rest: ")}<b>{Math.max(0, r.total_amount - r.paid_amount)}€</b></p>
          <textarea rows={2} defaultValue={r.admin_notes ?? ""} placeholder={bi("ملاحظات الإدارة | Interne Notiz")} onBlur={(e) => e.target.value !== (r.admin_notes ?? "") && void patch(r, { admin_notes: e.target.value })} className={inputCls} />
          {!trashView && <Button size="sm" variant="outline" className="w-full" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" />{bi("تعديل بيانات الحجز والمسافرين | Buchung bearbeiten")}</Button>}
          {trashView
            ? <div className="flex gap-3"><button type="button" className="font-bold text-primary underline" onClick={() => void patch(r, { status: "new" })}>{bi("↩️ استرجاع | Wiederherstellen")}</button><button type="button" className="text-destructive underline" onClick={() => { if (window.confirm("حذف نهائي بلا رجعة؟ | Endgültig löschen?")) void patch(r, { remove: true }); }}>{bi("حذف نهائي | Endgültig löschen")}</button></div>
            : <button type="button" className="text-destructive underline" onClick={() => { if (window.confirm("نقل الحجز إلى سلة المحذوفات؟ | In den Papierkorb?")) void patch(r, { status: "deleted" }); }}>{bi("🗑 نقل للسلة | In den Papierkorb")}</button>}
        </div> })()}
      </DialogContent>
    </Dialog>
  </section>;
}

/** Admin-only pencil next to a text: tap to edit that exact text (Arabic + German) in place. */
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

/** Admin quick switches placed directly above the registration form; texts are edited with the pencils in place. */
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
    {/* زر قفل / فتح التسجيل: ظاهر دائماً للإدارة للسرعة والراحة */}
    <Button size="sm" variant={reg.closed ? "default" : "outline"} className="w-full" onClick={() => void saveReg({ closed: !reg.closed })}>
      {bi(reg.closed ? "🔓 فتح التسجيل للزوار | Anmeldung öffnen" : "🔒 قفل التسجيل مؤقتاً | Anmeldung schließen")}
    </Button>

    {/* خيارات المسح الضوئي وتعديل النصوص: تظهر فقط عند تفعيل القلم ✏️ */}
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
const blankMT = (airport = ""): MT => ({ firstName: "", lastName: "", gender: "", birthDate: "", nationality: "", passportNo: "", passportExpiry: "", airport, relation: "", category: "adult", visa: "none" });

/** Staff form to add a notebook booking (or edit any booking). Files optional, no emails sent. */
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

/** Staff-only room calculator: counts rooms per type from the bookings and searches visitors by name. */
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
  useEffect(() => { void load(); }, [s?.password]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = useMemo(() => (rows ?? []).filter((r) => r.status !== "deleted" && r.status !== "cancelled"), [rows]);
  const trips = useMemo(() => [...new Set(active.map(groupKey))], [active]);
  if (!s) return null;
  const byTrip = trip === "all" ? active : active.filter((r) => groupKey(r) === trip);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = byTrip.filter((r) => (room === "all" || (r.room_pref || "leader") === room) && words.every((w) => r.travelers.some((t) => `${t["firstName"] ?? ""} ${t["lastName"] ?? ""}`.toLowerCase().includes(w))));
  const pax = byTrip.reduce((n, r) => n + r.travelers.length, 0);
  return <section className="mb-6 rounded-lg border-2 border-secondary bg-card p-3 shadow-sm">
    <div className="flex items-center gap-2"><h2 className="flex-1 text-base font-bold text-primary">{bi("🛏️ حاسبة وفرز الغرف | Zimmer-Rechner ")}<span className="text-xs text-muted-foreground">({byTrip.length} / {pax} pax)</span></h2>
      <button type="button" aria-label="تحديث | Aktualisieren" onClick={() => void load()} className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary"><RefreshCw className="h-4 w-4" /></button>
    </div>
    <select value={trip} onChange={(e) => setTrip(e.target.value)} className={inputCls}><option value="all">{bi("كل الرحلات | Alle Reisen")}</option>{trips.map((t) => <option key={t} value={t}>{t}</option>)}</select>
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {rooms.map((rm) => { const c = byTrip.filter((r) => (r.room_pref || "leader") === rm.id); const on = room === rm.id; return <button key={rm.id} type="button" onClick={() => setRoom(on ? "all" : rm.id)} className={`rounded-md border p-2 text-start text-xs ${on ? "border-secondary bg-primary text-primary-foreground" : "border-border bg-card text-primary"}`}>
        <span className="block font-bold">{bi(rm.ar)}</span>
        <span className="mt-0.5 block"><b className="text-lg text-secondary">{c.length}</b> {bi("غرفة | Zimmer")} · {c.reduce((n, r) => n + r.travelers.length, 0)} pax</span>
      </button>; })}
    </div>
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={bi("بحث باسم الزائر | Name suchen")} className={inputCls} />
    {rows === null ? <Loader2 className="mx-auto mt-3 animate-spin" /> : <ul className="mt-2 space-y-1.5">{shown.map((r) => <li key={r.id} className="rounded-md border border-border p-2 text-xs">
      <p className="font-bold text-primary">{r.travelers.map((t) => `${t["firstName"] ?? ""} ${t["lastName"] ?? ""}`.trim()).join("، ")}</p>
      <p className="text-muted-foreground">🛏 {roomName(r.room_pref)} · {r.travelers.length} pax · {r.trip}</p>
    </li>)}{shown.length === 0 && <li className="py-3 text-center text-xs text-muted-foreground">{bi("لا توجد نتائج | Keine Einträge")}</li>}</ul>}
  </section>;
}
