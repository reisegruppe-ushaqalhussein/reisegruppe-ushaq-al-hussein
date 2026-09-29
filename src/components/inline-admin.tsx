import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveSiteContent } from "@/lib/site-content.functions";
import type { SiteContent } from "@/lib/site-content";

export type FieldDef = { key: string; ar: string; de: string; ltr?: boolean; multiline?: boolean; checkbox?: boolean };
type Row = Record<string, unknown>;

const inputCls = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** Saves a new version of site content; the server re-verifies the admin password. */
export function useSaveContent(password: string) {
  const save = useServerFn(saveSiteContent);
  const qc = useQueryClient();
  return async (next: SiteContent) => {
    const res = await save({ data: { password, content: next } });
    if (!res.ok) throw new Error(res.error ?? "unknown");
    qc.setQueryData(["site-content"], next);
  };
}

function EditDialog({ open, onOpenChange, title, fields, initial, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; title: { ar: string; de: string }; fields: FieldDef[]; initial: Row; onSubmit: (row: Row) => Promise<void> }) {
  const [draft, setDraft] = useState<Row>(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) setDraft(initial); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle>{title.ar} <span className="text-sm italic text-muted-foreground">| {title.de}</span></DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          {fields.map((f) => f.checkbox ? (
            <label key={f.key} className="flex items-center gap-2 font-bold"><input type="checkbox" checked={Boolean(draft[f.key])} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4 accent-secondary" />{f.ar} | {f.de}</label>
          ) : (
            <label key={f.key} className="block font-bold">{f.ar} | {f.de}
              {f.multiline
                ? <textarea dir={f.ltr ? "ltr" : "rtl"} rows={4} value={String(draft[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />
                : <input dir={f.ltr ? "ltr" : "rtl"} value={String(draft[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />}
            </label>
          ))}
          <Button disabled={busy} className="h-11 w-full" onClick={async () => {
            setBusy(true);
            try { await onSubmit(draft); onOpenChange(false); } catch (e) { console.error(e); window.alert(`تعذّر الحفظ | Speichern fehlgeschlagen\n\n${e instanceof Error ? e.message : String(e)}`); } finally { setBusy(false); }
          }}>حفظ <span className="text-xs italic opacity-75">| Speichern</span></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ItemActions({ fields, item, onSave, onDelete }: { fields: FieldDef[]; item: Row; onSave: (row: Row) => Promise<void>; onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 flex gap-2">
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Pencil />تعديل <span className="text-xs italic">| Bearbeiten</span></Button>
      <Button size="sm" variant="outline" className="text-destructive" onClick={async () => {
        if (!window.confirm("هل أنت متأكد من الحذف؟\nMöchten Sie diesen Eintrag wirklich löschen?")) return;
        try { await onDelete(); } catch { window.alert("تعذّر الحذف | Löschen fehlgeschlagen"); }
      }}><Trash2 />حذف <span className="text-xs italic">| Löschen</span></Button>
      {open && <EditDialog open={open} onOpenChange={setOpen} title={{ ar: "تعديل", de: "Bearbeiten" }} fields={fields} initial={item} onSubmit={onSave} />}
    </div>
  );
}

export function AddButton({ label, fields, blank, onAdd }: { label: { ar: string; de: string }; fields: FieldDef[]; blank: Row; onAdd: (row: Row) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className="mb-4 h-11 w-full border-dashed border-secondary text-primary" onClick={() => setOpen(true)}><Plus />{label.ar} <span className="text-xs italic">| {label.de}</span></Button>
      {open && <EditDialog open={open} onOpenChange={setOpen} title={label} fields={fields} initial={blank} onSubmit={onAdd} />}
    </>
  );
}
