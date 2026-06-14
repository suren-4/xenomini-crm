import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row justify-between items-start sm:items-end gap-[var(--space-4)]",
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">
          {title}
        </h1>
        {description && (
          <p className="text-[var(--text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-[var(--space-3)] shrink-0">{actions}</div>}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-[var(--space-4)]">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-4 w-64" />
      </div>
      <div className="skeleton h-10 w-36 rounded-[var(--radius-sm)]" />
    </div>
  );
}
