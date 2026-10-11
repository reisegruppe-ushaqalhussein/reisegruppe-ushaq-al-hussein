import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Wrench, KeyRound, LogOut, Pencil, RotateCcw, ShieldAlert, Trash2, ScrollText, LayoutDashboard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loginWithCode, logout, setMode, setToolsHidden, updatePassword, useStaffSession, useToolsHidden } from "@/lib/admin-session";
import { saveOrQueue } from "@/lib/offline";
import { changeAdminPassword, clearSecurityLog, getSecurityOverview } from "@/lib/site-content.functions";
import type { SiteContent, TrashEntry } from "@/lib/site-content";

const inputCls = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const openGatewayEvent = "open-access-gateway";
export const openGateway = () => window.dispatchEvent(new Event(openGatewayEvent));

/** Neutral single-field code entry. It never reveals that two roles exist. */
export function AccessGateway() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { const h = () => { setOpen(true); setCode(""); setError(false); }; window.addEventListener(openGatewayEvent, h); return () => window.removeEventListener(openGatewayEvent, h); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { const role = await loginWithCode(code.trim()); if (role) { setOpen(false); navigator.vibrate?.(30); } else setError(true); }
    catch { setError(true); } finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100%-24px)] max-w-[360px]" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle>بوابة الوصول <span className="text-sm italic text-muted-foreground">| Zugang</span></DialogTitle><DialogDescription className="sr-only">Code</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input type="password" autoComplete="current-password" autoFocus value={code} onChange={(e) => { setCode(e.target.value); setError(false); }} placeholder="الرمز السري | Code" className={inputCls} dir="ltr" />
          {error && <p className="text-xs text-destructive">الرمز غير صحيح | Code ungültig</p>}
          <Button type="submit" disabled={busy || !code} className="h-11 w-full">دخول <span className="text-xs italic opacity-75">| Weiter</span></Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Floating bar visible only to signed-in staff. */
