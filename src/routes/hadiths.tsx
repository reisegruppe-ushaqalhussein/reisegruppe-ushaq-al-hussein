import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/hadiths")({
  component: LegacyHadithsRedirect,
});

function LegacyHadithsRedirect() {
  useEffect(() => {
    window.history.replaceState(window.history.state, "", "/#hadiths");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);
  return null;
}
