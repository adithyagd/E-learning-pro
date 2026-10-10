import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { TablePagination } from "@/components/data/TablePagination";
import { ROLE_LABEL } from "@/features/auth/roles";
import { ACTIVITY_LABEL, activityQuery, formatDate } from "./queries";

export function ActivityList({
  userId,
  onlyManagement,
  size = 10,
}: {
  userId?: string;
  onlyManagement?: boolean;
  size?: number;
}) {
  const [page, setPage] = useState(1);
  const q = useQuery(activityQuery({ userId, onlyManagement, page, size }));
  if (q.isPending) return <LoadingState label="Loading activity…" />;
  if (q.isError)
    return <ErrorState description="Activity could not be loaded." onRetry={() => q.refetch()} />;
  const { rows, total, names } = q.data;
  if (!rows.length)
    return <EmptyState title="No activity yet" description="Recorded actions will appear here." />;
  const name = (id: string | null) => (id ? (names.get(id) ?? "Unknown user") : "—");
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead className="hidden md:table-cell">Target</TableHead>
              <TableHead className="hidden lg:table-cell">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const meta = (r.metadata ?? {}) as Record<string, unknown>;
              const details = Object.entries(meta)
                .map(
                  ([k, v]) =>
                    `${k.replace(/_/g, " ")}: ${Array.isArray(v) ? v.join(", ") || "none" : String(v)}`,
                )
                .join(" · ");
              return (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {formatDate(r.created_at, true)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {ACTIVITY_LABEL[r.action] ?? r.action}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {name(r.user_id)}
                    {r.role && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({ROLE_LABEL[r.role]})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap md:table-cell">
                    {name(r.target_user_id)}
                  </TableCell>
                  <TableCell
                    className="hidden max-w-xs truncate text-xs text-muted-foreground lg:table-cell"
                    title={details}
                  >
                    {details || "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <TablePagination page={page} size={size} total={total} onPage={setPage} />
    </div>
  );
}
