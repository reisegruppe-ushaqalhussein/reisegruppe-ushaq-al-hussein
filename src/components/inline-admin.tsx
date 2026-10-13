import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, RotateCcw, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveOrQueue } from "@/lib/offline";
import { useShowHidden } from "@/lib/admin-session";
import { useLang } from "@/lib/i18n";
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
export function EditDialog({ open, onOpenChange, title, fields, initial, onSubmit, languageAware = true }: { open: boolean; onOpenChange: (o: boolean) => void; title: { ar: string; de: string }; fields: FieldDef[]; initial: Row; onSubmit: (row: Row) => Promise<void>; languageAware?: boolean }) {
  const { lang } = useLang();
  const [draft, setDraft] = useState<Row>(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) setDraft(initial); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-24px)] max-w-[396px] overflow-y-auto" dir={languageAware && (lang === "de" || lang === "en") ? "ltr" : "rtl"}>
        <DialogHeader className={languageAware && (lang === "de" || lang === "en") ? "text-left" : "text-right"}><DialogTitle>{languageAware ? (lang === "de" || lang === "en" ? title.de : lang === "ar" ? title.ar : <>{title.ar} <span className="text-sm italic text-muted-foreground">| {title.de}</span></>) : <>{title.ar} <span className="text-sm italic text-muted-foreground">| {title.de}</span></>}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          {fields.map((f) => f.checkbox ? (
            <label key={f.key} className="flex items-center gap-2 font-bold"><input type="checkbox" checked={Boolean(draft[f.key])} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4 accent-secondary" />{languageAware ? (lang === "de" || lang === "en" ? f.de : lang === "ar" ? f.ar : <>{f.ar} | {f.de}</>) : <>{f.ar} | {f.de}</>}</label>
          ) : (
            <label key={f.key} className="block font-bold">{languageAware ? (lang === "de" || lang === "en" ? f.de : lang === "ar" ? f.ar : <>{f.ar} | {f.de}</>) : <>{f.ar} | {f.de}</>}
              {f.options
                ? <select value={String(draft[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className={inputCls}>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                : f.multiline
                ? <textarea dir={f.ltr ? "ltr" : "rtl"} rows={4} value={String(draft[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />
                : <input type={f.type ?? "text"} dir={f.ltr || f.type ? "ltr" : "rtl"} value={String(draft[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />}
            </label>
          ))}
          <Button disabled={busy} className="h-11 w-full" onClick={async () => {
            setBusy(true);
            try { await onSubmit(draft); onOpenChange(false); } catch (e) { console.error(e); window.alert(`${languageAware ? (lang === "en" ? "Save failed" : lang === "de" ? "Speichern fehlgeschlagen" : "تعذّر الحفظ") : "تعذّر الحفظ | Speichern fehlgeschlagen"}\n\n${e instanceof Error ? e.message : String(e)}`); } finally { setBusy(false); }
          }}>{languageAware ? (lang === "en" ? "Save" : lang === "de" ? "Speichern" : lang === "ar" ? "حفظ" : <>حفظ <span className="text-xs italic opacity-75">| Speichern</span></>) : <>حفظ <span className="text-xs italic opacity-75">| Speichern</span></>}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** زر أيقونة مدمج */
export function IconBtn({ label, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={`pointer-events-auto grid h-7 w-7 place-items-center rounded-full border border-border bg-background/90 shadow-sm backdrop-blur transition-transform active:scale-95 ${danger ? "text-destructive" : "text-primary"}`}>{children}</button>;
}

// في GearMenu: تثبيت جهة اليسار دائماً ومنع القفز لليمين
export function GearMenu({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const { lang } = useLang();
  const settingsLabel = lang === "ar" ? "الإعدادات" : lang === "de" ? "Einstellungen" : lang === "en" ? "Settings" : "الإعدادات | Einstellungen";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} dir="ltr" className={`pointer-events-auto relative inline-flex items-center ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={settingsLabel}
        title={settingsLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-secondary/50 bg-card/95 text-secondary shadow-sm hover:bg-card active:scale-95 transition-transform"
      >
        <Settings className="h-3.5 w-3.5" />
      </button>
      <div
        onClick={() => setOpen(false)}
        className={`absolute left-0 top-8 z-40 flex w-max max-w-[calc(100vw-24px)] flex-nowrap items-center gap-1 whitespace-nowrap rounded-md border border-border bg-card p-1 shadow-md ${open ? "" : "hidden"}`}
      >
        {children}
      </div>
    </div>
  );
}

// في SectionAdminBar: تثبيت دائم بالجهة اليسرى في كل اللغات
export function SectionAdminBar({
  editMode,
  inline = false,
  addLabel,
  addFields,
  addBlank,
  onAdd,
  onRestore,
  children,
  languageAware = true,
  onEditClick,
}: {
  editMode?: boolean;
  inline?: boolean;
  addLabel?: { ar: string; de: string };
  addFields?: FieldDef[];
  addBlank?: Row;
  onAdd?: (row: Row) => Promise<void>;
  onRestore?: () => Promise<void> | void;
  children?: React.ReactNode;
  languageAware?: boolean;
  onEditClick?: () => void;
}) {
  const globalIsEditing = useSectionEditMode();
  const isEditing = editMode ?? globalIsEditing;
  const { lang } = useLang();

  return (
    <div dir="ltr" className={`flex items-center justify-start gap-1.5 ${inline ? "contents" : "mb-3"}`}>
      {children}
      <button
        type="button"
        onClick={onEditClick ?? toggleSectionEditMode}
        aria-pressed={onEditClick ? undefined : isEditing}
        aria-label={languageAware ? (lang === "en" ? (isEditing ? "Done" : "Edit items") : lang === "de" ? (isEditing ? "Fertig" : "Elemente bearbeiten") : lang === "ar" ? (isEditing ? "إنهاء التعديل" : "تعديل العناصر") : "تعديل العناصر | Elemente bearbeiten") : "تعديل العناصر | Elemente bearbeiten"}
        className={`grid h-7 w-7 place-items-center rounded-full border shadow-sm transition-colors ${
          isEditing
            ? "border-secondary bg-secondary text-secondary-foreground font-bold"
            : "border-secondary/60 bg-background/80 text-primary hover:bg-muted"
        }`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {onRestore && <RestoreButton onRestore={onRestore} languageAware={languageAware} />}
      {addLabel && addFields && addBlank && onAdd && (
        <AddButton label={addLabel} fields={addFields} blank={addBlank} onAdd={onAdd} inline languageAware={languageAware} />
      )}
    </div>
  );
}
