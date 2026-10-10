import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthCard } from "@/features/auth/AuthCard";
import { verifyCertificate } from "@/features/certificates/certificates.functions";

export const Route = createFileRoute("/verify/$certificateId")({
  loader: ({ params }) => verifyCertificate({ data: { number: params.certificateId } }),
  head: () => ({
    meta: [
      { title: "Certificate Verification — E2E Procurement Pvt Ltd" },
      { name: "description", content: "Verify an E2E Recruiter Academy certificate." },
      { property: "og:title", content: "Certificate Verification — E2E Procurement" },
      { property: "og:description", content: "Check whether an Academy certificate is valid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const r = Route.useLoaderData();
  return (
    <AuthCard eyebrow="Certificate verification" title={r ? r.certificate_number : "Not found"}>
      {!r ? (
        <p className="text-sm text-muted-foreground">
          No issued certificate matches this ID. Check the ID and try again.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <p
            className={`flex items-center gap-2 font-semibold ${r.status === "valid" ? "text-success" : "text-destructive"}`}
          >
            {r.status === "valid" ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <XCircle className="size-5" />
            )}
            {r.status === "valid" ? "Valid certificate" : "Revoked — not valid"}
          </p>
          <p>
            <span className="text-muted-foreground">Name: </span>
            {r.candidate_name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Program: </span>
            {r.program}
          </p>
          <p>
            <span className="text-muted-foreground">Issue date: </span>
            {new Date(r.issued_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </p>
        </div>
      )}
      <Link to="/" className="mt-6 block text-sm underline">
        Return to portal
      </Link>
    </AuthCard>
  );
}
