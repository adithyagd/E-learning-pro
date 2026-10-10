import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AuthCard } from "@/features/auth/AuthCard";
import { LoginForm } from "@/features/auth/LoginForm";
import { recruiterSignIn } from "@/features/auth/auth.functions";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional(), status: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Recruiter Sign In — E2E Recruiter Academy" },
      {
        name: "description",
        content:
          "Sign in to the E2E Procurement Recruiter Academy with your Candidate ID or email.",
      },
      { property: "og:title", content: "Recruiter Sign In — E2E Recruiter Academy" },
      {
        property: "og:description",
        content: "Sign in with your Candidate/Employee ID or registered email.",
      },
    ],
  }),
  component: RecruiterLogin,
});

function RecruiterLogin() {
  const { redirect, status } = Route.useSearch();
  const signIn = useServerFn(recruiterSignIn);
  return (
    <AuthCard
      eyebrow="Recruiter portal"
      title="Sign in"
      description="Accounts are issued by your administrator."
      footer={
        <>
          Staff member?{" "}
          <Link
            to="/admin/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Admin sign in
          </Link>
        </>
      }
    >
      <LoginForm
        identifierLabel="Candidate/Employee ID or email"
        identifierType="text"
        identifierRequiredMessage="Enter your Candidate/Employee ID or registered email."
        redirect={redirect}
        status={status}
        allowedRedirectPrefixes={["/recruiter/"]}
        submit={(identifier, password) => signIn({ data: { identifier, password } })}
      />
    </AuthCard>
  );
}
