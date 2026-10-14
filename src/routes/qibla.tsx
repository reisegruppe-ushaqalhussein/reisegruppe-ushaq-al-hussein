import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/qibla")({
  component: LegacyQiblaRedirect,
});

function LegacyQiblaRedirect() {
  useEffect(() => {
    window.location.replace("/#qibla");
  }, []);
  return <main className="p-6 text-center" role="status">جارٍ فتح اتجاه القبلة… | Qibla-Kompass wird geöffnet…</main>;
}
