import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { display, isArabic, useLang } from "@/lib/i18n";
import calligraphySrc from "@/assets/tag-calligraphy.png";
import shrineSrc from "@/assets/tag-shrine.png";
import kaabaSrc from "@/assets/tag-kaaba.png";

/* Fixed print data — do not change without the leader's approval. */
const APP_URL = "https://reisegruppe-ushaq-al-hussein.lovable.app";
const PHONE_IQ = "009647819998905";
const PHONE_DE = "004915773055365";
const DPI = 300;
const PX_PER_MM = DPI / 25.4;
const A4 = { w: 210, h: 297 };

type Kind = "iraq" | "umrah";
type Person = { ar: string; de: string };
type Assets = { call: HTMLImageElement; shrine: HTMLImageElement; kaaba: HTMLImageElement };

/* Iraq/Iran: 2 x 4 on A4, exact A7 landscape (105 x 74.25 mm) — matches the leader's laminator sheet.
   Umrah: 3 x 3 on A4, 55.67 x 83.87 mm portrait — matches the Canva PDF grid. */
const SPEC: Record<Kind, { w: number; h: number; cols: number; rows: number; ox: number; oy: number }> = {
  iraq: { w: 105, h: 74.25, cols: 2, rows: 4, ox: 0, oy: 0 },
  umrah: { w: 55.67, h: 83.87, cols: 3, rows: 3, ox: (A4.w - 3 * 55.67) / 2, oy: (A4.h - 3 * 83.87) / 2 },
};

const GOLD = "#a8721a";
const RED = "#8e1424";
const BLUE = "#1f5fbf";
const INK = "#1a1a1a";

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
let assetsP: Promise<Assets> | null = null;
function loadAssets() {
  if (!assetsP) {
    assetsP = (async () => {
      await Promise.all(["700 40px Cairo", "600 40px Cairo", "400 40px Cairo"].map((f) => document.fonts.load(f).catch(() => null)));
      const [call, shrine, kaaba] = await Promise.all([loadImg(calligraphySrc), loadImg(shrineSrc), loadImg(kaabaSrc)]);
      return { call, shrine, kaaba };
    })();
    assetsP.catch(() => { assetsP = null; });
  }
  return assetsP;
}

function pen(ctx: CanvasRenderingContext2D, S: number, ox: number, oy: number) {
  const X = (mm: number) => (ox + mm) * S;
  const Y = (mm: number) => (oy + mm) * S;
  const font = (size: number, weight = 700) => `${weight} ${size * S}px Cairo, "Noto Naskh Arabic", sans-serif`;
  /** Draws text with baseline at y; shrinks to fit maxW (mm). Returns drawn width in mm. */
  const text = (s: string, x: number, y: number, size: number, o: { weight?: number; color?: string; align?: CanvasTextAlign; maxW?: number } = {}) => {
    let sz = size;
    ctx.font = font(sz, o.weight);
    if (o.maxW) while (sz > 1 && ctx.measureText(s).width / S > o.maxW) { sz -= 0.1; ctx.font = font(sz, o.weight); }
    ctx.fillStyle = o.color ?? INK;
    ctx.textAlign = o.align ?? "center";
    ctx.direction = isArabic(s) ? "rtl" : "ltr";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s, X(x), Y(y));
    return ctx.measureText(s).width / S;
  };
  const width = (s: string, size: number, weight = 700) => { ctx.font = font(size, weight); return ctx.measureText(s).width / S; };
  const img = (im: HTMLImageElement, x: number, y: number, w: number, h?: number) => {
    const hh = h ?? (w * im.naturalHeight) / im.naturalWidth;
    ctx.drawImage(im, X(x), Y(y), w * S, hh * S);
    return hh;
  };
  const qr = (data: string, x: number, y: number, size: number, margin: number) => {
    const q = QRCode.create(data, { errorCorrectionLevel: "M" });
    const n = q.modules.size;
    const m = size / (n + margin * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(X(x), Y(y), size * S, size * S);
    ctx.fillStyle = "#000000";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!q.modules.get(r, c)) continue;
      const x0 = Math.round(X(x + (c + margin) * m)), x1 = Math.round(X(x + (c + margin + 1) * m));
      const y0 = Math.round(Y(y + (r + margin) * m)), y1 = Math.round(Y(y + (r + margin + 1) * m));
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  };
  const rect = (x: number, y: number, w: number, h: number, o: { fill?: string; stroke?: string; lw?: number }) => {
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fillRect(X(x), Y(y), w * S, h * S); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = (o.lw ?? 0.3) * S; ctx.strokeRect(X(x), Y(y), w * S, h * S); }
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color: string, lw: number, dash?: number[]) => {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw * S; if (dash) ctx.setLineDash(dash.map((d) => d * S));
    ctx.beginPath(); ctx.moveTo(X(x1), Y(y1)); ctx.lineTo(X(x2), Y(y2)); ctx.stroke(); ctx.restore();
  };
  return { text, width, img, qr, rect, line, X, Y, S };
}

