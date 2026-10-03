import { RoomsPanel } from "@/components/final-group";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowUp, BedDouble, IdCard, MessageSquare, Pencil, Phone, Plus, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/lib/i18n";
import { FavStar } from "@/components/group2";
import { useAdminSession } from "@/lib/admin-session";
import { AddButton, ManageRow, useSaveContent, type FieldDef } from "@/components/inline-admin";
import type { EmergencyEntry, SiteContent } from "@/lib/site-content";

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
export type PilgrimId = { nameAr: string; nameDe: string; phone: string; stays: Stay[]; current?: string };
const empty: PilgrimId = { nameAr: "", nameDe: "", phone: "", stays: [] };

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
  if (lang === "ar") return <span className="block">{ar}</span>;
  if (lang === "de" || lang === "en") return <span dir="ltr" className="block">{de}</span>;
  return <span className="block">{ar}<span lang="de" dir="ltr" className="block text-[0.8em] italic opacity-75">{de}</span></span>;
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
  useEffect(() => { if (!filled) setEditing(true); }, [filled]);
  const start = () => { setDraft(p); setEditing(true); };
  const setStay = (id: string, patch: Partial<Stay>) => setDraft({ ...draft, stays: draft.stays.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const current = p.stays.find((s) => s.id === p.current) ?? p.stays[0];
  const qr = [`${p.nameAr} ${p.nameDe}`.trim(), "حملة عشاق الحسين - Reisegruppe Ushaq al-Hussein", ...phones.map((x) => `Tel: ${x}`), current ? `${cityOf(current.city).de}: ${current.hotel} / ${current.floor} / ${current.room}` : ""].filter(Boolean).join("\n");

  return <div className="screen-enter space-y-5 px-4 py-7">
    <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-md bg-accent text-primary"><IdCard className="h-5 w-5" /></span><h2 className="flex-1 text-primary"><T ar="هويتي والطوارئ" de="Mein Ausweis & Notfall" /></h2><FavStar id="section:pilgrim-id" /></div>
    <p className="text-xs text-muted-foreground"><T ar="تُحفظ هذه البيانات على هاتفك فقط وتعمل بدون إنترنت." de="Diese Daten bleiben nur auf Ihrem Handy und funktionieren offline." /></p>

    {!editing && filled && <section className="relative overflow-hidden rounded-xl border-2 border-secondary bg-primary p-5 text-primary-foreground shadow-lg">
      <Button type="button" variant="ghost" size="icon" onClick={start} aria-label="تعديل البطاقة | Karte bearbeiten" className="absolute left-3 top-3 h-9 w-9 rounded-full bg-background/15 text-primary-foreground hover:bg-background/25 hover:text-primary-foreground"><Pencil className="h-4 w-4" /></Button>
      <p className="text-center text-xs text-secondary">حملة عشاق الحسين - ألمانيا<span dir="ltr" className="block">Reisegruppe Ushaq al-Hussein</span></p>
      <div className="gold-line mx-auto my-3 h-px w-24" />
      <p className="text-center text-xl font-bold">{p.nameAr}</p>
      {p.nameDe && <p dir="ltr" className="text-center text-sm opacity-80">{p.nameDe}</p>}
      {p.phone && <p dir="ltr" className="mt-1 text-center text-xs opacity-75">{p.phone}</p>}
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

    {editing && <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      {staff && <p className="rounded-md bg-accent px-3 py-2 text-xs font-bold text-primary"><T ar="تحكم المشرف: إضافة وتعديل وحذف بيانات البطاقة والإقامة" de="Mitarbeiter: Ausweis- und Unterkunftsdaten verwalten" /></p>}
      <label className="block text-xs font-bold text-primary">الاسم بالعربية | Name (Arabisch)<input className={inputCls} value={draft.nameAr} onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })} /></label>
      <label className="block text-xs font-bold text-primary">الاسم بالأحرف اللاتينية | Name (Latein)<input dir="ltr" className={inputCls} value={draft.nameDe} onChange={(e) => setDraft({ ...draft, nameDe: e.target.value })} /></label>
      <label className="block text-xs font-bold text-primary">رقم هاتفي (اختياري) | Meine Nummer<input dir="ltr" type="tel" className={inputCls} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
      <p className="pt-2 text-sm font-bold text-primary"><T ar="الإقامة في كل مدينة" de="Unterkunft je Stadt" /></p>
      {draft.stays.map((s) => <div key={s.id} className="space-y-2 rounded-md border border-secondary/40 p-3">
        <div className="flex gap-2"><select className={inputCls} value={s.city} onChange={(e) => setStay(s.id, { city: e.target.value })}>{cities.map((c) => <option key={c.id} value={c.id}>{c.ar} | {c.de}</option>)}</select>
          <Button type="button" variant="outline" size="icon" aria-label="حذف الإقامة | Unterkunft löschen" onClick={() => setDraft({ ...draft, stays: draft.stays.filter((x) => x.id !== s.id) })} className="h-11 w-11 shrink-0 text-destructive"><Trash2 className="h-4 w-4" /></Button></div>
        <input placeholder="اسم الفندق | Hotel" className={inputCls} value={s.hotel} onChange={(e) => setStay(s.id, { hotel: e.target.value })} />
        <div className="grid grid-cols-2 gap-2"><input placeholder="الطابق | Etage" className={inputCls} value={s.floor} onChange={(e) => setStay(s.id, { floor: e.target.value })} /><input placeholder="الغرفة | Zimmer" className={inputCls} value={s.room} onChange={(e) => setStay(s.id, { room: e.target.value })} /></div>
      </div>)}
      <Button type="button" variant="outline" className="h-10 w-full" onClick={() => setDraft({ ...draft, stays: [...draft.stays, { id: crypto.randomUUID(), city: "karbala", hotel: "", floor: "", room: "" }] })}><Plus /><T ar="إضافة مدينة/فندق" de="Stadt/Hotel hinzufügen" /></Button>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button type="button" className="h-11" onClick={() => { save(draft); setEditing(false); }}><T ar="حفظ البطاقة" de="Speichern" /></Button>
        {filled && <Button type="button" variant="outline" className="h-11" onClick={() => setEditing(false)}><T ar="إلغاء" de="Abbrechen" /></Button>}
      </div>
    </section>}

    {staff && <RoomsPanel content={content} />}

    <section className="min-w-0 rounded-lg border-2 border-destructive/40 bg-card p-3">
      <div className="mb-1 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <h3 className="min-w-0 font-bold text-destructive"><T ar="🚨 طوارئ — بدون إنترنت" de="🚨 Notfall — ohne Internet" /></h3>
        {staff && <Button type="button" variant="ghost" size="icon" onClick={() => setManage(true)} aria-label="إدارة أرقام الطوارئ | Notfallnummern verwalten" className="h-7 w-7 shrink-0 rounded-full bg-primary text-secondary hover:bg-primary/90 hover:text-secondary"><Settings className="h-3.5 w-3.5" /></Button>}
      </div>
      <p className="mb-3 text-xs text-muted-foreground"><T ar="يفتح رسالة SMS جاهزة فيها اسمك وفندقك وموقعك، فقط اضغط إرسال." de="Öffnet eine fertige SMS mit Name, Hotel und Standort – nur noch senden." /></p>
      <EmergencySmsButton content={content} />
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
  </div>;
}

export function ScrollToTop() {
  const [show, setShow] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > window.innerHeight * 1.5);
    const detectAudio = () => setAudioOpen(Boolean(document.querySelector("[data-audio-player]")));
    const observer = new MutationObserver(detectAudio);
    on(); detectAudio();
    window.addEventListener("scroll", on, { passive: true });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { window.removeEventListener("scroll", on); observer.disconnect(); };
  }, []);
  if (!show) return null;
  return <Button type="button" size="icon" aria-label="إلى الأعلى | Nach oben" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={`fixed left-3 z-40 h-10 w-10 rounded-full border border-secondary bg-primary text-secondary shadow-lg hover:bg-primary ${audioOpen ? "bottom-[8.25rem]" : "bottom-24"}`}><ArrowUp className="h-4 w-4" /></Button>;
}
