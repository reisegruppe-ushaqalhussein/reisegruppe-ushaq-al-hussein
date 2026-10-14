/** The only service-worker registrar. Refuses in dev, preview and iframes. */
export async function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const h = location.hostname;
  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    h.startsWith("id-preview--") || h.startsWith("preview--") ||
    h === "lovableproject.com" || h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev") ||
    new URLSearchParams(location.search).get("sw") === "off";
  if (refused) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  // New versions activate immediately (skipWaiting); check again whenever the
  // installed app returns to the foreground, since Android keeps it alive.
  registerSW({
    immediate: true,
    onRegisteredSW: (_url, reg) => {
      if (!reg) return;
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
    },
  });
}
