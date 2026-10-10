import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/manager/performance")({
  head: () => ({
    meta: [
      { title: "Performance — E2E Recruiter Academy" },
      { name: "description", content: "Team performance against targets." },
      { property: "og:title", content: "Performance — E2E Recruiter Academy" },
      { property: "og:description", content: "Team performance against targets." },
    ],
  }),
  component: () => (
    <ModulePlaceholder title="Performance" description="Team performance against targets." />
  ),
});
