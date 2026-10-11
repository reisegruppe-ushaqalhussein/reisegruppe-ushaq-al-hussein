import { useEffect, useRef, useState } from "react";
import { LangText } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/lang-switcher";
import { createPortal } from "react-dom";
import { BedDouble, BookMarked, Folder, Type, ChevronLeft, ChevronRight, ClipboardPaste, FileText, Flag, Search, Settings, Pencil, ImagePlus, ImageMinus, Eye, EyeOff, Trash2, Upload, Loader2, Link2, X, ZoomIn, Download, ArrowLeft } from "lucide-react";
import { uploadImage, normalizeUrl } from "@/lib/upload-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FavStar } from "@/components/group2";
import { useAdminSession, useShowHidden, useCanManage } from "@/lib/admin-session";
import { AddButton, EditDialog, GearMenu, IconBtn, ManageRow, useSaveContent, type FieldDef } from "@/components/inline-admin";
import { labelOf, type GuidelineEntry, type RoomEntry, type SiteContent } from "@/lib/site-content";

const gearCls = "h-7 w-7 shrink-0 rounded-full bg-primary text-secondary hover:bg-primary/90 hover:text-secondary";
const inputCls = "h-11 w-full rounded-md border border-border bg-background px-3 text-sm";

function Pair({ ar, de }: { ar: string; de: string }) { return <LangText ar={ar} de={de} />; }

/** Clickable folder tile with an optional gear menu in its top-left corner. */
export function FolderCard({ icon: Icon, ar, de, count, onOpen, menu }: { icon: React.ComponentType<{ className?: string }>; ar: string; de: string; count?: number; onOpen: () => void; menu?: React.ReactNode }) {
  return <div className="relative min-w-0">
    {menu && <div className="absolute left-2 top-2 z-10">{menu}</div>}
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-lg border border-secondary/50 bg-card p-4 ps-4 pe-12 text-right shadow-sm transition-colors hover:border-secondary">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-accent text-secondary"><Icon className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1 font-bold text-primary"><Pair ar={ar} de={de} />{count !== undefined && <span className="mt-1 block text-xs font-normal text-muted-foreground">{count}</span>}</span>
      <ChevronLeft className="h-5 w-5 shrink-0 text-secondary" />
    </button>
  </div>;
}

function ManageDialog({ open, onOpenChange, ar, de, children }: { open: boolean; onOpenChange: (o: boolean) => void; ar: string; de: string; children: React.ReactNode }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
      <DialogHeader className="text-right"><DialogTitle>{ar} <span className="text-sm italic text-muted-foreground">| {de}</span></DialogTitle><DialogDescription className="sr-only">{de}</DialogDescription></DialogHeader>
      {children}
    </DialogContent>
  </Dialog>;
}

/* ---------- Rooms & hotels (staff only) ---------- */
const roomFields: FieldDef[] = [
  { key: "name", ar: "اسم الزائر", de: "Name" },
  { key: "city", ar: "المدينة", de: "Stadt" },
  { key: "hotel", ar: "الفندق", de: "Hotel" },
  { key: "floor", ar: "الطابق", de: "Etage", ltr: true },
  { key: "room", ar: "الغرفة", de: "Zimmer", ltr: true },
];

/** Parses pasted lines "name, city, hotel, floor, room" (Arabic/Latin comma, semicolon, tab or | separated). */
function parseRooms(text: string): RoomEntry[] {
  return text.split(/\r?\n/).map((l) => l.split(/[\t;|,،؛\uFF0C]/).map((x) => x.trim())).filter((c) => c[0])
    .map((c, i) => ({ id: `rm${Date.now()}${i}`, name: c[0] ?? "", city: c[1] ?? "", hotel: c[2] ?? "", floor: c[3] ?? "", room: c[4] ?? "" }));
}

/** Normalizes text for search: digits (Arabic/Persian→Latin), diacritics, Arabic letter variants, German umlauts. */
function norm(s: string) {
  return (s ?? "").toLowerCase()
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").trim();
}

/** Normalizes a single character the same way as norm() (keeps spaces) for highlight index mapping. */
function normChar(c: string) { return /\s/.test(c) ? " " : norm(c); }

/** Highlights every search word inside text, matching on normalized form (digits, diacritics, letter variants). */
export function Hl({ text, words }: { text: string; words: string[] }) {
  const t = text ?? "";
  if (!words.length || !t) return <>{t}</>;
  const chars = Array.from(t);
  let n = ""; const owner: number[] = [];
  chars.forEach((c, i) => { const m = normChar(c); for (let k = 0; k < m.length; k++) owner.push(i); n += m; });
  const mark = new Array(chars.length).fill(false);
  for (const w of words) { let at = n.indexOf(w); while (at !== -1 && w) { for (let k = at; k < at + w.length; k++) { const o = owner[k]; if (o !== undefined) mark[o] = true; } at = n.indexOf(w, at + 1); } }
  const out: React.ReactNode[] = []; let buf = ""; let on = false;
  const flush = (key: number) => { if (!buf) return; out.push(on ? <mark key={key} className="rounded-sm bg-secondary/60 px-0.5 text-foreground">{buf}</mark> : <span key={key}>{buf}</span>); buf = ""; };
  chars.forEach((c, i) => { if (mark[i] !== on) { flush(i); on = mark[i]; } buf += c; });
  flush(chars.length);
  return <>{out}</>;
}

