import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadSessionInfo } from "@/features/auth/session";
import { supabase } from "@/integrations/supabase/client";

const STAFF_PREFIXES = ["/admin", "/trainer", "/manager"];

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const loginPath = STAFF_PREFIXES.some((p) => location.pathname.startsWith(p))
      ? "/admin/login"
      : "/login";
    const session = await loadSessionInfo();
    if (!session) {
      throw redirect({ to: loginPath, search: { redirect: location.href } });
    }
    if (session.accountStatus !== "active") {
      await supabase.auth.signOut();
      throw redirect({ to: loginPath, search: { status: session.accountStatus } });
    }
    return { session };
  },
  component: Outlet,
});
