import { RoomsPanel } from "@/components/final-group";
import { LuggageTags } from "@/components/luggage-tags";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowUp, BedDouble, Check, ClipboardList, Clock, Globe, IdCard, ListChecks, Lock, LockOpen, Send, ShieldCheck, X, MessageSquare, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { display, isArabic, useLang } from "@/lib/i18n";
import { FavStar } from "@/components/group2";
import { useAdminSession } from "@/lib/admin-session";
import { AddButton, GearMenu, IconBtn, ManageRow, useSaveContent, type FieldDef } from "@/components/inline-admin";
import type { EmergencyEntry, SiteContent } from "@/lib/site-content";
import { decideIdRequest, getIdFields, getIdSettings, getIdStatus, listIdRequests, saveIdFields, saveIdSettings, submitIdRequest, translateLabels, type IdField, type IdRequest, type IdSettings } from "@/lib/site-content.functions";

export const DEFAULT_LEADER_PHONE = "+9647819998905";
const KEY = "ushaq-pilgrim-id";

export const cities = [
  { id: "karbala", ar: "كربلاء", de: "Kerbela" },
  { id: "najaf", ar: "النجف", de: "Nadschaf" },
  { id: "kazimiyya", ar: "الكاظمية", de: "Kazimiya" },
  { id: "samarra", ar: "سامراء", de: "Samarra" },
  { id: "mashhad", ar: "مشهد", de: "Maschhad" },
  { id: "qom", ar: "قم", de: "Ghom" },
  { id: "mecca", ar: "مكة المكرمة", de: "Mekka" },
  { id: "medina", ar: "المدينة المنورة", de: "Medina" },
  { id: "other", ar: "وجهة أخرى", de: "Anderer Ort" },
];
const fallbackCity = { id: "other", ar: "وجهة أخرى", de: "Anderer Ort" };
const cityOf = (id: string) => cities.find((c) => c.id === id) ?? fallbackCity;

export type Stay = { id: string; city: string; hotel: string; floor: string; room: string };
export type PilgrimId = { nameAr: string; nameDe: string; phone: string; stays: Stay[]; current?: string; extra?: Record<string, string>; reqId?: string; status?: "pending" | "approved" | "rejected" | "unsent"; seen?: string | undefined };
const empty: PilgrimId = { nameAr: "", nameDe: "", phone: "", stays: [] };
const SKEY = "ushaq-id-settings";
const defaultSettings: IdSettings = { open: false, emergencyPublic: false, emTitleAr: "", emTitleDe: "", emNoteAr: "", emNoteDe: "" };

function useLocal() {
  const [data, setData] = useState<PilgrimId>(empty);
  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) setData({ ...empty, ...JSON.parse(raw) }); } catch { /* ignore */ } }, []);
  const save = (next: PilgrimId) => { setData(next); localStorage.setItem(KEY, JSON.stringify(next)); };
  return [data, save] as const;
}

export function leaderContacts(content: SiteContent) {
  const list = (content.emergency ?? []).filter((e) => !e.hidden && e.phone);
  return list.length ? list : [{ id: "default", ar: "رقم الحاج للطوارئ", de: "Notfallnummer des Hajj", phone: DEFAULT_LEADER_PHONE }];
}
export const leaderPhones = (content: SiteContent) => leaderContacts(content).map((entry) => entry.phone);
const clean = (p: string) => p.replace(/[^\d+]/g, "").replace(/^00/, "+");

function T({ ar, de }: { ar: string; de: string }) {
  const { lang } = useLang();
  const { main, sub } = display(lang, ar, de);
  if (!sub) return <span dir={isArabic(main) ? "rtl" : "ltr"} className={`block ${isArabic(main) ? "text-right" : "text-left"}`}>{main}</span>;
  return <span className="block">{main}<span lang="de" dir="ltr" className="block text-[0.8em] italic opacity-75">{sub}</span></span>;
}

function buildSms(p: PilgrimId, stay: Stay | undefined, loc: string, lang: string) {
  const c = stay ? cityOf(stay.city) : null;
  const ar = `نداء طوارئ: أنا الزائر ${p.nameAr || p.nameDe || "—"}${p.phone ? ` (${p.phone})` : ""}. أحتاج مساعدة عاجلة.${stay && c ? ` ${c.ar} - فندق: ${stay.hotel}، طابق: ${stay.floor}، غرفة: ${stay.room}.` : ""}`;
  const de = `NOTFALL: Ich bin ${p.nameDe || p.nameAr || "—"}${p.phone ? ` (${p.phone})` : ""}. Ich brauche dringend Hilfe.${stay && c ? ` ${c.de} - Hotel: ${stay.hotel}, Etage: ${stay.floor}, Zimmer: ${stay.room}.` : ""}`;
  const en = `EMERGENCY: I am ${p.nameDe || p.nameAr || "—"}${p.phone ? ` (${p.phone})` : ""}. I need urgent help.${stay && c ? ` ${c.de} - Hotel: ${stay.hotel}, Floor: ${stay.floor}, Room: ${stay.room}.` : ""}`;
  const where = loc ? `\n📍 ${loc}` : "\n📍 GPS ?";
  const text = lang === "ar" ? ar : lang === "de" ? de : lang === "en" ? en : `${ar}\n${de}`;
  return text + where;
}

