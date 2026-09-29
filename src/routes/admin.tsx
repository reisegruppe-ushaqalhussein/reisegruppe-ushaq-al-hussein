import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { clearSynced, flushQueue, getQueue, idbGet, isOnline, onQueueChange, saveOrQueue, type QueueItem } from "@/lib/offline";
import { useOnline } from "@/components/offline-status";
import { Bell, BookOpen, CalendarClock, CheckCircle2, Clock, CreditCard, Home, Hotel, KeyRound, Lock, MapPin, Megaphone, Plane, Plus, Save, Trash2, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { changeAdminPassword, checkAdminPassword, getSiteContent, sendAlertPush } from "@/lib/site-content.functions";
import { duaCategories, duaCategoryOf, type DuaCategory, type LocationKind, type SiteContent } from "@/lib/site-content";
import { ADMIN_KEY, RecitersEditor } from "@/components/dua-admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة | Verwaltung — عشاق الحسين" },
      { name: "description", content: "لوحة إدارة محتوى الحملة | Inhaltsverwaltung der Reisegruppe" },
      { property: "og:title", content: "لوحة الإدارة | Verwaltung" },
      { property: "og:description", content: "لوحة إدارة محتوى الحملة | Inhaltsverwaltung" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function L({ ar, de }: { ar: string; de: string }) {
  return (
    <span className="block text-sm font-bold text-primary">
      {ar} <span lang="de" dir="ltr" className="text-xs font-medium italic text-muted-foreground">| {de}</span>
    </span>
  );
}

const inputCls = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ ar, de, value, onChange, multiline, ltr }: { ar: string; de: string; value: string; onChange: (v: string) => void; multiline?: boolean; ltr?: boolean }) {
  return (
    <label className="block">
      <L ar={ar} de={de} />
      {multiline ? (
        <textarea dir={ltr ? "ltr" : "rtl"} rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      ) : (
        <input dir={ltr ? "ltr" : "rtl"} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
    </label>
  );
}

function Section({ id, ar, de, children }: { id?: string; ar: string; de: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-4 border-b border-border pb-2 text-base"><L ar={ar} de={de} /></h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function VisibilityToggle({ checked, onCheckedChange, ar, de }: { checked: boolean; onCheckedChange: (checked: boolean) => void; ar: string; de: string }) {
  return <label className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted p-3"><L ar={ar} de={de} /><Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={`${ar} | ${de}`} /></label>;
}

const adminAreas = [
  { id: "alerts", ar: "التنبيهات", de: "Meldungen", icon: Bell },
  { id: "trips", ar: "الرحلات", de: "Reisen", icon: Plane },
  { id: "itinerary", ar: "الجدول", de: "Tagesplan", icon: CalendarClock },
  { id: "contacts", ar: "التواصل", de: "Kontakte", icon: Users },
  { id: "locations", ar: "المواقع", de: "Orte", icon: MapPin },
  { id: "program", ar: "البرنامج", de: "Programm", icon: Hotel },
  { id: "payment", ar: "الدفع", de: "Zahlung", icon: CreditCard },
  { id: "news", ar: "الأخبار", de: "News", icon: Megaphone },
  { id: "duas", ar: "الزيارات", de: "Ziyarat", icon: BookOpen },
  { id: "security", ar: "الأمان", de: "Sicherheit", icon: KeyRound },
];

function AdminPage() {
  const check = useServerFn(checkAdminPassword);
  const load = useServerFn(getSiteContent);
  const changePw = useServerFn(changeAdminPassword);
  const pushAlert = useServerFn(sendAlertPush);
  const [savedAlert, setSavedAlert] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "short" | "mismatch" | "saved" | "failed">("idle");

  async function onChangePw() {
    if (newPw.length < 6) return setPwStatus("short");
    if (newPw !== newPw2) return setPwStatus("mismatch");
    try {
      const res = await changePw({ data: { password, newPassword: newPw } });
      if (!res.ok) return setPwStatus("failed");
      setPassword(newPw); sessionStorage.setItem(ADMIN_KEY, newPw); setNewPw(""); setNewPw2(""); setPwStatus("saved");
    } catch { setPwStatus("failed"); }
  }
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "queued" | "failed">("idle");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!isOnline()) {
      const cached = await idbGet<SiteContent>("content");
      if (cached && sessionStorage.getItem(ADMIN_KEY) === password) { setError(false); return setContent(cached); }
      return setError(true);
    }
    const { ok } = await check({ data: { password } });
    if (!ok) return setError(true);
    setError(false);
    sessionStorage.setItem(ADMIN_KEY, password);
    const loaded = await load();
    setSavedAlert(loaded.alert.active ? loaded.alert.ar + loaded.alert.de : "");
    setContent(loaded);
  }

  async function onSave() {
    if (!content) return;
    setStatus("saving");
    try {
      const { queued } = await saveOrQueue(password, content, "لوحة الإدارة | Verwaltung");
      setStatus(queued ? "queued" : "saved");
      const key = content.alert.active ? content.alert.ar + content.alert.de : "";
      if (!queued && key && key !== savedAlert) {
        setSavedAlert(key);
        const r = await pushAlert({ data: { password, title: "تنبيه عاجل | Eilmeldung", body: [content.alert.ar, content.alert.de].filter(Boolean).join("\n") } }).catch(() => null);
        if (r?.ok) window.alert(`تم إرسال الإشعار إلى ${r.sent} جهاز | Benachrichtigung an ${r.sent} Geräte gesendet`);
      }
    } catch (e) {
      console.error(e);
      setStatus("failed");
      window.alert(`تعذّر الحفظ | Speichern fehlgeschlagen\n\n${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const update = (fn: (c: SiteContent) => SiteContent) => { setContent((c) => (c ? fn(structuredClone(c)) : c)); setStatus("idle"); };

  return (
    <div className="min-h-screen bg-muted">
      <main className="mx-auto min-h-screen w-full max-w-[520px] bg-background pb-28">
        <header className="bg-primary px-5 py-6 text-center text-primary-foreground">
          <Link to="/" className="mb-4 flex h-11 items-center justify-center gap-2 rounded-md bg-secondary text-sm font-bold text-secondary-foreground shadow-sm hover:bg-secondary/90">
            <Home className="h-4 w-4" aria-hidden="true" />العودة للرئيسية <span lang="de" className="text-xs italic opacity-80">| Zur Startseite</span>
          </Link>
          <p className="text-sm font-extrabold">حملة عشاق الحسين (ع) — ألمانيا</p>
          <div className="gold-line mx-auto my-3 h-px w-24" />
          <h1 className="font-bold">لوحة الإدارة</h1>
          <p lang="de" dir="ltr" className="text-xs italic text-primary-foreground/65">Verwaltung</p>
        </header>

        {!content ? (
          <form onSubmit={login} className="mx-4 mt-8 rounded-lg border border-border bg-card p-5 shadow-sm">
            <Lock className="mx-auto mb-4 h-8 w-8 text-secondary" aria-hidden="true" />
            <label className="block">
              <L ar="كلمة السر" de="Passwort" />
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </label>
            {error && <p className="mt-2 text-sm text-destructive">كلمة السر غير صحيحة <span lang="de" className="italic">| Falsches Passwort</span></p>}
            <Button type="submit" className="mt-4 h-12 w-full">دخول <span className="text-xs italic opacity-75">| Anmelden</span></Button>
            <Link to="/" className="mt-4 block text-center text-sm text-muted-foreground underline">العودة للتطبيق | Zurück zur App</Link>
          </form>
        ) : (
          <div className="space-y-4 px-4 py-5">
            <SyncQueue password={password} />
            <nav className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-3 shadow-sm" aria-label="أقسام لوحة الإدارة | Verwaltungsbereiche">
              {adminAreas.map(({ id, ar, de, icon: Icon }) => <a key={id} href={`#${id}`} className="flex min-h-14 items-center gap-2 rounded-md bg-muted px-3 py-2 text-primary transition-colors hover:bg-accent"><Icon className="h-4 w-4 shrink-0 text-secondary" /><span className="text-xs font-bold">{ar}<span lang="de" dir="ltr" className="block text-[10px] font-medium italic text-muted-foreground">{de}</span></span></a>)}
            </nav>
            <Section id="alerts" ar="التنبيه العاجل" de="Eilmeldung">
              <Field multiline ar="نص التنبيه (عربي)" de="Text (Arabisch)" value={content.alert.ar} onChange={(v) => update((c) => { c.alert.ar = v; return c; })} />
              <Field multiline ltr ar="نص التنبيه (ألماني)" de="Text (Deutsch)" value={content.alert.de} onChange={(v) => update((c) => { c.alert.de = v; return c; })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={content.alert.active} onChange={(e) => update((c) => { c.alert.active = e.target.checked; return c; })} className="h-4 w-4 accent-secondary" />
                <L ar="إظهار التنبيه للزوار (يُرسل إشعاراً للهواتف عند الحفظ)" de="Anzeigen (sendet beim Speichern eine Push-Benachrichtigung)" />
              </label>
            </Section>

            <Section id="trips" ar="الرحلات والتواريخ" de="Reisen & Termine">
              {content.trips.map((t, i) => (
                <div key={t.id} className="space-y-3 rounded-md border border-border p-3">
                  <Field ar="اسم الرحلة" de="Reisename" value={t.ar} onChange={(v) => update((c) => { c.trips[i]!.ar = v; return c; })} />
                  <Field ar="الاسم بالألمانية" de="Name auf Deutsch" ltr value={t.de} onChange={(v) => update((c) => { c.trips[i]!.de = v; return c; })} />
                  <Field ar="التاريخ" de="Datum" ltr value={t.date} onChange={(v) => update((c) => { c.trips[i]!.date = v; return c; })} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={t.visible} onChange={(e) => update((c) => { c.trips[i]!.visible = e.target.checked; return c; })} className="h-4 w-4 accent-secondary" />
                    <L ar="إظهار للزوار" de="Für Besucher sichtbar" />
                  </label>
                </div>
              ))}
            </Section>

            <Section id="itinerary" ar="جدول الرحلة والفعاليات" de="Tagesprogramm">
              {content.itinerary.map((item, i) => <div key={item.id} className="space-y-3 rounded-md border border-border p-3">
                <div className="grid grid-cols-2 gap-2"><Field ltr ar="التاريخ" de="Datum" value={item.date} onChange={(v) => update((c) => { c.itinerary[i]!.date = v; return c; })} /><Field ltr ar="الوقت" de="Uhrzeit" value={item.time} onChange={(v) => update((c) => { c.itinerary[i]!.time = v; return c; })} /></div>
                <Field ar="عنوان الفعالية" de="Titel (Arabisch)" value={item.titleAr} onChange={(v) => update((c) => { c.itinerary[i]!.titleAr = v; return c; })} />
                <Field ltr ar="العنوان بالألمانية" de="Titel (Deutsch)" value={item.titleDe} onChange={(v) => update((c) => { c.itinerary[i]!.titleDe = v; return c; })} />
                <Field ar="مكان التجمع" de="Treffpunkt" value={item.place} onChange={(v) => update((c) => { c.itinerary[i]!.place = v; return c; })} />
                <Field multiline ar="ملاحظات" de="Hinweise" value={item.notes} onChange={(v) => update((c) => { c.itinerary[i]!.notes = v; return c; })} />
                <VisibilityToggle checked={item.gathering} onCheckedChange={(v) => update((c) => { c.itinerary[i]!.gathering = v; return c; })} ar="تمييز كموعد تجمع" de="Als Sammelzeit markieren" />
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => update((c) => { c.itinerary.splice(i, 1); return c; })}><Trash2 />حذف <span className="text-xs italic">| Löschen</span></Button>
              </div>)}
              <Button variant="outline" className="w-full" onClick={() => update((c) => { c.itinerary.push({ id: `e${Date.now()}`, date: new Date().toISOString().slice(0, 10), time: "08:00", titleAr: "", titleDe: "", place: "", notes: "", gathering: false }); return c; })}><Plus />إضافة فعالية <span className="text-xs italic">| Programmpunkt hinzufügen</span></Button>
            </Section>

            <Section id="contacts" ar="جهات التواصل" de="Kontakte">
              <VisibilityToggle checked={content.contactsVisible} onCheckedChange={(v) => update((c) => { c.contactsVisible = v; return c; })} ar="إظهار قسم التواصل كاملاً" de="Gesamten Kontaktbereich anzeigen" />
              {content.contacts.map((contact, i) => <div key={contact.id} className="space-y-3 rounded-md border border-border p-3">
                <VisibilityToggle checked={contact.visible !== false} onCheckedChange={(v) => update((c) => { c.contacts[i]!.visible = v; return c; })} ar="إظهار جهة التواصل" de="Kontakt anzeigen" />
                <Field ar="الاسم" de="Name (Arabisch)" value={contact.ar} onChange={(v) => update((c) => { c.contacts[i]!.ar = v; return c; })} />
                <Field ltr ar="الاسم بالألمانية" de="Name (Deutsch)" value={contact.de} onChange={(v) => update((c) => { c.contacts[i]!.de = v; return c; })} />
                <Field ar="الصفة" de="Rolle (Arabisch)" value={contact.roleAr} onChange={(v) => update((c) => { c.contacts[i]!.roleAr = v; return c; })} />
                <Field ltr ar="الصفة بالألمانية" de="Rolle (Deutsch)" value={contact.roleDe} onChange={(v) => update((c) => { c.contacts[i]!.roleDe = v; return c; })} />
                <Field ltr ar="رقم الهاتف" de="Telefonnummer" value={contact.phone} onChange={(v) => update((c) => { c.contacts[i]!.phone = v; return c; })} />
                <Field ltr ar="رابط واتساب" de="WhatsApp-Link" value={contact.whatsapp} onChange={(v) => update((c) => { c.contacts[i]!.whatsapp = v; return c; })} />
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => update((c) => { c.contacts.splice(i, 1); return c; })}><Trash2 />حذف <span className="text-xs italic">| Löschen</span></Button>
              </div>)}
              <Button variant="outline" className="w-full" onClick={() => update((c) => { c.contacts.push({ id: `c${Date.now()}`, ar: "", de: "", roleAr: "", roleDe: "", phone: "", whatsapp: "", visible: true }); return c; })}><Plus />إضافة جهة تواصل <span className="text-xs italic">| Kontakt hinzufügen</span></Button>
            </Section>

            <Section id="locations" ar="دليل الإقامة والمواقع" de="Unterkunft & Orte">
              {content.locations.map((location, i) => <div key={location.id} className="space-y-3 rounded-md border border-border p-3">
                <label className="block"><L ar="النوع" de="Art" /><select value={location.kind} onChange={(e) => update((c) => { c.locations[i]!.kind = e.target.value as LocationKind; return c; })} className={inputCls}><option value="hotel">فندق | Hotel</option><option value="shrine">مرقد | Heiliger Ort</option><option value="gathering">نقطة تجمع | Treffpunkt</option></select></label>
                <Field ar="الاسم" de="Name (Arabisch)" value={location.ar} onChange={(v) => update((c) => { c.locations[i]!.ar = v; return c; })} />
                <Field ltr ar="الاسم بالألمانية" de="Name (Deutsch)" value={location.de} onChange={(v) => update((c) => { c.locations[i]!.de = v; return c; })} />
                <Field ar="العنوان" de="Adresse" value={location.address} onChange={(v) => update((c) => { c.locations[i]!.address = v; return c; })} />
                <Field ltr ar="رابط خرائط Google" de="Google-Maps-Link" value={location.mapsUrl} onChange={(v) => update((c) => { c.locations[i]!.mapsUrl = v; return c; })} />
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => update((c) => { c.locations.splice(i, 1); return c; })}><Trash2 />حذف <span className="text-xs italic">| Löschen</span></Button>
              </div>)}
              <Button variant="outline" className="w-full" onClick={() => update((c) => { c.locations.push({ id: `l${Date.now()}`, kind: "hotel", ar: "", de: "", address: "", mapsUrl: "" }); return c; })}><Plus />إضافة موقع <span className="text-xs italic">| Ort hinzufügen</span></Button>
            </Section>

            <Section id="program" ar="أسماء الفنادق" de="Hotelnamen">
              <Field ar="الكاظمية" de="al-Kazimiyya" value={content.hotels.kadhimiya} onChange={(v) => update((c) => { c.hotels.kadhimiya = v; return c; })} />
              <Field ar="كربلاء" de="Kerbela" value={content.hotels.karbala} onChange={(v) => update((c) => { c.hotels.karbala = v; return c; })} />
              <Field ar="النجف" de="Nadschaf" value={content.hotels.najaf} onChange={(v) => update((c) => { c.hotels.najaf = v; return c; })} />
            </Section>

            <Section ar="تفاصيل البرنامج والفيزا" de="Programm & Visum">
              <Field multiline ar="تفاصيل البرنامج (عربي)" de="Programm (Arabisch)" value={content.program.ar} onChange={(v) => update((c) => { c.program.ar = v; return c; })} />
              <Field multiline ltr ar="تفاصيل البرنامج (ألماني)" de="Programm (Deutsch)" value={content.program.de} onChange={(v) => update((c) => { c.program.de = v; return c; })} />
              <Field ltr ar="رسوم الفيزا — جواز أوروبي" de="Visumgebühr — EU-Reisepass" value={content.visa.eu} onChange={(v) => update((c) => { c.visa.eu = v; return c; })} />
              <Field ltr ar="رسوم الفيزا — جواز غير أوروبي" de="Visumgebühr — Nicht-EU-Reisepass" value={content.visa.nonEu} onChange={(v) => update((c) => { c.visa.nonEu = v; return c; })} />
              <p className="text-xs text-muted-foreground">اتركها فارغة لعرض «سيتم تحديدها لاحقاً» <span lang="de" className="italic">| Leer lassen für „wird noch bekannt gegeben“</span></p>
            </Section>

            <Section id="payment" ar="طرق الدفع والتحويل" de="Zahlungsmethoden">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={content.payment.visible} onChange={(e) => update((c) => { c.payment.visible = e.target.checked; return c; })} className="h-4 w-4 accent-secondary" />
                <L ar="إظهار بيانات التحويل للزوار" de="Zahlungsdaten für Besucher anzeigen" />
              </label>
              <Field ar="اسم صاحب الحساب" de="Kontoinhaber" value={content.payment.accountName} onChange={(v) => update((c) => { c.payment.accountName = v; return c; })} />
              <Field ar="اسم البنك" de="Bankname" value={content.payment.bankName} onChange={(v) => update((c) => { c.payment.bankName = v; return c; })} />
              <Field ltr ar="رقم الحساب الدولي IBAN" de="IBAN" value={content.payment.iban} onChange={(v) => update((c) => { c.payment.iban = v; return c; })} />
              <Field ltr ar="رمز البنك BIC" de="BIC" value={content.payment.bic} onChange={(v) => update((c) => { c.payment.bic = v; return c; })} />
              <p className="text-xs text-muted-foreground">القسم مخفي مبدئياً؛ أدخل البيانات الصحيحة ثم فعّل خيار الإظهار. <span lang="de" dir="ltr" className="block italic">Der Bereich ist zunächst ausgeblendet. Tragen Sie die korrekten Daten ein und aktivieren Sie ihn anschließend.</span></p>
            </Section>

            <Section id="news" ar="الأخبار والتنبيهات" de="Neuigkeiten & Hinweise">
              {content.news.map((n, i) => (
                <div key={i} className="space-y-3 rounded-md border border-border p-3">
                  <Field ar="العنوان (عربي)" de="Titel (Arabisch)" value={n.ar} onChange={(v) => update((c) => { c.news[i]!.ar = v; return c; })} />
                  <Field ltr ar="العنوان (ألماني)" de="Titel (Deutsch)" value={n.de} onChange={(v) => update((c) => { c.news[i]!.de = v; return c; })} />
                  <Field multiline ar="النص (عربي)" de="Text (Arabisch)" value={n.bodyAr} onChange={(v) => update((c) => { c.news[i]!.bodyAr = v; return c; })} />
                  <Field multiline ltr ar="النص (ألماني)" de="Text (Deutsch)" value={n.bodyDe} onChange={(v) => update((c) => { c.news[i]!.bodyDe = v; return c; })} />
                  <Button variant="outline" size="sm" onClick={() => update((c) => { c.news.splice(i, 1); return c; })} className="text-destructive"><Trash2 />حذف <span className="text-xs italic">| Löschen</span></Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => update((c) => { c.news.unshift({ ar: "", de: "", bodyAr: "", bodyDe: "" }); return c; })} className="w-full"><Plus />إضافة إعلان جديد <span className="text-xs italic">| Neue Meldung</span></Button>
            </Section>

            <Section id="duas" ar="الأدعية والزيارات" de="Bittgebete & Ziyarat">
              {content.duas.map((d, i) => (
                <div key={d.id} className="space-y-3 rounded-md border border-border p-3">
                  <Field ar="الاسم (عربي)" de="Name (Arabisch)" value={d.ar} onChange={(v) => update((c) => { c.duas[i]!.ar = v; return c; })} />
                  <Field ltr ar="الاسم (ألماني)" de="Name (Deutsch)" value={d.de} onChange={(v) => update((c) => { c.duas[i]!.de = v; return c; })} />
                  <label className="block">
                    <L ar="التصنيف / المكان" de="Kategorie" />
                    <select value={duaCategoryOf(d)} onChange={(e) => update((c) => { c.duas[i]!.category = e.target.value as DuaCategory; return c; })} className={inputCls}>
                      {duaCategories.map((cat) => <option key={cat.id} value={cat.id}>{cat.de} ({cat.ar})</option>)}
                    </select>
                  </label>
                  <Field multiline ar="النص العربي" de="Arabischer Text" value={d.textAr} onChange={(v) => update((c) => { c.duas[i]!.textAr = v; return c; })} />
                  <Field multiline ltr ar="الكتابة اللاتينية / الترجمة" de="Transliteration / Übersetzung" value={d.textDe} onChange={(v) => update((c) => { c.duas[i]!.textDe = v; return c; })} />
                  <RecitersEditor value={d.reciters ?? []} onChange={(v) => update((c) => { c.duas[i]!.reciters = v; return c; })} />
                  <Field ltr ar="رابط PDF أو Google Drive" de="PDF- oder Google-Drive-Link" value={d.link} onChange={(v) => update((c) => { c.duas[i]!.link = v; return c; })} />
                  <Button variant="outline" size="sm" onClick={() => update((c) => { c.duas.splice(i, 1); return c; })} className="text-destructive"><Trash2 />حذف <span className="text-xs italic">| Löschen</span></Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => update((c) => { c.duas.push({ id: `d${Date.now()}`, ar: "", de: "", textAr: "", textDe: "", link: "" }); return c; })} className="w-full"><Plus />إضافة دعاء / زيارة <span className="text-xs italic">| Neues Bittgebet</span></Button>
            </Section>

            <Section id="security" ar="تغيير كلمة السر" de="Passwort ändern">
              <label className="block"><L ar="كلمة السر الجديدة" de="Neues Passwort" /><input type="password" autoComplete="new-password" value={newPw} onChange={(e) => { setNewPw(e.target.value); setPwStatus("idle"); }} className={inputCls} /></label>
              <label className="block"><L ar="تأكيد كلمة السر" de="Passwort bestätigen" /><input type="password" autoComplete="new-password" value={newPw2} onChange={(e) => { setNewPw2(e.target.value); setPwStatus("idle"); }} className={inputCls} /></label>
              {pwStatus === "short" && <p className="text-sm text-destructive">6 أحرف على الأقل <span lang="de" className="italic">| Mindestens 6 Zeichen</span></p>}
              {pwStatus === "mismatch" && <p className="text-sm text-destructive">كلمتا السر غير متطابقتين <span lang="de" className="italic">| Passwörter stimmen nicht überein</span></p>}
              {pwStatus === "failed" && <p className="text-sm text-destructive">تعذّر التغيير <span lang="de" className="italic">| Änderung fehlgeschlagen</span></p>}
              {pwStatus === "saved" && <p className="text-sm text-success-foreground">تم تغيير كلمة السر <span lang="de" className="italic">| Passwort geändert</span></p>}
              <Button variant="outline" onClick={onChangePw} className="w-full"><KeyRound />حفظ كلمة السر <span className="text-xs italic">| Passwort speichern</span></Button>
            </Section>
          </div>
        )}
      </main>

      {content && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[520px] border-t border-border bg-card/95 p-3 backdrop-blur-md">
          {status === "saved" && <p className="mb-2 text-center text-sm text-success-foreground">تم الحفظ بنجاح <span lang="de" className="italic">| Gespeichert</span></p>}
          {status === "queued" && <p className="mb-2 text-center text-sm text-secondary">محفوظ محلياً — بانتظار المزامنة <span lang="de" className="italic">| Lokal gespeichert – wartet auf Sync</span></p>}
          {status === "failed" && <p className="mb-2 text-center text-sm text-destructive">تعذّر الحفظ <span lang="de" className="italic">| Speichern fehlgeschlagen</span></p>}
          <Button onClick={onSave} disabled={status === "saving"} className="h-12 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Save />حفظ التغييرات <span className="text-xs italic opacity-75">| Änderungen speichern</span>
          </Button>
        </div>
      )}
    </div>
  );
}

function SyncQueue({ password }: { password: string }) {
  const online = useOnline();
  const [items, setItems] = useState<QueueItem[]>([]);
  useEffect(() => { const load = () => { getQueue().then(setItems); }; load(); return onQueueChange(load); }, []);
  useEffect(() => { if (online) flushQueue(password); }, [online, password]);
  if (!items.length) return null;
  const pending = items.filter((i) => i.status === "pending").length;
  const synced = items.filter((i) => i.status === "synced").length;
  return (
    <Section ar="قائمة المزامنة" de="Sync-Warteschlange">
      <div className="flex gap-2 text-xs font-bold">
        <span className="rounded-full bg-secondary/15 px-3 py-1 text-secondary">بانتظار: {pending} | Ausstehend</span>
        <span className="rounded-full bg-muted px-3 py-1 text-primary">تمت: {synced} | Synchronisiert</span>
      </div>
      <ul className="space-y-2 text-sm">
        {items.slice().reverse().map((i) => (
          <li key={i.id} className="flex items-start gap-2 rounded-md border border-border p-2">
            {i.status === "pending" ? <Clock className="h-4 w-4 text-secondary" /> : i.status === "synced" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
            <div className="flex-1">
              <p>{i.label}</p>
              <p dir="ltr" className="text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleString("de-DE")} · {i.status === "pending" ? "Pending Sync" : i.status === "synced" ? "Synced" : `Failed: ${i.error ?? ""}`}</p>
            </div>
          </li>
        ))}
      </ul>
      {synced > 0 && <Button variant="outline" size="sm" onClick={() => clearSynced()}>مسح المتزامنة <span className="text-xs italic">| Erledigte entfernen</span></Button>}
    </Section>
  );
}