/** Phone row: Arabic label on the right, number (LTR) on the left, centred on cx. */
function phoneRow(p: ReturnType<typeof pen>, label: string, num: string, cx: number, y: number, maxW: number) {
  let ls = 2.3, ns = 3.1;
  const gap = 1.2;
  let total = p.width(label, ls, 600) + gap + p.width(num, ns, 700);
  if (total > maxW) { const k = maxW / total; ls *= k; ns *= k; total = maxW; }
  const left = cx - total / 2;
  p.text(num, left, y, ns, { weight: 700, align: "left", color: INK });
  p.text(label, left + total, y, ls, { weight: 600, align: "right", color: GOLD });
}

function drawGermanFlag(p: ReturnType<typeof pen>, x: number, y: number, w: number, h: number) {
  p.rect(x, y, w, h / 3, { fill: "#000000" });
  p.rect(x, y + h / 3, w, h / 3, { fill: "#dd0000" });
  p.rect(x, y + (2 * h) / 3, w, h / 3, { fill: "#ffce00" });
  p.rect(x, y, w, h, { stroke: "#9a9a9a", lw: 0.15 });
}
function drawLebanonFlag(ctx: CanvasRenderingContext2D, p: ReturnType<typeof pen>, x: number, y: number, w: number, h: number) {
  p.rect(x, y, w, h, { fill: "#ffffff" });
  p.rect(x, y, w, h / 4, { fill: "#ed1c24" });
  p.rect(x, y + (3 * h) / 4, w, h / 4, { fill: "#ed1c24" });
  // Simplified cedar
  const cx = x + w / 2, top = y + h * 0.28, bot = y + h * 0.72;
  ctx.fillStyle = "#00a651";
  ctx.beginPath();
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const t0 = top + ((bot - top - h * 0.06) * i) / tiers, t1 = top + ((bot - top - h * 0.06) * (i + 1)) / tiers + h * 0.04;
    const half = (w * 0.12) + (w * 0.06) * i;
    ctx.moveTo(p.X(cx), p.Y(t0)); ctx.lineTo(p.X(cx + half), p.Y(t1)); ctx.lineTo(p.X(cx - half), p.Y(t1)); ctx.closePath();
  }
  ctx.fill();
  p.rect(cx - w * 0.02, bot - h * 0.08, w * 0.04, h * 0.08, { fill: "#00a651" });
  p.rect(x, y, w, h, { stroke: "#9a9a9a", lw: 0.15 });
}