export function EmergencySmsButton({ content, compact = false }: { content: SiteContent; compact?: boolean }) {
  const [p] = useLocal();
  const { lang } = useLang();
  const [busy, setBusy] = useState(false);
  const contacts = leaderContacts(content);
  const send = (phone: string) => {
    const stay = p.stays.find((s) => s.id === p.current) ?? p.stays[0];
    const go = (loc: string) => { setBusy(false); window.location.href = `sms:${clean(phone)}?body=${encodeURIComponent(buildSms(p, stay, loc, lang))}`; };
    setBusy(true);
    if (!navigator.geolocation) return go("");
    navigator.geolocation.getCurrentPosition(
      (pos) => go(`https://maps.google.com/?q=${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
      () => go(""),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };
  return <div className="space-y-2">
    {contacts.map((contact, i) => <div key={contact.id} className="min-w-0 rounded-md border border-destructive/25 bg-background p-2.5">
      <div className="mb-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="min-w-0 text-sm font-bold text-foreground"><T ar={contact.ar || "رقم الطوارئ"} de={contact.de || "Notfallnummer"} /></span>
        <a href={`tel:${clean(contact.phone)}`} dir="ltr" className="break-all text-sm font-bold text-primary underline underline-offset-2">{contact.phone}</a>
      </div>
      <div className="grid grid-cols-1 gap-2 min-[350px]:grid-cols-[minmax(0,1fr)_auto]">
        <Button type="button" disabled={busy} onClick={() => send(contact.phone)} className={`${compact ? "min-h-10" : "min-h-11"} h-auto min-w-0 whitespace-normal bg-destructive px-3 py-2 text-destructive-foreground hover:bg-destructive/90`}>
          <MessageSquare className="h-4 w-4 shrink-0" /><span className="min-w-0 text-start text-xs leading-tight"><T ar={i === 0 ? "أرسل موقعي برسالة SMS" : "أرسل للرقم الاحتياطي"} de={i === 0 ? "Standort per SMS senden" : "An Ersatznummer senden"} /></span>
        </Button>
        <Button asChild variant="outline" className={`${compact ? "h-10" : "h-11"} min-w-0 px-3`}><a href={`tel:${clean(contact.phone)}`} aria-label={`اتصال ${contact.phone}`}><Phone className="h-4 w-4" /><span>اتصال <span className="italic opacity-70">| Anrufen</span></span></a></Button>
      </div>
    </div>)}
  </div>;
}

const inputCls = "h-11 w-full rounded-md border border-border bg-background px-3 text-sm";
const emergencyFields: FieldDef[] = [
  { key: "ar", ar: "اسم الحملة أو الجهة", de: "Name (AR)" },
  { key: "de", ar: "الاسم بالألمانية", de: "Name (DE)", ltr: true },
  { key: "phone", ar: "رقم الهاتف", de: "Telefonnummer", ltr: true },
];

export function PilgrimIdView({ content }: { content: SiteContent }) {
  const staff = useAdminSession();
  const saveContent = useSaveContent(staff?.password ?? "");
  const [p, save] = useLocal();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PilgrimId>(empty);
  const [manage, setManage] = useState(false);
  const phones = leaderPhones(content);
  const filled = !!(p.nameAr || p.nameDe);
  const [fields, setFields] = useState<IdField[]>([]);
  const [requests, setRequests] = useState<IdRequest[]>([]);
  const [reqOpen, setReqOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  useEffect(() => { getIdFields().then(setFields).catch(() => {}); }, []);
  const loadRequests = () => { if (staff) listIdRequests({ data: { password: staff.password } }).then((r) => setRequests(r.rows)).catch(() => {}); };
  useEffect(loadRequests, [staff?.password]);
  useEffect(() => {
    if (!p.reqId || p.status === "unsent") return;
    let alive = true;
    const check = () => getIdStatus({ data: { id: p.reqId! } }).then((r) => { if (alive && r.status && r.status !== p.status) save({ ...p, status: r.status }); }).catch(() => {});
    check();
    const t = p.status === "pending" ? window.setInterval(check, 30000) : 0;
    return () => { alive = false; if (t) window.clearInterval(t); };
  }, [p.reqId, p.status]);
  const submit = async (d: PilgrimId) => {
    const reqId = d.reqId ?? crypto.randomUUID();
    setSending(true);
    try {
      const r = await submitIdRequest({ data: { id: reqId, nameAr: d.nameAr, nameDe: d.nameDe, phone: d.phone, extra: d.extra ?? {}, stays: d.stays.map(({ city, hotel, floor, room }) => ({ city: cityOf(city).ar, hotel, floor, room })) } });
      if (r.closed) { window.alert("التسجيل مغلق حالياً | Die Registrierung ist derzeit geschlossen"); save({ ...d, status: "unsent" }); }
      else save({ ...d, reqId, status: r.status ?? "pending", seen: r.status === "approved" ? undefined : d.seen });
    } catch { save({ ...d, reqId, status: "unsent" }); }
    setSending(false);
  };
  const approved = p.status === "approved";
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const decide = async (id: string, status: "approved" | "rejected" | "delete") => { if (!staff) return; if (status === "delete" && !window.confirm("حذف الطلب؟ | Anfrage löschen?")) return; await decideIdRequest({ data: { password: staff.password, id, status } }); loadRequests(); };
  const [st, setSt] = useState<IdSettings>(defaultSettings);
  useEffect(() => {
    try { const c = localStorage.getItem(SKEY); if (c) setSt({ ...defaultSettings, ...JSON.parse(c) }); } catch { /* ignore */ }
    getIdSettings().then((s) => { setSt(s); localStorage.setItem(SKEY, JSON.stringify(s)); }).catch(() => {});
  }, []);
  const saveSt = async (next: IdSettings) => {
    if (staff?.role !== "admin") return;
    const r = await saveIdSettings({ data: { password: staff.password, settings: next } });
    if (r.ok) { setSt(next); localStorage.setItem(SKEY, JSON.stringify(next)); } else window.alert("تعذّر الحفظ | Speichern fehlgeschlagen");
  };
  const [textOpen, setTextOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [addNew, setAddNew] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const lb = st.labels ?? {};
  const L = (k: string, ar: string, de: string) => { const a = lb[`${k}Ar`] || ""; const d = lb[`${k}De`] || ""; return <T ar={a || ar} de={d || (a ? a : de)} />; };
  const locked = !st.open && !p.reqId && !staff;
  const canSeeEmergency = !!staff || approved || st.emergencyPublic;
  const notice = (p.status === "approved" || p.status === "rejected") && p.seen !== p.status;
  useEffect(() => { if (!filled) setEditing(true); }, [filled]);
  const start = () => { setDraft(p); setEditing(true); };
  const setStay = (id: string, patch: Partial<Stay>) => setDraft({ ...draft, stays: draft.stays.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const current = p.stays.find((s) => s.id === p.current) ?? p.stays[0];
  const qr = [`${p.nameAr} ${p.nameDe}`.trim(), "حملة عشاق الحسين - Reisegruppe Ushaq al-Hussein", ...phones.map((x) => `Tel: ${x}`), current ? `${cityOf(current.city).de}: ${current.hotel} / ${current.floor} / ${current.room}` : ""].filter(Boolean).join("\n");

  return <div className="screen-enter space-y-5 px-4 py-7">
    <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-md bg-accent text-primary"><IdCard className="h-5 w-5" /></span><h2 className="flex-1 text-primary"><T ar={st.titleAr || "هويتي والطوارئ"} de={st.titleDe || st.titleAr || "Mein Ausweis & Notfall"} /></h2><FavStar id="section:pilgrim-id" />
      {staff && <div className="relative">
        <button type="button" aria-label="طلبات الهوية | Ausweis-Anfragen" title="طلبات الهوية | Ausweis-Anfragen" onClick={() => { loadRequests(); setReqOpen(true); }} className={`grid h-7 w-7 place-items-center rounded-full shadow-sm ${pendingCount > 0 ? "bg-destructive text-destructive-foreground" : "bg-primary text-secondary"}`}><ListChecks className="h-3.5 w-3.5" /></button>
        {pendingCount > 0 && <span className="pointer-events-none absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full border border-background bg-destructive px-1 text-[10px] font-bold text-destructive-foreground" dir="ltr">{pendingCount}</span>}
      </div>}
      {staff?.role === "admin" && <GearMenu>
        <IconBtn label={st.open ? "إغلاق التسجيل | Registrierung schließen" : "فتح التسجيل | Registrierung öffnen"} onClick={() => saveSt({ ...st, open: !st.open })}>{st.open ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}</IconBtn>
        <IconBtn label="حقول التحقق | Prüffelder" onClick={() => setFieldsOpen(true)}><ClipboardList className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label="تعديل | Bearbeiten" onClick={() => setLabelsOpen(true)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label="إضافة خانة | Feld hinzufügen" onClick={() => { setAddNew(true); setFieldsOpen(true); }}><Plus className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn label="حذف خانة | Feld löschen" danger onClick={() => setDelOpen(true)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
      </GearMenu>}</div>
    {staff && <p className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${st.open ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{st.open ? "🔓 التسجيل مفتوح | Offen" : "🔒 التسجيل مغلق | Geschlossen"}</p>}
    <p className="text-xs text-muted-foreground"><T ar="تُحفظ هذه البيانات على هاتفك فقط وتعمل بدون إنترنت." de="Diese Daten bleiben nur auf Ihrem Handy und funktionieren offline." /></p>
    {staff && <LuggageTags nameAr={p.nameAr} nameDe={p.nameDe} />}

    {notice && <div className={`flex items-start gap-2 rounded-lg border-2 p-3 text-sm font-bold ${p.status === "approved" ? "border-secondary bg-accent text-primary" : "border-destructive/50 bg-destructive/10 text-destructive"}`}>
      {p.status === "approved" ? <Check className="h-5 w-5 shrink-0" /> : <X className="h-5 w-5 shrink-0" />}
      <span className="min-w-0 flex-1">{p.status === "approved" ? <T ar="تم اعتماد هويتك ✓" de="Ihr Ausweis wurde bestätigt ✓" /> : <T ar="طلبك يحتاج تعديل البيانات" de="Ihre Anfrage muss korrigiert werden" />}</span>
      <button type="button" aria-label="إغلاق | Schließen" onClick={() => save({ ...p, seen: p.status })} className="grid h-6 w-6 shrink-0 place-items-center rounded-full"><X className="h-3.5 w-3.5" /></button>
    </div>}

    {locked && <section className="space-y-2 rounded-xl border-2 border-secondary bg-card p-5 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent text-secondary"><Lock className="h-6 w-6" /></span>
      <p className="text-base font-bold text-primary"><T ar="التسجيل مغلق حالياً" de="Die Registrierung ist derzeit geschlossen" /></p>
      <p className="text-xs text-muted-foreground"><T ar="يُفتح التسجيل من إدارة الحملة خلال فترة الرحلة." de="Die Reiseleitung öffnet die Registrierung während der Reise." /></p>
    </section>}

    {!editing && filled && !approved && <section className="relative space-y-3 rounded-xl border-2 border-secondary bg-card p-5 text-center">
      <Button type="button" variant="ghost" size="icon" onClick={start} aria-label="تعديل البطاقة | Karte bearbeiten" className="absolute left-3 top-3 h-9 w-9 rounded-full"><Pencil className="h-4 w-4" /></Button>
      <span className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${p.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-accent text-secondary"}`}>{p.status === "rejected" ? <X className="h-6 w-6" /> : <Clock className="h-6 w-6" />}</span>
      <p className="text-lg font-bold text-primary">{p.nameAr || p.nameDe}</p>
      {p.status === "pending" && <p className="text-sm font-bold text-primary"><T ar="قيد المراجعة والاعتماد" de="In Bearbeitung" /></p>}
      {p.status === "pending" && <p className="text-xs text-muted-foreground"><T ar="ستظهر بطاقتك ورمز الطوارئ بعد موافقة إدارة الحملة." de="Ihr Ausweis und Notfall-QR erscheinen nach Freigabe durch die Reiseleitung." /></p>}
      {p.status === "rejected" && <p className="text-sm font-bold text-destructive"><T ar="رُفض الطلب: البيانات غير مطابقة لسجل الحملة. عدّلها وأعد الإرسال." de="Abgelehnt: Daten stimmen nicht mit der Gruppenliste überein. Bitte korrigieren und erneut senden." /></p>}
      {(!p.status || p.status === "unsent") && <p className="text-xs text-muted-foreground"><T ar="أرسل بياناتك لاعتماد بطاقتك من إدارة الحملة." de="Senden Sie Ihre Daten zur Freigabe an die Reiseleitung." /></p>}
      {p.status !== "pending" && p.status !== "rejected" && <Button type="button" className="h-11 w-full" disabled={sending} onClick={() => submit(p)}><Send className="h-4 w-4" /><T ar="إرسال للاعتماد" de="Zur Freigabe senden" /></Button>}
    </section>}

    {!editing && filled && approved && <section className="relative overflow-hidden rounded-xl border-2 border-secondary bg-primary p-5 text-primary-foreground shadow-lg">
      <Button type="button" variant="ghost" size="icon" onClick={start} aria-label="تعديل البطاقة | Karte bearbeiten" className="absolute left-3 top-3 h-9 w-9 rounded-full bg-background/15 text-primary-foreground hover:bg-background/25 hover:text-primary-foreground"><Pencil className="h-4 w-4" /></Button>
      <p className="text-center text-xs text-secondary">حملة عشاق الحسين - ألمانيا<span dir="ltr" className="block">Reisegruppe Ushaq al-Hussein</span></p>
      <div className="gold-line mx-auto my-3 h-px w-24" />
      <p className="text-center text-xl font-bold">{p.nameAr}</p>
      {p.nameDe && <p dir="ltr" className="text-center text-sm opacity-80">{p.nameDe}</p>}
      {p.phone && <p dir="ltr" className="mt-1 text-center text-xs opacity-75">{p.phone}</p>}
      {fields.filter((f) => p.extra?.[f.id]).map((f) => <div key={f.id} className="mt-1 text-center text-xs opacity-80"><T ar={f.ar || f.de} de={f.de || f.ar} /><b dir="auto">{p.extra?.[f.id]}</b></div>)}
      {current && <div className="mt-4 rounded-md border border-primary-foreground/20 bg-primary-foreground/10 p-3 text-sm">
        <p className="flex items-center justify-center gap-1.5 font-bold text-secondary"><BedDouble className="h-4 w-4" />{cityOf(current.city).ar} | {cityOf(current.city).de}</p>
        <p className="mt-1 text-center">{current.hotel || "—"}</p>
        <p className="mt-1 text-center text-xs">الطابق / Etage: <b dir="ltr">{current.floor || "—"}</b> · الغرفة / Zimmer: <b dir="ltr">{current.room || "—"}</b></p>
      </div>}
      <div className="mt-4 space-y-2">{p.stays.map((s) => { const c = cityOf(s.city); const on = s.id === current?.id; return <button type="button" key={s.id} onClick={() => save({ ...p, current: s.id })} className={`w-full rounded-md border p-3 text-start text-sm ${on ? "border-secondary bg-secondary/20" : "border-primary-foreground/20"}`}>
        <span className="font-bold text-secondary">{c.ar} | {c.de}{on && " ✓"}</span>
        <span className="mt-1 block">🏨 {s.hotel || "—"}</span>
        <span className="block">طابق / Etage: <b dir="ltr">{s.floor || "—"}</b> · غرفة / Zimmer: <b dir="ltr">{s.room || "—"}</b></span>
      </button>; })}</div>
      <div className="mx-auto mt-5 w-fit rounded-lg bg-background p-3"><QRCodeSVG value={qr} size={150} /></div>
      <p className="mt-2 text-center text-[11px] opacity-75">امسح للاتصال بالحملة · Scannen für Kontakt</p>
      <div className="mt-3 text-center text-xs"><T ar="رقم الحاج للطوارئ" de="Notfallnummer des Hajj" />{phones.map((x) => <a key={x} href={`tel:${clean(x)}`} dir="ltr" className="block font-bold text-secondary">{x}</a>)}</div>
    </section>}

    {editing && !locked && <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      {staff && <p className="rounded-md bg-accent px-3 py-2 text-xs font-bold text-primary"><T ar="تحكم المشرف: إضافة وتعديل وحذف بيانات البطاقة والإقامة" de="Mitarbeiter: Ausweis- und Unterkunftsdaten verwalten" /></p>}
      <label className="block text-xs font-bold text-primary">{L("name", "الاسم بالعربية", "Name (Arabisch)")}<input className={inputCls} value={draft.nameAr} onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })} /></label>
      <label className="block text-xs font-bold text-primary">{L("foreign", "الأحرف الأجنبية (ألماني / إنجليزي)", "Fremdschrift (Deutsch / Englisch)")}<input dir="ltr" className={inputCls} value={draft.nameDe} onChange={(e) => setDraft({ ...draft, nameDe: e.target.value })} /></label>
      <label className="block text-xs font-bold text-primary">{L("phone", "رقم هاتفي (اختياري)", "Meine Nummer")}<input dir="ltr" type="tel" className={inputCls} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
      {fields.map((f) => <label key={f.id} className="block text-xs font-bold text-primary"><T ar={`${f.ar || f.de} *`} de={`${f.de || f.ar} *`} /><input dir="auto" className={inputCls} value={draft.extra?.[f.id] ?? ""} onChange={(e) => setDraft({ ...draft, extra: { ...(draft.extra ?? {}), [f.id]: e.target.value } })} /></label>)}
      <p className="pt-2 text-sm font-bold text-primary"><T ar={lb['staysAr'] || "الإقامة في كل مدينة"} de={lb['staysDe'] || lb['staysAr'] || "Unterkunft je Stadt"} /></p>
      {draft.stays.map((s) => <div key={s.id} className="space-y-2 rounded-md border border-secondary/40 p-3">
        <div className="flex gap-2"><select className={inputCls} value={s.city} onChange={(e) => setStay(s.id, { city: e.target.value })}>{cities.map((c) => <option key={c.id} value={c.id}>{c.ar} | {c.de}</option>)}</select>
          <Button type="button" variant="outline" size="icon" aria-label="حذف الإقامة | Unterkunft löschen" onClick={() => setDraft({ ...draft, stays: draft.stays.filter((x) => x.id !== s.id) })} className="h-11 w-11 shrink-0 text-destructive"><Trash2 className="h-4 w-4" /></Button></div>
        <input placeholder="اسم الفندق | Hotel" className={inputCls} value={s.hotel} onChange={(e) => setStay(s.id, { hotel: e.target.value })} />
        <div className="grid grid-cols-2 gap-2"><input placeholder="الطابق | Etage" className={inputCls} value={s.floor} onChange={(e) => setStay(s.id, { floor: e.target.value })} /><input placeholder="الغرفة | Zimmer" className={inputCls} value={s.room} onChange={(e) => setStay(s.id, { room: e.target.value })} /></div>
      </div>)}
      <Button type="button" variant="outline" className="h-10 w-full" onClick={() => setDraft({ ...draft, stays: [...draft.stays, { id: crypto.randomUUID(), city: "karbala", hotel: "", floor: "", room: "" }] })}><Plus /><T ar="إضافة مدينة/فندق" de="Stadt/Hotel hinzufügen" /></Button>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button type="button" className="h-11" disabled={sending} onClick={async () => {
          if (!(draft.nameAr.trim() || draft.nameDe.trim()) || fields.some((f) => !(draft.extra?.[f.id] ?? "").trim())) { window.alert("يرجى تعبئة الاسم وجميع الحقول المطلوبة (*) | Bitte Name und alle Pflichtfelder (*) ausfüllen"); return; }
          const same = p.status === "approved" && JSON.stringify({ ...draft, current: undefined }) === JSON.stringify({ ...p, current: undefined });
          setEditing(false);
          if (same) save(draft); else await submit(draft);
        }}><T ar="حفظ وإرسال" de="Speichern & senden" /></Button>
        {filled && <Button type="button" variant="outline" className="h-11" onClick={() => setEditing(false)}><T ar="إلغاء" de="Abbrechen" /></Button>}
      </div>
    </section>}

    {staff && <RoomsPanel content={content} />}

    <section className="min-w-0 rounded-lg border-2 border-destructive/40 bg-card p-3">
      <div className="mb-1 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <h3 className="min-w-0 font-bold text-destructive"><T ar={st.emTitleAr || "🚨 طوارئ — بدون إنترنت"} de={st.emTitleDe || "🚨 Notfall — ohne Internet"} /></h3>
        {staff && <GearMenu>
          {staff.role === "admin" && <IconBtn label="تعديل النصوص | Texte bearbeiten" onClick={() => setTextOpen(true)}><Pencil className="h-3.5 w-3.5" /></IconBtn>}
          <IconBtn label="الأرقام: إضافة/تعديل/إخفاء/حذف | Nummern" onClick={() => setManage(true)}><Phone className="h-3.5 w-3.5" /></IconBtn>
          {staff.role === "admin" && <IconBtn label={st.emergencyPublic ? "ظاهر للجميع ← حصر بالمعتمدين | Für alle → nur Bestätigte" : "للمعتمدين فقط ← إظهار للجميع | Nur Bestätigte → für alle"} onClick={() => saveSt({ ...st, emergencyPublic: !st.emergencyPublic })}>{st.emergencyPublic ? <Globe className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}</IconBtn>}
        </GearMenu>}
      </div>
      {staff && <p className="mb-2 w-fit rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{st.emergencyPublic ? "🌐 للجميع | Für alle" : "🛡️ للمعتمدين | Nur Bestätigte"}</p>}
      {canSeeEmergency ? <>
        <p className="mb-3 whitespace-pre-line text-xs text-muted-foreground"><T ar={st.emNoteAr || "يفتح رسالة SMS جاهزة فيها اسمك وفندقك وموقعك، فقط اضغط إرسال."} de={st.emNoteDe || "Öffnet eine fertige SMS mit Name, Hotel und Standort – nur noch senden."} /></p>
        <EmergencySmsButton content={content} />
      </> : <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-background p-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-5 w-5 shrink-0 text-destructive" />
        <T ar={st.lockAr || "أرقام الطوارئ وخدمة SMS مخصصة للزوار المسجلين والمعتمدين في الرحلة الحالية."} de={st.lockDe || "Notfallnummern und SMS-Dienst sind nur für registrierte und bestätigte Besucher der aktuellen Reise."} />
      </div>}
    </section>
    {staff && <Dialog open={manage} onOpenChange={setManage}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle>أرقام الطوارئ <span className="text-sm italic text-muted-foreground">| Notfallnummern</span></DialogTitle><DialogDescription className="sr-only">Notfallnummern</DialogDescription></DialogHeader>
        <div className="space-y-2">
          {content.emergency.length === 0 && <ManageRow title="رقم الحاج للطوارئ" subtitle={DEFAULT_LEADER_PHONE} fields={emergencyFields} item={{ ar: "رقم الحاج للطوارئ", de: "Notfallnummer des Hajj", phone: DEFAULT_LEADER_PHONE }} onSave={(row) => saveContent({ ...content, emergency: [{ ...(row as EmergencyEntry), id: `em${Date.now()}` }] })} onDelete={async () => { window.alert("هذا هو الرقم الافتراضي؛ أضف رقماً آخر ليحل محله | Standardnummer – fügen Sie eine andere hinzu"); }} />}
          {content.emergency.map((entry) => <ManageRow key={entry.id} title={entry.ar || entry.de || "رقم طوارئ"} subtitle={entry.phone} fields={emergencyFields} item={entry} hidden={entry.hidden ?? false} onVisibilityChange={(hidden) => saveContent({ ...content, emergency: content.emergency.map((x) => x.id === entry.id ? { ...x, hidden } : x) })} onSave={(row) => saveContent({ ...content, emergency: content.emergency.map((x) => x.id === entry.id ? { ...(row as EmergencyEntry), id: entry.id, hidden: entry.hidden ?? false } : x) })} onDelete={() => saveContent({ ...content, emergency: content.emergency.filter((x) => x.id !== entry.id) })} />)}
        </div>
        <AddButton label={{ ar: "إضافة رقم طوارئ", de: "Notfallnummer hinzufügen" }} fields={emergencyFields} blank={{ ar: "", de: "", phone: "" }} onAdd={(row) => saveContent({ ...content, emergency: [...content.emergency, { ...(row as EmergencyEntry), id: `em${Date.now()}` }] })} />
      </DialogContent>
    </Dialog>}
    {staff && <Dialog open={reqOpen} onOpenChange={setReqOpen}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle>طلبات الهوية <span className="text-sm italic text-muted-foreground">| Ausweis-Anfragen</span></DialogTitle><DialogDescription className="sr-only">Anfragen</DialogDescription></DialogHeader>
        <div className="space-y-2">
          {requests.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">لا توجد طلبات | Keine Anfragen</p>}
          {requests.map((r) => <div key={r.id} className={`space-y-1 rounded-md border p-3 text-xs ${r.status === "pending" ? "border-secondary bg-accent/40" : "border-border bg-card"}`}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1"><p className="text-sm font-bold text-primary">{r.nameAr || "—"}</p>{r.nameDe && <p dir="ltr" className="text-muted-foreground">{r.nameDe}</p>}</div>
              {r.auto && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary">⚡ تلقائي | Auto</span>}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.status === "approved" ? "bg-primary text-primary-foreground" : r.status === "rejected" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}`}>{r.status === "approved" ? "معتمد | Bestätigt" : r.status === "rejected" ? "مرفوض | Abgelehnt" : "معلق | Ausstehend"}</span>
              <button type="button" aria-label="حذف | Löschen" onClick={() => decide(r.id, "delete")} className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {r.phone && <p dir="ltr">📞 {r.phone}</p>}
            {Object.entries(r.extra ?? {}).map(([k, v]) => { const f = fields.find((x) => x.id === k); return <div key={k}>{f ? <T ar={f.ar || f.de} de={f.de || f.ar} /> : k}<b dir="auto">{v}</b></div>; })}
            {r.stays.map((st, i) => <p key={i}>🏨 {st.city} · {st.hotel || "—"} · طابق/Etage {st.floor || "—"} · غرفة/Zimmer {st.room || "—"}</p>)}
            <p dir="ltr" className="text-[10px] text-muted-foreground">{new Date(r.at).toLocaleString()}</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button type="button" className="h-9" disabled={r.status === "approved"} onClick={() => decide(r.id, "approved")}><Check className="h-4 w-4" />موافقة <span className="text-[10px] italic opacity-80">| Genehmigen</span></Button>
              <Button type="button" variant="destructive" className="h-9" disabled={r.status === "rejected"} onClick={() => decide(r.id, "rejected")}><X className="h-4 w-4" />رفض <span className="text-[10px] italic opacity-80">| Ablehnen</span></Button>
            </div>
          </div>)}
        </div>
      </DialogContent>
    </Dialog>}
    {staff?.role === "admin" && <Dialog open={textOpen} onOpenChange={setTextOpen}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle><Pencil className="inline h-4 w-4" /></DialogTitle><DialogDescription className="sr-only">Texte</DialogDescription></DialogHeader>
        <EmTextEditor initial={st} onSave={async (next) => { await saveSt(next); setTextOpen(false); }} />
      </DialogContent>
    </Dialog>}
    {staff?.role === "admin" && <Dialog open={fieldsOpen} onOpenChange={(o) => { setFieldsOpen(o); if (!o) setAddNew(false); }}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle>{addNew ? <Plus className="inline h-4 w-4" /> : <>حقول التحقق <span className="text-sm italic text-muted-foreground">| Prüffelder</span></>}</DialogTitle><DialogDescription className="sr-only">Pflichtfelder</DialogDescription></DialogHeader>
        <FieldsEditor key={String(addNew)} addNew={addNew} initial={fields} onSave={async (next) => { const de = await autoGerman(staff.password, next.map((f) => [f.ar, f.de])); const out = next.map((f, i) => ({ ...f, de: de[i] ?? f.de })); const r = await saveIdFields({ data: { password: staff.password, fields: out } }); if (r.ok) { setFields(out); setFieldsOpen(false); setAddNew(false); } else window.alert("تعذّر الحفظ | Speichern fehlgeschlagen"); }} />
      </DialogContent>
    </Dialog>}
    {staff?.role === "admin" && <Dialog open={delOpen} onOpenChange={setDelOpen}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle><Trash2 className="inline h-4 w-4 text-destructive" /></DialogTitle><DialogDescription className="sr-only">Felder löschen</DialogDescription></DialogHeader>
        <DeleteFields fields={fields} onDelete={async (id) => { const out = fields.filter((f) => f.id !== id); const r = await saveIdFields({ data: { password: staff.password, fields: out } }); if (r.ok) setFields(out); else window.alert("تعذّر الحفظ | Speichern fehlgeschlagen"); }} />
      </DialogContent>
    </Dialog>}
    {staff?.role === "admin" && <Dialog open={labelsOpen} onOpenChange={setLabelsOpen}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle><Pencil className="inline h-4 w-4" /></DialogTitle><DialogDescription className="sr-only">Bezeichnungen</DialogDescription></DialogHeader>
        <LabelsEditor st={st} fields={fields} password={staff.password} onSave={async (s, f) => { await saveSt(s); const r = await saveIdFields({ data: { password: staff.password, fields: f } }); if (r.ok) setFields(f); setLabelsOpen(false); }} />
      </DialogContent>
    </Dialog>}
  </div>;
}

function EmTextEditor({ initial, onSave }: { initial: IdSettings; onSave: (s: IdSettings) => Promise<void> }) {
  const [d, setD] = useState(initial);
  return <div className="space-y-2">
    <input placeholder="🚨 طوارئ — بدون إنترنت" className={inputCls} value={d.emTitleAr} onChange={(e) => setD({ ...d, emTitleAr: e.target.value })} />
    <input dir="ltr" placeholder="🚨 Notfall — ohne Internet" className={inputCls} value={d.emTitleDe} onChange={(e) => setD({ ...d, emTitleDe: e.target.value })} />
    <textarea rows={3} placeholder="يفتح رسالة SMS جاهزة…" className="w-full rounded-md border border-border bg-background p-3 text-sm" value={d.emNoteAr} onChange={(e) => setD({ ...d, emNoteAr: e.target.value })} />
    <textarea dir="ltr" rows={3} placeholder="Öffnet eine fertige SMS…" className="w-full rounded-md border border-border bg-background p-3 text-sm" value={d.emNoteDe} onChange={(e) => setD({ ...d, emNoteDe: e.target.value })} />
    <textarea rows={3} placeholder="أرقام الطوارئ وخدمة SMS مخصصة للزوار المسجلين…" className="w-full rounded-md border border-border bg-background p-3 text-sm" value={d.lockAr ?? ""} onChange={(e) => setD({ ...d, lockAr: e.target.value })} />
    <textarea dir="ltr" rows={3} placeholder="Notfallnummern … nur für registrierte Besucher…" className="w-full rounded-md border border-border bg-background p-3 text-sm" value={d.lockDe ?? ""} onChange={(e) => setD({ ...d, lockDe: e.target.value })} />
    <Button type="button" className="h-11 w-full" aria-label="حفظ | Speichern" onClick={() => onSave(d)}><Check className="h-4 w-4" /></Button>
  </div>;
}

const LABELS: [string, string, string][] = [["title", "هويتي والطوارئ", "Mein Ausweis & Notfall"], ["name", "الاسم بالعربية", "Name (Arabisch)"], ["foreign", "الأحرف الأجنبية (ألماني / إنجليزي)", "Fremdschrift (Deutsch / Englisch)"], ["phone", "رقم هاتفي (اختياري)", "Meine Nummer"], ["stays", "الإقامة في كل مدينة", "Unterkunft je Stadt"]];

/** Fills empty German texts from Arabic automatically. pairs: [ar, de][] → returns de[] */
async function autoGerman(password: string, pairs: [string, string][]) {
  const idx = pairs.map((p, i) => (p[0].trim() && !p[1].trim() ? i : -1)).filter((i) => i >= 0);
  const out = pairs.map((p) => p[1]);
  if (!idx.length) return out;
  try {
    const r = await translateLabels({ data: { password, texts: idx.map((i) => pairs[i]![0]) } });
    if (r.ok) idx.forEach((i, n) => { out[i] = r.out[n] ?? ""; });
  } catch { /* keep empty → Arabic shown as fallback */ }
  return out;
}

function LabelsEditor({ st, fields, password, onSave }: { st: IdSettings; fields: IdField[]; password: string; onSave: (s: IdSettings, f: IdField[]) => Promise<void> }) {
  const [orig] = useState<Record<string, string>>(() => {
    const src: Record<string, string> = { ...(st.labels ?? {}), titleAr: st.titleAr ?? "", titleDe: st.titleDe ?? "" };
    const out: Record<string, string> = {};
    for (const [k] of LABELS) { out[`${k}Ar`] = src[`${k}Ar`] ?? ""; out[`${k}De`] = src[`${k}De`] ?? ""; }
    return out;
  });
  const [lb, setLb] = useState<Record<string, string>>(orig);
  const [list, setList] = useState<IdField[]>(fields);
  const [busy, setBusy] = useState(false);
  const set = (id: string, patch: Partial<IdField>) => setList(list.map((f) => f.id === id ? { ...f, ...patch } : f));
  const save = async () => {
    setBusy(true);
    const next = { ...lb };
    // Arabic changed but German untouched → old German is dropped and re-translated
    for (const [k] of LABELS) if (next[`${k}Ar`] !== orig[`${k}Ar`] && next[`${k}De`] === orig[`${k}De`]) next[`${k}De`] = "";
    const fl = list.filter((f) => f.ar.trim() || f.de.trim()).map((f) => { const o = fields.find((x) => x.id === f.id); return o && f.ar !== o.ar && f.de === o.de ? { ...f, de: "" } : f; });
    const de = await autoGerman(password, [...LABELS.map(([k]) => [next[`${k}Ar`] ?? "", next[`${k}De`] ?? ""] as [string, string]), ...fl.map((f) => [f.ar, f.de] as [string, string])]);
    LABELS.forEach(([k], i) => { next[`${k}De`] = de[i] ?? ""; });
    const flOut = fl.map((f, i) => ({ ...f, de: de[LABELS.length + i] ?? f.de }));
    const { titleAr, titleDe, ...labels } = next;
    await onSave({ ...st, titleAr: titleAr ?? "", titleDe: titleDe ?? "", labels }, flOut);
    setBusy(false);
  };
  return <div className="space-y-3">
    {LABELS.map(([k, ar, de]) => <div key={k} className="space-y-1 rounded-md border border-border p-2"><input placeholder={ar} className={inputCls} value={lb[`${k}Ar`] ?? ""} onChange={(e) => setLb({ ...lb, [`${k}Ar`]: e.target.value })} /><input dir="ltr" placeholder={de} className={inputCls} value={lb[`${k}De`] ?? ""} onChange={(e) => setLb({ ...lb, [`${k}De`]: e.target.value })} /></div>)}
    {list.map((f) => <div key={f.id} className="space-y-1 rounded-md border border-secondary/40 p-2">
      <input placeholder="الاسم بالعربية" className={inputCls} value={f.ar} onChange={(e) => set(f.id, { ar: e.target.value })} /><input dir="ltr" placeholder="Deutsch (automatisch)" className={inputCls} value={f.de} onChange={(e) => set(f.id, { de: e.target.value })} />
    </div>)}
    <Button type="button" className="h-11 w-full" disabled={busy} aria-label="حفظ | Speichern" onClick={save}><Check className="h-4 w-4" /></Button>
  </div>;
}

function DeleteFields({ fields, onDelete }: { fields: IdField[]; onDelete: (id: string) => Promise<void> }) {
  if (!fields.length) return <p className="py-3 text-center text-xs text-muted-foreground">—</p>;
  return <div className="space-y-2">{fields.map((f) => <div key={f.id} className="flex items-center gap-2 rounded-md border border-border p-2">
    <span className="min-w-0 flex-1 text-sm font-bold text-primary"><T ar={f.ar || f.de} de={f.de || f.ar} /></span>
    <Button type="button" variant="outline" size="icon" aria-label="حذف | Löschen" className="h-10 w-10 shrink-0 text-destructive" onClick={() => { if (window.confirm(`حذف «${f.ar || f.de}»؟ | Löschen?`)) onDelete(f.id); }}><Trash2 className="h-4 w-4" /></Button>
  </div>)}</div>;
}

function FieldsEditor({ initial, onSave, addNew }: { initial: IdField[]; onSave: (f: IdField[]) => Promise<void>; addNew?: boolean }) {
  const [list, setList] = useState<IdField[]>(addNew ? [...initial, { id: `f${Date.now()}`, ar: "", de: "" }] : initial);
  const set = (id: string, patch: Partial<IdField>) => setList(list.map((f) => f.id === id ? { ...f, ...patch } : f));
  return <div className="space-y-2">
    {list.map((f) => <div key={f.id} className="flex gap-2">
      <div className="min-w-0 flex-1 space-y-1"><input placeholder="الاسم بالعربية" className={inputCls} value={f.ar} onChange={(e) => set(f.id, { ar: e.target.value })} /><input dir="ltr" placeholder="Name (DE)" className={inputCls} value={f.de} onChange={(e) => set(f.id, { de: e.target.value })} /></div>
      <Button type="button" variant="outline" size="icon" aria-label="حذف | Löschen" className="h-11 w-11 shrink-0 text-destructive" onClick={() => setList(list.filter((x) => x.id !== f.id))}><Trash2 className="h-4 w-4" /></Button>
    </div>)}
    <div className="flex justify-end"><Button type="button" variant="outline" size="icon" aria-label="إضافة حقل | Feld hinzufügen" className="h-9 w-9" onClick={() => setList([...list, { id: `f${Date.now()}`, ar: "", de: "" }])}><Plus className="h-4 w-4" /></Button></div>
    <Button type="button" className="h-11 w-full" aria-label="حفظ | Speichern" onClick={() => onSave(list.filter((f) => f.ar.trim() || f.de.trim()))}><Check className="h-4 w-4" /></Button>
  </div>;
}

export function ScrollToTop() {
  const [show, setShow] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const s = window.scrollY > window.innerHeight * 1.5;
        setShow((p) => (p === s ? p : s));
        const a = Boolean(document.querySelector("[data-audio-player]"));
        setAudioOpen((p) => (p === a ? p : a));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); if (raf) cancelAnimationFrame(raf); };
  }, []);
  if (!show) return null;
  return <Button type="button" size="icon" aria-label="إلى الأعلى | Nach oben" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={`fixed left-3 z-40 h-10 w-10 rounded-full border border-secondary bg-primary text-secondary shadow-lg hover:bg-primary ${audioOpen ? "bottom-[8.25rem]" : "bottom-24"}`}><ArrowUp className="h-4 w-4" /></Button>;
}
