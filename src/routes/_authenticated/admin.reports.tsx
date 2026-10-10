import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports — E2E Recruiter Academy" },
      { name: "description", content: "Academy and operations reports." },
      { property: "og:title", content: "Reports — E2E Recruiter Academy" },
      { property: "og:description", content: "Academy and operations reports." },
    ],
  }),
  component: () => (
    <ModulePlaceholder title="Reports" description="Academy and operations reports." />
  ),
});
