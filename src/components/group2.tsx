import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ChevronDown, Compass, FileText, Music, ScrollText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, toEnglish } from "@/lib/i18n";
import { AddButton, ItemActions, useSaveContent, type FieldDef } from "@/components/inline-admin";
import type { ResourceEntry, SiteContent } from "@/lib/site-content";
import { useShowHidden } from "@/lib/admin-session";

type Admin = { password: string; content: SiteContent } | null;

function P({ ar, de, en }: { ar: string; de: string; en?: string }) {
  const { lang } = useLang();
  if (lang === "ar") return <span className="block">{ar || de}</span>;
  if (lang === "de") return <span dir="ltr" className="block">{de || ar}</span>;
  if (lang === "en") return <span dir="ltr" className="block">{en || toEnglish(de || ar)}</span>;
  return <span className="block">{ar && <span className="block">{ar}</span>}{de && <span lang="de" dir="ltr" className="block text-[0.8em] italic text-muted-foreground">{de}</span>}</span>;
}

function Title({ icon: Icon, ar, de }: { icon: typeof Compass; ar: string; de: string }) {
  return <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span><h2 className="text-xl text-primary"><P ar={ar} de={de} /></h2></div>;
}

/* ---------- Favorites (stored on the device) ---------- */
const FAV_KEY = "dua-favorites";
export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try { setIds(JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]")); } catch { /* ignore */ }
    const sync = () => { try { setIds(JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]")); } catch { /* ignore */ } };
    window.addEventListener("favorites-change", sync);
    return () => window.removeEventListener("favorites-change", sync);
  }, []);
  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
    navigator.vibrate?.(20);
    toast(ids.includes(id) ? "أُزيلت من محفوظاتك | Aus Favoriten entfernt" : "تمت الإضافة إلى محفوظاتك ⭐ | Zu Favoriten hinzugefügt", { duration: 4000, action: ids.includes(id) ? undefined : { label: "عرض | Ansehen", onClick: () => window.dispatchEvent(new Event("open-favorites")) } });
    setIds(next);
    window.dispatchEvent(new Event("favorites-change"));
  };
  return { ids, toggle, has: (id: string) => ids.includes(id) };
}

/* ---------- Qibla ---------- */
const KAABA = { lat: 21.4225, lng: 39.8262 };
function qiblaBearing(lat: number, lng: number) {
  const r = Math.PI / 180;
  const dL = (KAABA.lng - lng) * r;
  const y = Math.sin(dL);
  const x = Math.cos(lat * r) * Math.tan(KAABA.lat * r) - Math.sin(lat * r) * Math.cos(dL);
  return (Math.atan2(y, x) / r + 360) % 360;
}

type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number };

