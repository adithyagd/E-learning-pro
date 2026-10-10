import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/layouts/AppShell";
import { ErrorState, LoadingState } from "@/components/states";
import { supabase } from "@/integrations/supabase/client";
import { QUESTION_TYPE_LABEL } from "@/features/assessments/assessments";

export const Route = createFileRoute("/_authenticated/admin/assessments")({
  head: () => ({
    meta: [
      { title: "Assessments — E2E Recruiter Academy" },
      { name: "description", content: "Assessment configuration and question bank." },
      { property: "og:title", content: "Assessments — E2E Recruiter Academy" },
      { property: "og:description", content: "Assessment configuration and question bank." },
    ],
  }),
  component: AdminAssessments,
});

function AdminAssessments() {
  const [mod, setMod] = useState<string>("");
  const data = useQuery({
    queryKey: ["admin", "assessment-bank"],
    queryFn: async () => {
      const [c, q, m] = await Promise.all([
        supabase.from("assessment_configs").select("*"),
        supabase
          .from("assessment_questions")
          .select(
            "id, code, module_id, scope, question_type, difficulty, question_text, variant_group, status",
          )
          .order("code"),
        supabase.from("academy_modules").select("id, module_number, title").order("module_number"),
      ]);
      if (c.error || q.error || m.error) throw new Error("load");
      return { configs: c.data, questions: q.data, modules: m.data };
    },
  });
  if (data.isPending) return <LoadingState />;
  if (data.isError) return <ErrorState description="Assessments could not be loaded." />;
  const { configs, questions, modules } = data.data;
  const shown = questions.filter((q) =>
    mod === "final" ? q.scope === "final" : !mod || (q.scope === "module" && q.module_id === mod),
  );
  const finalCfg = configs.find((x) => x.scope === "final");
  const finalBank = questions.filter((q) => q.scope === "final" && q.status === "active");

  return (
    <>
      <PageHeader title="Assessments" description="Configuration and question bank (read-only)." />
      <div className="mb-6 overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              {[
                "Assessment",
                "Questions",
                "Time",
                "Pass mark",
                "Easy/Med/Hard",
                "Bank",
                "Status",
              ].map((h) => (
                <th key={h} className="px-4 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => {
              const c = configs.find((x) => x.module_id === m.id);
              const bank = questions.filter(
                (q) => q.scope === "module" && q.module_id === m.id && q.status === "active",
              );
              return (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2">{c?.title ?? `Module ${m.module_number}`}</td>
                  <td className="px-4 py-2">{c?.question_count ?? "—"}</td>
                  <td className="px-4 py-2">{c ? `${c.time_limit_seconds / 60} min` : "—"}</td>
                  <td className="px-4 py-2">{c ? `${c.pass_mark}%` : "—"}</td>
                  <td className="px-4 py-2">
                    {c ? `${c.easy_pct}/${c.medium_pct}/${c.hard_pct}%` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {bank.length} questions · {new Set(bank.map((b) => b.variant_group)).size}{" "}
                    groups
                  </td>
                  <td className="px-4 py-2 capitalize">{c?.status ?? "—"}</td>
                </tr>
              );
            })}
            {finalCfg && (
              <tr className="border-t font-medium">
                <td className="px-4 py-2">Final Assessment</td>
                <td className="px-4 py-2">{finalCfg.question_count}</td>
                <td className="px-4 py-2">{finalCfg.time_limit_seconds / 60} min</td>
                <td className="px-4 py-2">{finalCfg.pass_mark}%</td>
                <td className="px-4 py-2">
                  {finalCfg.easy_pct}/{finalCfg.medium_pct}/{finalCfg.hard_pct}%
                </td>
                <td className="px-4 py-2">
                  {finalBank.length} questions ·{" "}
                  {new Set(finalBank.map((b) => b.variant_group)).size} groups
                </td>
                <td className="px-4 py-2 capitalize">{finalCfg.status}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="mf" className="text-sm">
          Module
        </label>
        <select
          id="mf"
          value={mod}
          onChange={(e) => setMod(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              Module {m.module_number}
            </option>
          ))}
          <option value="final">Final Assessment</option>
        </select>
        <span className="text-sm text-muted-foreground">{shown.length} questions</span>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              {["Code", "Type", "Difficulty", "Status", "Question"].map((h) => (
                <th key={h} className="px-4 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((q) => (
              <tr key={q.id} className="border-t align-top">
                <td className="px-4 py-2 font-mono text-xs">{q.code}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {QUESTION_TYPE_LABEL[q.question_type]}
                </td>
                <td className="px-4 py-2 capitalize">{q.difficulty}</td>
                <td className="px-4 py-2 capitalize">{q.status}</td>
                <td className="px-4 py-2">{q.question_text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
