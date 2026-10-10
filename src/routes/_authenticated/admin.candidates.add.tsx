import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/layouts/AppShell";
import { CandidateForm, EMPTY_CANDIDATE } from "@/features/candidates/CandidateForm";
import { createCandidate } from "@/features/candidates/candidates.functions";

export const Route = createFileRoute("/_authenticated/admin/candidates/add")({
  head: () => ({
    meta: [
      { title: "Add Candidate — E2E Recruiter Academy" },
      { name: "description", content: "Create a new candidate account and send an invitation." },
      { property: "og:title", content: "Add Candidate — E2E Recruiter Academy" },
      { property: "og:description", content: "Create a new candidate account." },
    ],
  }),
  component: AddCandidate,
});

function AddCandidate() {
  const create = useServerFn(createCandidate);
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <>
      <PageHeader
        title="Add candidate"
        description="The candidate receives an email invitation to set their own password. No password is created or shown here."
      />
      <div className="max-w-3xl">
        <CandidateForm
          mode="create"
          initial={EMPTY_CANDIDATE}
          submitLabel="Create account & send invitation"
          onCancel={() => navigate({ to: "/admin/candidates" })}
          onSubmit={async (v) => {
            const res = await create({
              data: {
                ...v,
                accountStatus: v.accountStatus as never,
                academyStatus: v.academyStatus as never,
                redirectOrigin: window.location.origin,
              },
            });
            if (!res.ok) return res;
            await qc.invalidateQueries({ queryKey: ["candidates"] });
            toast.success("Candidate created", {
              description: `Invitation email sent to ${v.email.trim().toLowerCase()}.`,
            });
            void navigate({
              to: "/admin/candidates/$candidateId",
              params: { candidateId: res.userId! },
            });
            return { ok: true };
          }}
        />
      </div>
    </>
  );
}