function drawIraq(ctx: CanvasRenderingContext2D, S: number, ox: number, oy: number, a: Assets, who: Person) {
  const p = pen(ctx, S, ox, oy);
  const W = 105, H = 74.25;
  p.rect(0, 0, W, H, { fill: "#ffffff" });
  // Gold frame, 3.5 mm inside the cut so the laminator cutter never touches it
  p.rect(3.5, 3.5, W - 7, H - 7, { stroke: GOLD, lw: 0.35 });

  // Right column: QR (no rose) with generous white quiet zone + small flags below
  const qx = W - 5 - 27, qy = 6;
  p.rect(qx - 0.6, qy - 0.6, 28.2, 28.2, { stroke: "#d8c49a", lw: 0.2 });
  p.qr(APP_URL, qx, qy, 27, 3);
  const fw = 9.5, fh = 6.2, fy = qy + 27 + 3;
  drawLebanonFlag(ctx, p, qx + 27 / 2 - fw - 1, fy, fw, fh);
  drawGermanFlag(p, qx + 27 / 2 + 1, fy, fw, fh);

  // Main column (x 5 .. 69)
  const cx = 38;
  p.text("بطاقة زائر", cx, 11.5, 4.4, { color: GOLD });
  const cw = 54;
  p.img(a.call, cx - cw / 2, 13.5, cw);
  p.text("بإدارة الحاج ياسر الدر", cx, 38.2, 4.1, { color: GOLD, maxW: 56 });

  // Shrine bottom-left inside the frame
  const sh = 27, sw = (sh * a.shrine.naturalWidth) / a.shrine.naturalHeight;
  ctx.save();
  ctx.beginPath(); ctx.rect(p.X(3.7), p.Y(3.7), (W - 7.4) * S, (H - 7.4) * S); ctx.clip();
  p.img(a.shrine, 3.8, H - 3.7 - sh, sw, sh);
  ctx.restore();

  const px = 3.8 + sw + 1.5;
  const pcx = (px + 69) / 2;
  phoneRow(p, "رقم التلفون بالعراق", PHONE_IQ, pcx, 44, 69 - px);
  phoneRow(p, "رقم التلفون بألمانيا", PHONE_DE, pcx, 49, 69 - px);

  // Visitor name line (x px .. W-5)
  const right = W - 6;
  const lbl = "اسم الزائر:";
  const lw = p.text(lbl, right, 60, 3, { color: INK, align: "right", weight: 700 });
  const nameRight = right - lw - 1.5;
  const nameMax = nameRight - px;
  if (who.ar || who.de) {
    if (who.ar) p.text(who.ar, nameRight, 60.3, 4.4, { align: "right", color: RED, maxW: nameMax });
    if (who.de) p.text(who.de, nameRight, who.ar ? 65.6 : 60.3, who.ar ? 3 : 4.2, { align: "right", color: INK, weight: 600, maxW: nameMax });
  }
  p.line(px, 61.8, nameRight, 61.8, "#9a9a9a", 0.2, [0.6, 0.6]);
}

function drawUmrah(ctx: CanvasRenderingContext2D, S: number, ox: number, oy: number, a: Assets, who: Person) {
  const p = pen(ctx, S, ox, oy);
  const W = 55.67, H = 83.87, cx = W / 2, mw = W - 8;
  p.rect(0, 0, W, H, { fill: "#ffffff" });
  p.text("شركة الحاج الدر", cx, 8, 4.8, { maxW: mw });
  p.text("للسياحة و السفر", cx, 12.6, 2.9, { weight: 600, maxW: mw });
  p.text("- بإدارة الحاج ياسر الدر -", cx, 17, 2.9, { maxW: mw });
  p.text("Reisegruppe Aldor", cx, 21.3, 2.9, { weight: 400, maxW: mw });
  phoneRow(p, "المانيا:", PHONE_DE, cx, 25.6, mw);

  const kw = 28;
  const kh = p.img(a.kaaba, cx - kw / 2, 27.6, kw);

  // QR left, title right
  const ty = 27.6 + kh + 2;
  const qs = 17;
  p.qr(APP_URL, 4, ty, qs, 2);
  const rx = W - 4, rmin = 4 + qs + 1.5, rw = rx - rmin, rcx = (rx + rmin) / 2;
  p.text("بطاقة زائر", rcx, ty + 7, 4.2, { color: BLUE, maxW: rw });
  p.text("Umrah", rcx, ty + 13, 3, { weight: 600, color: BLUE, maxW: rw });

  // Blue name band
  const by = ty + qs + 1.8, bh = 9.5;
  p.rect(0, by, W - 4.5, bh, { fill: BLUE });
  p.line(0, by - 0.5, W - 4.5, by - 0.5, BLUE, 0.4);
  if (who.ar && who.de) {
    p.text(who.ar, (W - 4.5) / 2, by + 4.6, 3.6, { color: "#ffffff", maxW: W - 9 });
    p.text(who.de, (W - 4.5) / 2, by + 8.3, 2.5, { color: "#ffffff", weight: 600, maxW: W - 9 });
  } else if (who.ar || who.de) {
    p.text(who.ar || who.de, (W - 4.5) / 2, by + 6.4, 3.8, { color: "#ffffff", maxW: W - 9 });
  }
  // Cut outline like the original sheet
  p.rect(0, 0, W, H, { stroke: BLUE, lw: 0.3 });
}

