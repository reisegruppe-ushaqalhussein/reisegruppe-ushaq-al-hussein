import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/qibla")({
  component: LegacySectionRedirect,
});

function LegacySectionRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/", hash: "qibla", replace: true });
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-center" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground" dir="auto">جارٍ فتح اتجاه القبلة… | Qibla-Richtung wird geöffnet…</p>
    </main>
  );
}
