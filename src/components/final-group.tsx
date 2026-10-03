import { useState } from "react";
import { BedDouble, BookMarked, Folder, Type, ChevronLeft, ChevronRight, ClipboardPaste, FileText, Flag, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FavStar } from "@/components/group2";
import { useAdminSession, useShowHidden } from "@/lib/admin-session";
import { AddButton, IconBtn, ManageRow, useSaveContent, type FieldDef } from "@/components/inline-admin";
import { labelOf, type GuidelineEntry, type RoomEntry, type SiteContent } from "@/lib/site-content";

const gearCls = "h-7 w-7 shrink-0 rounded-full bg-primary text-secondary hover:bg-primary/90 hover:text-secondary";
const inputCls = "h-11 w-full rounded-md border border-border bg-background px-3 text-sm";

function Pair({ ar, de }: { ar: string; de: string }) {
  return <span className="block"><span className="block">{ar}</span><span lang="de" dir="ltr" className="block text-[0.8em] italic text-muted-foreground">{de}</span></span>;
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

/** Parses pasted lines "name, city, hotel, floor, room" (comma, tab, ; or | separated). */
function parseRooms(text: string): RoomEntry[] {
  return text.split(/\r?\n/).map((l) => l.split(/\t|;|\||,/).map((x) => x.trim())).filter((c) => c[0])
    .map((c, i) => ({ id: `rm${Date.now()}${i}`, name: c[0] ?? "", city: c[1] ?? "", hotel: c[2] ?? "", floor: c[3] ?? "", room: c[4] ?? "" }));
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
  const term = q.trim().toLowerCase();
  const list = term ? visible.filter((r) => [r.name, r.room, r.hotel, r.city].some((x) => x.toLowerCase().includes(term))) : visible;
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

  return <section className="min-w-0 rounded-lg border border-secondary/50 bg-card p-3">
    <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
      <h3 className="flex min-w-0 items-start gap-1.5 font-bold text-primary"><BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /><Pair ar={`تسكين الزوار (${visible.length})`} de="Zimmerverteilung" /></h3>
      <Button type="button" variant="ghost" size="icon" onClick={() => setManage(true)} aria-label="إدارة التسكين | Zimmer verwalten" className={gearCls}><Settings className="h-3.5 w-3.5" /></Button>
    </div>
    <label className="relative block"><Search className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الغرفة | Name oder Zimmer" className={`${inputCls} pr-9`} /></label>
    <div className="mt-2 max-h-80 space-y-1.5 overflow-y-auto">
      {list.map((r) => <div key={r.id} className={`rounded-md border border-border p-2 text-xs ${r.hidden ? "opacity-60" : ""}`}>
        <p className="font-bold text-primary">{r.name}{r.hidden && <span className="ms-1 text-[10px] text-muted-foreground">(مخفي | Versteckt)</span>}</p>
        <p className="text-muted-foreground">{r.city} · {r.hotel} · طابق/Etage <b dir="ltr">{r.floor || "—"}</b> · غرفة/Zimmer <b dir="ltr">{r.room || "—"}</b></p>
      </div>)}
      {list.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">لا توجد نتائج | Keine Einträge</p>}
    </div>

    <ManageDialog open={manage} onOpenChange={setManage} ar="تسكين الزوار" de="Zimmerverteilung">
      <div className="space-y-2">
        {visible.map((r) => <ManageRow key={r.id} title={r.name} subtitle={`${r.city} · ${r.hotel} · ${r.floor}/${r.room}`} fields={roomFields} item={r} hidden={r.hidden ?? false}
          onVisibilityChange={(hidden) => commit(all.map((x) => x.id === r.id ? { ...x, hidden } : x))}
          onSave={(row) => commit(all.map((x) => x.id === r.id ? { ...(row as RoomEntry), id: r.id, hidden: r.hidden ?? false } : x))}
          onDelete={() => commit(all.filter((x) => x.id !== r.id))} />)}
      </div>
      <AddButton label={{ ar: "إضافة زائر", de: "Gast hinzufügen" }} fields={roomFields} blank={{ name: "", city: "", hotel: "", floor: "", room: "" }} onAdd={(row) => commit([...all, { ...(row as RoomEntry), id: `rm${Date.now()}` }])} />
      <div className="space-y-2 rounded-md border border-secondary/40 p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-primary"><ClipboardPaste className="h-4 w-4" />لصق جماعي | Massenimport</p>
        <p className="text-[11px] text-muted-foreground">سطر لكل زائر: الاسم، المدينة، الفندق، الطابق، الغرفة<span dir="ltr" className="block">Pro Zeile: Name, Stadt, Hotel, Etage, Zimmer</span></p>
        <textarea rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-xs" />
        <Button type="button" className="h-10 w-full" disabled={!paste.trim()} onClick={importRooms}>استيراد | Importieren</Button>
      </div>
      <Button type="button" variant="destructive" className="mt-2 h-11 w-full" onClick={endTrip}><Flag />انتهاء الرحلة <span className="text-xs italic opacity-80">| Reise beenden</span></Button>
    </ManageDialog>
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
    {open && <TitleDialog open={open} onOpenChange={setOpen} initial={{ ar, de }} onSubmit={(row) => save({ ...content, labels: { ...(content.labels ?? {}), [labelKey]: { ar: String(row.ar ?? ""), de: String(row.de ?? "") } } })} />}
  </>;
}
function TitleDialog({ open, onOpenChange, initial, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; initial: { ar: string; de: string }; onSubmit: (r: Record<string, unknown>) => Promise<void> }) {
  const [d, setD] = useState(initial);
  return <ManageDialog open={open} onOpenChange={onOpenChange} ar="إعادة تسمية" de="Umbenennen">
    {titleFields.map((f) => <label key={f.key} className="block text-xs font-bold text-primary">{f.ar} | {f.de}<input dir={f.ltr ? "ltr" : "rtl"} value={d[f.key as "ar" | "de"]} onChange={(e) => setD({ ...d, [f.key]: e.target.value })} className={`${inputCls} mt-1`} /></label>)}
    <Button type="button" className="h-10 w-full" onClick={async () => { await onSubmit(d); onOpenChange(false); }}>حفظ | Speichern</Button>
  </ManageDialog>;
}

export function GuidelinesFolders({ content }: { content: SiteContent }) {
  const staff = useAdminSession();
  const showHidden = useShowHidden();
  const save = useSaveContent(staff?.password ?? "");
  const [openId, setOpenId] = useState<string | null>(null);
  const [img, setImg] = useState(0);
  const [manage, setManage] = useState(false);
  const all = content.guidelines ?? [];
  const items = all.filter((g) => showHidden || !g.hidden);
  if (!staff && items.length === 0) return null;
  const title = labelOf(content, "guidelines", "إرشادات وآداب الزيارة", "Hinweise & Etikette");
  const commit = (guidelines: GuidelineEntry[]) => save({ ...content, guidelines });
  const cur = items.find((g) => g.id === openId) ?? null;
  const pics = (cur?.images ?? "").split(/\s+/).filter(Boolean);
  const n = pics.length;

  return <section className="mt-7 min-w-0">
    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
      <h3 className="flex min-w-0 items-start gap-1.5 font-bold text-primary"><BookMarked className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /><Pair ar={title.ar} de={title.de} /></h3>
      {staff && <div className="flex gap-1"><RenameTitle content={content} labelKey="guidelines" ar={title.ar} de={title.de} /><Button type="button" variant="ghost" size="icon" onClick={() => setManage(true)} aria-label="إدارة الإرشادات | Hinweise verwalten" className={gearCls}><Settings className="h-3.5 w-3.5" /></Button></div>}
    </div>
    <div className="grid grid-cols-2 gap-3">
      {items.map((g) => <button key={g.id} type="button" onClick={() => { setImg(0); setOpenId(g.id); }} className={`flex min-h-24 min-w-0 flex-col items-start gap-2 rounded-lg border border-secondary/50 bg-card p-3 text-right shadow-sm ${g.hidden ? "opacity-60" : ""}`}>
        <Folder className="h-6 w-6 text-secondary" />
        <span className="min-w-0 text-sm font-bold text-primary"><Pair ar={g.destAr || g.ar.slice(0, 30)} de={g.destDe || g.de.slice(0, 30)} /></span>
      </button>)}
    </div>

    <Dialog open={!!cur} onOpenChange={(o) => !o && setOpenId(null)}>
      <DialogContent className="max-h-[88vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
        {cur && <>
          <DialogHeader className="text-right"><DialogTitle><Pair ar={cur.destAr || title.ar} de={cur.destDe || title.de} /></DialogTitle><DialogDescription className="sr-only">{title.de}</DialogDescription></DialogHeader>
          {n > 0 && <div className="relative overflow-hidden rounded-md">
            <img src={pics[img % n]} alt={cur.destAr || title.ar} className="aspect-square w-full object-cover" />
            {n > 1 && <>
              <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2" aria-label="السابق | Zurück" onClick={() => setImg((img - 1 + n) % n)}><ChevronRight className="h-4 w-4" /></Button>
              <Button type="button" variant="secondary" size="icon" className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2" aria-label="التالي | Weiter" onClick={() => setImg((img + 1) % n)}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">{pics.map((p, k) => <span key={p + k} className={`h-1.5 rounded-full ${k === img % n ? "w-4 bg-secondary" : "w-1.5 bg-background/80"}`} />)}</div>
            </>}
          </div>}
          <div className="relative rounded-md bg-accent p-4 pe-12 text-sm">
            <FavStar id={`guide:${cur.id}`} className="absolute left-2 top-2 h-8 w-8" />
            <p className="whitespace-pre-line">{cur.ar}</p>
            {cur.de && <p lang="de" dir="ltr" className="mt-2 whitespace-pre-line text-xs italic text-muted-foreground">{cur.de}</p>}
          </div>
          {(cur.pdf || content.guidelinesPdf) && <Button asChild variant="outline" className="h-10 w-full"><a href={cur.pdf || content.guidelinesPdf} target="_blank" rel="noreferrer" download><FileText />PDF <span className="text-xs italic opacity-70">| öffnen</span></a></Button>}
        </>}
      </DialogContent>
    </Dialog>

    {staff && <ManageDialog open={manage} onOpenChange={setManage} ar={title.ar} de={title.de}>
      <div className="space-y-2">
        {items.map((g) => <ManageRow key={g.id} title={g.destAr || g.ar.slice(0, 40)} subtitle={g.destDe || g.de.slice(0, 40)} fields={guideFields} item={g} hidden={g.hidden ?? false}
          onVisibilityChange={(hidden) => commit(all.map((x) => x.id === g.id ? { ...x, hidden } : x))}
          onSave={(row) => commit(all.map((x) => x.id === g.id ? { ...(row as GuidelineEntry), id: g.id, hidden: g.hidden ?? false } : x))}
          onDelete={() => commit(all.filter((x) => x.id !== g.id))} />)}
      </div>
      <AddButton label={{ ar: "إضافة مجلد إرشادات", de: "Hinweis-Ordner hinzufügen" }} fields={guideFields} blank={{ destAr: "", destDe: "", ar: "", de: "", images: "", pdf: "" }} onAdd={(row) => commit([...all, { ...(row as GuidelineEntry), id: `gd${Date.now()}` }])} />
    </ManageDialog>}
  </section>;
}
