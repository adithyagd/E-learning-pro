import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/recruiter/operations/")({
  beforeLoad: () => {
    throw redirect({ to: "/recruiter/operations/$section", params: { section: "dashboard" } });
  },
});
