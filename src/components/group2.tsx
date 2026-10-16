import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ChevronDown, Star, Compass, Eye, EyeOff, FileText, Music, Pencil, ScrollText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang, LangText } from "@/lib/i18n";
import { AddButton, EditDialog, IconBtn, SectionManagementGears, useSaveContent, type FieldDef } from "@/components/inline-admin";
import type { ResourceEntry, SiteContent } from "@/lib/site-content";
import { useShowHidden } from "@/lib/admin-session";

type Admin = { password: string; content: SiteContent } | null;

const P = LangText;

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

/** Universal gold star: saves any item (trip, dua, contact, info) to "My favorites". */
export function FavStar({ id, className = "" }: { id: string; className?: string }) {
  const fav = useFavorites();
  const on = fav.has(id);
  return <button type="button" onClick={(e) => { e.stopPropagation(); fav.toggle(id); }} aria-pressed={on} aria-label="المفضلة | Favorit" className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-secondary/50 bg-card text-secondary shadow-sm ${className}`}><Star className={`h-4 w-4 ${on ? "fill-current" : ""}`} /></button>;
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
      <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><Title icon={Compass} ar="اتجاه القبلة" de="Qibla-Richtung" /></div><FavStar id="tool:qibla" /></div>
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

function ResourceCard({ item, kind }: { item: ResourceEntry; kind: "occasions" | "hadiths" }) {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.location.hash === `#${kind}:item:${encodeURIComponent(item.id)}`);
  const toggleOpen = () => {
    const next = !open;
    window.history.pushState({ view: kind, resourceId: next ? item.id : undefined }, "", next ? `#${kind}:item:${encodeURIComponent(item.id)}` : `#${kind}`);
    setOpen(next);
  };
  useEffect(() => {
    const restore = () => setOpen(window.location.hash === `#${kind}:item:${encodeURIComponent(item.id)}`);
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [kind, item.id]);
  const { lang } = useLang();
  const text = lang === "ar" ? item.textAr : lang === "en" ? item.textEn || item.textDe : lang === "de" ? item.textDe : null;
  return (
    <article className={`rounded-lg border border-border bg-card p-4 shadow-sm ${item.hidden ? "opacity-55" : ""}`}>
      <div className="flex items-start gap-2"><FavStar id={`res:${item.id}`} /><button type="button" onClick={toggleOpen} className="flex min-w-0 flex-1 items-start gap-2 text-right">
        <span className="min-w-0 flex-1 font-bold text-primary"><P ar={item.ar} de={item.de} en={item.en ?? ""} />{item.place && <span className="mt-1 block text-xs font-normal text-secondary">{item.place}</span>}</span>
        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button></div>
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
  const [editPickerOpen, setEditPickerOpen] = useState(false);
  const [editDraftId, setEditDraftId] = useState("");
  const [editItemId, setEditItemId] = useState("");
  const [renameSectionOpen, setRenameSectionOpen] = useState(false);
  const [renameItemId, setRenameItemId] = useState("");
  const [renamePickerOpen, setRenamePickerOpen] = useState(false);
  const [renameDraftId, setRenameDraftId] = useState("");
  const showHidden = useShowHidden();
  const labels = content.labels ?? {};
  const sectionKey = `tile:${kind}`;
  const sectionHidden = (content.cms?.hiddenTiles ?? []).includes(kind);
  const visible = list.filter((r) => showHidden || !r.hidden);
  const put = (next: ResourceEntry[]) => save({ ...content, [kind]: next });
  const title = kind === "occasions" ? { ar: "المناسبات الخاصة وأعمالها", de: "Besondere Anlässe", icon: Sparkles } : { ar: "الأحاديث والروايات", de: "Hadithe & Überlieferungen" , icon: ScrollText };
  const sectionTitle = { ar: labels[sectionKey]?.ar?.trim() || title.ar, de: labels[sectionKey]?.de?.trim() || title.de };
  const SectionIcon = title.icon;
  const renameFields: FieldDef[] = [
    { key: "ar", ar: "العنوان بالعربية", de: "Titel auf Arabisch" },
    { key: "de", ar: "العنوان بالألمانية", de: "Titel auf Deutsch", ltr: true },
  ];
  const renameTarget = list.find((item) => item.id === renameItemId);
  const editTarget = list.find((item) => item.id === editItemId);
  const setSectionHidden = (hidden: boolean) => {
    const next = new Set(content.cms?.hiddenTiles ?? []);
    if (hidden) next.add(kind); else next.delete(kind);
    return save({ ...content, cms: { ...(content.cms ?? {}), hiddenTiles: [...next] } });
  };
  const toggleContentVisibility = () => {
    const allHidden = list.length > 0 && list.every((item) => item.hidden);
    return put(list.map((item) => ({ ...item, hidden: !allHidden })));
  };
  return (
    <div className={`screen-enter px-4 py-7 ${sectionHidden ? "opacity-60" : ""}`}>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><SectionIcon className="h-5 w-5" /></span>
        <h2 className="min-w-0 flex-1 text-xl text-primary"><P ar={sectionTitle.ar} de={sectionTitle.de} /></h2>
      </div>
      {admin && <SectionManagementGears
        className="mb-4"
        sectionActions={<>
          <IconBtn label="T — إعادة تسمية القسم | Bereich umbenennen" onClick={() => setRenameSectionOpen(true)}><span className="text-xs font-black">T</span></IconBtn>
          {showHidden && <IconBtn label={sectionHidden ? "إظهار القسم | Bereich einblenden" : "إخفاء القسم | Bereich ausblenden"} onClick={() => void setSectionHidden(!sectionHidden)}>{sectionHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>}
        </>}
        contentActions={<>
          <IconBtn label="T — إعادة تسمية محتوى فرعي | Unterinhalt umbenennen" onClick={() => { setRenameDraftId(list[0]?.id ?? ""); setRenamePickerOpen(true); }}><span className="text-xs font-black">T</span></IconBtn>
          <IconBtn label="تعديل معلومة أو خانة | Eintrag oder Feld bearbeiten" onClick={() => { setEditDraftId(list[0]?.id ?? ""); setEditPickerOpen(true); }}><Pencil className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="إخفاء/إظهار المحتوى | Inhalte aus-/einblenden" onClick={() => void toggleContentVisibility()}>{list.length > 0 && list.every((item) => item.hidden) ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>
          <AddButton label={{ ar: "إضافة عنصر جديد", de: "Neuer Eintrag" }} fields={resourceFields} blank={blank} onAdd={(row) => put([...list, { ...(row as ResourceEntry), id: crypto.randomUUID(), hidden: false }])} inline />
        </>}
      />}
      <div className="space-y-3">
        {visible.map((item) => <ResourceCard key={item.id} item={item} kind={kind} />)}
        {visible.length === 0 && <p className="rounded-lg bg-card p-6 text-center text-sm text-muted-foreground"><Music className="mx-auto mb-2 h-6 w-6 text-secondary" /><P ar="سيُضاف المحتوى قريباً." de="Inhalte folgen in Kürze." /></p>}
      </div>
      <Dialog open={editPickerOpen} onOpenChange={setEditPickerOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>اختيار المعلومة المراد تعديلها | Eintrag zum Bearbeiten auswählen</DialogTitle>
            <DialogDescription>اختر خانة واحدة لفتح جميع معلوماتها وترجماتها. | Wähle einen Eintrag, um seine Felder und Übersetzungen zu bearbeiten.</DialogDescription>
          </DialogHeader>
          <select value={editDraftId} onChange={(event) => setEditDraftId(event.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
            <option value="">— اختر خانة — | — Eintrag auswählen —</option>
            {list.map((item) => <option key={item.id} value={item.id}>{item.ar || item.de}</option>)}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditPickerOpen(false)}>إلغاء | Abbrechen</Button>
            <Button className="flex-1" disabled={!editDraftId || !list.some((item) => item.id === editDraftId)} onClick={() => { setEditItemId(editDraftId); setEditPickerOpen(false); }}>متابعة | Weiter</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={renamePickerOpen} onOpenChange={setRenamePickerOpen}>
        <DialogContent className="w-[calc(100%-24px)] max-w-[396px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>اختيار المحتوى المراد إعادة تسميته | Inhalt zum Umbenennen auswählen</DialogTitle>
            <DialogDescription>اختر عنصرًا واحدًا فقط. لن يتغير أي نص آخر. | Wähle genau einen Eintrag aus.</DialogDescription>
          </DialogHeader>
          <select value={renameDraftId} onChange={(event) => setRenameDraftId(event.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
            <option value="">— اختر عنصرًا — | — Eintrag auswählen —</option>
            {list.map((item) => <option key={item.id} value={item.id}>{item.ar || item.de}</option>)}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setRenamePickerOpen(false)}>إلغاء | Abbrechen</Button>
            <Button className="flex-1" disabled={!renameDraftId || !list.some((item) => item.id === renameDraftId)} onClick={() => { setRenameItemId(renameDraftId); setRenamePickerOpen(false); }}>متابعة | Weiter</Button>
          </div>
        </DialogContent>
      </Dialog>
      {renameSectionOpen && <EditDialog open={renameSectionOpen} onOpenChange={setRenameSectionOpen} title={{ ar: "إعادة تسمية القسم", de: "Bereich umbenennen" }} fields={renameFields} initial={sectionTitle} onSubmit={(row) => save({ ...content, labels: { ...labels, [sectionKey]: { ar: String(row.ar ?? ""), de: String(row.de ?? ""), hidden: labels[sectionKey]?.hidden } } })} />}
      {editTarget && <EditDialog open={true} onOpenChange={(open) => { if (!open) setEditItemId(""); }} title={{ ar: "تعديل المحتوى والترجمات", de: "Inhalt und Übersetzungen bearbeiten" }} fields={resourceFields} initial={editTarget as unknown as Record<string, unknown>} onSubmit={async (row) => { await put(list.map((item) => item.id === editTarget.id ? { ...item, ...(row as ResourceEntry), id: editTarget.id, hidden: item.hidden ?? false } : item)); setEditItemId(""); }} />}
      {renameTarget && <EditDialog open={true} onOpenChange={(open) => { if (!open) setRenameItemId(""); }} title={{ ar: "إعادة تسمية المحتوى", de: "Inhalt umbenennen" }} fields={renameFields} initial={{ ar: renameTarget.ar, de: renameTarget.de }} onSubmit={async (row) => { await put(list.map((item) => item.id === renameTarget.id ? { ...item, ar: String(row.ar ?? ""), de: String(row.de ?? "") } : item)); setRenameItemId(""); }} />}
    </div>
  );
}