import { Download, Facebook, ImageIcon, MapPin, CalendarDays, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, LangText } from "@/lib/i18n";
import { AddButton, ItemActions, useSaveContent, type FieldDef } from "@/components/inline-admin";
import { useShowHidden } from "@/lib/admin-session";
import { FavStar } from "@/components/group2";
import type { MemoryEntry, SiteContent } from "@/lib/site-content";

type Admin = { password: string; content: SiteContent } | null;

const places = [
  { value: "", label: "—" },
  { value: "karbala", label: "كربلاء | Kerbela" },
  { value: "najaf", label: "النجف | Nadschaf" },
  { value: "umrah", label: "العمرة | Umrah" },
  { value: "iran", label: "إيران | Iran" },
  { value: "hajj", label: "الحج | Hadsch" },
];
const placeLabel = (v: string) => places.find((p) => p.value === v)?.label ?? v;

const fields: FieldDef[] = [
  { key: "imageUrl", ar: "رابط الصورة", de: "Bild-Link", ltr: true },
  { key: "ar", ar: "عنوان الصورة (عربي)", de: "Bildtitel (AR)" },
  { key: "de", ar: "عنوان الصورة (ألماني)", de: "Bildtitel (DE)", ltr: true },
  { key: "place", ar: "الموقع (اختياري)", de: "Ort (optional)", options: places },
  { key: "date", ar: "التاريخ (اختياري)", de: "Datum (optional)", type: "date" },
];
const reviewFields: FieldDef[] = [{ key: "reviewUrl", ar: "رابط صفحة التقييم", de: "Bewertungs-Link", ltr: true }];
const facebookUrl = "https://www.facebook.com/share/1KF3URwHzk/";

const T = LangText;

const fmt = (iso: string) => { const [y, m, d] = iso.split("-"); return y && m && d ? `${d}.${m}.${y}` : iso; };

export function MemoriesView({ content, admin }: { content: SiteContent; admin: Admin }) {
  const save = useSaveContent(admin?.password ?? "");
  const showHidden = useShowHidden();
  const all = content.memories;
  const list = all.filter((m) => m.imageUrl && (showHidden || !m.hidden));
  const put = (next: MemoryEntry[]) => save({ ...content, memories: next });
  return (
    <div className="screen-enter px-4 py-7">
      <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><ImageIcon className="h-5 w-5" /></span><h2 className="min-w-0 flex-1 text-xl text-primary"><T ar="مقتطفات وذكريات الزيارة" de="Reiseerinnerungen" /></h2></div>
      {admin && <AddButton label={{ ar: "إضافة صورة", de: "Bild hinzufügen" }} fields={fields} blank={{ imageUrl: "", ar: "", de: "", place: "", date: "" }} onAdd={(row) => put([...all, { ...(row as MemoryEntry), id: `m${Date.now()}`, hidden: false }])} />}
      {list.length === 0 ? <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground"><T ar="ستُنشر صور الرحلات هنا قريباً." de="Reisefotos folgen in Kürze." /></p> : (
        <div className="grid grid-cols-2 gap-3">
          {list.map((m) => (
            <article key={m.id} className={`relative min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm ${m.hidden ? "opacity-55" : ""}`}>
              {admin && <div className="absolute left-1 top-1 z-10"><ItemActions fields={fields} item={m} hidden={m.hidden ?? false} onVisibilityChange={(hidden) => put(all.map((x) => (x.id === m.id ? { ...x, hidden } : x)))} onSave={(row) => put(all.map((x) => (x.id === m.id ? { ...(row as MemoryEntry), id: x.id, hidden: x.hidden ?? false } : x)))} onDelete={() => put(all.filter((x) => x.id !== m.id))} /></div>}
              <a href={m.imageUrl} target="_blank" rel="noreferrer"><img src={m.imageUrl} alt={m.ar || m.de} loading="lazy" className="aspect-square w-full bg-muted object-cover" /></a>
              <div className="space-y-1 p-2 text-xs">
                {(m.ar || m.de) && <div className="font-bold text-primary"><T ar={m.ar} de={m.de} /></div>}
                {m.place && <p className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{placeLabel(m.place)}</p>}
                {m.date && <p dir="ltr" className="flex items-center justify-end gap-1 text-muted-foreground">{fmt(m.date)}<CalendarDays className="h-3 w-3 shrink-0" /></p>}
                <div className="flex items-center justify-between pt-1">
                  <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs"><a href={m.imageUrl} download target="_blank" rel="noreferrer"><Download />تحميل</a></Button>
                  <FavStar id={`memory:${m.id}`} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <section className="relative mt-7 rounded-lg bg-primary p-5 text-center text-primary-foreground shadow-md">
        {admin && <div className="absolute left-2 top-2 z-10"><ItemActions fields={reviewFields} item={{ reviewUrl: content.reviewUrl ?? "" }} onSave={(row) => save({ ...content, reviewUrl: String(row["reviewUrl"] ?? "") })} onDelete={() => save({ ...content, reviewUrl: "" })} /></div>}
        <div className="flex justify-center gap-1 text-secondary">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-5 w-5 fill-current" />)}</div>
        <p className="mt-3 text-sm"><T ar="شاركنا رأيك بالرحلة وتابع صور الحملة" de="Teilen Sie Ihre Meinung und folgen Sie uns" inverse /></p>
        <div className="mt-4 grid gap-2">
          {content.reviewUrl && <Button asChild className="h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90"><a href={content.reviewUrl} target="_blank" rel="noreferrer"><Star />قيّم الحملة <span className="text-xs italic">| Bewerten</span></a></Button>}
          <Button asChild variant="outline" className="h-12 bg-transparent text-primary-foreground"><a href={facebookUrl} target="_blank" rel="noreferrer"><Facebook />فيسبوك <span className="text-xs italic">| Facebook</span></a></Button>
        </div>
      </section>
    </div>
  );
}
