import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import { AuthCard } from "@/features/auth/AuthCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "E2E Recruiter Academy — E2E Procurement Pvt Ltd" },
      {
        name: "description",
        content:
          "Internal platform for recruiter training, certification and recruitment operations.",
      },
      { property: "og:title", content: "E2E Recruiter Academy — E2E Procurement Pvt Ltd" },
      {
        property: "og:description",
        content: "Recruiter training, certification and recruitment operations.",
      },
    ],
  }),
  component: Portal,
});

function Portal() {
  const entries = [
    {
      to: "/login",
      icon: UserRound,
      title: "Recruiter",
      desc: "Academy, assessments and certification",
    },
    {
      to: "/admin/login",
      icon: ShieldCheck,
      title: "Staff",
      desc: "Administrators, trainers and managers",
    },
  ] as const;
  return (
    <AuthCard
      eyebrow="Welcome"
      title="Choose your portal"
      description="Sign in with the account issued by E2E Procurement."
    >
      <nav className="space-y-3" aria-label="Sign-in options">
        {entries.map((e) => (
          <Link
            key={e.to}
            to={e.to}
            className="group flex items-center gap-4 rounded-md border bg-card p-4 transition-colors hover:border-primary hover:bg-accent"
          >
            <e.icon className="size-5 text-primary" aria-hidden />
            <span className="flex-1">
              <span className="block text-sm font-semibold">{e.title} sign in</span>
              <span className="block text-xs text-muted-foreground">{e.desc}</span>
            </span>
            <ArrowRight
              className="size-4 text-muted-foreground group-hover:text-primary"
              aria-hidden
            />
          </Link>
        ))}
      </nav>
    </AuthCard>
  );
}
