import { createFileRoute, notFound } from "@tanstack/react-router";
import { RecruitmentWorkspace } from "@/features/recruitment/Workspace";
import { SECTIONS, isSection } from "@/features/recruitment/recruitment";

export const Route = createFileRoute("/_authenticated/manager/recruitment/$section")({
  beforeLoad: ({ params }) => {
    if (!isSection(params.section)) throw notFound();
  },
  head: ({ params }) => {
    const label = SECTIONS.find((s) => s.key === params.section)?.label ?? "Recruitment";
    const title = `${label} — Recruitment Operations (Manager)`;
    const description = "Recruitment records for the teams you manage.";
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
      area="manager"
      section={section}
      me={session.userId}
      isAdmin={session.roles.includes("admin")}
    />
  );
}
