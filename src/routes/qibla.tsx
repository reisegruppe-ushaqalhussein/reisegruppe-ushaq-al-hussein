import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/qibla")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "qibla", replace: true });
  },
});
