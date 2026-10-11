import { useState, type ComponentType } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown, ArrowUp, BookOpen, Briefcase, CalendarDays, Camera, Compass, Eye, EyeOff, Feather, FileText, Folder, FolderInput, Gift, Globe, HandHeart, Heart, Image as ImageIcon,
  Info, Landmark, Link2, Loader2, Luggage, Map as MapIcon, MapPin, Megaphone, MoonStar, Move, Music2, Palette, Pencil, RotateCcw, Phone, Plane, Plus, ScrollText, Shield, Sparkles, Star, Trash2, Upload, Users, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GearMenu, IconBtn } from "@/components/inline-admin";
import { LangText } from "@/lib/i18n";
import { saveOrQueue } from "@/lib/offline";
import { useAdminSession, useCanManage, useShowHidden, useStaffSession } from "@/lib/admin-session";
import { labelOf, type CmsConfig, type CmsItem, type CmsSection, type SiteContent } from "@/lib/site-content";
import { translateToEnglish } from "@/lib/site-content.functions";
import { uploadImage } from "@/lib/upload-image";

type IconType = ComponentType<{ className?: string }>;
export type Tile = { id: string; ar: string; de: string; icon: IconType; builtin: boolean; staffOnly?: boolean; defaultParent?: string };
/** Parent of a tile: admin choice first, then the built-in default ("" = home). */
const parentOf = (parents: Record<string, string>, t: Tile) => parents[t.id] ?? t.defaultParent ?? "";

export const cmsIcons: Record<string, IconType> = {
  folder: Folder, book: BookOpen, scroll: ScrollText, star: Star, sparkles: Sparkles, heart: Heart, hand: HandHeart, moon: MoonStar, feather: Feather, landmark: Landmark,
  plane: Plane, luggage: Luggage, map: MapIcon, pin: MapPin, compass: Compass, globe: Globe, calendar: CalendarDays, megaphone: Megaphone, phone: Phone, users: Users,
  camera: Camera, image: ImageIcon, video: Video, music: Music2, file: FileText, info: Info, gift: Gift, shield: Shield, briefcase: Briefcase, link: Link2,
};
const inputCls = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const customTileId = (id: string) => `c:${id}`;

/** Saves a new structure; fills missing German from Arabic automatically before saving. */
function useCms(content: SiteContent) {
  const qc = useQueryClient();
  const s = useAdminSession();
  const canManage = useCanManage(content);
  const cms: CmsConfig = content.cms ?? {};
  const save = async (next: CmsConfig, extra: Partial<SiteContent> = {}) => {
    if (!s || !canManage) return;
    // Show the change instantly; the server save follows.
    qc.setQueryData(["site-content"], { ...content, ...extra, cms: next });
    try {
      const { queued } = await saveOrQueue(s.password, { ...content, ...extra, cms: next }, "هيكل التطبيق | App-Struktur", qc);
      if (queued) window.alert("محفوظ محلياً — سيُرفع عند عودة الإنترنت | Lokal gespeichert");
    } catch (e) { window.alert(`تعذّر الحفظ | Fehler\n${e instanceof Error ? e.message : e}`); }
  };
  return { cms, save, password: s?.password ?? "" };
}

async function fillGerman<T extends Record<string, unknown>>(row: T, pairs: Array<[keyof T, keyof T]>): Promise<T> {
  const missing = pairs.filter(([a, d]) => String(row[a] ?? "").trim() && !String(row[d] ?? "").trim());
  if (!missing.length) return row;
  try {
    const r = await translateToEnglish({ data: { texts: missing.map(([a]) => String(row[a])), target: "de" } });
    if (!r.ok) return row;
    const next = { ...row };
    missing.forEach(([, d], i) => { (next as Record<string, unknown>)[d as string] = r.out[i] ?? ""; });
    return next;
  } catch { return row; }
}

/** Sorted tiles of one level (home or a folder), following the admin's order. */
function arrange(tiles: Tile[], cms: CmsConfig) {
  const pos = new Map((cms.order ?? []).map((id, i) => [id, i]));
  return tiles.map((t, i) => ({ t, k: pos.get(t.id) ?? 10000 + i })).sort((a, b) => a.k - b.k).map((x) => x.t);
}

export function allTiles(content: SiteContent, builtins: Tile[]): Tile[] {
  const custom = (content.cms?.sections ?? []).map((s) => ({ id: customTileId(s.id), ar: s.ar, de: s.de, icon: cmsIcons[s.icon] ?? Folder, builtin: false }));
  return [...builtins.map((b) => ({ ...b, ...labelOf(content, `tile:${b.id}`, b.ar, b.de) })), ...custom];
}

