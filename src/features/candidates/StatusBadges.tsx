import { cn } from "@/lib/utils";
import {
  ACADEMY_STATUS_LABEL,
  ACCOUNT_STATUS_LABEL,
  type AcademyStatus,
  type AccountStatus,
} from "./schema";

const accountCls: Record<AccountStatus, string> = {
  active: "border-success/30 bg-success/10 text-success",
  invited: "border-info/30 bg-info/10 text-info",
  suspended: "border-warning/40 bg-warning/15 text-warning-foreground",
  disabled: "border-destructive/30 bg-destructive/10 text-destructive",
};
const academyCls: Record<AcademyStatus, string> = {
  not_started: "border-border bg-muted text-muted-foreground",
  in_progress: "border-info/30 bg-info/10 text-info",
  completed: "border-success/30 bg-success/10 text-success",
  certified: "border-primary/30 bg-primary/10 text-primary",
};

const base =
  "inline-flex items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium";

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <span className={cn(base, accountCls[status])}>{ACCOUNT_STATUS_LABEL[status]}</span>;
}
export function AcademyStatusBadge({ status }: { status: AcademyStatus }) {
  return <span className={cn(base, academyCls[status])}>{ACADEMY_STATUS_LABEL[status]}</span>;
}
