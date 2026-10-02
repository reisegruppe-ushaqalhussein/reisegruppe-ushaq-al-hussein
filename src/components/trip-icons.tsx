type P = { className?: string; "aria-hidden"?: boolean | "true" | "false" };
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Shrine dome with two minarets — Iraq (Karbala / Najaf). */
export function IraqIcon(p: P) {
  return <svg {...base} {...p}><path d="M12 3v1.5" /><path d="M7.5 12a4.5 4.5 0 0 1 9 0" /><path d="M6.5 12h11v8h-11z" /><path d="M10.5 20v-3a1.5 1.5 0 0 1 3 0v3" /><path d="M3.5 20V9l1-1.5 1 1.5v11" /><path d="M18.5 20V9l1-1.5 1 1.5v11" /><path d="M2.5 20h19" /></svg>;
}

/** Kaaba — Umrah. */
export function KaabaIcon(p: P) {
  return <svg {...base} {...p}><path d="M4 8l8-3 8 3v10l-8 3-8-3z" /><path d="M4 8l8 3 8-3" /><path d="M12 11v10" /><path d="M4 11l8 3 8-3" /></svg>;
}

/** Single dome with crescent — Iran (Mashhad / Qom). */
export function IranIcon(p: P) {
  return <svg {...base} {...p}><path d="M12.8 2.4a1.4 1.4 0 1 0 .9 2.4 1.7 1.7 0 0 1-.9-2.4z" /><path d="M12 5.5c-3.5 1.5-6 4-6 7.5h12c0-3.5-2.5-6-6-7.5z" /><path d="M5 13h14v7H5z" /><path d="M10 20v-3.5a2 2 0 0 1 4 0V20" /><path d="M3 20h18" /></svg>;
}

/** Mount Arafat with pilgrims' tent — Hajj. */
export function HajjIcon(p: P) {
  return <svg {...base} {...p}><path d="M2 20l6.5-10 3.5 5 2.5-3.5L22 20z" /><path d="M8.5 10V6" /><path d="M8.5 6h2.5l-.8 1 .8 1H8.5" /><path d="M14 20l2-3 2 3" /></svg>;
}
