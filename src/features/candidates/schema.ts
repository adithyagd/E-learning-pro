import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type AccountStatus = Database["public"]["Enums"]["account_status"];
export type AcademyStatus = Database["public"]["Enums"]["academy_status"];
export type CandidateRow = Database["public"]["Views"]["candidate_directory"]["Row"];

export const ACCOUNT_STATUSES: AccountStatus[] = ["invited", "active", "suspended", "disabled"];
export const ACADEMY_STATUSES: AcademyStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "certified",
];

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  invited: "Invited",
  active: "Active",
  suspended: "Suspended",
  disabled: "Disabled",
};
export const ACADEMY_STATUS_LABEL: Record<AcademyStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  certified: "Certified",
};

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** Phone: digits with optional +, spaces, dashes, parentheses; 7–15 digits. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s\-()]{7,20}$/, "Enter a valid phone number.")
  .refine((v) => {
    const d = v.replace(/\D/g, "").length;
    return d >= 7 && d <= 15;
  }, "Enter a valid phone number.");

export const candidateFields = z.object({
  fullName: z.string().trim().min(2, "Candidate name is required.").max(120),
  candidateId: z
    .string()
    .trim()
    .min(2, "Candidate ID is required.")
    .max(40)
    .regex(/^[A-Za-z0-9][A-Za-z0-9\-_/]*$/, "Use letters, numbers, - _ or / only."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(255),
  phone: phoneSchema,
  location: z.string().trim().min(2, "Location is required.").max(120),
  hrEmployeeId: optText(40),
  joiningDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  department: optText(120),
  designation: optText(120),
  academyStatus: z.enum(["not_started", "in_progress", "completed", "certified"]),
});

export const createCandidateSchema = candidateFields.extend({
  accountStatus: z.enum(["invited", "active", "suspended", "disabled"]),
  redirectOrigin: z.string().url().max(500),
});
export type CreateCandidateInput = z.input<typeof createCandidateSchema>;

export const updateCandidateSchema = candidateFields
  .omit({ email: true })
  .extend({ userId: z.string().uuid() });
export type UpdateCandidateInput = z.input<typeof updateCandidateSchema>;

export const statusActionSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["activate", "suspend", "disable", "reenable"]),
});
export type StatusAction = z.infer<typeof statusActionSchema>["action"];
