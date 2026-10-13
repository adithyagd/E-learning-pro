import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { safeRedirect } from "./roles";

const STATUS_NOTICE: Record<string, string> = {
  invited: "Your account has not been activated yet. Please contact your administrator.",
  suspended: "Your account is suspended. Please contact your administrator.",
  disabled: "Your account has been disabled. Please contact your administrator.",
};

type Result =
  | { ok: true; access_token: string; refresh_token: string; redirectTo: string }
  | { ok: false; error: string };

interface Props {
  identifierLabel: string;
  identifierType: "text" | "email";
  identifierRequiredMessage: string;
  redirect: string | undefined;
  status: string | undefined;
  /** Path prefix the redirect target must belong to, so a link cannot send a user into another role's area. */
  allowedRedirectPrefixes: string[];
  submit: (identifier: string, password: string) => Promise<Result>;
}

export function LoginForm(p: Props) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(
    p.status ? (STATUS_NOTICE[p.status] ?? null) : null,
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs: typeof fieldErrors = {};
    const id = identifier.trim();
    if (!id) errs.identifier = p.identifierRequiredMessage;
    else if (p.identifierType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id))
      errs.identifier = "Enter a valid email address.";
    if (!password) errs.password = "Password is required.";
    setFieldErrors(errs);
    setError(null);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const res = await p.submit(id, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const { error: sessErr } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      if (sessErr) {
        setError("Unable to start your session. Please try again.");
        return;
      }
      const target = safeRedirect(p.redirect);
      const ok =
        target &&
        p.allowedRedirectPrefixes.some((pre) => target.startsWith(pre)) &&
        target.startsWith(res.redirectTo.split("/").slice(0, 2).join("/"));
      navigate({ to: ok ? target : res.redirectTo, replace: true });
    } catch {
      // Local development fallback: the secure server sign-in needs cloud-only
      // secrets, so on a local dev server sign in directly with email + password.
      // Area layouts still enforce role and account status; data access is RLS.
      if (import.meta.env.DEV && id.includes("@")) {
        const { error: pwErr } = await supabase.auth.signInWithPassword({ email: id, password });
        if (pwErr) {
          setError("Invalid email or password.");
          return;
        }
        const { data: u } = await supabase.auth.getUser();
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", u.user?.id ?? "");
        const names = (roles ?? []).map((r) => r.role as string);
        const area = names.includes("admin")
          ? "/admin/"
          : names.includes("manager")
            ? "/manager/"
            : names.includes("trainer")
              ? "/trainer/"
              : "/recruiter/";
        if (!p.allowedRedirectPrefixes.includes(area)) {
          await supabase.auth.signOut();
          setError("This account cannot sign in on this portal.");
          return;
        }
        navigate({ to: `${area}dashboard` as never, replace: true });
        return;
      }
      setError(
        import.meta.env.DEV
          ? "Local sign-in: please use your email address instead of the Candidate ID."
          : "Unable to sign in right now. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate aria-busy={busy}>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="identifier">{p.identifierLabel}</Label>
        <Input
          id="identifier"
          type={p.identifierType}
          autoComplete={p.identifierType === "email" ? "email" : "username"}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          aria-invalid={!!fieldErrors.identifier}
          aria-describedby={fieldErrors.identifier ? "identifier-error" : undefined}
          disabled={busy}
        />
        {fieldErrors.identifier && (
          <p id="identifier-error" className="text-xs text-destructive">
            {fieldErrors.identifier}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            to="/forgot-password"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          disabled={busy}
        />
        {fieldErrors.password && (
          <p id="password-error" className="text-xs text-destructive">
            {fieldErrors.password}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden /> Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
