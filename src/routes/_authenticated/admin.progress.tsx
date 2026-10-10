import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/admin/progress")({
  head: () => ({
    meta: [
      { title: "Progress — E2E Recruiter Academy" },
      { name: "description", content: "Academy progress across candidates." },
      { property: "og:title", content: "Progress — E2E Recruiter Academy" },
      { property: "og:description", content: "Academy progress across candidates." },
    ],
  }),
  component: () => (
    <ModulePlaceholder title="Progress" description="Academy progress across candidates." />
  ),
});
