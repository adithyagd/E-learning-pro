import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { TablePagination } from "@/components/data/TablePagination";
import { PerformanceBadge } from "@/components/performance/PerformanceBadge";
import { AccountStatusBadge, AcademyStatusBadge } from "@/features/candidates/StatusBadges";
import {
  candidateListQuery,
  formatDate,
  PAGE_SIZES,
  SORT_FIELDS,
  type SortField,
} from "@/features/candidates/queries";
import {
  ACADEMY_STATUSES,
  ACADEMY_STATUS_LABEL,
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_LABEL,
} from "@/features/candidates/schema";

const search = z.object({
  q: z.string().max(100).optional().catch(undefined),
  account: z.enum(["invited", "active", "suspended", "disabled"]).optional().catch(undefined),
  academy: z
    .enum(["not_started", "in_progress", "completed", "certified"])
    .optional()
    .catch(undefined),
  sort: z.enum(SORT_FIELDS).optional().catch(undefined),
  dir: z.enum(["asc", "desc"]).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
  size: z.number().int().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/admin/candidates/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Candidates — E2E Recruiter Academy" },
      { name: "description", content: "All candidate accounts." },
      { property: "og:title", content: "Candidates — E2E Recruiter Academy" },
      { property: "og:description", content: "All candidate accounts." },
    ],
  }),
  component: CandidatesPage,
});

const ALL = "all";

function CandidatesPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const params = {
    q: s.q,
    account: s.account,
    academy: s.academy,
    sort: (s.sort ?? "created_at") as SortField,
    dir: s.dir ?? "desc",
    page: s.page ?? 1,
    size: PAGE_SIZES.includes(s.size as never) ? (s.size as number) : 10,
  };
  const query = useQuery(candidateListQuery(params));
  const [term, setTerm] = useState(s.q ?? "");

  // Debounced search → URL
  useEffect(() => {
    const t = setTimeout(() => {
      if ((s.q ?? "") !== term)
        void navigate({
          search: (p) => ({ ...p, q: term || undefined, page: undefined }),
          replace: true,
        });
    }, 300);
    return () => clearTimeout(t);
  }, [term]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<z.infer<typeof search>>) =>
    navigate({ search: (p) => ({ ...p, page: undefined, ...patch }) });
  const hasFilters = !!(s.q || s.account || s.academy);
  const toggleSort = (f: SortField) =>
    update({ sort: f, dir: params.sort === f && params.dir === "asc" ? "desc" : "asc" });

  const SortHead = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: string;
    className?: string;
  }) => {
    const active = params.sort === field;
    const Icon = !active ? ArrowUpDown : params.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead
        className={className}
        aria-sort={active ? (params.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className="inline-flex items-center gap-1 font-medium hover:text-foreground"
        >
          {children} <Icon className="size-3" aria-hidden />
        </button>
      </TableHead>
    );
  };

  return (
    <>
      <PageHeader
        title="Candidates"
        description="Manage candidate accounts, status and academy enrolment."
        actions={
          <Button asChild>
            <Link to="/admin/candidates/add">
              <Plus className="size-4" aria-hidden /> Add candidate
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search name, Candidate ID, Employee ID, email or phone"
            className="pl-8"
            aria-label="Search candidates"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select
            value={s.account ?? ALL}
            onValueChange={(v) => update({ account: v === ALL ? undefined : (v as never) })}
          >
            <SelectTrigger className="sm:w-[170px]" aria-label="Filter by account status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All account statuses</SelectItem>
              {ACCOUNT_STATUSES.map((a) => (
                <SelectItem key={a} value={a}>
                  {ACCOUNT_STATUS_LABEL[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={s.academy ?? ALL}
            onValueChange={(v) => update({ academy: v === ALL ? undefined : (v as never) })}
          >
            <SelectTrigger className="sm:w-[170px]" aria-label="Filter by academy status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All academy statuses</SelectItem>
              {ACADEMY_STATUSES.map((a) => (
                <SelectItem key={a} value={a}>
                  {ACADEMY_STATUS_LABEL[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              className="col-span-2"
              onClick={() => {
                setTerm("");
                void navigate({ search: {} });
              }}
            >
              <X className="size-4" aria-hidden /> Clear filters
            </Button>
          )}
        </div>
      </div>

      {query.isPending ? (
        <LoadingState label="Loading candidates…" />
      ) : query.isError ? (
        <ErrorState description="Candidates could not be loaded." onRetry={() => query.refetch()} />
      ) : query.data.rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No matching candidates"
            description="Try a different search or clear the filters."
          />
        ) : (
          <EmptyState
            title="No candidates yet"
            description="Add the first candidate to send their invitation."
            action={
              <Button asChild>
                <Link to="/admin/candidates/add">Add candidate</Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="overflow-hidden rounded-md border bg-card">
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead field="full_name">Candidate name</SortHead>
                  <SortHead field="candidate_id">Candidate ID</SortHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden xl:table-cell">Phone</TableHead>
                  <TableHead className="hidden xl:table-cell">Location</TableHead>
                  <SortHead field="account_status">Account</SortHead>
                  <TableHead>Academy</TableHead>
                  <SortHead field="progress_percent">Progress</SortHead>
                  <SortHead field="joining_date" className="hidden lg:table-cell">
                    Joining
                  </SortHead>
                  <SortHead field="created_at" className="hidden lg:table-cell">
                    Created
                  </SortHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.rows.map((c) => (
                  <TableRow key={c.user_id}>
                    <TableCell className="font-medium">{c.full_name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{c.candidate_id}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={c.email ?? ""}>
                      {c.email}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap xl:table-cell">
                      {c.phone || "—"}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">{c.location || "—"}</TableCell>
                    <TableCell>
                      {c.account_status && <AccountStatusBadge status={c.account_status} />}
                    </TableCell>
                    <TableCell>
                      {c.academy_status && <AcademyStatusBadge status={c.academy_status} />}
                    </TableCell>
                    <TableCell>
                      <PerformanceBadge value={Number(c.progress_percent ?? 0)} />
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-xs lg:table-cell">
                      {formatDate(c.joining_date)}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-xs lg:table-cell">
                      {formatDate(c.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to="/admin/candidates/$candidateId"
                          params={{ candidateId: c.user_id! }}
                        >
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile cards */}
          <ul className="divide-y md:hidden">
            {query.data.rows.map((c) => (
              <li key={c.user_id}>
                <Link
                  to="/admin/candidates/$candidateId"
                  params={{ candidateId: c.user_id! }}
                  className="block space-y-2 p-4 hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.full_name || "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.candidate_id} · {c.email}
                      </p>
                    </div>
                    {c.account_status && <AccountStatusBadge status={c.account_status} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.academy_status && <AcademyStatusBadge status={c.academy_status} />}
                    <PerformanceBadge value={Number(c.progress_percent ?? 0)} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <TablePagination
            page={params.page}
            size={params.size}
            total={query.data.total}
            sizes={PAGE_SIZES}
            onPage={(p) => navigate({ search: (x) => ({ ...x, page: p }) })}
            onSize={(n) => update({ size: n })}
          />
        </div>
      )}
    </>
  );
}
