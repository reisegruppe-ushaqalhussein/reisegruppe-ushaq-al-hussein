import { useEffect, useRef, useState } from "react";
let qrMod: Promise<typeof import("qrcode")> | null = null;
let qrcodeLib: typeof import("qrcode") | null = null;
import { useServerFn } from "@tanstack/react-start";
import { listBookings, type BookingRow } from "@/lib/bookings.functions";
import { useAdminSession } from "@/lib/admin-session";
import { Download, Printer, Tag, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { display, isArabic, useLang } from "@/lib/i18n";
import calligraphySrc from "@/assets/tag-calligraphy.png";
import shrineSrc from "@/assets/tag-shrine.png";
import kaabaSrc from "@/assets/tag-kaaba.png";
import iraqTemplateSrc from "@/assets/tag-iraq-template.png";

/* Fixed print data — do not change without the leader's approval. */
const APP_URL = "https://reisegruppe-ushaq-al-hussein.lovable.app";
const PHONE_IQ = "009647819998905";
const PHONE_DE = "004915773055365";
const DPI = 300;
const PX_PER_MM = DPI / 25.4;
const A4 = { w: 210, h: 297 };
const CUSTOM_KEY = "luggage-tag-custom-iraq";

type Kind = "iraq" | "umrah";
type Person = { ar: string; de: string };
type Assets = { call: HTMLImageElement; shrine: HTMLImageElement; kaaba: HTMLImageElement; template: HTMLImageElement; custom: HTMLImageElement | null };
type Style = { variant: "new" | "classic" | "custom"; color: "red" | "gold" | "black"; bold: boolean; scale: number; layout: "side" | "stack" };

const SPEC: Record<Kind, { w: number; h: number; cols: number; rows: number; ox: number; oy: number }> = {
  iraq: { w: 105, h: 74.25, cols: 2, rows: 4, ox: 0, oy: 0 },
  umrah: { w: 55.67, h: 83.87, cols: 3, rows: 3, ox: (A4.w - 3 * 55.67) / 2, oy: (A4.h - 3 * 83.87) / 2 },
};

const GOLD = "#a8721a";
const RED = "#8e1424";
const BLUE = "#1f5fbf";
const INK = "#1a1a1a";
const IRAQ_COLORS: Record<Style["color"], string> = { red: RED, gold: GOLD, black: "#000000" };

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
let assetsP: Promise<Omit<Assets, "custom">> | null = null;
let customCache: { src: string; img: HTMLImageElement } | null = null;
async function loadAssets(): Promise<Assets> {
  if (!qrcodeLib) {
    qrcodeLib = await (qrMod ??= import("qrcode"));
  }
  if (!assetsP) {
    assetsP = (async () => {
      await Promise.all(["800 40px Cairo", "700 40px Cairo", "600 40px Cairo", "500 40px Cairo", "400 40px Cairo"].map((f) => document.fonts.load(f).catch(() => null)));
      const [call, shrine, kaaba, template] = await Promise.all([loadImg(calligraphySrc), loadImg(shrineSrc), loadImg(kaabaSrc), loadImg(iraqTemplateSrc)]);
      return { call, shrine, kaaba, template };
    })();
    assetsP.catch(() => { assetsP = null; });
  }
  const base = await assetsP;
  let custom: HTMLImageElement | null = null;
  const src = typeof localStorage !== "undefined" ? localStorage.getItem(CUSTOM_KEY) : null;
  if (src) {
    if (customCache?.src !== src) customCache = { src, img: await loadImg(src).catch(() => null as unknown as HTMLImageElement) };
    custom = customCache?.img ?? null;
  }
  return { ...base, custom };
}

function pen(ctx: CanvasRenderingContext2D, S: number, ox: number, oy: number) {
  const X = (mm: number) => (ox + mm) * S;
  const Y = (mm: number) => (oy + mm) * S;
  const font = (size: number, weight = 700) => `${weight} ${size * S}px Cairo, "Noto Naskh Arabic", sans-serif`;
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
    if (!qrcodeLib) return;
    const q = qrcodeLib.create(data, { errorCorrectionLevel: "M" });
    const n = q.modules.size;
    const m = size / (n + margin * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(X(x), Y(y), size * S, size * S);
    ctx.fillStyle = "#000000";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!q.modules.get(r, c)) continue;
        const x0 = Math.round(X(x + (c + margin) * m)), x1 = Math.round(X(x + (c + margin + 1) * m));
        const y0 = Math.round(Y(y + (r + margin) * m)), y1 = Math.round(Y(y + (r + margin + 1) * m));
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
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

function phoneRow(p: ReturnType<typeof pen>, label: string, num: string, cx: number, y: number, maxW: number, labelColor = GOLD) {
  let ls = 2.3, ns = 3.1;
  const gap = 1.2;
  let total = p.width(label, ls, 600) + gap + p.width(num, ns, 700);
  if (total > maxW) { const k = maxW / total; ls *= k; ns *= k; total = maxW; }
  const left = cx - total / 2;
  p.text(num, left, y, ns, { weight: 700, align: "left", color: INK });
  p.text(label, left + total, y, ls, { weight: 600, align: "right", color: labelColor });
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

function drawName(p: ReturnType<typeof pen>, who: Person, st: Style, left: number, right: number, base: number, size: number, color: string) {
  const w = st.bold ? 800 : 500;
  const sz = size * st.scale;
  const full = right - left;
  if (who.ar && who.de && st.layout === "side") {
    const half = full / 2 - 1;
    p.text(who.ar, right, base, sz, { align: "right", color, weight: w, maxW: half });
    p.text(who.de, left, base, sz * 0.85, { align: "left", color, weight: w, maxW: half });
  } else if (who.ar && who.de) {
    p.text(who.ar, right, base - sz * 0.95, sz, { align: "right", color, weight: w, maxW: full });
    p.text(who.de, left, base, sz * 0.78, { align: "left", color, weight: w, maxW: full });
  } else if (who.ar || who.de) {
    const t = (who.ar || who.de).trim();
    const rtl = /[\u0600-\u06FF]/.test(t);
    p.text(t, rtl ? right : left, base, sz, { align: rtl ? "right" : "left", color, weight: w, maxW: full });
  }
}

function drawIraq(ctx: CanvasRenderingContext2D, S: number, ox: number, oy: number, a: Assets, who: Person, st: Style) {
  const p = pen(ctx, S, ox, oy);
  const W = 105, H = 74.25;
  const tpl = st.variant === "custom" && a.custom ? a.custom : a.template;
  p.rect(0, 0, W, H, { fill: "#ffffff" });
  p.img(tpl, 0, 0, W, H);
  drawName(p, who, st, 25, 81.5, 59.6, 4.4, IRAQ_COLORS[st.color]);
}

function drawIraqClassic(ctx: CanvasRenderingContext2D, S: number, ox: number, oy: number, a: Assets, who: Person, st: Style) {
  const p = pen(ctx, S, ox, oy);
  const W = 105, H = 74.25;
  p.rect(0, 0, W, H, { fill: "#ffffff" });
  p.rect(3.5, 3.5, W - 7, H - 7, { stroke: GOLD, lw: 0.35 });
  const qx = W - 5 - 27, qy = 6;
  p.rect(qx - 0.6, qy - 0.6, 28.2, 28.2, { stroke: "#d8c49a", lw: 0.2 });
  p.qr(APP_URL, qx, qy, 27, 3);
  const fw = 9.5, fh = 6.2, fy = qy + 27 + 3;
  drawLebanonFlag(ctx, p, qx + 27 / 2 - fw - 1, fy, fw, fh);
  drawGermanFlag(p, qx + 27 / 2 + 1, fy, fw, fh);
  const cx = 38;
  p.text("بطاقة زائر", cx, 11.5, 4.4, { color: GOLD });
  const cw = 54;
  p.img(a.call, cx - cw / 2, 13.5, cw);
  p.text("بإدارة الحاج ياسر الدر", cx, 38.2, 4.1, { color: GOLD, maxW: 56 });
  const sh = 27, sw = (sh * a.shrine.naturalWidth) / a.shrine.naturalHeight;
  ctx.save();
  ctx.beginPath(); ctx.rect(p.X(3.7), p.Y(3.7), (W - 7.4) * S, (H - 7.4) * S); ctx.clip();
  p.img(a.shrine, 3.8, H - 3.7 - sh, sw, sh);
  ctx.restore();
  const px = 3.8 + sw + 1.5;
  const pcx = (px + 69) / 2;
  phoneRow(p, "رقم التلفون بالعراق", PHONE_IQ, pcx, 44, 69 - px);
  phoneRow(p, "رقم التلفون بألمانيا", PHONE_DE, pcx, 49, 69 - px);
  const right = W - 6;
  const lw = p.text("اسم الزائر:", right, 60, 3, { color: INK, align: "right", weight: 700 });
  const nameRight = right - lw - 1.5;
  drawName(p, who, st, px, nameRight, 60.3, 4.2, IRAQ_COLORS[st.color]);
  p.line(px, 61.8, nameRight, 61.8, "#9a9a9a", 0.2, [0.6, 0.6]);
}

function drawUmrah(ctx: CanvasRenderingContext2D, S: number, ox: number, oy: number, a: Assets, who: Person, st: Style) {
  const p = pen(ctx, S, ox, oy);
  const W = 55.67, H = 83.87, cx = W / 2, mw = W - 8;
  p.rect(0, 0, W, H, { fill: "#ffffff" });
  p.text("بطاقة زائر", cx, 8, 4.6, { color: BLUE, maxW: mw });
  p.text("شركة الحاج الدر", cx, 13.6, 4.2, { maxW: mw });
  p.text("للسياحة و السفر", cx, 17.6, 2.7, { weight: 600, maxW: mw });
  p.text("- بإدارة الحاج ياسر الدر -", cx, 21.4, 2.7, { maxW: mw });
  p.text("Reisegruppe Aldor", cx, 25.1, 2.7, { weight: 500, maxW: mw });
  phoneRow(p, "المانيا:", PHONE_DE, cx, 29, mw, BLUE);

  const bh = 10, by = H - 3.2 - bh, bx = 3, bw = W - 6;
  const qs = 15.5, qy = by - 5.6 - qs;
  const top = 30.6, bottom = qy - 1.2;
  const ratio = a.kaaba.naturalWidth / a.kaaba.naturalHeight;
  let kh = bottom - top, kw = kh * ratio;
  if (kw > mw) { kw = mw; kh = kw / ratio; }
  p.img(a.kaaba, cx - kw / 2, top + (bottom - top - kh) / 2, kw, kh);
  p.qr(APP_URL, cx - qs / 2, qy, qs, 2);
  p.text("إسم الزائر:", cx, by - 1.3, 3, { color: BLUE, weight: 700, maxW: mw });
  p.rect(bx, by, bw, bh, { fill: BLUE });
  drawName(p, who, st, bx + 1.8, bx + bw - 1.8, who.ar && who.de && st.layout === "stack" ? by + 8.4 : by + 6.6, 3.7, "#ffffff");
  p.rect(0, 0, W, H, { stroke: BLUE, lw: 0.3 });
}

function drawCard(kind: Kind, ctx: CanvasRenderingContext2D, S: number, ox: number, oy: number, a: Assets, who: Person, st: Style) {
  if (kind === "umrah") return drawUmrah(ctx, S, ox, oy, a, who, st);
  if (st.variant === "classic") return drawIraqClassic(ctx, S, ox, oy, a, who, st);
  return drawIraq(ctx, S, ox, oy, a, who, st);
}

async function renderCard(kind: Kind, who: Person, st: Style, S = PX_PER_MM) {
  const a = await loadAssets();
  const sp = SPEC[kind];
  const c = document.createElement("canvas");
  c.width = Math.round(sp.w * S); c.height = Math.round(sp.h * S);
  drawCard(kind, c.getContext("2d")!, S, 0, 0, a, who, st);
  return c;
}

async function renderSheets(kind: Kind, people: Person[], st: Style) {
  const a = await loadAssets();
  const sp = SPEC[kind];
  const per = sp.cols * sp.rows;
 const blank: Person = { ar: "", de: "" };
const list = people.length ? people : [blank];
const targetLength = Math.ceil(list.length / per) * per;
const filled =
  list.length === 1
    ? Array.from({ length: per }, () => list[0] ?? blank)
    : [
        ...list,
        ...Array.from(
          { length: targetLength - list.length },
          () => blank
        ),
      ];
  const pages: HTMLCanvasElement[] = [];
  for (let i = 0; i < filled.length; i += per) {
    const c = document.createElement("canvas");
    c.width = Math.round(A4.w * PX_PER_MM); c.height = Math.round(A4.h * PX_PER_MM);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
    filled.slice(i, i + per).forEach((who: Person | undefined, k) => {
      const col = k % sp.cols, row = Math.floor(k / sp.cols);
      drawCard(kind, ctx, PX_PER_MM, sp.ox + col * sp.w, sp.oy + row * sp.h, a, who ?? { ar: "", de: "" }, st);
    });
    if (kind === "iraq") {
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
  const [copies, setCopies] = useState<1 | 2>(2);
  const [blankOnly, setBlankOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [variant, setVariant] = useState<Style["variant"]>("new");
  const [color, setColor] = useState<Style["color"]>("black");
  const [bold, setBold] = useState(true);
  const [scale, setScale] = useState(1);
  const [layout, setLayout] = useState<Style["layout"]>("side");
  const [hasCustom, setHasCustom] = useState(false);
   
  const s = useAdminSession();
  const listFn = useServerFn(listBookings);
  const [trips, setTrips] = useState<string[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<string>("");
  const [pullLang, setPullLang] = useState<"ar" | "latin" | "both">("ar");
  const [allBookings, setAllBookings] = useState<BookingRow[]>([]);

  useEffect(() => { setHasCustom(!!localStorage.getItem(CUSTOM_KEY)); }, []);
  const st: Style = { variant: variant === "custom" && !hasCustom ? "new" : variant, color, bold, scale, layout };

  const onUpload = (file?: File) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => { try { localStorage.setItem(CUSTOM_KEY, String(r.result)); setHasCustom(true); setVariant("custom"); } catch { setErr("الصورة كبيرة جداً | Bild zu groß"); } };
    r.readAsDataURL(file);
  };

  const preview = useRef<HTMLCanvasElement>(null);
  useEffect(() => { setAr(nameAr); setDe(nameDe); }, [nameAr, nameDe]);

    const extractTripPilgrims = (bookingsList: BookingRow[], tripName: string, mode: "ar" | "latin" | "both" = pullLang) => {
    const normTrip = (s: string) => s.replace(/[\s|—–-]+/g, " ").trim().toLowerCase();
    const target = normTrip(tripName);

    const filtered = bookingsList.filter((b) => {
      const bFull = normTrip(`${b.trip} ${b.trip_date ?? ""}`);
      const bTripOnly = normTrip(b.trip);
      return bFull.includes(target) || target.includes(bTripOnly) || bTripOnly.includes(target);
    });

    const lines: string[] = [];
    filtered.forEach((b) => {
      (b.travelers || []).forEach((t) => {
        const arName = (t["arabicName"] || "").trim();
        const enName = `${t["firstName"] || ""} ${t["lastName"] || ""}`.trim();
        
        if (mode === "ar") {
          // عربي فقط كما في الدفتر، وإن لم يتوفر يُوضع الاسم اللاتيني كبديل
          lines.push(arName || enName);
        } else if (mode === "latin") {
          // لاتيني فقط
          lines.push(enName || arName);
        } else {
          // دمج الاثنين
          if (arName && enName) lines.push(`${arName} / ${enName}`);
          else lines.push(arName || enName);
        }
      });
    });
    return lines.filter(Boolean);
  };

  const applyTripPilgrims = (tripName: string, mode = pullLang) => {
    setSelectedTrip(tripName);
    const lines = extractTripPilgrims(allBookings, tripName, mode);
    setBulk(lines.join("\n"));
    setBlankOnly(false);
  };

    const fetchTripNames = async () => {
    if (!s) return;
    setBusy(true);
    try {
      const res = await listFn({ data: { password: s.password } });
      const valid = (res.rows ?? []).filter((r) => r.status !== "deleted");
      setAllBookings(valid);

      // جلب جميع الرحلات المعلنة في التطبيق من الذاكرة المحلية أو الحجوزات
      const savedContent = typeof window !== "undefined" ? localStorage.getItem("ushaq_offline_site-content") : null;
      let declaredTrips: string[] = [];
      if (savedContent) {
        try {
          const parsed = JSON.parse(savedContent);
          if (Array.isArray(parsed?.trips)) {
            declaredTrips = parsed.trips.map((t: { ar: string; de: string; date?: string }) =>
              `${t.ar} | ${t.de}${t.date ? ` — ${t.date}` : ""}`.replace(/\s*\|\s*/g, " — ").trim()
            );
          }
        } catch { /* ignore */ }
      }

      // دمج رحلات الحجوزات الفعلية مع الرحلات المعلنة ومنع التكرار
      const bookedTrips = valid.map((r) => {
        const t = `${r.trip}${r.trip_date ? ` — ${r.trip_date}` : ""}`.replace(/\s*\|\s*/g, " — ");
        return t.trim();
      }).filter(Boolean);

      const uniqueTrips = [...new Set([...declaredTrips, ...bookedTrips])].filter(Boolean);

      setTrips(uniqueTrips);
      const firstTrip = uniqueTrips[0];
      if (firstTrip && !selectedTrip) {
        setSelectedTrip(firstTrip);
        const lines = extractTripPilgrims(valid, firstTrip);
        setBulk(lines.join("\n"));
        setBlankOnly(false);
      }
    } catch {
      setErr("تعذر جلب الحجوزات | Buchungen konnten nicht geladen werden");
    }
    setBusy(false);
  };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const targetWho = blankOnly ? { ar: "", de: "" } : { ar, de };
    renderCard(kind, targetWho, st, 10).then((c) => {
      const el = preview.current; if (!alive || !el) return;
      el.width = c.width; el.height = c.height; el.getContext("2d")!.drawImage(c, 0, 0);
    }).catch(() => setErr("تعذر تحميل التصميم | Design konnte nicht geladen werden"));
    return () => { alive = false; };
  }, [open, kind, ar, de, st.variant, color, bold, scale, layout, hasCustom, blankOnly]);

  const people = (): Person[] => {
    const sp = SPEC[kind];
    if (blankOnly) {
      return Array.from({ length: sp.cols * sp.rows }, () => ({ ar: "", de: "" }));
    }
    const b = parseNames(bulk);
    const baseList = b.length ? b : [{ ar, de }];
    if (copies === 2) {
      const doubled: Person[] = [];
      baseList.forEach((p) => { doubled.push(p); doubled.push(p); });
      return doubled;
    }
    return baseList;
  };

  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(""); try { await fn(); } catch { setErr("حدث خطأ، حاول مجدداً | Fehler, bitte erneut versuchen"); } setBusy(false); };
  const fileBase = kind === "iraq" ? "bataqat-zaer-iraq" : "bataqat-zaer-umrah";

  const saveCard = () => run(async () => { await download(await renderCard(kind, blankOnly ? { ar: "", de: "" } : { ar, de }, st), `${fileBase}.png`); });
  const saveSheet = () => run(async () => { const pages = await renderSheets(kind, people(), st); for (let i = 0; i < pages.length; i++) await download(pages[i]!, `${fileBase}-A4-${i + 1}.png`); });
  const printSheet = () => {
    const w = window.open("", "_blank");
    run(async () => {
      const pages = await renderSheets(kind, people(), st);
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

      {kind === "iraq" && <div className="space-y-1">
        <p className="text-xs font-bold text-primary"><L ar="تصميم البطاقة" de="Kartendesign" /></p>
        <div className="grid grid-cols-3 gap-1.5">
          {([["new", "الجديد", "Neu"], ["classic", "السابق", "Vorherig"], ["custom", "مرفوع", "Eigenes"]] as const).map(([v, a1, d1]) => <button key={v} type="button" disabled={v === "custom" && !hasCustom} onClick={() => setVariant(v)} className={`min-h-10 rounded-md border-2 px-1 text-xs font-bold disabled:opacity-40 ${st.variant === v ? "border-secondary bg-accent text-primary" : "border-border bg-background text-muted-foreground"}`}><L ar={a1} de={d1} /></button>)}
        </div>
        <label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs font-bold text-primary">
          <Upload className="h-4 w-4" /><L ar="رفع تصميم بطاقة جديد (PNG/JPG بمقاس 105×74 مم)" de="Neues Kartendesign hochladen" />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
        </label>
      </div>}

      <div className="space-y-2 rounded-md border border-border p-2">
        <p className="text-xs font-bold text-primary"><L ar="خط اسم الزائر" de="Schrift des Namens" /></p>
        {kind === "iraq" && <div className="grid grid-cols-3 gap-1.5">
          {([["black", "أسود", "Schwarz"], ["red", "أحمر", "Rot"], ["gold", "ذهبي", "Gold"]] as const).map(([v, a1, d1]) => <button key={v} type="button" onClick={() => setColor(v)} className={`min-h-10 rounded-md border-2 text-xs font-bold ${color === v ? "border-secondary bg-accent" : "border-border bg-background"}`} style={{ color: IRAQ_COLORS[v] }}><L ar={a1} de={d1} /></button>)}
        </div>}
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => setBold(!bold)} className={`min-h-10 rounded-md border-2 text-sm ${bold ? "border-secondary bg-accent font-extrabold text-primary" : "border-border bg-background font-normal text-muted-foreground"}`}><L ar="عريض" de="Fett" /></button>
          <button type="button" onClick={() => setLayout(layout === "side" ? "stack" : "side")} className="min-h-10 rounded-md border-2 border-border bg-background text-xs font-bold text-primary">{layout === "side" ? <L ar="عربي يمين · أجنبي يسار" de="Arabisch rechts · Latein links" /> : <L ar="عربي فوق · أجنبي تحت" de="Arabisch oben · Latein unten" />}</button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setScale(Math.max(0.7, +(scale - 0.1).toFixed(1)))} className="h-10 w-10 rounded-md border border-border text-lg font-bold">−</button>
          <span className="flex-1 text-center text-sm font-bold" dir="ltr">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale(Math.min(1.5, +(scale + 0.1).toFixed(1)))} className="h-10 w-10 rounded-md border border-border text-lg font-bold">+</button>
        </div>
      </div>

      <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2.5">
        <p className="text-xs font-bold text-primary"><L ar="توزيع البطاقات والنسخ" de="Kartenanzahl" /></p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setCopies(2); setBlankOnly(false); }} className={`min-h-10 rounded-md border-2 p-1 text-xs font-bold ${copies === 2 && !blankOnly ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>
            <L ar="🏷️ بطاقتان لكل زائر (شحن + يد)" de="2 pro Pilger (Hand + Fracht)" />
          </button>
          <button type="button" onClick={() => { setCopies(1); setBlankOnly(false); }} className={`min-h-10 rounded-md border-2 p-1 text-xs font-bold ${copies === 1 && !blankOnly ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>
            <L ar="🏷️ بطاقة واحدة لكل زائر" de="1 Karte pro Pilger" />
          </button>
        </div>
        <button type="button" onClick={() => setBlankOnly(!blankOnly)} className={`w-full min-h-9 rounded-md border text-xs font-bold transition-all ${blankOnly ? "border-destructive bg-destructive text-destructive-foreground" : "border-border bg-background text-primary"}`}>
          {blankOnly ? <L ar="✓ تفعيل: طباعة بطاقات فارغة بدون اسم (للطوارئ)" de="✓ Leere Karten für Notfälle aktiv" /> : <L ar="📄 طباعة بطاقات فارغة بدون أسماء (للطوارئ)" de="Leere Karten drucken" />}
        </button>
      </div>

      {!blankOnly && <div className="grid gap-2">
        <input className={inputCls} dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} placeholder="اسم الزائر بالعربية" />
        <input className={inputCls} dir="ltr" value={de} onChange={(e) => setDe(e.target.value)} placeholder="Name (Latin)" />
      </div>}

      {!blankOnly && <details className="rounded-md border border-border p-2 text-sm" open={!!bulk.trim()}>
        <summary className="cursor-pointer font-bold text-primary"><L ar="طباعة لعدة زوار أو سحب من الحجوزات" de="Mehrere Pilger / Aus Buchungen" /></summary>
        
          {s && (
          <div className="mt-2 space-y-2 rounded-md bg-accent/40 p-2">
            {trips.length === 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={fetchTripNames} disabled={busy} className="w-full text-xs">
                📥 <L ar="سحب أسماء الزوار من الحجوزات" de="Pilgernamen aus Buchungen laden" />
              </Button>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-primary"><L ar="اختر الرحلة لسحب أسمائها فوراً:" de="Reise wählen:" /></p>
                  <button type="button" onClick={fetchTripNames} className="text-[10px] text-primary underline">🔄 تحديث</button>
                </div>
                <select value={selectedTrip} onChange={(e) => applyTripPilgrims(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs">
                  {trips.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>

                {/* خيارات لغة السحب: عربي فقط أو لاتيني فقط أو دمج الاثنين */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground">صيغة الأسماء:</span>
                  <div className="flex gap-1 text-[10px]">
                    <button type="button" onClick={() => { setPullLang("ar"); applyTripPilgrims(selectedTrip, "ar"); }} className={`rounded px-1.5 py-0.5 font-bold ${pullLang === "ar" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>عربي فقط</button>
                    <button type="button" onClick={() => { setPullLang("latin"); applyTripPilgrims(selectedTrip, "latin"); }} className={`rounded px-1.5 py-0.5 font-bold ${pullLang === "latin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Latin فقط</button>
                    <button type="button" onClick={() => { setPullLang("both"); applyTripPilgrims(selectedTrip, "both"); }} className={`rounded px-1.5 py-0.5 font-bold ${pullLang === "both" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>دمج الاثنين</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* سطر الملاحظة مع زر المسح السريع X فوق مربع النص مباشرة */}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground"><L ar="اسم في كل سطر: الاسم العربي / Latin" de="Ein Name pro Zeile: Arabisch / Latein" /></p>
          {bulk.trim() && (
            <button type="button" onClick={() => setBulk("")} className="text-xs font-bold text-destructive hover:underline">
              ✕ <L ar="مسح الأسماء" de="Leeren" />
            </button>
          )}
        </div>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={5} className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm" placeholder={"علي حسن محمد / ALI HASSAN\nزينب عبد الله / ZEINAB ABDALLAH"} />
        {bulk.trim() && <p className="text-xs text-muted-foreground" dir="ltr">{parseNames(bulk).length} زائر × {copies} = {people().length} بطاقة → {Math.ceil(people().length / (sp.cols * sp.rows))} صفحة A4</p>}
      </details>}

      <div className="grid gap-2 pt-1">
        <Button type="button" disabled={busy} onClick={printSheet} className="h-auto min-h-11 whitespace-normal font-bold"><Printer className="h-4 w-4 shrink-0" /><L ar={`طباعة صفحة A4 جاهزة للقص (${people().length} بطاقة)`} de={`A4-Bogen drucken (${people().length} Karten)`} /></Button>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={saveSheet} className="h-auto min-h-11 whitespace-normal text-xs font-semibold"><Download className="h-4 w-4 shrink-0" /><L ar="حفظ صفحات A4 صور" de="A4 als Bild" /></Button>
          <Button type="button" variant="outline" disabled={busy} onClick={saveCard} className="h-auto min-h-11 whitespace-normal text-xs font-semibold"><Download className="h-4 w-4 shrink-0" /><L ar="حفظ بطاقة واحدة" de="Einzelkarte" /></Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground"><L ar="عند الطباعة اختر: الحجم الفعلي 100% بدون تكبير أو تصغير." de="Beim Drucken: Tatsächliche Größe 100 %, ohne Skalierung." /></p>
      {err && <p className="text-xs font-bold text-destructive">{err}</p>}
    </div>}
  </section>;
}
