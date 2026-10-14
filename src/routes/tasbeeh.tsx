import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/tasbeeh")({
  component: LegacyTasbeehRedirect,
});

function LegacyTasbeehRedirect() {
  useEffect(() => {
    window.location.replace("/#tasbeeh");
  }, []);
  return <main className="p-6 text-center" role="status">جارٍ فتح السبحة الإلكترونية… | Elektronische Gebetskette wird geöffnet…</main>;
}
