import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/recruiter/progress")({
  head: () => ({
    meta: [
      { title: "Progress — E2E Recruiter Academy" },
      { name: "description", content: "Your academy progress across modules." },
      { property: "og:title", content: "Progress — E2E Recruiter Academy" },
      { property: "og:description", content: "Your academy progress across modules." },
    ],
  }),
  component: () => (
    <ModulePlaceholder title="Progress" description="Your academy progress across modules." />
  ),
});
