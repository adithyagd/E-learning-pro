import { createFileRoute } from "@tanstack/react-router";
import { PermissionDenied } from "@/components/states";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Access Denied — E2E Recruiter Academy" },
      { name: "description", content: "You do not have permission to view this area." },
      { property: "og:title", content: "Access Denied — E2E Recruiter Academy" },
      { property: "og:description", content: "You do not have permission to view this area." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <div className="w-full">
        <PermissionDenied />
      </div>
    </div>
  ),
});
