import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/certificates/issued")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/certificates", search: { status: "issued" } });
  },
});
