import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/layouts/AppShell";
import { ErrorState, LoadingState } from "@/components/states";
import { overviewQuery } from "@/features/academy/academy";
import { finalOverviewQuery } from "@/features/assessments/assessments";
import { fmtDate, myCertificateQuery } from "@/features/certificates/certificates";
import { getCertificateDownload } from "@/features/certificates/certificates.functions";
import { CertStatusBadge } from "./admin.certificates.index";

export const Route = createFileRoute("/_authenticated/recruiter/certificate")({
  head: () => ({
    meta: [
      { title: "Certificate — E2E Recruiter Academy" },
      { name: "description", content: "Your certification status and certificate download." },
      { property: "og:title", content: "Certificate — E2E Recruiter Academy" },
      { property: "og:description", content: "Certification status and download." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CertificatePage,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t py-3 text-sm first:border-t-0 sm:flex-row sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function CertificatePage() {
  const { session } = Route.useRouteContext();
  const modules = useQuery(overviewQuery(session.userId));
  const final = useQuery(finalOverviewQuery(session.userId));
  const cert = useQuery(myCertificateQuery(session.userId));
  const download = useServerFn(getCertificateDownload);

  if (modules.isPending || final.isPending || cert.isPending) return <LoadingState />;
  if (modules.isError || final.isError || cert.isError)
    return <ErrorState description="Certificate status could not be loaded." />;

  const mods = modules.data;
  const incomplete = mods.filter((m) => m.state !== "completed");
  const c = cert.data;
  const passed = !!final.data.passed;
  const status = c?.status ?? "not_eligible";

  let message: React.ReactNode;
  if (!c) {
    message = incomplete.length ? (
      <>
        Complete the remaining modules (and pass each module assessment):{" "}
        {incomplete.map((m) => `Module ${m.module_number}`).join(", ")}. Then pass the{" "}
        <Link to="/recruiter/final-assessment" className="underline">
          Final Assessment
        </Link>
        .
      </>
    ) : (
      <>
        All modules are complete. Pass the{" "}
        <Link to="/recruiter/final-assessment" className="underline">
          Final Assessment
        </Link>{" "}
        with at least 70% to request your certificate.
      </>
    );
  } else if (status === "pending_approval") message = "Certificate Pending Admin Approval.";
  else if (status === "approved") message = "Approved — your certificate is being prepared.";
  else if (status === "rejected")
    message = `Your request was not approved. Reason: ${c.rejection_reason ?? "—"}. An administrator may review it again.`;
  else if (status === "revoked")
    message = `This certificate has been revoked and is no longer valid. Reason: ${c.revocation_reason ?? "—"}.`;
  else message = "Your certificate has been issued.";

  return (
    <>
      <PageHeader title="Certificate" description="Recruitment Operations Training certification" />
      <section className="max-w-3xl rounded-md border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Certification status</h2>
          <CertStatusBadge status={status} />
        </div>
        <p className="mb-4 text-sm">{message}</p>
        <Row
          label="Training completion"
          value={`${mods.length - incomplete.length} of ${mods.length} modules completed`}
        />
        <Row label="Final Assessment" value={passed ? "Passed" : "Not yet passed"} />
        <Row label="Certificate eligibility" value={c ? "Eligible" : "Not eligible"} />
        {c?.issued_at && (
          <>
            <Row label="Certificate ID" value={c.certificate_number} />
            <Row label="Issue date" value={fmtDate(c.issued_at)} />
          </>
        )}
        {status === "issued" && c && (
          <Button
            className="mt-4"
            onClick={async () => {
              const res = await download({ data: { certificateId: c.id } });
              if (res.ok) window.location.assign(res.url);
              else toast.error(res.error);
            }}
          >
            <Download className="size-4" /> Download Certificate
          </Button>
        )}
      </section>
    </>
  );
}
