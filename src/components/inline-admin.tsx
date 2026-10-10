import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, RotateCcw, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveOrQueue } from "@/lib/offline";
import { useShowHidden } from "@/lib/admin-session";
import type { SiteContent } from "@/lib/site-content";

export type FieldDef = { key: string; ar: string; de: string; ltr?: boolean; multiline?: boolean; checkbox?: boolean; type?: "date" | "time"; options?: Array<{ value: string; label: string }> };
type Row = Record<string, unknown>;

const inputCls = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** حالة تشغيل/إخفاء أزرار التعديل على البطاقات لتظل الصفحة نظيفة */
let editMode = false;
const editListeners = new Set<() => void>();
export function useSectionEditMode() {
  return useSyncExternalStore(
    (l) => { editListeners.add(l); return () => { editListeners.delete(l); }; },
    () => editMode,
    () => false
  );
}
export function toggleSectionEditMode() {
  editMode = !editMode;
  editListeners.forEach((l) => l());
}

/** حفظ المحتوى مع التحقق التلقائي */
export function useSaveContent(password: string) {
  const qc = useQueryClient();
  return async (next: SiteContent) => {
    const { queued } = await saveOrQueue(password, next, "تعديل مباشر | Direkte Änderung", qc);
    if (queued) window.alert("محفوظ محلياً — سيُرفع عند عودة الإنترنت | Lokal gespeichert – wird bei Verbindung hochgeladen");
  };
}

