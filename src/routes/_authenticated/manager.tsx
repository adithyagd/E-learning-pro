import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/layouts/AppShell";
import { logActivity } from "@/features/auth/session";

export const Route = createFileRoute("/_authenticated/manager")({
  beforeLoad: async ({ context, location }) => {
    if (!context.session.roles.includes("manager")) {
      void logActivity("access_denied", {
        ...(context.session.roles[0] ? { role: context.session.roles[0] } : {}),
        metadata: { path: location.pathname, required: "manager" },
      }).catch(() => {});
      throw redirect({ to: "/unauthorized" });
    }
  },
  component: Layout,
});

function Layout() {
  const { session } = Route.useRouteContext();
  return (
    <AppShell area="manager" session={session}>
      <Outlet />
    </AppShell>
  );
}
