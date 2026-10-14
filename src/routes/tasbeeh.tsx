import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/tasbeeh")({
  component: LegacyTasbeehRedirect,
});

function LegacyTasbeehRedirect() {
  useEffect(() => {
    window.history.replaceState(window.history.state, "", "/#tasbeeh");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);
  return null;
}
