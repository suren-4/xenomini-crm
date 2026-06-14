import type { Customer } from "./api";

export type CustomerStatus = "active" | "inactive" | "new" | "churned" | "prospect";
export type SpendCategory = "vip" | "high" | "regular" | "budget";

export const CUSTOMER_STATUSES: CustomerStatus[] = [
  "active",
  "inactive",
  "new",
  "churned",
  "prospect",
];

export const SPEND_CATEGORIES: SpendCategory[] = ["vip", "high", "regular", "budget"];

export function daysSince(date: string): number {
  return Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function getCustomerStatus(customer: Customer): CustomerStatus {
  if (customer.orderCount === 0) return "prospect";

  const daysSinceLast = daysSince(customer.lastOrderDate);
  const daysSinceCreated = daysSince(customer.createdAt);

  if (daysSinceCreated <= 30) return "new";
  if (daysSinceLast >= 180) return "churned";
  if (daysSinceLast >= 90) return "inactive";
  return "active";
}

export function getSpendCategory(totalSpend: number): SpendCategory {
  if (totalSpend >= 50000) return "vip";
  if (totalSpend >= 25000) return "high";
  if (totalSpend >= 5000) return "regular";
  return "budget";
}

export const statusConfig: Record<
  CustomerStatus,
  { label: string; variant: "success" | "warning" | "info" | "error" | "outline" }
> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "warning" },
  new: { label: "New", variant: "info" },
  churned: { label: "Churned", variant: "error" },
  prospect: { label: "Prospect", variant: "outline" },
};

export const spendCategoryConfig: Record<
  SpendCategory,
  { label: string; className: string }
> = {
  vip: {
    label: "VIP",
    className:
      "bg-[var(--channel-email-bg)] text-[var(--channel-email-text)] border-[var(--channel-email-border)]",
  },
  high: {
    label: "High Value",
    className: "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]",
  },
  regular: {
    label: "Regular",
    className: "bg-[var(--info-bg)] text-[var(--info)] border-[var(--info-border)]",
  },
  budget: {
    label: "Budget",
    className: "bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]",
  },
};

export function getAvgOrderValue(customer: Customer): number {
  if (customer.orderCount === 0) return 0;
  return customer.totalSpend / customer.orderCount;
}