export function QiblaView() {
  const [bearing, setBearing] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onOrient = (e: Event) => {
      const ev = e as OrientationEvt;
      if (typeof ev.webkitCompassHeading === "number") setHeading(ev.webkitCompassHeading);
      else if (ev.absolute && typeof ev.alpha === "number") setHeading(360 - ev.alpha);
    };
    window.addEventListener("deviceorientationabsolute", onOrient);
    window.addEventListener("deviceorientation", onOrient);
    return () => { window.removeEventListener("deviceorientationabsolute", onOrient); window.removeEventListener("deviceorientation", onOrient); };
  }, []);

  const start = async () => {
    setError(null);
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (DOE?.requestPermission) { try { await DOE.requestPermission(); } catch { /* ignore */ } }
    if (!navigator.geolocation) { setError("geo"); return; }
    navigator.geolocation.getCurrentPosition((pos) => setBearing(qiblaBearing(pos.coords.latitude, pos.coords.longitude)), () => setError("geo"), { enableHighAccuracy: true, timeout: 15000 });
  };

  const arrow = bearing === null ? 0 : bearing - (heading ?? 0);
  const aligned = bearing !== null && heading !== null && Math.abs(((arrow % 360) + 540) % 360 - 180) < 5;
  useEffect(() => { if (aligned) navigator.vibrate?.(40); }, [aligned]);

  return (
    <div className="screen-enter px-4 py-7">
      <Title icon={Compass} ar="اتجاه القبلة" de="Qibla-Richtung" />
      <section className="rounded-lg bg-card p-6 text-center shadow-sm">
        <div className={`relative mx-auto grid h-64 w-64 place-items-center rounded-full border-4 ${aligned ? "border-success" : "border-secondary"} bg-muted`}>
          <span className="absolute top-2 text-xs font-bold text-muted-foreground">N</span>
          <div className="absolute inset-6 transition-transform duration-300" style={{ transform: `rotate(${arrow}deg)` }}>
            <div className="mx-auto h-1/2 w-2 rounded-full bg-secondary" />
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">🕋</span>
          </div>
          <span className="z-10 h-4 w-4 rounded-full bg-primary" />
        </div>
        {bearing !== null && <p dir="ltr" className="mt-5 text-2xl font-extrabold text-primary">{Math.round(bearing)}°</p>}
        <div className="mt-3 text-sm text-muted-foreground">
          {bearing === null ? <P ar="اضغط على الزر لتحديد موقعك وإظهار اتجاه القبلة." de="Tippen Sie auf die Taste, um Ihren Standort zu bestimmen." en="Tap the button to find your location and the Qibla." />
            : heading === null ? <P ar="البوصلة غير متاحة: وجّه أعلى الهاتف نحو الشمال ثم استدر بالزاوية الظاهرة باتجاه عقارب الساعة." de="Kompass nicht verfügbar: Richten Sie das Handy nach Norden und drehen Sie sich um den angezeigten Winkel im Uhrzeigersinn." en="Compass unavailable: point the phone north, then turn clockwise by the angle shown." />
            : aligned ? <P ar="أنت الآن باتجاه القبلة ✓" de="Sie sind jetzt in Qibla-Richtung ✓" en="You are facing the Qibla ✓" />
            : <P ar="أدر الهاتف حتى يشير السهم الذهبي إلى الأعلى." de="Drehen Sie das Handy, bis der goldene Pfeil nach oben zeigt." en="Turn the phone until the gold arrow points up." />}
        </div>
        {error && <p className="mt-3 text-sm text-destructive"><P ar="تعذّر تحديد الموقع. فعّل خدمة الموقع وحاول مجدداً." de="Standort nicht verfügbar. Bitte Ortungsdienste aktivieren." en="Location unavailable. Please enable location services." /></p>}
        <Button className="mt-6 h-12 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={start}><Compass /><P ar="تحديد اتجاه القبلة" de="Qibla bestimmen" en="Find Qibla" /></Button>
      </section>
    </div>
  );
}

/* ---------- Occasions & Hadiths ---------- */
const resourceFields: FieldDef[] = [
  { key: "ar", ar: "العنوان (عربي)", de: "Titel (Arabisch)" },
  { key: "de", ar: "العنوان (ألماني)", de: "Titel (Deutsch)", ltr: true },
  { key: "en", ar: "العنوان (إنجليزي)", de: "Titel (Englisch)", ltr: true },
  { key: "place", ar: "المكان / المناسبة", de: "Ort / Anlass" },
  { key: "textAr", ar: "النص (عربي)", de: "Text (Arabisch)", multiline: true },
  { key: "textDe", ar: "النص (ألماني)", de: "Text (Deutsch)", multiline: true, ltr: true },
  { key: "textEn", ar: "النص (إنجليزي)", de: "Text (Englisch)", multiline: true, ltr: true },
  { key: "pdfUrl", ar: "رابط ملف PDF", de: "PDF-Link", ltr: true },
  { key: "audioUrl", ar: "رابط ملف صوتي (MP3)", de: "Audio-Link (MP3)", ltr: true },
];
const blank = { ar: "", de: "", en: "", place: "", textAr: "", textDe: "", textEn: "", pdfUrl: "", audioUrl: "" };

