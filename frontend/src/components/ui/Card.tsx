import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
}

export function Card({ children, className, padding = true, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-card)] rounded-[var(--radius)] border border-[var(--border)] shadow-[var(--shadow)]",
        padding && "p-[var(--card-padding)]",
        hover && "hover:shadow-[var(--shadow-md)] transition-shadow duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-[var(--space-4)]", className)}>
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        {description && (
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
