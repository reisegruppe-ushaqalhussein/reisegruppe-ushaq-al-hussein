import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tasbeeh")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "tasbeeh", replace: true });
  },
  component: () => null,
});