export function RoomsPanel({ content }: { content: SiteContent }) {
  const staff = useAdminSession();
  const showHidden = useShowHidden();
  const save = useSaveContent(staff?.password ?? "");
  const [q, setQ] = useState("");
  const [manage, setManage] = useState(false);
  const [paste, setPaste] = useState("");
  const all = content.rooms ?? [];
  const visible = all.filter((r) => showHidden || !r.hidden);
  const words = norm(q).split(" ").filter(Boolean);
  const list = words.length ? visible.filter((r) => { const hay = norm([r.name, r.city, r.hotel, r.floor, r.room].join(" ")); return words.every((w) => hay.includes(w)); }) : visible;
  const commit = (rooms: RoomEntry[]) => save({ ...content, rooms });

  const importRooms = async () => {
    const rows = parseRooms(paste);
    if (!rows.length) return;
    const byName = new Map(all.map((r) => [r.name.trim().toLowerCase(), r]));
    for (const r of rows) { const old = byName.get(r.name.toLowerCase()); byName.set(r.name.toLowerCase(), old ? { ...old, ...r, id: old.id } : r); }
    await commit([...byName.values()]);
    setPaste("");
    window.alert(`تم تحديث ${rows.length} | ${rows.length} aktualisiert`);
  };
  const endTrip = async () => {
    if (!window.confirm("انتهاء الرحلة: سيتم حذف جميع بيانات التسكين المؤقتة. الأدعية والإعدادات لن تتأثر. متابعة؟\nReise beenden: Alle Zimmerdaten werden gelöscht. Fortfahren?")) return;
    if (!window.confirm("تأكيد نهائي؟ | Endgültig bestätigen?")) return;
    await commit([]);
    setManage(false);
  };

  const [page, setPage] = useState(false);
  const [detail, setDetail] = useState<RoomEntry | null>(null);
  const canEdit = (staff?.role === "admin" && staff.mode === "admin") || (staff?.role === "haj" && !!content.cms?.hajToolsEnabled);
  const gear = canEdit ? <Button type="button" variant="ghost" size="icon" onClick={() => setManage(true)} aria-label="إدارة التسكين | Zimmer verwalten" title="إدارة | Verwalten" className={gearCls}><Settings className="h-3.5 w-3.5" /></Button> : null;

  return <section className="min-w-0">
    <button type="button" onClick={() => setPage(true)} className="flex w-full items-center gap-2 rounded-lg border border-secondary/50 bg-card p-3 text-right">
      <BedDouble className="h-5 w-5 shrink-0 text-secondary" />
      <span className="min-w-0 flex-1 font-bold text-primary"><Pair ar="تسكين الزوار" de="Zimmerverteilung" /></span>
      <span className="grid h-8 min-w-8 place-items-center rounded-full bg-primary px-2 text-sm font-bold text-primary-foreground" dir="ltr">{visible.length}</span>
    </button>

    {page && <FullPage title={{ ar: `تسكين الزوار (${visible.length})`, de: "Zimmerverteilung" }} onBack={() => setPage(false)} menu={gear}>
      <label className="relative block"><Search className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الغرفة | Name oder Zimmer" className={`${inputCls} pr-9`} /></label>
      <div className="space-y-1.5">
        {list.map((r) => { const n = visible.indexOf(r) + 1; return <div key={r.id} className="flex items-start gap-2">
          <span className="mt-2 grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-secondary px-1 text-[11px] font-bold text-secondary-foreground" dir="ltr">{n}</span>
          <div className="min-w-0 flex-1">{canEdit
            ? <ManageRow onOpen={() => setDetail(r)} title={<Hl text={r.name} words={words} />} subtitle={<><Hl text={r.city} words={words} /> · <Hl text={r.hotel} words={words} /> · طابق/Etage <Hl text={r.floor || "—"} words={words} /> · غرفة/Zimmer <Hl text={r.room || "—"} words={words} /></>} fields={roomFields} item={r} hidden={r.hidden ?? false}
                onVisibilityChange={(hidden) => commit(all.map((x) => x.id === r.id ? { ...x, hidden } : x))}
                onSave={(row) => commit(all.map((x) => x.id === r.id ? { ...(row as RoomEntry), id: r.id, hidden: r.hidden ?? false } : x))}
                onDelete={() => commit(all.filter((x) => x.id !== r.id))} />
            : <button type="button" onClick={() => setDetail(r)} className="block w-full rounded-md border border-border bg-card p-2 text-start text-xs active:bg-accent">
                <p className="font-bold text-primary"><Hl text={r.name} words={words} /></p>
                <p className="text-muted-foreground"><Hl text={r.city} words={words} /> · <Hl text={r.hotel} words={words} /> · طابق/Etage <b dir="ltr"><Hl text={r.floor || "—"} words={words} /></b> · غرفة/Zimmer <b dir="ltr"><Hl text={r.room || "—"} words={words} /></b></p>
              </button>}</div>
        </div>; })}
        {list.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">لا توجد نتائج | Keine Einträge</p>}
      </div>
    </FullPage>}

    <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
      <DialogContent className="w-[calc(100%-24px)] max-w-[396px]" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle className="text-xl text-primary">{detail?.name}</DialogTitle><DialogDescription className="sr-only">Gastdetails</DialogDescription></DialogHeader>
        {detail && <div className="space-y-2">
          {([["المدينة", "Stadt", detail.city], ["الفندق", "Hotel", detail.hotel], ["الطابق", "Etage", detail.floor], ["الغرفة", "Zimmer", detail.room]] as const).map(([ar, de, v]) => <div key={de} className="flex items-center justify-between gap-3 rounded-md border border-secondary/40 bg-card p-3">
            <span className="text-xs font-bold text-muted-foreground">{ar}<span dir="ltr" className="block italic">{de}</span></span>
            <span dir="auto" className="text-lg font-bold text-primary">{v || "—"}</span>
          </div>)}
          <Button type="button" variant="outline" className="h-10 w-full" aria-label="نسخ | Kopieren" onClick={() => { void navigator.clipboard?.writeText(`${detail.name}\n${detail.city} - ${detail.hotel}\nطابق/Etage: ${detail.floor} · غرفة/Zimmer: ${detail.room}`); }}><ClipboardPaste className="h-4 w-4" /></Button>
        </div>}
      </DialogContent>
    </Dialog>

    {canEdit && <ManageDialog open={manage} onOpenChange={setManage} ar="تسكين الزوار" de="Zimmerverteilung">
      <AddButton label={{ ar: "إضافة زائر", de: "Gast hinzufügen" }} fields={roomFields} blank={{ name: "", city: "", hotel: "", floor: "", room: "" }} onAdd={(row) => commit([...all, { ...(row as RoomEntry), id: `rm${Date.now()}` }])} />
      <div className="space-y-2 rounded-md border border-secondary/40 p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-primary"><ClipboardPaste className="h-4 w-4" />لصق جماعي | Massenimport</p>
        <p className="text-[11px] text-muted-foreground">سطر لكل زائر: الاسم، المدينة، الفندق، الطابق، الغرفة<span dir="ltr" className="block">Pro Zeile: Name, Stadt, Hotel, Etage, Zimmer</span></p>
        <textarea rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-xs" />
        <Button type="button" className="h-10 w-full" disabled={!paste.trim()} onClick={importRooms}>استيراد | Importieren</Button>
      </div>
      <Button type="button" variant="destructive" className="mt-2 h-11 w-full" onClick={endTrip}><Flag />انتهاء الرحلة <span className="text-xs italic opacity-80">| Reise beenden</span></Button>
    </ManageDialog>}
  </section>;
}

/* ---------- Visit guideline folders (carousel images + PDF) ---------- */
const guideFields: FieldDef[] = [
  { key: "destAr", ar: "اسم الزيارة / الوجهة (عربي)", de: "Reise / Ziel (AR)" },
  { key: "destDe", ar: "اسم الزيارة / الوجهة (ألماني)", de: "Reise / Ziel (DE)", ltr: true },
  { key: "ar", ar: "النص بالعربية", de: "Text (AR)", multiline: true },
  { key: "de", ar: "النص بالألمانية", de: "Text (DE)", multiline: true, ltr: true },
  { key: "images", ar: "روابط صور الكاروسيل (رابط بكل سطر)", de: "Karussell-Bilder (eine URL pro Zeile)", multiline: true, ltr: true },
  { key: "pdf", ar: "رابط ملف PDF", de: "PDF-Link", ltr: true },
];
const titleFields: FieldDef[] = [{ key: "ar", ar: "العنوان بالعربية", de: "Titel (AR)" }, { key: "de", ar: "العنوان بالألمانية", de: "Titel (DE)", ltr: true }];

/** Admin-only pencil to rename a section title stored in content.labels. */
export function RenameTitle({ content, labelKey, ar, de }: { content: SiteContent; labelKey: string; ar: string; de: string }) {
  const staff = useAdminSession();
  const save = useSaveContent(staff?.password ?? "");
  const [open, setOpen] = useState(false);
  if (staff?.role !== "admin") return null;
  return <>
    <IconBtn label="إعادة تسمية | Umbenennen" onClick={() => setOpen(true)}><Type className="h-3.5 w-3.5" /></IconBtn>
    {open && <TitleDialog open={open} onOpenChange={setOpen} initial={{ ar, de }} onSubmit={(row) => save({ ...content, labels: { ...(content.labels ?? {}), [labelKey]: { ar: String(row["ar"] ?? ""), de: String(row["de"] ?? "") } } })} />}
  </>;
}
function TitleDialog({ open, onOpenChange, initial, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; initial: { ar: string; de: string }; onSubmit: (r: Record<string, unknown>) => Promise<void> }) {
  const [d, setD] = useState(initial);
  return <ManageDialog open={open} onOpenChange={onOpenChange} ar="إعادة تسمية" de="Umbenennen">
    {titleFields.map((f) => <label key={f.key} className="block text-xs font-bold text-primary">{f.ar} | {f.de}<input dir={f.ltr ? "ltr" : "rtl"} value={d[f.key as "ar" | "de"]} onChange={(e) => setD({ ...d, [f.key]: e.target.value })} className={`${inputCls} mt-1`} /></label>)}
    <Button type="button" className="h-10 w-full" onClick={async () => { await onSubmit(d); onOpenChange(false); }}>حفظ | Speichern</Button>
  </ManageDialog>;
}

function splitPics(s?: string) { return (s ?? "").split(/[\s,]+/).map((x) => x.trim()).filter((x) => /^https?:\/\//i.test(x)); }

/** Converts common share links (Google Drive, Dropbox) into direct image URLs. */
function directUrl(u: string) {
  const drive = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}`;
  if (/dropbox\.com/.test(u)) return u.replace(/[?&]dl=0/, "").replace("www.dropbox.com", "dl.dropboxusercontent.com");
  return u;
}

/** Image with loading shimmer, no-referrer (avoids hotlink blocks) and a clean fallback instead of a broken icon. */
function SmartImg({ src, alt, onOpen }: { src: string; alt: string; onOpen?: () => void }) {
  const [state, setState] = useState<"load" | "ok" | "err">("load");
  const url = directUrl(src);
  return <div className="relative aspect-[4/5] w-full bg-primary">
    {state === "load" && <div className="absolute inset-0 animate-pulse bg-primary/80" />}
    {state === "err"
      ? <div className="absolute inset-0 grid place-items-center bg-accent/40 p-4 text-center text-xs text-muted-foreground"><span><BookMarked className="mx-auto mb-2 h-8 w-8 text-secondary" />تعذّر عرض الصورة<span dir="ltr" className="block italic">Bild nicht verfügbar</span><a href={src} target="_blank" rel="noreferrer" className="mt-2 inline-block underline text-primary">فتح الرابط | Link öffnen</a></span></div>
      : <button type="button" onClick={onOpen} aria-label="تكبير | Vergrößern" className="absolute inset-0 h-full w-full">
          <img src={url} alt={alt} referrerPolicy="no-referrer" loading="lazy" onLoad={() => setState("ok")} onError={() => setState("err")} className={`h-full w-full object-contain transition-opacity ${state === "ok" ? "opacity-100" : "opacity-0"}`} />
          {state === "ok" && <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/80 text-primary"><ZoomIn className="h-4 w-4" /></span>}
        </button>}
  </div>;
}

/** Fullscreen viewer: pinch / double-tap zoom, drag to pan, arrows, X to close. No libraries. */
function Lightbox({ pics, index, onIndex, onClose }: { pics: string[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const n = pics.length;
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ d: number; s: number; x: number; y: number; px: number; py: number } | null>(null);
  const lastTap = useRef(0);
  const go = (i: number) => { setT({ s: 1, x: 0, y: 0 }); onIndex((i + n) % n); };
  const begin = () => {
    const p = [...pts.current.values()];
    const a = p[0], b = p[1];
    if (!a) { start.current = null; return; }
    start.current = { d: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0, s: t.s, x: t.x, y: t.y, px: b ? (a.x + b.x) / 2 : a.x, py: b ? (a.y + b.y) / 2 : a.y };
  };
  return createPortal(<div className="fixed inset-0 z-[100] flex flex-col bg-foreground/95" dir="ltr" role="dialog" aria-modal="true" style={{ pointerEvents: "auto" }}>
    <div className="flex items-center justify-between p-3">
      <span className="text-sm text-background">{n > 1 ? `${index + 1} / ${n}` : ""}</span>
      <div className="flex items-center gap-2"><button type="button" onClick={() => void downloadImage(pics[index] ?? "")} aria-label="تحميل الصورة | Bild herunterladen" title="تحميل الصورة | Bild herunterladen" className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-secondary-foreground"><Download className="h-5 w-5" /></button><button type="button" onClick={onClose} aria-label="إغلاق | Schließen" className="grid h-11 w-11 place-items-center rounded-full bg-background text-foreground"><X className="h-6 w-6" /></button></div>
    </div>
    <div className="relative flex-1 overflow-hidden" style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); begin();
        if (pts.current.size === 1) { const now = Date.now(); if (now - lastTap.current < 300) setT((v) => v.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }); lastTap.current = now; }
      }}
      onPointerMove={(e) => {
        if (!pts.current.has(e.pointerId) || !start.current) return;
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const p = [...pts.current.values()]; const a = p[0]!, b = p[1]; const st = start.current;
        if (b && st.d) { const s = Math.min(5, Math.max(1, st.s * Math.hypot(a.x - b.x, a.y - b.y) / st.d)); setT({ s, x: s === 1 ? 0 : st.x + (a.x + b.x) / 2 - st.px, y: s === 1 ? 0 : st.y + (a.y + b.y) / 2 - st.py }); }
        else if (!b && st.s > 1) setT({ s: st.s, x: st.x + a.x - st.px, y: st.y + a.y - st.py });
      }}
      onPointerUp={(e) => {
        const st = start.current; const p = pts.current.get(e.pointerId);
        pts.current.delete(e.pointerId);
        if (st && p && pts.current.size === 0 && t.s === 1 && n > 1 && Math.abs(p.x - st.px) > 60) go(index + (p.x < st.px ? 1 : -1));
        begin();
      }}
      onPointerCancel={(e) => { pts.current.delete(e.pointerId); begin(); }}>
      <img src={directUrl(pics[index] ?? "")} alt="" referrerPolicy="no-referrer" draggable={false}
        className="absolute inset-0 h-full w-full select-none object-contain"
        style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, transition: pts.current.size ? "none" : "transform 0.2s" }} />
      {n > 1 && t.s === 1 && <>
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(index - 1)} aria-label="السابق | Zurück" className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(index + 1)} aria-label="التالي | Weiter" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground"><ChevronRight className="h-5 w-5" /></button>
      </>}
    </div>
    <p className="p-3 text-center text-xs text-background/80">كبّر بإصبعين أو بنقرتين | Mit zwei Fingern oder Doppeltipp zoomen</p>
  </div>, document.body);
}

/** Add images: direct upload from phone (compressed) or optional direct link. */
function ImageAddDialog({ onClose, password, onAdd }: { onClose: () => void; password: string; onAdd: (urls: string[]) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [link, setLink] = useState("");
  const run = async (fn: () => Promise<string[]>) => {
    setBusy(true); setErr("");
    try { const urls = await fn(); if (urls.length) { await onAdd(urls); onClose(); } }
    catch (e) { setErr(e instanceof Error ? e.message : "خطأ | Fehler"); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
    <DialogContent className="w-[calc(100%-24px)] max-w-[396px]" dir="rtl">
      <DialogHeader className="text-right"><DialogTitle><Pair ar="إضافة صورة" de="Bild hinzufügen" /></DialogTitle><DialogDescription className="sr-only">Upload</DialogDescription></DialogHeader>
      <label className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-secondary/60 bg-accent/40 text-sm font-bold text-primary ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? <Loader2 className="h-6 w-6 animate-spin text-secondary" /> : <Upload className="h-6 w-6 text-secondary" />}
        <span>{busy ? "جارٍ الرفع…" : "اختر من الهاتف"}</span><span dir="ltr" className="text-xs italic text-muted-foreground">{busy ? "Wird hochgeladen…" : "Vom Handy wählen"}</span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ""; if (fs.length) void run(() => Promise.all(fs.map((f) => uploadImage(f, password)))); }} />
      </label>
      <div className="flex gap-2">
        <input dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…/bild.jpg" className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
        <Button type="button" size="icon" variant="outline" className="h-10 w-10" disabled={busy || !link.trim()} aria-label="إضافة رابط | Link hinzufügen" onClick={() => run(async () => [normalizeUrl(link)])}><Link2 className="h-4 w-4" /></Button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </DialogContent>
  </Dialog>;
}

/** Gear menu inside an opened guideline post: edit, rename, add/remove image, hide (admin), delete. */
function GuideItemMenu({ g, pics, imgIndex, onUpdate, onDelete }: { g: GuidelineEntry; pics: string[]; imgIndex: number; onUpdate: (g: GuidelineEntry) => Promise<void>; onDelete: () => Promise<void> }) {
  const staff = useAdminSession();
  const showHidden = useShowHidden();
  const [dlg, setDlg] = useState<null | "edit" | "rename" | "img">(null);
  const close = (o: boolean) => { if (!o) setDlg(null); };
  return <>
    <GearMenu>
      <IconBtn label="تعديل | Bearbeiten" onClick={() => setDlg("edit")}><Pencil className="h-3.5 w-3.5" /></IconBtn>
      {staff?.role === "admin" && <IconBtn label="إعادة تسمية | Umbenennen" onClick={() => setDlg("rename")}><Type className="h-3.5 w-3.5" /></IconBtn>}
      <IconBtn label="إضافة صورة | Bild hinzufügen" onClick={() => setDlg("img")}><ImagePlus className="h-3.5 w-3.5" /></IconBtn>
      {pics.length > 0 && <IconBtn label="حذف الصورة الحالية | Aktuelles Bild löschen" danger onClick={async () => { if (!window.confirm("حذف هذه الصورة؟ | Dieses Bild löschen?")) return; await onUpdate({ ...g, images: pics.filter((_, k) => k !== imgIndex).join("\n") }); }}><ImageMinus className="h-3.5 w-3.5" /></IconBtn>}
      {showHidden && <IconBtn label={g.hidden ? "إرجاع | Wiederherstellen" : "إخفاء | Verbergen"} onClick={() => onUpdate({ ...g, hidden: !g.hidden })}>{g.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>}
      <IconBtn label="حذف | Löschen" danger onClick={async () => { if (!window.confirm("هل أنت متأكد من الحذف؟\nMöchten Sie diesen Eintrag wirklich löschen?")) return; await onDelete(); }}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
    </GearMenu>
    {dlg === "edit" && <EditDialog open onOpenChange={close} title={{ ar: "تعديل", de: "Bearbeiten" }} fields={guideFields} initial={g} onSubmit={(row) => onUpdate({ ...g, ...(row as GuidelineEntry), id: g.id, hidden: g.hidden ?? false })} />}
    {dlg === "rename" && <TitleDialog open onOpenChange={close} initial={{ ar: g.destAr ?? "", de: g.destDe ?? "" }} onSubmit={(r) => onUpdate({ ...g, destAr: String(r["ar"] ?? ""), destDe: String(r["de"] ?? "") })} />}
    {dlg === "img" && <ImageAddDialog onClose={() => setDlg(null)} password={staff?.password ?? ""} onAdd={(urls) => onUpdate({ ...g, images: [...pics, ...urls].join("\n") })} />}
  </>;
}

/** One-tap image download; falls back to opening the image if the host blocks direct fetch. */
async function downloadImage(src: string) {
  const url = directUrl(src);
  try {
    const res = await fetch(url, { referrerPolicy: "no-referrer" });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ziyarat-${Date.now()}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch {
    const a = document.createElement("a");
    a.href = url.includes("/storage/v1/object/sign/") ? `${url}${url.includes("?") ? "&" : "?"}download=` : url;
    a.download = `ziyarat-${Date.now()}.jpg`; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  }
}

/** One guideline post rendered inline: gear, carousel, download, text, PDF. */
function GuidePost({ g, fallbackPdf, onUpdate, onDelete }: { g: GuidelineEntry; fallbackPdf?: string | undefined; onUpdate: (g: GuidelineEntry) => Promise<void>; onDelete: () => Promise<void> }) {
  const staff = useAdminSession();
  const [img, setImg] = useState(0);
  const [zoom, setZoom] = useState(false);
  const pics = splitPics(g.images);
  const n = pics.length;
  const cur = pics[img % Math.max(n, 1)] ?? "";
  return <article className={`relative space-y-3 rounded-lg border border-secondary/40 bg-card p-3 shadow-sm ${g.hidden ? "opacity-60" : ""}`}>
    {g.hidden && <span className="text-xs text-muted-foreground">مخفي | Versteckt</span>}
    {canManage && <div className="flex justify-end"><GuideItemMenu g={g} pics={pics} imgIndex={img % Math.max(n, 1)} onUpdate={onUpdate} onDelete={onDelete} /></div>}
    {n > 0 && <div className="relative overflow-hidden rounded-md">
      <SmartImg key={cur} src={cur} alt={g.destAr || ""} onOpen={() => setZoom(true)} />
      {n > 1 && <>
        <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2" aria-label="السابق | Zurück" onClick={() => setImg((img - 1 + n) % n)}><ChevronRight className="h-4 w-4" /></Button>
        <Button type="button" variant="secondary" size="icon" className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2" aria-label="التالي | Weiter" onClick={() => setImg((img + 1) % n)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">{pics.map((p, k) => <span key={p + k} className={`h-1.5 rounded-full ${k === img % n ? "w-4 bg-secondary" : "w-1.5 bg-background/80"}`} />)}</div>
      </>}
    </div>}
    {n > 0 && <div className="flex justify-center"><button type="button" onClick={() => void downloadImage(cur)} aria-label="تحميل الصورة | Bild herunterladen" title="تحميل الصورة | Bild herunterladen" className="grid h-9 w-9 place-items-center rounded-full border border-secondary/60 bg-background text-primary shadow-sm"><Download className="h-4 w-4" /></button></div>}
    {(g.ar || g.de) && <div className="relative rounded-md bg-accent p-4 pe-12 text-sm">
      <FavStar id={`guide:${g.id}`} className="absolute left-2 top-2 h-8 w-8" />
      <div className="whitespace-pre-line"><LangText ar={g.ar} de={g.de} /></div>
    </div>}
    {(g.pdf || fallbackPdf) && <Button asChild variant="outline" className="h-10 w-full"><a href={g.pdf || fallbackPdf} target="_blank" rel="noreferrer" download><FileText />PDF <span className="text-xs italic opacity-70">| öffnen</span></a></Button>}
    {zoom && n > 0 && <Lightbox pics={pics} index={img % n} onIndex={setImg} onClose={() => setZoom(false)} />}
  </article>;
}

/** Full-screen page shell with back arrow, bilingual title and an icon-only gear. */
export function FullPage({ title, onBack, menu, children }: { title: { ar: string; de: string }; onBack: () => void; menu?: React.ReactNode; children: React.ReactNode }) {
  useEffect(() => { const y = window.scrollY; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; window.scrollTo(0, y); }; }, []);
  return createPortal(<div className="fixed inset-0 z-40 overflow-y-auto bg-muted" dir="rtl">
    <div className="mx-auto min-h-full w-full max-w-[420px] bg-background pb-28">
      <header className="sticky top-0 z-10 border-b border-secondary/40 bg-primary px-3 pb-3 pt-4 text-primary-foreground shadow-md">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} aria-label="رجوع | Zurück" title="رجوع | Zurück" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><ArrowLeft className="h-5 w-5 rotate-180" /></button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-sm font-extrabold">حملة عشاق الحسين (ع) — ألمانيا</p>
            <p lang="de" dir="ltr" className="mt-0.5 text-[10px] font-medium text-primary-foreground/65">Reisegruppe Ushaq al-Hussein (as) — Deutschland</p>
            <div className="gold-line mx-auto my-2 h-px w-24" />
            <div className="font-bold"><LangText ar={title.ar} de={title.de} inverse center /></div>
          </div>
          <div className="flex w-9 shrink-0 justify-center">{menu}</div>
        </div>
        <LanguageSwitcher />
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </div>
  </div>, document.body);
}

const blankGuide = { destAr: "", destDe: "", ar: "", de: "", images: "", pdf: "" };

export function GuidelinesFolders({ content }: { content: SiteContent }) {
  const staff = useAdminSession();
  const canManage = useCanManage(content);
  const showHidden = useShowHidden();
  const save = useSaveContent(staff?.password ?? "");

  const [page, setPage] = useState(false);
  const [folder, setFolder] = useState<string | null>(null);
  const [manage, setManage] = useState(false);

  const all = content.guidelines ?? [];
  const items = all.filter((g) => showHidden || !g.hidden);

  const title = labelOf(
    content,
    "guidelines",
    "إرشادات وآداب الزيارة",
    "Hinweise & Etikette"
  );

  const sectionHidden =
    content.labels?.["guidelines"]?.hidden ?? false;

  const commit = (guidelines: GuidelineEntry[]) =>
    save({ ...content, guidelines });

  const keyOf = (g: GuidelineEntry) =>
    (g.destAr || g.destDe || g.ar.slice(0, 30)).trim();

  const folders: {
    key: string;
    ar: string;
    de: string;
    posts: GuidelineEntry[];
  }[] = [];

  for (const g of items) {
    const k = keyOf(g);
    const existing = folders.find((x) => x.key === k);

    if (existing) {
      existing.posts.push(g);
    } else {
      folders.push({
        key: k,
        ar: g.destAr || g.ar.slice(0, 30),
        de: g.destDe || g.de.slice(0, 30),
        posts: [g],
      });
    }
  }

  const toggleSection = () =>
    save({
      ...content,
      labels: {
        ...(content.labels ?? {}),
        guidelines: {
          ar: content.labels?.["guidelines"]?.ar ?? "",
          de: content.labels?.["guidelines"]?.de ?? "",
          hidden: !sectionHidden,
        },
      },
    });

  const addNew = (row: Record<string, unknown>) =>
    commit([
      ...all,
      {
        ...blankGuide,
        ...(row as GuidelineEntry),
        id: `gd${Date.now()}`,
      },
    ]);

  const sectionMenu = canManage && (
    <GearMenu>
      <RenameTitle
        content={content}
        labelKey="guidelines"
        ar={title.ar}
        de={title.de}
      />

      <AddButton
        inline
        label={{
          ar: "إضافة مجلد زيارة",
          de: "Ziyarat-Ordner hinzufügen",
        }}
        fields={guideFields}
        blank={blankGuide}
        onAdd={addNew}
      />

      {showHidden && (
        <IconBtn
          label={
            sectionHidden
              ? "إرجاع | Wiederherstellen"
              : "إخفاء | Verbergen"
          }
          onClick={() => void toggleSection()}
        >
          {sectionHidden ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </IconBtn>
      )}

      <IconBtn
        label="إدارة | Verwalten"
        onClick={() => setManage(true)}
      >
        <Settings className="h-3.5 w-3.5" />
      </IconBtn>
    </GearMenu>
  );

  if (sectionHidden && !showHidden) return null;

  return (
    <section
      className={`mt-3 min-w-0 ${
        sectionHidden ? "opacity-60" : ""
      }`}
    >
      {/* القسم الرئيسي */}
      <FolderCard
        icon={BookMarked}
        ar={title.ar}
        de={title.de}
        count={folders.length}
        onOpen={() => {
          setPage(true);
          setFolder(null);
        }}
        menu={sectionMenu}
      />

      {/* صفحة الإرشادات: مجلدات Accordion قابلة للفتح والإغلاق */}
      {page && (
        <FullPage
          title={title}
          onBack={() => {
            setPage(false);
            setFolder(null);
          }}
          menu={sectionMenu}
        >
          <div className="space-y-3">
            {folders.map((f) => {
              const isOpen = folder === f.key;

              return (
                <div
                  key={f.key}
                  className={`overflow-hidden rounded-xl border bg-card shadow-sm transition-colors ${
                    isOpen
                      ? "border-secondary"
                      : "border-secondary/40"
                  } ${
                    f.posts.every((p) => p.hidden)
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  {/* عنوان المجلد */}
                  <div className="relative">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setFolder(isOpen ? null : f.key)
                      }
                      className="flex min-h-[76px] w-full items-center gap-3 p-3 pe-14 text-right transition-colors hover:bg-accent/50 active:bg-accent"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-secondary">
                        <Folder className="h-6 w-6" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-primary">
                          <Pair ar={f.ar} de={f.de} />
                        </span>

                        <span className="mt-1 block text-xs text-muted-foreground">
                          {f.posts.length}{" "}
                          {f.posts.length === 1
                            ? "فقرة | Beitrag"
                            : "فقرات | Beiträge"}
                        </span>
                      </span>

                      <ChevronLeft
                        className={`h-5 w-5 shrink-0 text-secondary transition-transform duration-200 ${
                          isOpen ? "-rotate-90" : ""
                        }`}
                      />
                    </button>

                    {/* ترس إدارة المجلد الخارجي */}
                    {canManage && (
                      <div
                        className="absolute left-2 top-1 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FolderMenu
                          cur={f}
                          all={all}
                          commit={commit}
                          addNew={addNew}
                          onDeleted={() => setFolder(null)}
                        />
                      </div>
                    )}
                  </div>

                  {/* المحتوى الداخلي: يظهر عند فتح المجلد */}
                  {isOpen && (
                    <div className="space-y-3 border-t border-secondary/30 bg-muted/30 p-3">
                      {f.posts.map((g) => (
                        <GuidePost
                          key={g.id}
                          g={g}
                          fallbackPdf={content.guidelinesPdf}
                          onUpdate={(next) =>
                            commit(
                              all.map((x) =>
                                x.id === g.id ? next : x
                              )
                            )
                          }
                          onDelete={async () => {
                            await commit(
                              all.filter((x) => x.id !== g.id)
                            );

                            if (f.posts.length <= 1) {
                              setFolder(null);
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {folders.length === 0 && (
              <div className="rounded-xl border border-dashed border-secondary/50 bg-card p-8 text-center">
                <Folder className="mx-auto mb-3 h-9 w-9 text-secondary" />

                <p className="text-sm font-bold text-primary">
                  لا توجد إرشادات بعد
                </p>

                <p
                  dir="ltr"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  Noch keine Hinweise vorhanden
                </p>
              </div>
            )}
          </div>
        </FullPage>
      )}

      {/* إدارة جميع الفقرات والمجلدات */}
      {canManage && (
        <ManageDialog
          open={manage}
          onOpenChange={setManage}
          ar={title.ar}
          de={title.de}
        >
          <div className="space-y-2">
            {items.map((g) => (
              <ManageRow
                key={g.id}
                title={g.destAr || g.ar.slice(0, 40)}
                subtitle={g.destDe || g.de.slice(0, 40)}
                fields={guideFields}
                item={g}
                hidden={g.hidden ?? false}
                onVisibilityChange={(hidden) =>
                  commit(
                    all.map((x) =>
                      x.id === g.id ? { ...x, hidden } : x
                    )
                  )
                }
                onSave={(row) =>
                  commit(
                    all.map((x) =>
                      x.id === g.id
                        ? {
                            ...(row as GuidelineEntry),
                            id: g.id,
                            hidden: g.hidden ?? false,
                          }
                        : x
                    )
                  )
                }
                onDelete={() =>
                  commit(all.filter((x) => x.id !== g.id))
                }
              />
            ))}
          </div>

          <AddButton
            label={{
              ar: "إضافة مجلد إرشادات",
              de: "Hinweis-Ordner hinzufügen",
            }}
            fields={guideFields}
            blank={blankGuide}
            onAdd={addNew}
          />
        </ManageDialog>
      )}
    </section>
  );
}

/** Header gear inside one visit folder: add post, rename folder, hide (admin), delete folder. Icons only. */
function FolderMenu({ cur, all, commit, addNew, onDeleted }: { cur: { ar: string; de: string; posts: GuidelineEntry[] }; all: GuidelineEntry[]; commit: (g: GuidelineEntry[]) => Promise<void>; addNew: (r: Record<string, unknown>) => Promise<void>; onDeleted: () => void }) {
  const showHidden = useShowHidden();
  const [rename, setRename] = useState(false);
  const ids = new Set(cur.posts.map((p) => p.id));
  const allHidden = cur.posts.every((p) => p.hidden);
  return <>
    <GearMenu>
      <AddButton inline label={{ ar: "إضافة منشور", de: "Beitrag hinzufügen" }} fields={guideFields} blank={{ ...blankGuide, destAr: cur.posts[0]?.destAr ?? "", destDe: cur.posts[0]?.destDe ?? "" }} onAdd={addNew} />
      <IconBtn label="إعادة تسمية | Umbenennen" onClick={() => setRename(true)}><Type className="h-3.5 w-3.5" /></IconBtn>
      {showHidden && <IconBtn label={allHidden ? "إرجاع | Wiederherstellen" : "إخفاء | Verbergen"} onClick={() => void commit(all.map((x) => ids.has(x.id) ? { ...x, hidden: !allHidden } : x))}>{allHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>}
      <IconBtn label="حذف المجلد | Ordner löschen" danger onClick={async () => { if (!window.confirm("حذف المجلد وكل منشوراته؟\nOrdner mit allen Beiträgen löschen?")) return; await commit(all.filter((x) => !ids.has(x.id))); onDeleted(); }}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
    </GearMenu>
    {rename && <TitleDialog open onOpenChange={(o) => !o && setRename(false)} initial={{ ar: cur.ar, de: cur.de }} onSubmit={async (r) => { await commit(all.map((x) => ids.has(x.id) ? { ...x, destAr: String(r["ar"] ?? ""), destDe: String(r["de"] ?? "") } : x)); onDeleted(); }} />}
  </>;
}
