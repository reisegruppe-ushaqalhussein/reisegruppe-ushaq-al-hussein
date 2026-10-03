import { useState } from "react";
import { BedDouble, ChevronLeft, ChevronRight, ClipboardPaste, FileText, Flag, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FavStar } from "@/components/group2";
import { useAdminSession, useShowHidden } from "@/lib/admin-session";
import { AddButton, ManageRow, useSaveContent, type FieldDef } from "@/components/inline-admin";
import type { GuidelineEntry, RoomEntry, SiteContent } from "@/lib/site-content";

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

/* ---------- Visit guidelines carousel + PDF ---------- */
const guideFields: FieldDef[] = [
  { key: "ar", ar: "النص بالعربية", de: "Text (AR)", multiline: true },
  { key: "de", ar: "النص بالألمانية", de: "Text (DE)", multiline: true, ltr: true },
];

export function GuidelinesCarousel({ content }: { content: SiteContent }) {
  const staff = useAdminSession();
  const showHidden = useShowHidden();
  const save = useSaveContent(staff?.password ?? "");
  const [i, setI] = useState(0);
  const [manage, setManage] = useState(false);
  const [pdf, setPdf] = useState(content.guidelinesPdf ?? "");
  const all = content.guidelines ?? [];
  const items = all.filter((g) => showHidden || !g.hidden);
  if (!staff && items.length === 0 && !content.guidelinesPdf) return null;
  const cur = items[Math.min(i, Math.max(items.length - 1, 0))];
  const commit = (guidelines: GuidelineEntry[]) => save({ ...content, guidelines });
  const n = items.length;

  return <section className="mb-6 rounded-lg border border-secondary/50 bg-card p-3 shadow-sm">
    <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
      <h3 className="min-w-0 font-bold text-primary"><Pair ar="إرشادات وآداب الزيارة" de="Hinweise & Etikette" /></h3>
      {staff && <Button type="button" variant="ghost" size="icon" onClick={() => { setPdf(content.guidelinesPdf ?? ""); setManage(true); }} aria-label="إدارة الإرشادات | Hinweise verwalten" className={gearCls}><Settings className="h-3.5 w-3.5" /></Button>}
    </div>
    {cur && <div className={`relative rounded-md bg-accent p-4 pe-12 text-sm ${cur.hidden ? "opacity-60" : ""}`}>
      <FavStar id={`guide:${cur.id}`} className="absolute left-2 top-2 h-8 w-8" />
      <p className="whitespace-pre-line">{cur.ar}</p>
      {cur.de && <p lang="de" dir="ltr" className="mt-2 whitespace-pre-line text-xs italic text-muted-foreground">{cur.de}</p>}
    </div>}
    {n > 1 && <div className="mt-2 flex items-center justify-between">
      <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="السابق | Zurück" onClick={() => setI((i - 1 + n) % n)}><ChevronRight className="h-4 w-4" /></Button>
      <div className="flex gap-1">{items.map((g, k) => <span key={g.id} className={`h-1.5 rounded-full ${k === i ? "w-4 bg-secondary" : "w-1.5 bg-border"}`} />)}</div>
      <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="التالي | Weiter" onClick={() => setI((i + 1) % n)}><ChevronLeft className="h-4 w-4" /></Button>
    </div>}
    {content.guidelinesPdf && <Button asChild variant="outline" className="mt-3 h-10 w-full"><a href={content.guidelinesPdf} target="_blank" rel="noreferrer" download><FileText />ملف الإرشادات PDF <span className="text-xs italic opacity-70">| PDF öffnen</span></a></Button>}

    {staff && <ManageDialog open={manage} onOpenChange={setManage} ar="إرشادات الزيارة" de="Besuchshinweise">
      <div className="space-y-2">
        {items.map((g) => <ManageRow key={g.id} title={g.ar.slice(0, 60)} subtitle={g.de.slice(0, 60)} fields={guideFields} item={g} hidden={g.hidden ?? false}
          onVisibilityChange={(hidden) => commit(all.map((x) => x.id === g.id ? { ...x, hidden } : x))}
          onSave={(row) => commit(all.map((x) => x.id === g.id ? { ...(row as GuidelineEntry), id: g.id, hidden: g.hidden ?? false } : x))}
          onDelete={() => commit(all.filter((x) => x.id !== g.id))} />)}
      </div>
      <AddButton label={{ ar: "إضافة إرشاد", de: "Hinweis hinzufügen" }} fields={guideFields} blank={{ ar: "", de: "" }} onAdd={(row) => commit([...all, { ...(row as GuidelineEntry), id: `gd${Date.now()}` }])} />
      <label className="block text-xs font-bold text-primary">رابط ملف PDF | PDF-Link
        <input dir="ltr" value={pdf} onChange={(e) => setPdf(e.target.value)} className={`${inputCls} mt-1`} />
      </label>
      <Button type="button" className="h-10 w-full" onClick={() => save({ ...content, guidelinesPdf: pdf.trim() })}>حفظ الرابط | Link speichern</Button>
    </ManageDialog>}
  </section>;
}
