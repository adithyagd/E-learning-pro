import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/manager/analytics")({
  head: () => ({
    meta: [
      { title: "Performance Analytics — E2E Recruiter Academy" },
      { name: "description", content: "KPI and performance trends." },
      { property: "og:title", content: "Performance Analytics — E2E Recruiter Academy" },
      { property: "og:description", content: "KPI and performance trends." },
    ],
  }),
  component: () => (
    <ModulePlaceholder title="Performance Analytics" description="KPI and performance trends." />
  ),
});