/** The luxury tile grid used on home and inside every folder, so new sections look exactly like the existing ones. */
export function TileGrid({ content, builtins, parentId, onOpen }: { content: SiteContent; builtins: Tile[]; parentId?: string; onOpen: (id: string) => void }) {
  const { cms, save } = useCms(content);
  const canManage = useCanManage(content);
  const showHidden = useShowHidden() || canManage;
  const staff = useStaffSession();
  const [arranging, setArranging] = useState(false);
  const [editing, setEditing] = useState<Tile | "new" | null>(null);
  const [moving, setMoving] = useState<Tile | null>(null);
  const [design, setDesign] = useState(false);
  const parents = cms.parents ?? {};
  const hiddenTiles = new Set(cms.hiddenTiles ?? []);
  const everything = arrange(allTiles(content, builtins), cms);
  const level = everything.filter((t) => parentOf(parents, t) === (parentId ?? "") && (!t.staffOnly || !!staff));
  const shown = level.filter((t) => showHidden || !hiddenTiles.has(t.id));
  const cols = cms.columns === 3 ? "grid-cols-3" : "grid-cols-2";

  const move = (t: Tile, dir: -1 | 1) => {
    const i = shown.findIndex((x) => x.id === t.id);
    const other = shown[i + dir];
    if (!other) return;
    const ids = everything.map((x) => x.id);
    const a = ids.indexOf(t.id), b = ids.indexOf(other.id);
    [ids[a], ids[b]] = [ids[b]!, ids[a]!];
    save({ ...cms, order: ids });
  };
  const toggleHidden = (t: Tile) => {
    const next = new Set(hiddenTiles);
    if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
    save({ ...cms, hiddenTiles: [...next] });
  };
  const remove = (t: Tile) => {
    if (t.builtin) return;
    const id = t.id.slice(2);
    const sec = (cms.sections ?? []).find((s) => s.id === id);
    if (!window.confirm(`حذف «${sec?.ar || sec?.de}» مع محتواه؟ الأقسام داخله تعود لهذا المستوى.\nLöschen?`)) return;
    const nextParents = Object.fromEntries(Object.entries(parents).filter(([k]) => k !== t.id).map(([k, v]) => [k, v === id ? (parentId ?? "") : v]).filter(([, v]) => v));
    save({ ...cms, sections: (cms.sections ?? []).filter((s) => s.id !== id), parents: nextParents, order: (cms.order ?? []).filter((x) => x !== t.id) });
  };

  if (parentId && !canManage && shown.length === 0) return null;
  return (
    <div className="mt-5">
      {canManage && <div className="mb-2 flex items-center justify-end gap-2">
        {arranging && <button type="button" onClick={() => setArranging(false)} className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground">✓</button>}
        <GearMenu>
          <IconBtn label="قسم جديد | Neuer Bereich" onClick={() => setEditing("new")}><Plus className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="ترتيب ونقل | Anordnen" onClick={() => setArranging((v) => !v)}><Move className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="التصميم | Design" onClick={() => setDesign(true)}><Palette className="h-3.5 w-3.5" /></IconBtn>
        </GearMenu>
      </div>}
      <div className={`grid ${cols} gap-3`}>
        {shown.map((t) => {
          const Icon = t.icon;
          const off = hiddenTiles.has(t.id);
          return <div key={t.id} className={`relative min-w-0 ${off ? "opacity-45" : ""}`}>
            <Button variant="outline" onClick={() => !arranging && onOpen(t.id)} className={`${cms.columns === 3 ? "h-28 gap-2 px-1.5 text-xs" : "h-32 gap-3 px-3"} w-full flex-col whitespace-normal bg-card shadow-sm hover:border-secondary hover:bg-card`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-primary"><Icon className="h-5 w-5" /></span>
              <span className="w-full"><LangText ar={t.ar} de={t.de} center /></span>
            </Button>
            {arranging && <div className="absolute inset-x-1 bottom-1 flex flex-wrap justify-center gap-1">
              {shown.length > 1 && <IconBtn label="قبل | Davor" onClick={() => void move(t, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>}
              {shown.length > 1 && <IconBtn label="بعد | Danach" onClick={() => void move(t, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>}
              <IconBtn label="إخفاء/إظهار | Sichtbarkeit" onClick={() => toggleHidden(t)}>{off ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>
              <IconBtn label="نقل إلى مجلد | Verschieben" onClick={() => setMoving(t)}><FolderInput className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn label="تعديل | Bearbeiten" onClick={() => setEditing(t)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
              {!t.builtin && <IconBtn label="حذف | Löschen" danger onClick={() => remove(t)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>}
            </div>}
          </div>;
        })}
      </div>
      {editing && <SectionDialog content={content} tile={editing === "new" ? null : editing} parentId={parentId} onClose={() => setEditing(null)} />}
      {moving && <MoveDialog content={content} tile={moving} builtins={builtins} onClose={() => setMoving(null)} />}
      {design && <DesignDialog content={content} onClose={() => setDesign(false)} />}
    </div>
  );
}

function SectionDialog({ content, tile, parentId, onClose }: { content: SiteContent; tile: Tile | null; parentId?: string | undefined; onClose: () => void }) {
  const { cms, save } = useCms(content);
  const sec = tile && !tile.builtin ? (cms.sections ?? []).find((s) => customTileId(s.id) === tile.id) : undefined;
  const [ar, setAr] = useState(tile?.ar ?? "");
  const [de, setDe] = useState(sec ? sec.de : tile?.de ?? "");
  const [icon, setIcon] = useState(sec?.icon ?? "folder");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!ar.trim() && !de.trim()) return;
    setBusy(true);
    const filled = await fillGerman({ ar: ar.trim(), de: de.trim() }, [["ar", "de"]]);
    if (tile?.builtin) {
      await save(cms, { labels: { ...(content.labels ?? {}), [`tile:${tile.id}`]: { ar: filled.ar, de: filled.de } } });
    } else if (sec) {
      await save({ ...cms, sections: (cms.sections ?? []).map((s) => s.id === sec.id ? { ...s, ...filled, icon } : s) });
    } else {
      const s: CmsSection = { id: newId(), ...filled, icon, items: [] };
      await save({ ...cms, sections: [...(cms.sections ?? []), s], ...(parentId ? { parents: { ...(cms.parents ?? {}), [customTileId(s.id)]: parentId } } : {}) });
    }
    setBusy(false);
    onClose();
  };
  return <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-h-[90vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
    <DialogHeader className="text-right"><DialogTitle>{tile ? "تعديل القسم" : "قسم جديد"} <span className="text-sm italic text-muted-foreground">| {tile ? "Bereich bearbeiten" : "Neuer Bereich"}</span></DialogTitle><DialogDescription>اكتبي بالعربية فقط إن شئتِ — الألمانية تُترجم تلقائياً. | Deutsch wird automatisch ergänzt.</DialogDescription></DialogHeader>
    <div className="space-y-3 text-sm">
      <label className="block font-bold">الاسم بالعربية<input value={ar} onChange={(e) => setAr(e.target.value)} className={inputCls} /></label>
      <label className="block font-bold">Name (DE)<input dir="ltr" value={de} onChange={(e) => setDe(e.target.value)} placeholder="تلقائي | automatisch" className={inputCls} /></label>
      {!tile?.builtin && <div><p className="mb-1 font-bold">الأيقونة | Symbol</p><div className="grid grid-cols-6 gap-1.5">{Object.entries(cmsIcons).map(([k, I]) => <button key={k} type="button" aria-label={k} aria-pressed={icon === k} onClick={() => setIcon(k)} className={`grid h-10 place-items-center rounded-md border ${icon === k ? "border-secondary bg-accent text-primary" : "border-border bg-card text-muted-foreground"}`}><I className="h-4 w-4" /></button>)}</div></div>}
      <Button disabled={busy} className="h-11 w-full" onClick={submit}>{busy ? <Loader2 className="animate-spin" /> : "حفظ"} <span className="text-xs italic opacity-75">| Speichern</span></Button>
    </div>
  </DialogContent></Dialog>;
}

/** Converts a stored parent value (built-in id or raw section id) to its tile id. */
const parentTile = (v: string, builtins: Tile[]) => (builtins.some((b) => b.id === v) ? v : customTileId(v));

/** Chain of ancestors (outermost first) for a tile, used for breadcrumbs. */
export function pathOf(content: SiteContent, builtins: Tile[], tileId: string): Tile[] {
  const parents = content.cms?.parents ?? {};
  const tiles = allTiles(content, builtins);
  const out: Tile[] = [];
  const seen = new Set<string>([tileId]);
  const self = tiles.find((x) => x.id === tileId);
  let p = self ? parentOf(parents, self) : parents[tileId];
  while (p) {
    const id = parentTile(p, builtins);
    if (seen.has(id)) break;
    seen.add(id);
    const t = tiles.find((x) => x.id === id);
    if (!t) break;
    out.unshift(t);
    p = parentOf(parents, t);
  }
  return out;
}

function MoveDialog({ content, tile, builtins, onClose }: { content: SiteContent; tile: Tile; builtins: Tile[]; onClose: () => void }) {
  const { cms, save } = useCms(content);
  const parents = cms.parents ?? {};
  // A tile may not move into itself or into anything nested inside it.
  const isInside = (destTileId: string) => { let cur: string | undefined = destTileId; const seen = new Set<string>(); while (cur && !seen.has(cur)) { if (cur === tile.id) return true; seen.add(cur); const p: string | undefined = parents[cur]; cur = p ? parentTile(p, builtins) : undefined; } return false; };
  // Destinations: every section (built-in or created) as { value stored in parents, tile }.
  const dests = allTiles(content, builtins).map((t) => ({ value: t.builtin ? t.id : t.id.slice(2), t })).filter((d) => !isInside(d.t.id));
  const pick = (folder: string) => {
    const next = { ...parents };
    if (folder) next[tile.id] = folder; else if (tile.defaultParent) next[tile.id] = ""; else delete next[tile.id];
    void save({ ...cms, parents: next });
    onClose();
  };
  const current = parentOf(parents, tile);
  return <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-[360px] overflow-y-auto" dir="rtl">
    <DialogHeader className="text-right"><DialogTitle>نقل إلى <span className="text-sm italic text-muted-foreground">| Verschieben nach</span></DialogTitle><DialogDescription>«{tile.ar || tile.de}» ينتقل مع كل ما بداخله. | Mit allem Inhalt.</DialogDescription></DialogHeader>
    <div className="space-y-2">
      <Button variant={current === "" ? "default" : "outline"} className="h-11 w-full justify-start" onClick={() => pick("")}>🏠 الرئيسية | Startseite</Button>
      {dests.map(({ value, t }) => { const I = t.icon; return <Button key={t.id} variant={current === value ? "default" : "outline"} className="h-11 w-full justify-start gap-2" onClick={() => pick(value)}><I className="h-4 w-4" /><span className="truncate">{t.ar}{t.de && <span className="text-xs italic opacity-70"> | {t.de}</span>}</span></Button>; })}
      <Button variant="outline" className="h-11 w-full justify-start gap-2 border-dashed" onClick={() => {
        const name = window.prompt("اسم المجلد الجديد | Name des neuen Ordners");
        if (!name?.trim()) return;
        const sec: CmsSection = { id: newId(), ar: name.trim(), de: "", icon: "folder", items: [] };
        const next = { ...parents, [tile.id]: sec.id };
        const cur = parents[tile.id];
        if (cur) next[customTileId(sec.id)] = cur;
        void save({ ...cms, sections: [...(cms.sections ?? []), sec], parents: next });
        onClose();
      }}><Plus className="h-4 w-4" />مجلد جديد ونقل إليه | Neuer Ordner</Button>
    </div>
  </DialogContent></Dialog>;
}

const bannerModes: Array<{ id: string; ar: string; de: string; opacity: number; blur: number }> = [
  { id: "bright", ar: "ساطع", de: "Hell", opacity: 0.7, blur: 0 },
  { id: "calm", ar: "هادئ", de: "Ruhig", opacity: 0.45, blur: 0 },
  { id: "ghost", ar: "خيال", de: "Schemen", opacity: 0.25, blur: 2 },
  { id: "night", ar: "ليلي", de: "Nacht", opacity: 0.15, blur: 1 },
];
const bannerDefaults = { titleAr: "بإدارة الحاج ياسر الدر", titleDe: "Geleitet von Hajj Yasser Aldor", textAr: "كل رحلاتنا الدينية بمكان واحد: العراق، إيران، العمرة والحج.", textDe: "Alle unsere religiösen Reisen an einem Ort: Irak, Iran, Umrah und Hadsch." };

/** Home banner: one seamless block, image stays behind the text; admin can edit text, image and intensity. */
export function HomeBanner({ content, fallbackImage }: { content: SiteContent; fallbackImage: string }) {
  const canManage = useCanManage(content);
  const { cms, save } = useCms(content);
  const [edit, setEdit] = useState(false);
  const b = content.cms?.banner ?? {};
  const opacity = b.opacity ?? 0.55;
  const blur = b.blur ?? 0;
  return <section className="relative isolate overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-md">
    <img src={b.image || fallbackImage} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full scale-105 object-cover" style={{ opacity, filter: blur ? `blur(${blur}px)` : undefined }} />
    <div className="hero-shade pointer-events-none absolute inset-0 -z-10" />
        {canManage && <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5"><IconBtn label="تعديل البانر | Banner bearbeiten" onClick={() => setEdit(true)}><Pencil className="h-3.5 w-3.5" /></IconBtn>{Boolean(b.image) && <IconBtn label="استرجاع الصورة الأصلية | Originalbild" onClick={() => save({ ...cms, banner: { ...b, image: "" } })}><RotateCcw className="h-3.5 w-3.5" /></IconBtn>}</div>}
    <div className="relative px-5 pb-6 pt-16 text-center">
      <h1 className="text-lg"><LangText ar={b.titleAr || bannerDefaults.titleAr} de={b.titleDe || bannerDefaults.titleDe} inverse center /></h1>
      {(b.lineAr || b.lineDe) && <p className="mx-auto mt-3 max-w-[300px] rounded-full border border-secondary/50 bg-primary/40 px-4 py-1.5 text-sm font-bold text-secondary backdrop-blur-sm"><LangText ar={b.lineAr ?? ""} de={b.lineDe ?? ""} inverse center /></p>}
      <div className="gold-line mx-auto my-4 h-px w-28" />
      <p className="text-sm"><LangText ar={b.textAr || bannerDefaults.textAr} de={b.textDe || bannerDefaults.textDe} inverse center /></p>
    </div>
    {edit && <BannerDialog content={content} onClose={() => setEdit(false)} />}
  </section>;
}

function BannerDialog({ content, onClose }: { content: SiteContent; onClose: () => void }) {
  const { cms, save, password } = useCms(content);
  const [d, setD] = useState({ ...bannerDefaults, opacity: 0.55, blur: 0, image: "", lineAr: "", lineDe: "", ...(cms.banner ?? {}) });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k: string, v: string | number) => setD((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    setBusy(true);
    // Clear stale German when Arabic changed but German was left as before, so it re-translates.
    const old = cms.banner ?? {};
    const row = { ...d };
    (["title", "line", "text"] as const).forEach((k) => { const a = `${k}Ar` as const, g = `${k}De` as const; if (row[a] !== (old[a] ?? (bannerDefaults as Record<string, string>)[a] ?? "") && row[g] === (old[g] ?? (bannerDefaults as Record<string, string>)[g] ?? "")) row[g] = ""; });
    const filled = await fillGerman(row as Record<string, unknown>, [["titleAr", "titleDe"], ["lineAr", "lineDe"], ["textAr", "textDe"]]) as typeof d;
    await save({ ...cms, banner: filled });
    setBusy(false);
    onClose();
  };
  const field = (k: keyof typeof d, label: string, ltr = false, multi = false) => multi
    ? <label className="block font-bold">{label}<textarea dir={ltr ? "ltr" : undefined} rows={2} value={String(d[k] ?? "")} onChange={(e) => set(k, e.target.value)} placeholder={ltr ? "تلقائي | automatisch" : undefined} className={inputCls} /></label>
    : <label className="block font-bold">{label}<input dir={ltr ? "ltr" : undefined} value={String(d[k] ?? "")} onChange={(e) => set(k, e.target.value)} placeholder={ltr ? "تلقائي | automatisch" : undefined} className={inputCls} /></label>;
  return <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-h-[90vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
    <DialogHeader className="text-right"><DialogTitle>البانر الرئيسي <span className="text-sm italic text-muted-foreground">| Banner</span></DialogTitle><DialogDescription>اكتبي بالعربية فقط إن شئتِ — الألمانية والإنجليزية تُترجمان تلقائياً.</DialogDescription></DialogHeader>
    <div className="space-y-3 text-sm">
      {field("titleAr", "العنوان")}{field("titleDe", "Titel (DE)", true)}
      {field("lineAr", "سطر اليوم (دعاء / كلمة) — اختياري", false, true)}{field("lineDe", "Tageszeile (DE)", true, true)}
      {field("textAr", "النص التعريفي", false, true)}{field("textDe", "Text (DE)", true, true)}
      <div className="font-bold">صورة الخلفية | Hintergrundbild
        <div className="mt-1 flex gap-2"><input dir="ltr" value={d.image ?? ""} onChange={(e) => set("image", e.target.value)} placeholder="https://… (فارغ = الصورة الأصلية)" className={inputCls + " mt-0"} />
          <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-md border border-border bg-card text-primary">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setUploading(true); try { set("image", await uploadImage(f, password)); } catch (err) { window.alert(String(err)); } finally { setUploading(false); } }} /></label>
        </div>
      </div>
      <div><p className="mb-1 font-bold">درجة الصورة | Bildstärke</p>
        <div className="grid grid-cols-4 gap-1.5">{bannerModes.map((m) => <button key={m.id} type="button" onClick={() => setD((x) => ({ ...x, opacity: m.opacity, blur: m.blur }))} aria-pressed={d.opacity === m.opacity && d.blur === m.blur} className={`rounded-md border px-1 py-2 text-xs font-bold ${d.opacity === m.opacity && d.blur === m.blur ? "border-secondary bg-accent text-primary" : "border-border bg-card"}`}>{m.ar}<span className="block text-[10px] italic opacity-70">{m.de}</span></button>)}</div>
        <label className="mt-2 block text-xs">الشفافية {Math.round((d.opacity ?? 0.55) * 100)}%<input type="range" min={5} max={90} value={Math.round((d.opacity ?? 0.55) * 100)} onChange={(e) => set("opacity", Number(e.target.value) / 100)} className="w-full accent-secondary" /></label>
        <label className="block text-xs">التمويه | Weichzeichner {d.blur ?? 0}px<input type="range" min={0} max={6} value={d.blur ?? 0} onChange={(e) => set("blur", Number(e.target.value))} className="w-full accent-secondary" /></label>
      </div>
      <Button disabled={busy || uploading} className="h-11 w-full" onClick={submit}>{busy ? <Loader2 className="animate-spin" /> : "حفظ"} <span className="text-xs italic opacity-75">| Speichern</span></Button>
    </div>
  </DialogContent></Dialog>;
}

const themes: Array<{ id: string; ar: string; de: string; swatch: string }> = [
  { id: "", ar: "كحلي وذهبي", de: "Navy & Gold", swatch: "oklch(0.25 0.066 249)" },
  { id: "emerald", ar: "زمردي", de: "Smaragd", swatch: "oklch(0.32 0.07 165)" },
  { id: "burgundy", ar: "عنابي", de: "Bordeaux", swatch: "oklch(0.3 0.09 15)" },
  { id: "onyx", ar: "أسود فاخر", de: "Onyx", swatch: "oklch(0.2 0.01 250)" },
  { id: "royal", ar: "بنفسجي ملكي", de: "Königsblau", swatch: "oklch(0.3 0.1 275)" },
];
const LATIN_LINE = /^[^\u0600-\u06FF]*[A-Za-zÄÖÜäöüß][^\u0600-\u06FF]*$/;
/** Removes German/Latin-only lines and "| German" tails from Arabic text fields, keeping all Arabic. */
function stripLatin(v: string) {
  return v.split("\n").map((l) => (/[\u0600-\u06FF]/.test(l) ? l.replace(/\s*\|\s*[^\u0600-\u06FF]*[A-Za-zÄÖÜäöüß][^\u0600-\u06FF]*$/, "") : l)).filter((l) => !LATIN_LINE.test(l.trim())).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function cleanArabic(x: unknown, key = ""): unknown {
  if (typeof x === "string") return (key === "ar" || /Ar$/.test(key)) && /[\u0600-\u06FF]/.test(x) ? stripLatin(x) : x;
  if (Array.isArray(x)) return x.map((v) => cleanArabic(v));
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === "trash" ? v : cleanArabic(v, k)]));
  return x;
}

function DesignDialog({ content, onClose }: { content: SiteContent; onClose: () => void }) {
  const { cms } = useCms(content);
  const s = useAdminSession();
  const canManage = useCanManage(content);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<CmsConfig>(cms);
  const [busy, setBusy] = useState(false);
  const persist = async (next: SiteContent) => {
    if (!s || !canManage) return;
    setBusy(true);
    try {
      const { queued } = await saveOrQueue(s.password, next, "التصميم | Design", qc);
      if (queued) window.alert("محفوظ محلياً | Lokal gespeichert");
      onClose();
    } catch (e) { window.alert(`تعذّر الحفظ | Fehler\n${e instanceof Error ? e.message : e}`); } finally { setBusy(false); }
  };
  const clean = () => {
    if (!window.confirm("سيُحذف كل نص ألماني/لاتيني مكتوب داخل خانات العربية في كل التطبيق، ويبقى العربي فقط. خانات الألمانية لا تُمس. متابعة؟\nDeutsche Texte in arabischen Feldern entfernen?")) return;
    void persist({ ...(cleanArabic(content) as SiteContent), cms: draft });
  };
  return <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-h-[90vh] w-[calc(100%-24px)] max-w-[360px] overflow-y-auto" dir="rtl">
    <DialogHeader className="text-right"><DialogTitle>التصميم <span className="text-sm italic text-muted-foreground">| Design</span></DialogTitle><DialogDescription>يُطبّق على كل الأجهزة | Gilt auf allen Geräten</DialogDescription></DialogHeader>
    <div className="space-y-4 text-sm">
      <div><p className="mb-2 font-bold">اللون الأساسي | Hauptfarbe</p><div className="grid grid-cols-5 gap-2">{themes.map((t) => <button key={t.id} type="button" aria-label={t.de} aria-pressed={(draft.theme ?? "") === t.id} onClick={() => setDraft({ ...draft, theme: t.id })} className={`flex flex-col items-center gap-1 rounded-md border p-1.5 text-[9px] ${(draft.theme ?? "") === t.id ? "border-secondary ring-2 ring-secondary" : "border-border"}`}><span className="h-7 w-7 rounded-full border-2 border-secondary" style={{ background: t.swatch }} />{t.ar}</button>)}</div></div>
      <div><p className="mb-2 font-bold">عدد المربعات في الصف | Kacheln pro Reihe</p><div className="grid grid-cols-2 gap-2">{([2, 3] as const).map((n) => <Button key={n} variant={(draft.columns ?? 2) === n ? "default" : "outline"} onClick={() => setDraft({ ...draft, columns: n })}>{n}</Button>)}</div></div>
      {s?.role === "admin" && <label className="flex items-center gap-2 rounded-md border border-border p-3 font-bold"><input type="checkbox" checked={!!draft.hajCanManage} onChange={(e) => setDraft({ ...draft, hajCanManage: e.target.checked })} className="h-4 w-4 accent-secondary" />السماح للحاج بأدوات التحكم الكاملة <span className="text-xs italic text-muted-foreground">| Volle Kontrolle für Hajj</span></label>}
      <Button disabled={busy} className="h-11 w-full" onClick={() => void persist({ ...content, cms: draft })}>{busy ? <Loader2 className="animate-spin" /> : "حفظ التصميم"} <span className="text-xs italic opacity-75">| Speichern</span></Button>
      {s?.role === "admin" && <Button disabled={busy} variant="outline" className="h-auto w-full whitespace-normal py-2 text-xs" onClick={clean}>🧹 حذف الألماني من خانات العربية بضغطة واحدة | Deutsch aus arabischen Feldern entfernen</Button>}
    </div>
  </DialogContent></Dialog>;
}

/** Full page of an admin-created section: its sub-sections (same tiles) and its content cards. */
export function CustomSectionView({ content, id, builtins, onOpen }: { content: SiteContent; id: string; builtins: Tile[]; onOpen: (id: string) => void }) {
  const { cms, save, password } = useCms(content);
  const canManage = useCanManage(content);
  const [edit, setEdit] = useState<CmsItem | "new" | null>(null);
  const sec = (cms.sections ?? []).find((s) => s.id === id);
  if (!sec) return <p className="px-4 py-10 text-center text-sm text-muted-foreground"><LangText ar="هذا القسم غير موجود." de="Dieser Bereich existiert nicht." /></p>;
  const Icon = cmsIcons[sec.icon] ?? Folder;
  const items = sec.items.filter((i) => canManage || !i.hidden);
  const setItems = (list: CmsItem[]) => save({ ...cms, sections: (cms.sections ?? []).map((s) => s.id === id ? { ...s, items: list } : s) });
  const move = (i: CmsItem, dir: -1 | 1) => { const list = [...sec.items]; const a = list.indexOf(i), b = a + dir; if (b < 0 || b >= list.length) return; [list[a], list[b]] = [list[b]!, list[a]!]; setItems(list); };
  return <div className="screen-enter px-4 py-7">
    <div className="mb-2 flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
      <h2 className="min-w-0 flex-1 text-xl text-primary"><LangText ar={sec.ar} de={sec.de} /></h2>
      {canManage && <IconBtn label="إضافة محتوى | Inhalt hinzufügen" onClick={() => setEdit("new")}><Plus className="h-3.5 w-3.5" /></IconBtn>}
    </div>
    <TileGrid content={content} builtins={builtins} parentId={id} onOpen={onOpen} />
    <div className="mt-5 space-y-3">
      {items.map((it) => <article key={it.id} className={`relative overflow-hidden rounded-lg border border-border bg-card shadow-sm ${it.hidden ? "opacity-50" : ""}`}>
        {it.imageUrl && <img src={it.imageUrl} alt={it.ar || it.de} loading="lazy" className="max-h-72 w-full object-cover" />}
        <div className="p-4">
          {canManage && <div className="float-left mr-2"><GearMenu>
            <IconBtn label="قبل | Davor" onClick={() => move(it, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="بعد | Danach" onClick={() => move(it, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="تعديل | Bearbeiten" onClick={() => setEdit(it)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn label="إخفاء/إظهار | Sichtbarkeit" onClick={() => setItems(sec.items.map((x) => x.id === it.id ? { ...x, hidden: !x.hidden } : x))}>{it.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>
            <IconBtn label="حذف | Löschen" danger onClick={() => { if (window.confirm("حذف؟ | Löschen?")) setItems(sec.items.filter((x) => x.id !== it.id)); }}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
          </GearMenu></div>}
          <h3 className="font-bold text-primary"><LangText ar={it.ar} de={it.de} /></h3>
          {(it.bodyAr || it.bodyDe) && <div className="mt-2 whitespace-pre-line text-sm leading-relaxed"><LangText ar={it.bodyAr ?? ""} de={it.bodyDe ?? ""} /></div>}
          {(it.link || it.pdfUrl) && <div className="mt-3 flex flex-wrap gap-2">
            {it.link && <Button asChild size="sm" variant="outline"><a href={it.link} target="_blank" rel="noreferrer"><Link2 />فتح | Öffnen</a></Button>}
            {it.pdfUrl && <Button asChild size="sm" variant="outline"><a href={it.pdfUrl} target="_blank" rel="noreferrer"><FileText />PDF</a></Button>}
          </div>}
        </div>
      </article>)}
      {!items.length && !(cms.sections ?? []).some((s) => (cms.parents ?? {})[customTileId(s.id)] === id) && <p className="rounded-lg border border-dashed border-secondary/50 bg-card p-6 text-center text-sm text-muted-foreground"><LangText ar="سيُضاف المحتوى هنا قريباً." de="Inhalte folgen in Kürze." /></p>}
    </div>
    {edit && <ItemDialog item={edit === "new" ? null : edit} password={password} onClose={() => setEdit(null)} onSave={async (row) => { await setItems(edit === "new" ? [...sec.items, row] : sec.items.map((x) => x.id === row.id ? row : x)); }} />}
  </div>;
}

function ItemDialog({ item, password, onClose, onSave }: { item: CmsItem | null; password: string; onClose: () => void; onSave: (row: CmsItem) => Promise<void> }) {
  const [d, setD] = useState<CmsItem>(item ?? { id: newId(), ar: "", de: "", bodyAr: "", bodyDe: "", imageUrl: "", link: "", pdfUrl: "" });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k: keyof CmsItem, v: string) => setD((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    setBusy(true);
    const filled = await fillGerman(d as unknown as Record<string, unknown>, [["ar", "de"], ["bodyAr", "bodyDe"]]) as unknown as CmsItem;
    await onSave(filled);
    setBusy(false);
    onClose();
  };
  return <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-h-[90vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
    <DialogHeader className="text-right"><DialogTitle>{item ? "تعديل" : "محتوى جديد"} <span className="text-sm italic text-muted-foreground">| {item ? "Bearbeiten" : "Neuer Inhalt"}</span></DialogTitle><DialogDescription>الألمانية تُترجم تلقائياً إن تُركت فارغة. | Deutsch wird automatisch ergänzt.</DialogDescription></DialogHeader>
    <div className="space-y-3 text-sm">
      <label className="block font-bold">العنوان<input value={d.ar} onChange={(e) => set("ar", e.target.value)} className={inputCls} /></label>
      <label className="block font-bold">Titel (DE)<input dir="ltr" value={d.de} onChange={(e) => set("de", e.target.value)} placeholder="تلقائي | automatisch" className={inputCls} /></label>
      <label className="block font-bold">النص<textarea rows={5} value={d.bodyAr ?? ""} onChange={(e) => set("bodyAr", e.target.value)} className={inputCls} /></label>
      <label className="block font-bold">Text (DE)<textarea dir="ltr" rows={4} value={d.bodyDe ?? ""} onChange={(e) => set("bodyDe", e.target.value)} placeholder="تلقائي | automatisch" className={inputCls} /></label>
      <div className="font-bold">صورة | Bild
        <div className="mt-1 flex gap-2"><input dir="ltr" value={d.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" className={inputCls + " mt-0"} />
          <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-md border border-border bg-card text-primary">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setUploading(true); try { set("imageUrl", await uploadImage(f, password)); } catch (err) { window.alert(String(err)); } finally { setUploading(false); } }} /></label>
        </div>
      </div>
      <label className="block font-bold">رابط | Link<input dir="ltr" value={d.link ?? ""} onChange={(e) => set("link", e.target.value)} placeholder="https://…" className={inputCls} /></label>
      <label className="block font-bold">رابط PDF<input dir="ltr" value={d.pdfUrl ?? ""} onChange={(e) => set("pdfUrl", e.target.value)} placeholder="https://…" className={inputCls} /></label>
      <Button disabled={busy || uploading || (!d.ar.trim() && !d.de.trim())} className="h-11 w-full" onClick={submit}>{busy ? <Loader2 className="animate-spin" /> : "حفظ"} <span className="text-xs italic opacity-75">| Speichern</span></Button>
    </div>
  </DialogContent></Dialog>;
}
