import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { flushQueue, getQueue } from "@/lib/offline";
import { ADMIN_KEY } from "@/components/dua-admin";

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  return online;
}

/** Offline banner + silent background refresh and queue upload on reconnect. */
export function OfflineStatus() {
  const online = useOnline();
  const qc = useQueryClient();
  const wasOnline = useRef(online);
  useEffect(() => {
    const reconnected = !wasOnline.current && online;
    wasOnline.current = online;
    if (!online) return;
    const sync = async () => {
      const queue = await getQueue().catch(() => []);
      const hasPending = queue.some((item) => item.status === "pending");
      await flushQueue(sessionStorage.getItem(ADMIN_KEY));
      // The route loader already fetches fresh content on first launch. Avoid
      // invalidating it again unless connectivity returned or queued edits synced.
      if (reconnected || hasPending) await qc.invalidateQueries({ queryKey: ["site-content"] });
    };
    void sync();
  }, [online, qc]);
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-[520px] items-center justify-center gap-2 bg-primary/95 px-3 py-1.5 text-center text-xs text-primary-foreground shadow">
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-secondary" aria-hidden="true" />
      <span>أنت تتصفح حالياً بدون إنترنت - المحفوظات متاحة <span lang="de" dir="ltr" className="block italic opacity-75">Offline – gespeicherte Inhalte verfügbar</span></span>
    </div>
  );
}

export function OfflineFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <WifiOff className="mx-auto mb-3 h-10 w-10 text-secondary" aria-hidden="true" />
        <h1 className="font-bold text-primary">يلزم الاتصال بالإنترنت لأول مرة</h1>
        <p lang="de" dir="ltr" className="text-xs italic text-muted-foreground">Erstmalige Internetverbindung erforderlich</p>
        <p className="mt-3 text-sm">هذا المحتوى لم يُحمَّل على جهازك بعد. اتصل بالإنترنت مرة واحدة لتنزيله، وبعدها سيكون متاحاً بدون إنترنت.</p>
        <p lang="de" dir="ltr" className="mt-1 text-xs italic text-muted-foreground">Dieser Inhalt wurde noch nicht heruntergeladen. Bitte einmal mit dem Internet verbinden – danach ist er offline verfügbar.</p>
        <button onClick={() => location.reload()} className="mt-4 h-11 w-full rounded-md bg-primary text-sm font-bold text-primary-foreground">إعادة المحاولة <span className="text-xs italic opacity-75">| Erneut versuchen</span></button>
      </div>
    </div>
  );
}
