import type { QueryClient } from "@tanstack/react-query";
import { getSiteContent, saveSiteContent } from "./site-content.functions";
import type { SiteContent } from "./site-content";

/* Minimal IndexedDB key-value store (browser only). */
const DB = "ushaq-offline";
const STORE = "kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key: string, value: unknown) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export class OfflineMissingError extends Error {
  constructor() { super("offline-missing"); this.name = "OfflineMissingError"; }
}

export const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

/** Network-first content fetch with IndexedDB fallback. */
export async function fetchContentOfflineFirst(): Promise<SiteContent> {
  if (typeof window === "undefined") return getSiteContent();
  try {
    if (!isOnline()) throw new Error("offline");
    const data = await getSiteContent();
    idbSet("content", data).catch(() => {});
    return data;
  } catch {
    const cached = await idbGet<SiteContent>("content").catch(() => undefined);
    if (cached) return cached;
    throw new OfflineMissingError();
  }
}

/* ---------- Admin sync queue ---------- */
export type QueueItem = { id: string; label: string; createdAt: number; status: "pending" | "synced" | "failed"; error?: string | undefined; content: SiteContent };

const listeners = new Set<() => void>();
export const onQueueChange = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const emit = () => listeners.forEach((f) => f());

export const getQueue = async () => (await idbGet<QueueItem[]>("queue").catch(() => undefined)) ?? [];

export async function enqueueSave(content: SiteContent, label: string) {
  const q = await getQueue();
  q.push({ id: `${Date.now()}`, label, createdAt: Date.now(), status: "pending", content });
  await idbSet("queue", q.slice(-50));
  await idbSet("content", content);
  emit();
}

let flushing = false;
/** Uploads pending snapshots in order. The server re-checks the admin password. */
export async function flushQueue(password: string | null) {
  if (flushing || !password || !isOnline()) return;
  flushing = true;
  try {
    const q = await getQueue();
    for (const item of q) {
      if (item.status !== "pending") continue;
      try {
        const res = await saveSiteContent({ data: { password, content: item.content } });
        item.status = res.ok ? "synced" : "failed";
        item.error = res.ok ? undefined : res.error;
      } catch (e) {
        if (!isOnline()) break;
        item.status = "failed";
        item.error = e instanceof Error ? e.message : String(e);
      }
      await idbSet("queue", q);
      emit();
    }
  } finally { flushing = false; }
}

export async function clearSynced() {
  await idbSet("queue", (await getQueue()).filter((i) => i.status !== "synced"));
  emit();
}

/** Save now when online; otherwise queue locally as "pending sync". */
export async function saveOrQueue(password: string, nextContent: SiteContent, label: string, qc?: QueryClient) {
  const prev = qc?.getQueryData<SiteContent>(["site-content"]) ?? (await idbGet<SiteContent>("content").catch(() => undefined));
  const content = withTrash(prev, nextContent);
  if (!isOnline()) {
    await enqueueSave(content, label);
    qc?.setQueryData(["site-content"], content);
    return { queued: true };
  }
  const res = await saveSiteContent({ data: { password, content } });
  if (!res.ok) throw new Error(res.error ?? "unknown");
  idbSet("content", content).catch(() => {});
  qc?.setQueryData(["site-content"], content);
  return { queued: false };
}
