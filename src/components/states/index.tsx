import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FileQuestion, Inbox, Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function StateFrame({
  icon,
  title,
  description,
  action,
  tone = "muted",
}: {
  icon: ReactNode;
  title: string;
  description?: string | undefined;
  action?: ReactNode;
  tone?: "muted" | "destructive" | "success";
}) {
  const toneCls =
    tone === "destructive"
      ? "text-destructive"
      : tone === "success"
        ? "text-success"
        : "text-muted-foreground";
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed bg-card px-6 py-12 text-center">
      <div className={toneCls} aria-hidden>
        {icon}
      </div>
      <h2 className="mt-3 text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function EmptyState(p: { title: string; description?: string; action?: ReactNode }) {
  return <StateFrame icon={<Inbox className="size-8" />} {...p} />;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <StateFrame
      tone="destructive"
      icon={<AlertTriangle className="size-8" />}
      title={title}
      description={description}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}

export function SuccessState(p: { title: string; description?: string; action?: ReactNode }) {
  return <StateFrame tone="success" icon={<CheckCircle2 className="size-8" />} {...p} />;
}

export function PermissionDenied({
  description = "You do not have permission to view this page.",
}: {
  description?: string;
}) {
  return (
    <StateFrame
      icon={<ShieldOff className="size-8" />}
      title="Access denied"
      description={description}
      action={
        <Button asChild variant="outline">
          <Link to="/">Return to portal</Link>
        </Button>
      }
    />
  );
}

export function NotFoundState() {
  return (
    <StateFrame
      icon={<FileQuestion className="size-8" />}
      title="Page not found"
      description="The page you requested does not exist or has moved."
      action={
        <Button asChild variant="outline">
          <Link to="/">Return to portal</Link>
        </Button>
      }
    />
  );
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string | undefined;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
