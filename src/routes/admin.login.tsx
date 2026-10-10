import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AuthCard } from "@/features/auth/AuthCard";
import { LoginForm } from "@/features/auth/LoginForm";
import { staffSignIn } from "@/features/auth/auth.functions";

export const Route = createFileRoute("/admin/login")({
  validateSearch: z.object({ redirect: z.string().optional(), status: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Admin Sign In — E2E Recruiter Academy" },
      { name: "description", content: "Staff sign-in for the E2E Recruiter Academy." },
      { property: "og:title", content: "Admin Sign In — E2E Recruiter Academy" },
      { property: "og:description", content: "Staff sign-in for platform administration." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const { redirect, status } = Route.useSearch();
  const signIn = useServerFn(staffSignIn);
  return (
    <AuthCard
      eyebrow="Administration"
      title="Admin sign in"
      description="For authorized administrators only."
      footer={
        <>
          Recruiter / Candidate?{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <LoginForm
        identifierLabel="Admin email"
        identifierType="email"
        identifierRequiredMessage="Email is required."
        redirect={redirect}
        status={status}
        allowedRedirectPrefixes={["/admin/", "/trainer/", "/manager/"]}
        submit={(email, password) => signIn({ data: { email, password } })}
      />
    </AuthCard>
  );
}
