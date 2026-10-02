import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminSession, useShowHidden } from "@/lib/admin-session";
import { saveOrQueue } from "@/lib/offline";
import { duaCategories, duaCategoryOf, type DuaCategory, type DuaEntry, type Reciter, type SiteContent } from "@/lib/site-content";

export { ADMIN_KEY } from "@/lib/admin-session";

/** Returns the access code if this device is signed in (admin or campaign leader). */
export function useAdminPassword() {
  return useAdminSession()?.password ?? null;
}

function useSaveDuas(password: string, content: SiteContent) {
  const qc = useQueryClient();
  return async (duas: DuaEntry[]) => {
    await saveOrQueue(password, { ...content, duas }, "الأدعية | Bittgebete", qc);
  };
}

const inputCls = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function RecitersEditor({ value, onChange }: { value: Reciter[]; onChange: (v: Reciter[]) => void }) {
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="font-bold">القرّاء (اسم + رابط MP3) <span className="text-xs italic text-muted-foreground">| Rezitatoren</span></p>
      {value.map((r, i) => (
        <div key={i} className="space-y-1 rounded-md bg-muted p-2">
          <div className="flex flex-wrap gap-2">
            <input dir="rtl" placeholder="اسم القارئ | Name" value={r.name} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputCls} />
            <Button size="icon" variant="ghost" className="mt-1 text-destructive" aria-label="حذف | Löschen" onClick={() => onChange(value.filter((_, j) => j !== i))}><X /></Button>
          </div>
          <input dir="ltr" placeholder="https://…/file.mp3" value={r.url} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} className={inputCls} />
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...value, { name: "", url: "" }])}><Plus />إضافة قارئ <span className="text-xs italic">| Rezitator</span></Button>
    </div>
  );
}

function DuaForm({ open, onOpenChange, initial, title, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; initial: DuaEntry; title: { ar: string; de: string }; onSubmit: (d: DuaEntry) => Promise<void> }) {
  const [draft, setDraft] = useState<DuaEntry>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setDraft(initial); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch: Partial<DuaEntry>) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle>{title.ar} <span className="text-sm italic text-muted-foreground">| {title.de}</span></DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block font-bold">العنوان (عربي) | Titel (AR)<input dir="rtl" value={draft.ar} onChange={(e) => set({ ar: e.target.value })} className={inputCls} /></label>
          <label className="block font-bold">العنوان (ألماني) | Titel (DE)<input dir="ltr" value={draft.de} onChange={(e) => set({ de: e.target.value })} className={inputCls} /></label>
          <label className="block font-bold">التصنيف | Kategorie
            <select value={draft.category} onChange={(e) => set({ category: e.target.value as DuaCategory })} className={inputCls}>
              {duaCategories.map((c) => <option key={c.id} value={c.id}>{c.de} ({c.ar})</option>)}
            </select>
          </label>
          <label className="block font-bold">النص العربي | Arabischer Text<textarea dir="rtl" rows={6} value={draft.textAr} onChange={(e) => set({ textAr: e.target.value })} className={inputCls} /></label>
          <label className="block font-bold">اللاتينية — الترجمة | Transliteration — Übersetzung<textarea dir="ltr" rows={6} value={draft.textDe} onChange={(e) => set({ textDe: e.target.value })} className={inputCls} /></label>
          <p className="text-xs text-muted-foreground">افصل بين القراءة اللاتينية والترجمة بـ « — » | Transliteration und Übersetzung mit „ — “ trennen</p>
          <label className="block font-bold">رابط PDF | Link<input dir="ltr" value={draft.link} onChange={(e) => set({ link: e.target.value })} className={inputCls} /></label>
          <RecitersEditor value={draft.reciters ?? []} onChange={(reciters) => set({ reciters })} />
          <Button disabled={busy} className="h-11 w-full" onClick={async () => {
            if (!draft.ar && !draft.de) return window.alert("أدخل العنوان | Titel eingeben");
            setBusy(true);
            try { await onSubmit({ ...draft, reciters: (draft.reciters ?? []).filter((r) => r.name && r.url) }); onOpenChange(false); }
            catch (e) { console.error(e); window.alert(`تعذّر الحفظ | Speichern fehlgeschlagen\n\n${e instanceof Error ? e.message : String(e)}`); }
            finally { setBusy(false); }
          }}>حفظ ونشر <span className="text-xs italic opacity-75">| Speichern & veröffentlichen</span></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Section-level add button (admin only). */
export function DuaAddButton({ category, password, content }: { category: DuaCategory; password: string; content: SiteContent }) {
  const saveDuas = useSaveDuas(password, content);
  const [open, setOpen] = useState(false);
  const blank: DuaEntry = { id: `d${Date.now()}`, ar: "", de: "", textAr: "", textDe: "", link: "", category, reciters: [], hidden: false };
  return (
    <>
      <Button size="sm" variant="outline" className="shrink-0 border-secondary text-primary" onClick={() => setOpen(true)}><Plus />إضافة <span className="text-xs italic">| Hinzufügen</span></Button>
      {open && <DuaForm open={open} onOpenChange={setOpen} initial={blank} title={{ ar: "إضافة جديد", de: "Neu hinzufügen" }} onSubmit={(d) => saveDuas([...content.duas, { ...d, id: `d${Date.now()}` }])} />}
    </>
  );
}

export function DuaAdminActions({ id, password, content }: { id: string; password: string; content: SiteContent }) {
  const saveDuas = useSaveDuas(password, content);
  const entry = content.duas.find((d) => d.id === id);
  const [open, setOpen] = useState(false);
  const showHidden = useShowHidden();
  if (!entry) return null;
  async function onDelete() {
    if (!window.confirm("هل أنت متأكد من حذف هذه الزيارة؟\nMöchten Sie diesen Eintrag wirklich löschen?")) return;
    try { await saveDuas(content.duas.filter((d) => d.id !== id)); } catch { window.alert("تعذّر الحذف | Löschen fehlgeschlagen"); }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Pencil />تعديل <span className="text-xs italic">| Bearbeiten</span></Button>
      {showHidden && <Button size="sm" variant="outline" className={entry.hidden ? "text-primary" : "text-muted-foreground"} onClick={async () => {
        try { await saveDuas(content.duas.map((item) => item.id === id ? { ...item, hidden: !entry.hidden } : item)); }
        catch { window.alert("تعذّر تغيير الظهور | Sichtbarkeit konnte nicht geändert werden"); }
      }}>{entry.hidden ? <Eye /> : <EyeOff />}{entry.hidden ? "إرجاع" : "إخفاء"} <span className="text-xs italic">| {entry.hidden ? "Restore" : "Hide"}</span></Button>}
      <Button size="sm" variant="outline" className="text-destructive" onClick={onDelete}><Trash2 />حذف <span className="text-xs italic">| Löschen</span></Button>
      {open && <DuaForm open={open} onOpenChange={setOpen} initial={{ ...entry, category: duaCategoryOf(entry) }} title={{ ar: "تعديل", de: "Bearbeiten" }} onSubmit={(d) => saveDuas(content.duas.map((x) => (x.id === id ? d : x)))} />}
    </div>
  );
}
