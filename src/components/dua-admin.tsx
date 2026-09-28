import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { checkAdminPassword, saveSiteContent } from "@/lib/site-content.functions";
import { duaCategories, duaCategoryOf, type DuaCategory, type DuaEntry, type SiteContent } from "@/lib/site-content";

export const ADMIN_KEY = "admin-session-pw";

/** Returns the admin password if this browser session is logged in (verified server-side). */
export function useAdminPassword() {
  const check = useServerFn(checkAdminPassword);
  const [pw, setPw] = useState<string | null>(null);
  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_KEY);
    if (!stored) return;
    check({ data: { password: stored } }).then((r) => {
      if (r.ok) setPw(stored);
      else sessionStorage.removeItem(ADMIN_KEY);
    }).catch(() => {});
  }, [check]);
  return pw;
}

function useSaveDuas(password: string, content: SiteContent) {
  const save = useServerFn(saveSiteContent);
  const qc = useQueryClient();
  return async (duas: DuaEntry[]) => {
    const next = { ...content, duas };
    const res = await save({ data: { password, content: next } });
    if (!res.ok) throw new Error("failed");
    qc.setQueryData(["site-content"], next);
  };
}

const inputCls = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function DuaAdminActions({ id, password, content }: { id: string; password: string; content: SiteContent }) {
  const saveDuas = useSaveDuas(password, content);
  const entry = content.duas.find((d) => d.id === id);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DuaEntry | null>(null);
  const [busy, setBusy] = useState(false);
  if (!entry) return null;

  async function onDelete() {
    if (!window.confirm("هل أنت متأكد من حذف هذه الزيارة؟\nMöchten Sie diesen Eintrag wirklich löschen?")) return;
    try { await saveDuas(content.duas.filter((d) => d.id !== id)); } catch { window.alert("تعذّر الحذف | Löschen fehlgeschlagen"); }
  }
  async function onSave() {
    if (!draft) return;
    setBusy(true);
    try { await saveDuas(content.duas.map((d) => (d.id === id ? draft : d))); setOpen(false); }
    catch { window.alert("تعذّر الحفظ | Speichern fehlgeschlagen"); }
    finally { setBusy(false); }
  }
  const set = (patch: Partial<DuaEntry>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => { setDraft({ ...entry, category: duaCategoryOf(entry) }); setOpen(true); }}><Pencil />تعديل <span className="text-xs italic">| Bearbeiten</span></Button>
      <Button size="sm" variant="outline" className="text-destructive" onClick={onDelete}><Trash2 />حذف <span className="text-xs italic">| Löschen</span></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل <span className="text-sm italic text-muted-foreground">| Bearbeiten</span></DialogTitle></DialogHeader>
          {draft && (
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
              <Button onClick={onSave} disabled={busy} className="h-11 w-full">حفظ <span className="text-xs italic opacity-75">| Speichern</span></Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
