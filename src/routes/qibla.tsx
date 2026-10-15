import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/qibla")({
  component: LegacyQiblaRedirect,
});

function LegacyQiblaRedirect() {
  useEffect(() => {
    window.history.replaceState(window.history.state, "", "/#qibla");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);
  return null;
}
