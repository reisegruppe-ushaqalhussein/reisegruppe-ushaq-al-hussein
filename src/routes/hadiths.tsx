import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hadiths")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "hadiths", replace: true });
  },
  component: () => null,
});
