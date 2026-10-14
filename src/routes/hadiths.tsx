import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/hadiths")({
  component: LegacyHadithsRedirect,
});

function LegacyHadithsRedirect() {
  useEffect(() => {
    window.location.replace("/#hadiths");
  }, []);
  return <main className="p-6 text-center" role="status">جارٍ فتح الأحاديث والروايات… | Hadithe und Überlieferungen werden geöffnet…</main>;
}