function drawCard(kind: Kind, ctx: CanvasRenderingContext2D, S: number, ox: number, oy: number, a: Assets, who: Person) {
  (kind === "iraq" ? drawIraq : drawUmrah)(ctx, S, ox, oy, a, who);
}

async function renderCard(kind: Kind, who: Person, S = PX_PER_MM) {
  const a = await loadAssets();
  const sp = SPEC[kind];
  const c = document.createElement("canvas");
  c.width = Math.round(sp.w * S); c.height = Math.round(sp.h * S);
  drawCard(kind, c.getContext("2d")!, S, 0, 0, a, who);
  return c;
}

async function renderSheets(kind: Kind, people: Person[]) {
  const a = await loadAssets();
  const sp = SPEC[kind];
  const per = sp.cols * sp.rows;
  const list = people.length ? people : [{ ar: "", de: "" }];
  // One person => fill the whole sheet with their card
  const filled = list.length === 1 ? Array.from({ length: per }, () => list[0]) : list;
  const pages: HTMLCanvasElement[] = [];
  for (let i = 0; i < filled.length; i += per) {
    const c = document.createElement("canvas");
    c.width = Math.round(A4.w * PX_PER_MM); c.height = Math.round(A4.h * PX_PER_MM);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
    filled.slice(i, i + per).forEach((who: Person | undefined, k) => {
      const col = k % sp.cols, row = Math.floor(k / sp.cols);
      drawCard(kind, ctx, PX_PER_MM, sp.ox + col * sp.w, sp.oy + row * sp.h, a, who ?? { ar: "", de: "" });
    });
    if (kind === "iraq") {
      // Thin cut guides on the exact card edges
      ctx.strokeStyle = "#bdbdbd"; ctx.lineWidth = 0.15 * PX_PER_MM;
      for (let r = 0; r <= sp.rows; r++) { const y = (sp.oy + r * sp.h) * PX_PER_MM; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }
      const xm = (sp.ox + sp.w) * PX_PER_MM; ctx.beginPath(); ctx.moveTo(xm, 0); ctx.lineTo(xm, c.height); ctx.stroke();
    }
    pages.push(c);
  }
  return pages;
}

function download(c: HTMLCanvasElement, name: string) {
  return new Promise<void>((res) => c.toBlob((b) => {
    if (b) { const u = URL.createObjectURL(b); const l = document.createElement("a"); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
    res();
  }, "image/png"));
}

function parseNames(raw: string): Person[] {
  return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [x, y = ""] = l.split(/\s*[\/|]\s*/);
    const a = x ?? "";
    return isArabic(a) ? { ar: a, de: y } : isArabic(y) ? { ar: y, de: a } : { ar: "", de: a };
  });
}

function L({ ar, de }: { ar: string; de: string }) {
  const { lang } = useLang();
  const { main, sub } = display(lang, ar, de);
  return <span className="block">{main}{sub && <span lang="de" dir="ltr" className="block text-[0.8em] italic opacity-75">{sub}</span>}</span>;
}

