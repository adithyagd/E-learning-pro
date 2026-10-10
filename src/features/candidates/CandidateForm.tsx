import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACADEMY_STATUSES,
  ACADEMY_STATUS_LABEL,
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_LABEL,
  candidateFields,
} from "./schema";

export interface CandidateFormValues {
  fullName: string;
  candidateId: string;
  email: string;
  phone: string;
  location: string;
  hrEmployeeId: string;
  joiningDate: string;
  department: string;
  designation: string;
  accountStatus: string;
  academyStatus: string;
}

export const EMPTY_CANDIDATE: CandidateFormValues = {
  fullName: "",
  candidateId: "",
  email: "",
  phone: "",
  location: "",
  hrEmployeeId: "",
  joiningDate: "",
  department: "",
  designation: "",
  accountStatus: "invited",
  academyStatus: "not_started",
};

type SubmitResult = { ok: true } | { ok: false; error: string; field?: string };

export function CandidateForm({
  initial,
  mode,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: CandidateFormValues;
  mode: "create" | "edit";
  onSubmit: (v: CandidateFormValues) => Promise<SubmitResult>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof CandidateFormValues) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const schema = mode === "edit" ? candidateFields.omit({ email: true }) : candidateFields;
    const parsed = schema.safeParse(v);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const k = String(i.path[0]);
        errs[k] ??= i.message === "Invalid" ? "Invalid value." : i.message;
      }
      if (errs["joiningDate"]) errs["joiningDate"] = "Enter a valid date.";
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await onSubmit(v);
      if (!res.ok) {
        if (res.field) setErrors({ [res.field]: res.error });
        else setFormError(res.error);
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = (
    k: keyof CandidateFormValues,
    label: string,
    opts: {
      required?: boolean;
      type?: string;
      disabled?: boolean;
      autoComplete?: string;
      hint?: string;
    } = {},
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>
        {label}
        {opts.required && (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        )}
      </Label>
      <Input
        id={k}
        type={opts.type ?? "text"}
        value={v[k]}
        onChange={(e) => set(k)(e.target.value)}
        disabled={busy || opts.disabled}
        autoComplete={opts.autoComplete ?? "off"}
        aria-required={opts.required}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `${k}-error` : opts.hint ? `${k}-hint` : undefined}
      />
      {errors[k] ? (
        <p id={`${k}-error`} className="text-xs text-destructive">
          {errors[k]}
        </p>
      ) : opts.hint ? (
        <p id={`${k}-hint`} className="text-xs text-muted-foreground">
          {opts.hint}
        </p>
      ) : null}
    </div>
  );

  const select = (
    k: "accountStatus" | "academyStatus",
    label: string,
    options: readonly string[],
    labels: Record<string, string>,
    disabled = false,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Select value={v[k]} onValueChange={set(k)} disabled={busy || disabled}>
        <SelectTrigger id={k}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {labels[o]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-6" aria-busy={busy}>
      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <Section
        title="Candidate details"
        description="Required information for the candidate account."
      >
        {field("fullName", "Candidate name", { required: true })}
        {field("candidateId", "Candidate ID", {
          required: true,
          hint: "Unique. Used by the candidate to sign in.",
        })}
        {field("email", "Email", {
          required: true,
          type: "email",
          disabled: mode === "edit",
          hint:
            mode === "edit"
              ? "Email is the sign-in identity and cannot be changed here."
              : "The invitation is sent to this address.",
        })}
        {field("phone", "Phone", { required: true, type: "tel" })}
        {field("location", "Location", { required: true })}
      </Section>
      <Section title="Administrative" description="Optional organisational details.">
        {field("hrEmployeeId", "Employee ID", { hint: "Optional. Must be unique if provided." })}
        {field("joiningDate", "Joining date", { type: "date" })}
        {field("department", "Department")}
        {field("designation", "Designation")}
      </Section>
      <Section title="Account configuration">
        {mode === "create" ? (
          select("accountStatus", "Account status", ACCOUNT_STATUSES, ACCOUNT_STATUS_LABEL)
        ) : (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Account status is changed with the status actions on the candidate profile.
          </p>
        )}
        {select("academyStatus", "Academy status", ACADEMY_STATUSES, ACADEMY_STATUS_LABEL)}
      </Section>
      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-md border bg-card p-4 sm:p-5">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {description && <p className="mb-4 text-xs text-muted-foreground">{description}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
