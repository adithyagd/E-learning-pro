import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — E2E Recruiter Academy" },
      { name: "description", content: "Platform configuration." },
      { property: "og:title", content: "Settings — E2E Recruiter Academy" },
      { property: "og:description", content: "Platform configuration." },
    ],
  }),
  component: () => <ModulePlaceholder title="Settings" description="Platform configuration." />,
});