export function LuggageTags({ nameAr, nameDe }: { nameAr: string; nameDe: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("iraq");
  const [ar, setAr] = useState(nameAr);
  const [de, setDe] = useState(nameDe);
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const preview = useRef<HTMLCanvasElement>(null);
  useEffect(() => { setAr(nameAr); setDe(nameDe); }, [nameAr, nameDe]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    renderCard(kind, { ar, de }, 10).then((c) => {
      const el = preview.current; if (!alive || !el) return;
      el.width = c.width; el.height = c.height; el.getContext("2d")!.drawImage(c, 0, 0);
    }).catch(() => setErr("تعذر تحميل التصميم | Design konnte nicht geladen werden"));
    return () => { alive = false; };
  }, [open, kind, ar, de]);

  const people = () => { const b = parseNames(bulk); return b.length ? b : [{ ar, de }]; };
  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(""); try { await fn(); } catch { setErr("حدث خطأ، حاول مجدداً | Fehler, bitte erneut versuchen"); } setBusy(false); };
  const fileBase = kind === "iraq" ? "bataqat-zaer-iraq" : "bataqat-zaer-umrah";

  const saveCard = () => run(async () => { await download(await renderCard(kind, { ar, de }), `${fileBase}.png`); });
  const saveSheet = () => run(async () => { const pages = await renderSheets(kind, people()); for (let i = 0; i < pages.length; i++) await download(pages[i]!, `${fileBase}-A4-${i + 1}.png`); });
  const printSheet = () => {
    const w = window.open("", "_blank");
    run(async () => {
      const pages = await renderSheets(kind, people());
      const urls = pages.map((c) => c.toDataURL("image/png"));
      if (!w) { for (let i = 0; i < pages.length; i++) await download(pages[i]!, `${fileBase}-A4-${i + 1}.png`); return; }
      w.document.write(`<!doctype html><html><head><title>بطاقة زائر</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}img{display:block;width:210mm;height:297mm;page-break-after:always;break-after:page}img:last-child{page-break-after:auto;break-after:auto}</style></head><body>${urls.map((u) => `<img src="${u}">`).join("")}<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>`);
      w.document.close();
    });
  };

  const sp = SPEC[kind];
  const inputCls = "h-11 w-full rounded-md border border-border bg-background px-3 text-sm";
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 text-start">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent text-primary"><Tag className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1 font-bold text-primary"><L ar="بطاقة الأمتعة والحقائب" de="Kofferanhänger" /></span>
      <span className="text-lg text-muted-foreground">{open ? "−" : "+"}</span>
    </button>
    {open && <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(["iraq", "umrah"] as Kind[]).map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={`min-h-11 rounded-md border-2 px-2 py-1.5 text-sm font-bold ${kind === k ? "border-secondary bg-accent text-primary" : "border-border bg-background text-muted-foreground"}`}>
          {k === "iraq" ? <L ar="العراق وإيران" de="Irak & Iran" /> : <L ar="العمرة" de="Umrah" />}
        </button>)}
      </div>
      <canvas ref={preview} className="w-full rounded-md border border-border bg-background shadow-sm" style={{ aspectRatio: `${sp.w} / ${sp.h}`, maxWidth: kind === "umrah" ? "60%" : "100%", marginInline: "auto", display: "block" }} />
      <p className="text-center text-[11px] text-muted-foreground" dir="ltr">{sp.w} × {sp.h} mm · {sp.cols * sp.rows} / A4</p>
      <div className="grid gap-2">
        <input className={inputCls} dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} placeholder="اسم الزائر بالعربية" />
        <input className={inputCls} dir="ltr" value={de} onChange={(e) => setDe(e.target.value)} placeholder="Name (Latin)" />
      </div>
      <details className="rounded-md border border-border p-2 text-sm">
        <summary className="cursor-pointer font-bold text-primary"><L ar="طباعة لعدة زوار" de="Für mehrere Pilger drucken" /></summary>
        <p className="mt-2 text-xs text-muted-foreground"><L ar="اسم في كل سطر: الاسم العربي / Latin. تُوزع الأسماء على صفحات A4 تلقائياً." de="Ein Name pro Zeile: Arabisch / Latein. Die Namen werden automatisch auf A4-Seiten verteilt." /></p>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={5} className="mt-2 w-full rounded-md border border-border bg-background p-2 text-sm" placeholder={"علي حسن / Ali Hassan\nزينب محمد / Zainab Mohammad"} />
        {bulk.trim() && <p className="text-xs text-muted-foreground" dir="ltr">{parseNames(bulk).length} → {Math.ceil(parseNames(bulk).length / (sp.cols * sp.rows))} A4</p>}
      </details>
      <div className="grid gap-2">
        <Button type="button" disabled={busy} onClick={printSheet} className="h-auto min-h-11 whitespace-normal"><Printer className="h-4 w-4 shrink-0" /><L ar="طباعة صفحة A4 جاهزة للقص" de="A4-Bogen drucken" /></Button>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={saveSheet} className="h-auto min-h-11 whitespace-normal text-xs"><Download className="h-4 w-4 shrink-0" /><L ar="حفظ صفحة A4" de="A4 als Bild" /></Button>
          <Button type="button" variant="outline" disabled={busy} onClick={saveCard} className="h-auto min-h-11 whitespace-normal text-xs"><Download className="h-4 w-4 shrink-0" /><L ar="حفظ بطاقة واحدة" de="Einzelkarte" /></Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground"><L ar="عند الطباعة اختر: الحجم الفعلي 100% بدون تكبير أو تصغير." de="Beim Drucken: Tatsächliche Größe 100 %, ohne Skalierung." /></p>
      {err && <p className="text-xs font-bold text-destructive">{err}</p>}
    </div>}
  </section>;
}

