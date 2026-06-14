import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton", className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius)] border border-[var(--border)] p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-[var(--border-muted)]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className={cn("h-4", i === 0 ? "w-32" : "w-20")} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius)] border border-[var(--border)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-muted)] flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-muted)]">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="py-3 px-4 text-left">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius)] border border-[var(--border)] p-5 space-y-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={cn("bg-[var(--bg-card)] rounded-[var(--radius)] border border-[var(--border)] p-5", height)}>
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  );
}
