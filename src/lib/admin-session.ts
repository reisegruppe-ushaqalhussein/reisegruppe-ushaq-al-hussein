import { useSyncExternalStore } from "react";
import { checkAdminPassword } from "./site-content.functions";

export type AccessRole = "admin" | "haj";
export type AdminSession = { password: string; role: AccessRole; mode: AccessRole };

export const ADMIN_KEY = "admin-session-pw";
const ROLE_KEY = "admin-session-role";
const MODE_KEY = "admin-session-mode";
const DEVICE_KEY = "admin-device-id";

let session: AdminSession | null = null;
let started = false;
const listeners = new Set<() => void>();
const TOOLS_KEY = "admin-tools-hidden";
let toolsHidden = false;
/** What editing controls see: null while the staff member has hidden the tools for a clean view. */
let visible: AdminSession | null = null;
const emit = () => { visible = toolsHidden || (session?.role === "admin" && session.mode !== "admin") ? null : session; listeners.forEach((l) => l()); };

export function deviceInfo() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
  return { deviceId: id, ua: navigator.userAgent.slice(0, 300) };
}

function set(next: AdminSession | null) {
  session = next;
  if (next) {
    localStorage.setItem(ADMIN_KEY, next.password);
    localStorage.setItem(ROLE_KEY, next.role);
    localStorage.setItem(MODE_KEY, next.mode);
  } else {
    [ADMIN_KEY, ROLE_KEY, MODE_KEY].forEach((k) => localStorage.removeItem(k));
  }
  emit();
}

/** Restores the persistent login (stays signed in until explicit logout) and re-verifies it with the server. */
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  toolsHidden = localStorage.getItem(TOOLS_KEY) === "1";
  const pw = localStorage.getItem(ADMIN_KEY) ?? sessionStorage.getItem(ADMIN_KEY);
  if (!pw) return;
  const role = (localStorage.getItem(ROLE_KEY) as AccessRole | null) ?? "admin";
  const mode = (localStorage.getItem(MODE_KEY) as AccessRole | null) ?? role;
  session = { password: pw, role, mode: role === "haj" ? "haj" : mode };
  visible = toolsHidden || (session?.role === "admin" && session.mode !== "admin") ? null : session;
  checkAdminPassword({ data: { password: pw, ...deviceInfo() } })
    .then((r) => { if (r.ok && r.role) set({ password: pw, role: r.role, mode: r.role === "haj" ? "haj" : (session?.mode ?? r.role) }); else set(null); })
    .catch(() => { /* offline: keep the stored session */ });
}

function subscribe(l: () => void) { start(); listeners.add(l); return () => { listeners.delete(l); }; }

/** Session for editing controls; returns null while tools are hidden (clean view). */
export function useAdminSession() {
  return useSyncExternalStore(subscribe, () => visible, () => null);
}
/** The real signed-in staff session, even while tools are hidden (used by the staff bar). */
export function useStaffSession() {
  return useSyncExternalStore(subscribe, () => session, () => null);
}
export function useToolsHidden() {
  return useSyncExternalStore(subscribe, () => toolsHidden, () => false);
}
export function setToolsHidden(hidden: boolean) {
  toolsHidden = hidden;
  localStorage.setItem(TOOLS_KEY, hidden ? "1" : "0");
  emit();
}
/** Full app-structure control: always the admin; the haj only when the admin has allowed it. */
export function useCanManage(content: { cms?: { hajToolsEnabled?: boolean } | undefined }) {
  const s = useAdminSession();
  return !!s && ((s.role === "admin" && s.mode === "admin") || (s.role === "haj" && !!content.cms?.hajToolsEnabled));
}

/** Only the general admin in admin mode sees hidden items and hide/restore controls. */
export function useShowHidden() {
  const s = useAdminSession();
  return s?.role === "admin" && s.mode === "admin";
}

export async function loginWithCode(code: string) {
  const r = await checkAdminPassword({ data: { password: code, login: true, ...deviceInfo() } });
  if (r.ok && r.role) set({ password: code, role: r.role, mode: r.role });
  return r.ok ? r.role : null;
}

export function setMode(mode: AccessRole) { if (session?.role === "admin") set({ ...session, mode }); }
export function updatePassword(password: string) { if (session) set({ ...session, password }); }
export function logout() { sessionStorage.removeItem(ADMIN_KEY); set(null); }
export function getSession() { start(); return session; }
