import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  getCustomerStatus,
  getSpendCategory,
  statusConfig,
  spendCategoryConfig,
  type CustomerStatus,
  type SpendCategory,
} from "@/lib/customers";
import type { Customer } from "@/lib/api";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

export function CustomerStatusBadge({
  customer,
  status,
}: {
  customer?: Customer;
  status?: CustomerStatus;
}) {
  const resolved = status ?? (customer ? getCustomerStatus(customer) : "prospect");
  const config = statusConfig[resolved];
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

export function SpendCategoryBadge({
  totalSpend,
  category,
}: {
  totalSpend?: number;
  category?: SpendCategory;
}) {
  const resolved =
    category ?? (totalSpend !== undefined ? getSpendCategory(totalSpend) : "budget");
  const config = spendCategoryConfig[resolved];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

export function CityChip({ city, className }: { city: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md",
        "bg-[var(--bg-muted)] text-[var(--text-muted)] border border-[var(--border)]",
        className
      )}
    >
      <MapPin className="w-3 h-3 shrink-0 opacity-70" />
      {city}
    </span>
  );
}

export function CustomerAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-16 h-16 text-2xl" : "w-10 h-10 text-sm";

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm",
        getAvatarColor(name),
        sizeClass
      )}
    >
      {getInitials(name)}
    </div>
  );
}