export function AdminBar({ content }: { content: SiteContent }) {
  const s = useStaffSession();
  const { lang } = useLang();
  const t = (ar: string, de: string, en: string) => lang === "ar" || lang === "both" ? ar : lang === "en" ? en : de;
  const toolsHidden = useToolsHidden();
  const [trashOpen, setTrashOpen] = useState(false);
  const [secOpen, setSecOpen] = useState(false);
  const [alerts, setAlerts] = useState(0);
  const overview = getSecurityOverview;
  useEffect(() => {
    if (s?.role !== "admin") return;
    overview({ data: { password: s.password } }).then((r) => {
      if (!r.ok) return;
      const seen = Number(localStorage.getItem("security-seen") ?? 0);
      setAlerts(r.failures.filter((f) => f.at > seen).length);
    }).catch(() => {});
  }, [s?.role, s?.password, secOpen, overview]);
  const [menu, setMenu] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [hajToolsBusy, setHajToolsBusy] = useState(false);
  const qc = useQueryClient();
  const labels = content.modeLabels ?? { admin: "الإدارة", haj: "معاينة كحاج", leader: "مسؤول الحملة" };
  const [draft, setDraft] = useState(labels);
  if (!s) return null;
  const isAdmin = s.role === "admin";
  const trashCount = content.trash?.length ?? 0;
  const hajToolsEnabled = !!content.cms?.hajCanManage;
  const toggleHajTools = async () => {
    if (!isAdmin || s.mode !== "admin" || hajToolsBusy) return;
    setHajToolsBusy(true);
    try {
      await saveOrQueue(s.password, { ...content, cms: { ...(content.cms ?? {}), hajCanManage: !hajToolsEnabled } }, "صلاحيات أدوات الحاج | Hajj-Werkzeuge", qc);
    } catch (e) {
      window.alert(`تعذّر تحديث صلاحيات أدوات الحاج | Fehler\\n${e instanceof Error ? e.message : String(e)}`);
    } finally { setHajToolsBusy(false); }
  };
  const saveLabels = async () => {
    const next = { admin: draft.admin.trim() || "الإدارة", haj: draft.haj.trim() || "معاينة كحاج", leader: draft.leader.trim() || "مسؤول الحملة" };
    try { await saveOrQueue(s.password, { ...content, modeLabels: next }, "الأسماء | Namen", qc); setRenameOpen(false); }
    catch (e) { window.alert(`تعذّر الحفظ | Fehler\n${e instanceof Error ? e.message : e}`); }
  };
  const btn = "h-9 w-full justify-start gap-2 px-3 text-xs text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground";
  const badge = isAdmin ? (s.mode === "admin" ? `${labels.admin} ✏️` : `${labels.haj} 👁️`) : `${labels.leader} 📿`;
  return (
    <>
      <div className="relative z-30 flex justify-end px-3 pt-2 text-primary-foreground" dir="rtl">
        <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-label="القائمة | Menü" className="flex items-center gap-1.5 rounded-full border border-secondary bg-primary px-2.5 py-1 text-[10px] font-extrabold shadow-md">
          <span>{badge}</span>{alerts > 0 && <span className="h-2 w-2 rounded-full bg-destructive" />}<span className="text-sm leading-none tracking-widest">⋯</span>
        </button>
        {isAdmin && s.mode === "admin" && <button type="button" disabled={hajToolsBusy} onClick={() => void toggleHajTools()} aria-pressed={hajToolsEnabled} aria-label={hajToolsEnabled ? "إخفاء أدوات الحاج | Hajj-Werkzeuge ausblenden" : "إتاحة أدوات الحاج | Hajj-Werkzeuge freigeben"} title={hajToolsEnabled ? "إخفاء أدوات الحاج | Hajj-Werkzeuge ausblenden" : "إتاحة أدوات الحاج | Hajj-Werkzeuge freigeben"} className={`ml-2 grid h-7 w-7 place-items-center rounded-full border border-secondary shadow-md ${hajToolsEnabled ? "bg-secondary text-secondary-foreground" : "bg-primary text-secondary"}`}><Pencil className="h-3.5 w-3.5" />{hajToolsEnabled ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}</button>}
        <button type="button" onClick={() => setToolsHidden(!toolsHidden)} aria-pressed={toolsHidden} aria-label={toolsHidden ? "إظهار أدوات التحكم | Werkzeuge zeigen" : "إخفاء أدوات التحكم | Werkzeuge ausblenden"} title={toolsHidden ? "إظهار الأدوات | Werkzeuge zeigen" : "عرض نظيف | Saubere Ansicht"} className={`ml-2 grid h-7 w-7 place-items-center rounded-full border border-secondary shadow-md ${toolsHidden ? "bg-secondary text-secondary-foreground" : "bg-primary text-secondary"}`}>{toolsHidden ? <Wrench className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                       {menu && <div className="absolute left-3 top-10 w-56 overflow-hidden rounded-lg border border-secondary bg-primary p-1 shadow-xl" onClick={() => setMenu(false)}>
          <Button size="sm" variant="ghost" className={btn} onClick={() => window.dispatchEvent(new CustomEvent("open-view", { detail: "bookings" }))}><ScrollText className="h-3.5 w-3.5 text-secondary" />{t("كشوفات التسكين والحجوزات", "Buchungen & Listen", "Room Distribution & Bookings")}</Button>
          {isAdmin && <Button size="sm" variant="ghost" className={btn} onClick={() => setMode(s.mode === "admin" ? "haj" : "admin")}>{s.mode === "admin" ? <><Eye className="h-3.5 w-3.5" />{labels.haj}</> : <><Pencil className="h-3.5 w-3.5" />{labels.admin}</>}</Button>}
          {isAdmin && <Button size="sm" variant="ghost" className={btn} onClick={() => { setDraft(labels); setRenameOpen(true); }}><Pencil className="h-3.5 w-3.5" />{t("تعديل الأسماء", "Namen anpassen", "Edit names")}</Button>}
          {isAdmin && <Button size="sm" variant="ghost" className={btn} onClick={() => setTrashOpen(true)}><Trash2 className="h-3.5 w-3.5" />{t("المحذوفات", "Papierkorb", "Trash")}{trashCount > 0 && <span className="rounded-full bg-secondary px-1.5 text-[10px] text-secondary-foreground">{trashCount}</span>}</Button>}
          {isAdmin && <Button size="sm" variant="ghost" className={btn} onClick={() => setSecOpen(true)}><ShieldAlert className="h-3.5 w-3.5" />{t("الأمان", "Sicherheit", "Security")}{alerts > 0 && <span className="rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{alerts}</span>}</Button>}
          {isAdmin && <Button asChild size="sm" variant="ghost" className={btn}><Link to="/admin"><LayoutDashboard className="h-3.5 w-3.5" />{t("لوحة التحكم", "Dashboard", "Dashboard")}</Link></Button>}
          <Button size="sm" variant="ghost" className={btn} onClick={() => { if (window.confirm(t("تسجيل الخروج من هذا الجهاز؟", "Auf diesem Gerät abmelden?", "Log out from this device?"))) logout(); }}><LogOut className="h-3.5 w-3.5" />{t("تسجيل الخروج", "Abmelden", "Log out")}</Button>
        </div>}
      </div>
      {isAdmin && renameOpen && <Dialog open={renameOpen} onOpenChange={setRenameOpen}><DialogContent className="w-[calc(100%-24px)] max-w-[360px]" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle>تعديل الأسماء <span className="text-sm italic text-muted-foreground">| Namen ändern</span></DialogTitle><DialogDescription>تظهر على كل الأجهزة | Gilt auf allen Geräten</DialogDescription></DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block font-bold">اسم وضع الإدارة<input value={draft.admin} onChange={(e) => setDraft({ ...draft, admin: e.target.value })} className={inputCls} /></label>
          <label className="block font-bold">اسم وضع المعاينة كحاج<input value={draft.haj} onChange={(e) => setDraft({ ...draft, haj: e.target.value })} className={inputCls} /></label>
          <label className="block font-bold">اسم دخول الحاج (المسؤول الميداني)<input value={draft.leader} onChange={(e) => setDraft({ ...draft, leader: e.target.value })} className={inputCls} /></label>
          <Button className="h-11 w-full" onClick={saveLabels}>حفظ <span className="text-xs italic opacity-75">| Speichern</span></Button>
        </div>
      </DialogContent></Dialog>}
      {isAdmin && trashOpen && <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} content={content} password={s.password} />}
      {isAdmin && secOpen && <SecurityDialog open={secOpen} onOpenChange={setSecOpen} password={s.password} />}
    </>
  );
}

const sectionNames: Record<string, string> = { trips: "الرحلات | Reisen", news: "الأخبار | News", duas: "الأدعية والزيارات | Ziyarat", contacts: "التواصل | Kontakte", itinerary: "جدول الرحلة | Programm", locations: "المواقع | Orte", faqs: "الأسئلة | FAQ", occasions: "المناسبات | Anlässe", hadiths: "الأحاديث | Hadithe", rooms: "تسكين الزوار | Zimmer", guidelines: "الإرشادات | Hinweise", iraqItems: "زيارة العراق | Irak", emergency: "الطوارئ | Notfall", tripTypes: "أنواع الزيارة | Reisearten", shrines: "المراقد | Schreine", visaNotes: "الفيزا | Visum", donations: "التبرعات | Spenden", memories: "الذكريات | Erinnerungen" };
const titleKeys = ["name", "nameAr", "titleAr", "ar", "destAr", "qAr", "labelAr", "title", "label", "dateAr", "de", "nameDe", "titleDe", "destDe", "qDe", "phone", "number", "url"];
function labelOf(item: unknown) {
  const o = (item ?? {}) as Record<string, unknown>;
  for (const k of titleKeys) { const v = o[k]; if (typeof v === "string" && v.trim()) { const t = v.trim(); return t.length > 80 ? `${t.slice(0, 80)}…` : t; } }
  const any = Object.entries(o).find(([k, v]) => k !== "id" && typeof v === "string" && v.trim());
  return any ? String(any[1]).slice(0, 80) : "—";
}
function detailOf(item: unknown) {
  const o = (item ?? {}) as Record<string, unknown>;
  return ["city", "hotel", "floor", "room", "date", "destDe"].map((k) => o[k]).filter((v) => typeof v === "string" && v.trim()).join(" · ");
}

function TrashDialog({ open, onOpenChange, content, password }: { open: boolean; onOpenChange: (o: boolean) => void; content: SiteContent; password: string }) {
  const qc = useQueryClient();
  const trash = content.trash ?? [];
  const save = (next: SiteContent) => saveOrQueue(password, next, "سلة المحذوفات | Papierkorb", qc).catch((e) => window.alert(`تعذّر الحفظ | Fehler\n${e instanceof Error ? e.message : e}`));
  const restore = (t: TrashEntry) => {
    const list = (content as unknown as Record<string, unknown[]>)[t.section] ?? [];
    save({ ...content, [t.section]: [...list, t.item], trash: trash.filter((x) => x.id !== t.id) } as SiteContent);
  };
  const purge = (t: TrashEntry) => { if (window.confirm("حذف نهائي؟ لا يمكن التراجع.\nEndgültig löschen?")) save({ ...content, trash: trash.filter((x) => x.id !== t.id) }); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle>سلة المحذوفات <span className="text-sm italic text-muted-foreground">| Papierkorb</span></DialogTitle><DialogDescription>كل ما يُحذف يبقى هنا ويمكن إرجاعه لمكانه. | Gelöschtes kann wiederhergestellt werden.</DialogDescription></DialogHeader>
        {trash.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">السلة فارغة | Papierkorb leer</p> : <ul className="space-y-2">
          {trash.map((t) => <li key={t.id} className="rounded-md border border-border bg-card p-3 text-sm">
            <p className="font-bold text-primary">{labelOf(t.item)}</p>
            {detailOf(t.item) && <p className="text-xs text-foreground/80">{detailOf(t.item)}</p>}
            <p className="text-xs text-muted-foreground">{sectionNames[t.section] ?? t.section} · <span dir="ltr">{new Date(t.deletedAt).toLocaleString("de-DE")}</span></p>
            <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => restore(t)}><RotateCcw />إرجاع <span className="text-xs italic">| Wiederherstellen</span></Button><Button size="sm" variant="outline" className="text-destructive" onClick={() => purge(t)}><Trash2 />نهائي</Button></div>
          </li>)}
        </ul>}
      </DialogContent>
    </Dialog>
  );
}

function SecurityDialog({ open, onOpenChange, password }: { open: boolean; onOpenChange: (o: boolean) => void; password: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getSecurityOverview>> | null>(null);
  const [target, setTarget] = useState<"haj" | "admin">("haj");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => getSecurityOverview({ data: { password } }).then(setData).catch(() => {});
  useEffect(() => { load(); localStorage.setItem("security-seen", String(Date.now())); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function change() {
    if (pw1.length < 6) return setMsg("6 أحرف على الأقل | Mindestens 6 Zeichen");
    if (pw1 !== pw2) return setMsg("الرمزان غير متطابقين | Codes stimmen nicht überein");
    const r = await changeAdminPassword({ data: { password, newPassword: pw1, target } }).catch(() => ({ ok: false }));
    if (!r.ok) return setMsg("تعذّر الحفظ (قد يكون الرمز مستخدماً للطرف الآخر) | Fehlgeschlagen");
    if (target === "admin") updatePassword(pw1);
    setPw1(""); setPw2(""); setMsg("تم تغيير الرمز ✓ | Code geändert ✓"); load();
  }
  const device = (ua: string) => /iphone|ipad/i.test(ua) ? "iPhone/iPad" : /android/i.test(ua) ? "Android" : /mac/i.test(ua) ? "Mac" : /windows/i.test(ua) ? "Windows" : "جهاز | Gerät";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle>الأمان والأجهزة <span className="text-sm italic text-muted-foreground">| Sicherheit</span></DialogTitle><DialogDescription>الأجهزة المسجلة والمحاولات الخاطئة. | Angemeldete Geräte und Fehlversuche.</DialogDescription></DialogHeader>
        <section className="space-y-2 text-sm">
          <h3 className="flex items-center gap-1.5 font-bold text-primary"><Smartphone className="h-4 w-4" />الأجهزة المسجلة ({data?.devices.length ?? "…"})</h3>
          {data?.devices.map((d) => <div key={d.id} className="flex justify-between rounded-md bg-muted p-2 text-xs"><span>{d.role === "admin" ? "الإدارة 🔑" : "الحاج 📿"} · {device(d.ua)}</span><span dir="ltr">{new Date(d.lastSeen).toLocaleString("de-DE")}</span></div>)}
          {data?.devices.length ? <Button size="sm" variant="outline" onClick={() => clearSecurityLog({ data: { password, what: "devices" } }).then(load)}>مسح القائمة | Liste leeren</Button> : null}
        </section>
        <section className="space-y-2 border-t border-border pt-3 text-sm">
          <h3 className="flex items-center gap-1.5 font-bold text-destructive"><ShieldAlert className="h-4 w-4" />محاولات خاطئة ({data?.failures.length ?? "…"})</h3>
          {data?.failures.length === 0 && <p className="text-xs text-muted-foreground">لا توجد محاولات خاطئة ✓ | Keine Fehlversuche</p>}
          {data?.failures.map((f, i) => <div key={i} className="flex justify-between rounded-md bg-destructive/10 p-2 text-xs"><span>{device(f.ua)}</span><span dir="ltr">{new Date(f.at).toLocaleString("de-DE")}</span></div>)}
          {data?.failures.length ? <Button size="sm" variant="outline" onClick={() => clearSecurityLog({ data: { password, what: "failures" } }).then(load)}>مسح السجل | Leeren</Button> : null}
        </section>
        <section className="space-y-2 border-t border-border pt-3 text-sm">
          <h3 className="flex items-center gap-1.5 font-bold text-primary"><KeyRound className="h-4 w-4" />تغيير الرموز السرية</h3>
          {data && !data.hajSet && <p className="rounded-md bg-accent p-2 text-xs">لم يُحدَّد رمز الحاج بعد — حدّده هنا ليتمكن من الدخول. | Code für den Hajj noch nicht gesetzt.</p>}
          <div className="grid grid-cols-2 gap-2"><Button size="sm" variant={target === "haj" ? "default" : "outline"} onClick={() => setTarget("haj")}>رمز الحاج 📿</Button><Button size="sm" variant={target === "admin" ? "default" : "outline"} onClick={() => setTarget("admin")}>رمز الإدارة 🔑</Button></div>
          <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="الرمز الجديد | Neuer Code" className={inputCls} dir="ltr" />
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="تأكيد الرمز | Bestätigen" className={inputCls} dir="ltr" />
          <Button className="w-full" onClick={change}>حفظ الرمز | Speichern</Button>
          {msg && <p className="text-xs text-primary">{msg}</p>}
          <p className="text-[11px] text-muted-foreground">عند تغيير رمز طرفٍ ما، تُسجَّل أجهزته خروجاً ويدخل بالرمز الجديد. | Geräte dieser Rolle melden sich mit dem neuen Code neu an.</p>
        </section>
      </DialogContent>
    </Dialog>
  );
}
