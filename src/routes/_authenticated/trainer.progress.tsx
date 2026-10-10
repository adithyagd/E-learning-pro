import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/trainer/progress")({
  head: () => ({
    meta: [
      { title: "Progress — E2E Recruiter Academy" },
      { name: "description", content: "Learning progress of your trainees." },
      { property: "og:title", content: "Progress — E2E Recruiter Academy" },
      { property: "og:description", content: "Learning progress of your trainees." },
    ],
  }),
  component: () => (
    <ModulePlaceholder title="Progress" description="Learning progress of your trainees." />
  ),
});
