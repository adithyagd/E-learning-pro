import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — E2E Recruiter Academy" },
      { name: "description", content: "Platform overview." },
      { property: "og:title", content: "Admin Dashboard — E2E Recruiter Academy" },
      { property: "og:description", content: "Platform overview." },
    ],
  }),
  component: () => <ModulePlaceholder title="Admin Dashboard" description="Platform overview." />,
});
