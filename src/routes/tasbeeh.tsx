import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/tasbeeh")({
  component: LegacySectionRedirect,
});

function LegacySectionRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/", hash: "tasbeeh", replace: true });
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-center" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground" dir="auto">جارٍ فتح السبحة الإلكترونية… | Elektronische Gebetskette wird geöffnet…</p>
    </main>
  );
}
