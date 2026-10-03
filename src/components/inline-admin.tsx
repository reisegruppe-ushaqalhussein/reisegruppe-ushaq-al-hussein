import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveOrQueue } from "@/lib/offline";
import { useShowHidden } from "@/lib/admin-session";
import type { SiteContent } from "@/lib/site-content";

export type FieldDef = { key: string; ar: string; de: string; ltr?: boolean; multiline?: boolean; checkbox?: boolean; type?: "date" | "time"; options?: Array<{ value: string; label: string }> };
type Row = Record<string, unknown>;

const inputCls = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** Saves a new version of site content; the server re-verifies the admin password. */
export function useSaveContent(password: string) {
  const qc = useQueryClient();
  return async (next: SiteContent) => {
    const { queued } = await saveOrQueue(password, next, "تعديل مباشر | Direkte Änderung", qc);
    if (queued) window.alert("محفوظ محلياً — سيُرفع عند عودة الإنترنت | Lokal gespeichert – wird bei Verbindung hochgeladen");
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
              {f.options
                ? <select value={String(draft[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className={inputCls}>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                : f.multiline
                ? <textarea dir={f.ltr ? "ltr" : "rtl"} rows={4} value={String(draft[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />
                : <input type={f.type ?? "text"} dir={f.ltr || f.type ? "ltr" : "rtl"} value={String(draft[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />}
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

export function ItemActions({ fields, item, onSave, onDelete, hidden = false, onVisibilityChange }: { fields: FieldDef[]; item: Row; onSave: (row: Row) => Promise<void>; onDelete: () => Promise<void>; hidden?: boolean; onVisibilityChange?: (hidden: boolean) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const showHidden = useShowHidden();
  return (
    <div className="pointer-events-none relative z-10 -mb-8 flex h-8 justify-end">
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="خيارات | Optionen" className={`pointer-events-auto m-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-background/80 text-foreground shadow-sm backdrop-blur ${hidden ? "opacity-60" : ""}`}><MoreHorizontal className="h-4 w-4" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem onSelect={() => setOpen(true)}><Pencil />تعديل <span className="text-xs italic opacity-70">| Bearbeiten</span></DropdownMenuItem>
          {onVisibilityChange && showHidden && <DropdownMenuItem onSelect={async () => {
            try { await onVisibilityChange(!hidden); } catch { window.alert("تعذّر تغيير الظهور | Sichtbarkeit konnte nicht geändert werden"); }
          }}>{hidden ? <Eye /> : <EyeOff />}{hidden ? "إرجاع" : "إخفاء"} <span className="text-xs italic opacity-70">| {hidden ? "Restore" : "Hide"}</span></DropdownMenuItem>}
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={async () => {
            if (!window.confirm("هل أنت متأكد من الحذف؟\nMöchten Sie diesen Eintrag wirklich löschen?")) return;
            try { await onDelete(); } catch { window.alert("تعذّر الحذف | Löschen fehlgeschlagen"); }
          }}><Trash2 />حذف <span className="text-xs italic opacity-70">| Löschen</span></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {open && <EditDialog open={open} onOpenChange={setOpen} title={{ ar: "تعديل", de: "Bearbeiten" }} fields={fields} initial={item} onSubmit={onSave} />}
    </div>
  );
}

/** A list row for management dialogs with explicit edit / hide (admin-mode only) / delete buttons. */
export function ManageRow({ title, subtitle, fields, item, onSave, onDelete, hidden = false, onVisibilityChange }: { title: string; subtitle: string; fields: FieldDef[]; item: Row; onSave: (row: Row) => Promise<void>; onDelete: () => Promise<void>; hidden?: boolean; onVisibilityChange?: (hidden: boolean) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const showHidden = useShowHidden();
  const btn = "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background text-primary";
  return (
    <div className={`flex items-center gap-2 rounded-md border border-border bg-card p-2 text-xs ${hidden ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1"><p className="font-bold text-primary">{title}{hidden && <span className="ms-1 text-[10px] text-muted-foreground">(مخفي | Versteckt)</span>}</p><p dir="ltr" className="break-all text-muted-foreground">{subtitle}</p></div>
      <button type="button" aria-label="تعديل | Bearbeiten" className={btn} onClick={() => setOpen(true)}><Pencil className="h-4 w-4" /></button>
      {onVisibilityChange && showHidden && <button type="button" aria-label={hidden ? "إرجاع | Wiederherstellen" : "إخفاء | Verbergen"} className={btn} onClick={async () => { try { await onVisibilityChange(!hidden); } catch { window.alert("تعذّر تغيير الظهور | Sichtbarkeit konnte nicht geändert werden"); } }}>{hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>}
      <button type="button" aria-label="حذف | Löschen" className={`${btn} text-destructive`} onClick={async () => { if (!window.confirm("هل أنت متأكد من الحذف؟\nMöchten Sie diesen Eintrag wirklich löschen?")) return; try { await onDelete(); } catch { window.alert("تعذّر الحذف | Löschen fehlgeschlagen"); } }}><Trash2 className="h-4 w-4" /></button>
      {open && <EditDialog open={open} onOpenChange={setOpen} title={{ ar: "تعديل", de: "Bearbeiten" }} fields={fields} initial={item} onSubmit={onSave} />}
    </div>
  );
}

export function AddButton({ label, fields, blank, onAdd }: { label: { ar: string; de: string }; fields: FieldDef[]; blank: Row; onAdd: (row: Row) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 flex justify-end">
      <button type="button" onClick={() => setOpen(true)} aria-label={`${label.ar} | ${label.de}`} className="inline-flex h-7 items-center gap-1 rounded-full border border-secondary/60 bg-background/80 px-2.5 text-[11px] font-bold text-primary shadow-sm"><Plus className="h-3.5 w-3.5" />إضافة <span className="italic opacity-70">| Neu</span></button>
      {open && <EditDialog open={open} onOpenChange={setOpen} title={label} fields={fields} initial={blank} onSubmit={onAdd} />}
    </div>
  );
}
