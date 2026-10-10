import type { ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NAVIGATION } from "@/config/navigation";
import { ROLE_LABEL, type AppRole } from "@/features/auth/roles";
import type { SessionInfo } from "@/features/auth/session";
import { logActivity } from "@/features/auth/session";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({
  area,
  session,
  children,
}: {
  area: AppRole;
  session: SessionInfo;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sections = NAVIGATION[area];
  const loginPath = area === "candidate" ? "/login" : "/admin/login";

  async function signOut() {
    await logActivity("logout", { role: area }).catch(() => {});
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: loginPath, replace: true });
  }

  const name = session.fullName || session.email || "Signed in";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
              E2E
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">
                E2E Procurement
              </p>
              <p className="truncate text-xs text-sidebar-foreground/70">Recruiter Academy</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {sections.map((s) => (
            <SidebarGroup key={s.label}>
              <SidebarGroupLabel>{s.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {s.items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild tooltip={item.label}>
                        <Link
                          to={item.to}
                          activeOptions={{
                            exact: s.items.some(
                              (o) => o !== item && o.to.startsWith(item.to + "/"),
                            ),
                          }}
                          activeProps={{ "data-active": true } as never}
                        >
                          <item.icon aria-hidden />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          <p className="px-2 pb-2">Internal use only</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-card px-4">
          <SidebarTrigger aria-label="Toggle navigation" />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm font-medium text-muted-foreground">
            {ROLE_LABEL[area]} workspace
          </span>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{name}</p>
              <p className="text-xs text-muted-foreground">
                {session.roles.map((r) => ROLE_LABEL[r]).join(", ")}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="size-4" aria-hidden />{" "}
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