function ResourceCard({ item, admin, onSave, onDelete, onHide }: { item: ResourceEntry; admin: Admin; onSave: (r: Record<string, unknown>) => Promise<void>; onDelete: () => Promise<void>; onHide: (h: boolean) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const { lang } = useLang();
  const text = lang === "ar" ? item.textAr : lang === "en" ? item.textEn || item.textDe : lang === "de" ? item.textDe : null;
  return (
    <article className={`rounded-lg border border-border bg-card p-4 shadow-sm ${item.hidden ? "opacity-55" : ""}`}>
      {admin && <ItemActions fields={resourceFields} item={item} hidden={item.hidden ?? false} onVisibilityChange={onHide} onSave={onSave} onDelete={onDelete} />}
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-2 text-right">
        <span className="min-w-0 flex-1 font-bold text-primary"><P ar={item.ar} de={item.de} en={item.en ?? ""} />{item.place && <span className="mt-1 block text-xs font-normal text-secondary">{item.place}</span>}</span>
        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-4 space-y-3 text-sm leading-relaxed">
        {text !== null ? text && <p dir={lang === "ar" ? "rtl" : "ltr"} className="whitespace-pre-line">{text}</p>
          : <>{item.textAr && <p dir="rtl" className="whitespace-pre-line">{item.textAr}</p>}{item.textDe && <p dir="ltr" lang="de" className="whitespace-pre-line italic text-muted-foreground">{item.textDe}</p>}</>}
        {item.audioUrl && <audio controls preload="none" src={item.audioUrl} className="w-full"><track kind="captions" /></audio>}
        {item.pdfUrl && <Button asChild variant="outline" className="h-11 w-full"><a href={item.pdfUrl} target="_blank" rel="noreferrer"><FileText /><P ar="فتح ملف PDF" de="PDF öffnen" en="Open PDF" /></a></Button>}
      </div>}
    </article>
  );
}

export function ResourcesView({ content, admin, kind }: { content: SiteContent; admin: Admin; kind: "occasions" | "hadiths" }) {
  const save = useSaveContent(admin?.password ?? "");
  const list = content[kind];
  const showHidden = useShowHidden();
  const visible = list.filter((r) => showHidden || !r.hidden);
  const put = (next: ResourceEntry[]) => save({ ...content, [kind]: next });
  const title = kind === "occasions" ? { ar: "المناسبات الخاصة وأعمالها", de: "Besondere Anlässe", icon: Sparkles } : { ar: "الأحاديث والروايات", de: "Hadithe & Überlieferungen", icon: ScrollText };
  return (
    <div className="screen-enter px-4 py-7">
      <Title icon={title.icon} ar={title.ar} de={title.de} />
      {admin && <AddButton label={{ ar: "إضافة", de: "Hinzufügen" }} fields={resourceFields} blank={blank} onAdd={(row) => put([...list, { ...(row as ResourceEntry), id: crypto.randomUUID(), hidden: false }])} />}
      <div className="space-y-3">
        {visible.map((item) => <ResourceCard key={item.id} item={item} admin={admin}
          onSave={(row) => put(list.map((r) => (r.id === item.id ? { ...(row as ResourceEntry), id: item.id, hidden: item.hidden ?? false } : r)))}
          onDelete={() => put(list.filter((r) => r.id !== item.id))}
          onHide={(hidden) => put(list.map((r) => (r.id === item.id ? { ...r, hidden } : r)))} />)}
        {visible.length === 0 && <p className="rounded-lg bg-card p-6 text-center text-sm text-muted-foreground"><Music className="mx-auto mb-2 h-6 w-6 text-secondary" /><P ar="سيُضاف المحتوى قريباً." de="Inhalte folgen in Kürze." en="Content coming soon." /></p>}
      </div>
    </div>
  );
}
