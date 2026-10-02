import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, KeyRound, LogOut, Pencil, RotateCcw, ShieldAlert, Trash2, LayoutDashboard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loginWithCode, logout, setMode, updatePassword, useAdminSession } from "@/lib/admin-session";
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
  const s = useAdminSession();
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
  if (!s) return null;
  const isAdmin = s.role === "admin";
  const trashCount = content.trash?.length ?? 0;
  const btn = "h-8 gap-1 px-2 text-[11px] text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground";
  return (
    <>
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-1 border-b border-secondary bg-primary px-2 py-1.5 text-primary-foreground shadow-md" dir="rtl">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-extrabold text-secondary-foreground">{isAdmin ? (s.mode === "admin" ? "الإدارة ✏️" : "معاينة كحاج 👁️") : "مسؤول الحملة 📿"}</span>
        {isAdmin && <Button size="sm" variant="ghost" className={btn} onClick={() => setMode(s.mode === "admin" ? "haj" : "admin")}>{s.mode === "admin" ? <><Eye className="h-3.5 w-3.5" />معاينة كحاج</> : <><Pencil className="h-3.5 w-3.5" />وضع الإدارة</>}</Button>}
        {isAdmin && <Button size="sm" variant="ghost" className={btn} onClick={() => setTrashOpen(true)}><Trash2 className="h-3.5 w-3.5" />المحذوفات{trashCount > 0 && <span className="rounded-full bg-secondary px-1.5 text-[10px] text-secondary-foreground">{trashCount}</span>}</Button>}
        {isAdmin && <Button size="sm" variant="ghost" className={btn} onClick={() => setSecOpen(true)}><ShieldAlert className="h-3.5 w-3.5" />الأمان{alerts > 0 && <span className="rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{alerts}</span>}</Button>}
        {isAdmin && <Button asChild size="sm" variant="ghost" className={btn}><Link to="/admin"><LayoutDashboard className="h-3.5 w-3.5" />اللوحة</Link></Button>}
        <Button size="sm" variant="ghost" className={btn} onClick={() => { if (window.confirm("تسجيل الخروج من هذا الجهاز؟\nAuf diesem Gerät abmelden?")) logout(); }}><LogOut className="h-3.5 w-3.5" />خروج</Button>
      </div>
      {isAdmin && trashOpen && <TrashDialog open={trashOpen} onOpenChange={setTrashOpen} content={content} password={s.password} />}
      {isAdmin && secOpen && <SecurityDialog open={secOpen} onOpenChange={setSecOpen} password={s.password} />}
    </>
  );
}

const sectionNames: Record<string, string> = { trips: "الرحلات | Reisen", news: "الأخبار | News", duas: "الأدعية والزيارات | Ziyarat", contacts: "التواصل | Kontakte", itinerary: "جدول الرحلة | Programm", locations: "المواقع | Orte", faqs: "الأسئلة | FAQ", occasions: "المناسبات | Anlässe", hadiths: "الأحاديث | Hadithe" };
function labelOf(item: unknown) {
  const o = (item ?? {}) as Record<string, unknown>;
  return String(o["ar"] || o["titleAr"] || o["qAr"] || o["de"] || o["titleDe"] || "—");
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
