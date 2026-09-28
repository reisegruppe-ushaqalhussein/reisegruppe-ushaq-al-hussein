import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { Lock, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkAdminPassword, getSiteContent, saveSiteContent } from "@/lib/site-content.functions";
import type { SiteContent } from "@/lib/site-content";

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

function Section({ ar, de, children }: { ar: string; de: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-4 border-b border-border pb-2 text-base"><L ar={ar} de={de} /></h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function AdminPage() {
  const check = useServerFn(checkAdminPassword);
  const load = useServerFn(getSiteContent);
  const save = useServerFn(saveSiteContent);
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const { ok } = await check({ data: { password } });
    if (!ok) return setError(true);
    setError(false);
    setContent(await load());
  }

  async function onSave() {
    if (!content) return;
    setStatus("saving");
    try {
      const res = await save({ data: { password, content } });
      setStatus(res.ok ? "saved" : "failed");
    } catch {
      setStatus("failed");
    }
  }

  const update = (fn: (c: SiteContent) => SiteContent) => { setContent((c) => (c ? fn(structuredClone(c)) : c)); setStatus("idle"); };

  return (
    <div className="min-h-screen bg-muted">
      <main className="mx-auto min-h-screen w-full max-w-[520px] bg-background pb-28">
        <header className="bg-primary px-5 py-6 text-center text-primary-foreground">
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
            <Section ar="الرحلات والتواريخ" de="Reisen & Termine">
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

            <Section ar="أسماء الفنادق" de="Hotelnamen">
              <Field ar="الكاظمية" de="Kadhimiya" value={content.hotels.kadhimiya} onChange={(v) => update((c) => { c.hotels.kadhimiya = v; return c; })} />
              <Field ar="كربلاء" de="Kerbela" value={content.hotels.karbala} onChange={(v) => update((c) => { c.hotels.karbala = v; return c; })} />
              <Field ar="النجف" de="Najaf" value={content.hotels.najaf} onChange={(v) => update((c) => { c.hotels.najaf = v; return c; })} />
            </Section>

            <Section ar="تفاصيل البرنامج والفيزا" de="Programm & Visum">
              <Field multiline ar="تفاصيل البرنامج (عربي)" de="Programm (Arabisch)" value={content.program.ar} onChange={(v) => update((c) => { c.program.ar = v; return c; })} />
              <Field multiline ltr ar="تفاصيل البرنامج (ألماني)" de="Programm (Deutsch)" value={content.program.de} onChange={(v) => update((c) => { c.program.de = v; return c; })} />
              <Field ltr ar="رسوم الفيزا — جواز أوروبي" de="Visumgebühr — EU-Reisepass" value={content.visa.eu} onChange={(v) => update((c) => { c.visa.eu = v; return c; })} />
              <Field ltr ar="رسوم الفيزا — جواز غير أوروبي" de="Visumgebühr — Nicht-EU-Reisepass" value={content.visa.nonEu} onChange={(v) => update((c) => { c.visa.nonEu = v; return c; })} />
              <p className="text-xs text-muted-foreground">اتركها فارغة لعرض «سيتم تحديدها لاحقاً» <span lang="de" className="italic">| Leer lassen für „wird noch bekannt gegeben“</span></p>
            </Section>

            <Section ar="الأخبار والتنبيهات" de="Neuigkeiten & Hinweise">
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
          </div>
        )}
      </main>

      {content && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[520px] border-t border-border bg-card/95 p-3 backdrop-blur-md">
          {status === "saved" && <p className="mb-2 text-center text-sm text-success-foreground">تم الحفظ بنجاح <span lang="de" className="italic">| Gespeichert</span></p>}
          {status === "failed" && <p className="mb-2 text-center text-sm text-destructive">تعذّر الحفظ <span lang="de" className="italic">| Speichern fehlgeschlagen</span></p>}
          <Button onClick={onSave} disabled={status === "saving"} className="h-12 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Save />حفظ التغييرات <span className="text-xs italic opacity-75">| Änderungen speichern</span>
          </Button>
        </div>
      )}
    </div>
  );
}
