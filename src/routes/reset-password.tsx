import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthCard } from "@/features/auth/AuthCard";
import { SuccessState } from "@/components/states";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/features/auth/session";
import { completeInvitation } from "@/features/candidates/candidates.functions";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set Your Password — E2E Recruiter Academy" },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: "Set New Password — E2E Recruiter Academy" },
      { property: "og:description", content: "Choose a new password for your account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  // An expired/used link arrives with error params; a valid one creates a session from the link.
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.hash.replace(/^#/, "") || window.location.search,
    );
    if (params.get("error") || params.get("error_code")) {
      setLinkInvalid(true);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) setLinkInvalid(true);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) return setError("This link is invalid or has expired.");
    await logActivity("password_changed").catch(() => {});
    await completeInvitation().catch(() => {});
    await supabase.auth.signOut();
    setDone(true);
  }

  if (linkInvalid && !done)
    return (
      <AuthCard eyebrow="Account setup" title="Link invalid or expired">
        <Alert variant="destructive">
          <AlertDescription>
            This invitation or reset link is invalid, already used, or has expired. Please ask
            your administrator to resend your invitation, or request a new reset link.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link to="/forgot-password">Request a new reset link</Link>
        </Button>
      </AuthCard>
    );

  return (
    <AuthCard eyebrow="Account recovery" title="Set a new password">
      {done ? (
        <SuccessState
          title="Password updated"
          description="You can now sign in with your new password."
          action={
            <Button asChild>
              <Link to="/login">Go to sign in</Link>
            </Button>
          }
        />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pw">New password</Label>
            <PasswordInput
              id="pw"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">Confirm password</Label>
            <PasswordInput
              id="pw2"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full">
            Update password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
