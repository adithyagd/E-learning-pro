import { createFileRoute, notFound } from "@tanstack/react-router";
import { RecruitmentWorkspace } from "@/features/recruitment/Workspace";
import { SECTIONS, isSection } from "@/features/recruitment/recruitment";

export const Route = createFileRoute("/_authenticated/admin/recruitment/$section")({
  beforeLoad: ({ params }) => {
    if (!isSection(params.section)) throw notFound();
  },
  head: ({ params }) => {
    const label = SECTIONS.find((s) => s.key === params.section)?.label ?? "Recruitment";
    const title = `${label} — Recruitment Operations (Admin)`;
    const description = "Organisation-wide job requirements, pipeline, interviews and reports.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: Page,
});

function Page() {
  const { section } = Route.useParams();
  const { session } = Route.useRouteContext();
  if (!isSection(section)) return null;
  return (
    <RecruitmentWorkspace
      area="admin"
      section={section}
      me={session.userId}
      isAdmin={session.roles.includes("admin")}
    />
  );
}
