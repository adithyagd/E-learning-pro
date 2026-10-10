import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CONTENT_TYPE_LABEL } from "@/features/academy/academy";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/modules")({
  head: () => ({
    meta: [
      { title: "Academy Modules — E2E Recruiter Academy" },
      { name: "description", content: "Academy module and lesson configuration." },
      { property: "og:title", content: "Academy Modules — E2E Recruiter Academy" },
      { property: "og:description", content: "Academy module and lesson configuration." },
    ],
  }),
  component: AdminModules,
});

function AdminModules() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_modules")
        .select(
          "*, lessons(id, status, title, content_type, estimated_minutes, is_required, sort_order)",
        )
        .order("sort_order");
      if (error) throw new Error("Unable to load modules.");
      return data ?? [];
    },
  });

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase
      .from("academy_modules")
      .update({ status: active ? "active" : "inactive" })
      .eq("id", id);
    if (error) {
      toast.error("Module status could not be updated.");
      return;
    }
    toast.success(active ? "Module activated" : "Module deactivated");
    await qc.invalidateQueries({ queryKey: ["admin", "modules"] });
    await qc.invalidateQueries({ queryKey: ["academy"] });
  }

  return (
    <>
      <PageHeader
        title="Academy"
        description="Module structure and order. Lesson authoring is added with each module's content."
      />
      {q.isPending ? (
        <LoadingState label="Loading modules…" />
      ) : q.isError ? (
        <ErrorState description="Modules could not be loaded." onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title="No modules configured" />
      ) : (
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead className="hidden md:table-cell">Lessons</TableHead>
                  <TableHead className="hidden md:table-cell">Objectives</TableHead>
                  <TableHead className="hidden lg:table-cell">Assessment</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.map((m) => {
                  const active = m.lessons.filter((l) => l.status === "active").length;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="tabular-nums">{m.module_number}</TableCell>
                      <TableCell>
                        <p className="font-medium">{m.title}</p>
                        <p className="max-w-md text-xs text-muted-foreground">{m.description}</p>
                        {m.lessons.length > 0 && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer font-medium text-primary">
                              View lessons ({m.lessons.length})
                            </summary>
                            <ol className="mt-2 space-y-1">
                              {[...m.lessons]
                                .sort((a, b) => a.sort_order - b.sort_order)
                                .map((l) => (
                                  <li key={l.id} className="text-muted-foreground">
                                    <span className="text-foreground">
                                      {l.sort_order}. {l.title}
                                    </span>{" "}
                                    · {CONTENT_TYPE_LABEL[l.content_type]}
                                    {l.estimated_minutes ? ` · ${l.estimated_minutes} min` : ""}
                                    {l.is_required ? " · Required" : " · Optional"}
                                    {l.status === "active" ? "" : " · Inactive"}
                                  </li>
                                ))}
                            </ol>
                          </details>
                        )}
                      </TableCell>
                      <TableCell className="hidden tabular-nums md:table-cell">
                        {active
                          ? `${active} lessons · ${m.lessons.filter((l) => l.status === "active" && l.is_required).length} required`
                          : "None yet"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {m.learning_objectives.length || "—"}
                      </TableCell>
                      <TableCell className="hidden text-xs lg:table-cell">
                        {m.requires_assessment ? `Required · pass ${m.pass_mark}%` : "Not required"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={m.status === "active"}
                          onCheckedChange={(v) => void toggle(m.id, v)}
                          aria-label={`Module ${m.module_number} active`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="border-t px-4 py-3 text-xs text-muted-foreground">
            Module unlocking is sequential. Each module requires all required lessons and a passed
            module assessment (pass mark 70%) before the next opens. The Final Assessment opens
            after all five modules are completed.
          </p>
        </div>
      )}
    </>
  );
}
