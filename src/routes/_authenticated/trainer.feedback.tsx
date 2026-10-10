import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/trainer/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — E2E Recruiter Academy" },
      { name: "description", content: "Feedback shared with your trainees." },
      { property: "og:title", content: "Feedback — E2E Recruiter Academy" },
      { property: "og:description", content: "Feedback shared with your trainees." },
    ],
  }),
  component: () => (
    <ModulePlaceholder title="Feedback" description="Feedback shared with your trainees." />
  ),
});
