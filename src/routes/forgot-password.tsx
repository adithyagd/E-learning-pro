import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/features/auth/AuthCard";
import { SuccessState } from "@/components/states";
import { requestPasswordReset } from "@/features/auth/auth.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — E2E Recruiter Academy" },
      {
        name: "description",
        content: "Request a password reset link for your E2E Recruiter Academy account.",
      },
      { property: "og:title", content: "Reset Password — E2E Recruiter Academy" },
      { property: "og:description", content: "Request a password reset link." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const reset = useServerFn(requestPasswordReset);
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setFieldError("Enter a valid email address.");
    setFieldError(null);
    setBusy(true);
    try {
      await reset({ data: { email: v, redirectTo: window.location.origin } });
    } catch {
      // Same outcome shown regardless, to avoid revealing which emails exist.
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Forgot password"
      description="Enter your registered email and we'll send reset instructions."
      footer={
        <span className="flex gap-4">
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Recruiter sign in
          </Link>
          <Link
            to="/admin/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Staff sign in
          </Link>
        </span>
      }
    >
      {sent ? (
        <SuccessState
          title="Check your inbox"
          description="If an account exists for this email, password reset instructions have been sent."
        />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate aria-busy={busy}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Registered email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              disabled={busy}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? "email-error" : undefined}
              onChange={(e) => setEmail(e.target.value)}
            />
            {fieldError && (
              <p id="email-error" className="text-xs text-destructive">
                {fieldError}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Sending…
              </>
            ) : (
              "Send reset instructions"
            )}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
