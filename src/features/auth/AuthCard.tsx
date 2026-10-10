import type { ReactNode } from "react";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,480px)]">
      <aside className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-sm bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            E2E
          </div>
          <span className="text-sm font-semibold text-sidebar-accent-foreground">
            E2E Procurement Pvt Ltd
          </span>
        </div>
        <div className="max-w-md">
          <p className="text-xs font-medium uppercase tracking-widest text-sidebar-primary">
            Recruiter Academy
          </p>
          <p className="mt-3 text-3xl font-semibold leading-tight text-sidebar-accent-foreground">
            Training, certification and recruitment operations in one place.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">
          Internal platform · Authorised personnel only
        </p>
      </aside>
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          <div className="mt-8">{children}</div>
          {footer && (
            <div className="mt-8 border-t pt-4 text-sm text-muted-foreground">{footer}</div>
          )}
        </div>
      </main>
    </div>
  );
}
