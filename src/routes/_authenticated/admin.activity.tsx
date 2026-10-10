import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/layouts/AppShell";
import { ActivityList } from "@/features/candidates/ActivityList";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  head: () => ({
    meta: [
      { title: "Candidate Activity — E2E Recruiter Academy" },
      { name: "description", content: "Audit log of candidate management actions." },
      { property: "og:title", content: "Candidate Activity — E2E Recruiter Academy" },
      { property: "og:description", content: "Audit log of candidate management actions." },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        title="Candidate activity"
        description="Account creation, profile changes, status changes, invitations and profile views."
      />
      <ActivityList onlyManagement size={25} />
    </>
  ),
});