/** نافذة التعديل لجميع الحقول والكلمات دون استثناء */
export function EditDialog({ open, onOpenChange, title, fields, initial, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; title: { ar: string; de: string }; fields: FieldDef[]; initial: Row; onSubmit: (row: Row) => Promise<void> }) {
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

/** زر أيقونة مدمج */
export function IconBtn({ label, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={`pointer-events-auto grid h-7 w-7 place-items-center rounded-full border border-border bg-background/90 shadow-sm backdrop-blur transition-transform active:scale-95 ${danger ? "text-destructive" : "text-primary"}`}>{children}</button>;
}

/** قائمة الترس المصغرة للبطاقة */
export function GearMenu({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div ref={ref} className={`pointer-events-auto relative ${className}`} onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="إعدادات | Einstellungen" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid h-7 w-7 place-items-center rounded-full border border-secondary/50 bg-card/95 text-secondary shadow-sm hover:bg-card"><Settings className="h-3.5 w-3.5" /></button>
      <div onClick={() => setOpen(false)} className={`absolute left-0 top-8 z-30 flex max-w-[calc(100vw-24px)] gap-1 rounded-full border border-border bg-card p-1 shadow-md ${open ? "" : "hidden"}`}>{children}</div>
    </div>
  );
}

/** أزرار تحكم كل بطاقة (تختفي تماماً وتظهر فقط عند تفعيل زر القلم ✏️) */
export function ItemActions({ fields, item, onSave, onDelete, hidden = false, onVisibilityChange }: { fields: FieldDef[]; item: Row; onSave: (row: Row) => Promise<void>; onDelete: () => Promise<void>; hidden?: boolean; onVisibilityChange?: (hidden: boolean) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const showHidden = useShowHidden();
  const isEditing = useSectionEditMode();

  // إذا لم يكن وضع التعديل مفعّلاً، لا يظهر أي ترس على الكرت إطلاقاً
  if (!isEditing) return null;

  return (
    <div dir="ltr" className="pointer-events-none relative z-10 -mb-8 flex h-8 justify-start p-1 animate-in fade-in duration-200">
      <GearMenu>
        <IconBtn label="تعديل | Bearbeiten" onClick={() => setOpen(true)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
        {onVisibilityChange && showHidden && <IconBtn label={hidden ? "إرجاع | Wiederherstellen" : "إخفاء | Verbergen"} onClick={async () => { try { await onVisibilityChange(!hidden); } catch { window.alert("تعذّر تغيير الظهور | Sichtbarkeit konnte nicht geändert werden"); } }}>{hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</IconBtn>}
        <IconBtn label="حذف | Löschen" danger onClick={async () => { if (!window.confirm("هل أنت متأكد من الحذف؟\nMöchten Sie diesen Eintrag wirklich löschen?")) return; try { await onDelete(); } catch { window.alert("تعذّر الحذف | Löschen fehlgeschlagen"); } }}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
      </GearMenu>
      {open && <EditDialog open={open} onOpenChange={setOpen} title={{ ar: "تعديل", de: "Bearbeiten" }} fields={fields} initial={item} onSubmit={onSave} />}
    </div>
  );
}

/** سطر الإدارة التفصيلي */
export function ManageRow({ title, subtitle, fields, item, onSave, onDelete, hidden = false, onVisibilityChange, onOpen }: { title: React.ReactNode; subtitle: React.ReactNode; onOpen?: () => void; fields: FieldDef[]; item: Row; onSave: (row: Row) => Promise<void>; onDelete: () => Promise<void>; hidden?: boolean; onVisibilityChange?: (hidden: boolean) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const showHidden = useShowHidden();
  const btn = "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background text-primary";
  return (
    <div className={`flex items-center gap-2 rounded-md border border-border bg-card p-2 text-xs ${hidden ? "opacity-60" : ""}`}>
      {(() => { const body = <><p className="font-bold text-primary">{title}{hidden && <span className="ms-1 text-[10px] text-muted-foreground">(مخفي | Versteckt)</span>}</p><p dir="ltr" className="break-all text-muted-foreground">{subtitle}</p></>; return onOpen ? <button type="button" onClick={onOpen} className="min-w-0 flex-1 rounded text-start active:bg-accent">{body}</button> : <div className="min-w-0 flex-1">{body}</div>; })()}
      <button type="button" aria-label="تعديل | Bearbeiten" className={btn} onClick={() => setOpen(true)}><Pencil className="h-4 w-4" /></button>
      {onVisibilityChange && showHidden && <button type="button" aria-label={hidden ? "إرجاع | Wiederherstellen" : "إخفاء | Verbergen"} className={btn} onClick={async () => { try { await onVisibilityChange(!hidden); } catch { window.alert("تعذّر تغيير الظهور | Sichtbarkeit konnte nicht geändert werden"); } }}>{hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>}
      <button type="button" aria-label="حذف | Löschen" className={`${btn} text-destructive`} onClick={async () => { if (!window.confirm("هل أنت متأكد من الحذف؟\nMöchten Sie diesen Eintrag wirklich löschen?")) return; try { await onDelete(); } catch { window.alert("تعذّر الحذف | Löschen fehlgeschlagen"); } }}><Trash2 className="h-4 w-4" /></button>
      {open && <EditDialog open={open} onOpenChange={setOpen} title={{ ar: "تعديل", de: "Bearbeiten" }} fields={fields} initial={item} onSubmit={onSave} />}
    </div>
  );
}

/** زر إضافة عنصر جديد ➕ */
export function AddButton({ label, fields, blank, onAdd, inline = false }: { label: { ar: string; de: string }; fields: FieldDef[]; blank: Row; onAdd: (row: Row) => Promise<void>; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={inline ? "contents" : "mb-2 flex justify-end"}>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${label.ar} | ${label.de}`} title={`${label.ar} | ${label.de}`} className="grid h-7 w-7 place-items-center rounded-full border border-secondary/60 bg-background/80 text-primary shadow-sm hover:bg-muted"><Plus className="h-4 w-4" /></button>
      {open && <EditDialog open={open} onOpenChange={setOpen} title={label} fields={fields} initial={blank} onSubmit={onAdd} />}
    </div>
  );
}

/** زر استرجاع البيانات الأصلية للقسم 🔄 */
export function RestoreButton({ onRestore, label = "استرجاع البيانات الأصلية لهذا القسم | Standard wiederherstellen" }: { onRestore: () => Promise<void> | void; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("هل أنتِ متأكدة من استرجاع البيانات الأصلية لهذا القسم؟\nMöchten Sie die Originaldaten dieses Bereichs wirklich wiederherstellen?")) return;
        setBusy(true);
        try {
          await onRestore();
        } catch {
          window.alert("تعذّر الاسترجاع | Wiederherstellung fehlgeschlagen");
        } finally {
          setBusy(false);
        }
      }}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-full border border-secondary/60 bg-background/80 text-primary shadow-sm hover:bg-muted"
    >
      <RotateCcw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
    </button>
  );
}

/** شريط الإدارة الموحد في رأس القسم: يجمع (تفعيل التعديل ✏️، الاسترجاع 🔄، والإضافة ➕) */
export function SectionAdminBar({
  addLabel,
  addFields,
  addBlank,
  onAdd,
  onRestore,
  children,
}: {
  addLabel?: { ar: string; de: string };
  addFields?: FieldDef[];
  addBlank?: Row;
  onAdd?: (row: Row) => Promise<void>;
  onRestore?: () => Promise<void> | void;
  children?: React.ReactNode;
}) {
  const isEditing = useSectionEditMode();
  return (
    <div dir="ltr" className="mb-3 flex items-center justify-start gap-1.5">
      {children}
      <button
        type="button"
        onClick={toggleSectionEditMode}
        aria-pressed={isEditing}
        aria-label={isEditing ? "إنهاء وضع التعديل | Fertig" : "تعديل عناصر القسم | Elemente bearbeiten"}
        title={isEditing ? "إنهاء التعديل وإخفاء أزرار البطاقات | Fertig" : "إظهار أزرار تعديل البطاقات | Karten bearbeiten"}
        className={`grid h-7 w-7 place-items-center rounded-full border shadow-sm transition-colors ${
          isEditing
            ? "border-secondary bg-secondary text-secondary-foreground font-bold"
            : "border-secondary/60 bg-background/80 text-primary hover:bg-muted"
        }`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {onRestore && <RestoreButton onRestore={onRestore} />}
      {addLabel && addFields && addBlank && onAdd && (
        <AddButton label={addLabel} fields={addFields} blank={addBlank} onAdd={onAdd} inline />
      )}
    </div>
  );
}
