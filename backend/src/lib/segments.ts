import type { Customer, Order } from "@prisma/client";

export interface SegmentRule {
  id?: string;
  field: string;
  operator: string;
  value: string | number;
}

export interface EnrichedCustomer extends Customer {
  orders: Order[];
  orderCount: number;
  lastOrderDate: Date;
}

export function enrichCustomer(
  customer: Customer & { orders: Order[]; _count?: { orders: number } }
): EnrichedCustomer {
  const orderCount = customer._count?.orders ?? customer.orders.length;
  const lastOrderDate =
    customer.orders.length > 0
      ? customer.orders.reduce(
          (latest, order) => (order.purchasedAt > latest ? order.purchasedAt : latest),
          customer.orders[0].purchasedAt
        )
      : customer.createdAt;

  return {
    ...customer,
    orderCount,
    lastOrderDate,
  };
}

function matchesRule(customer: EnrichedCustomer, rule: SegmentRule): boolean {
  const now = new Date();
  let fieldValue: number | string;

  switch (rule.field) {
    case "totalSpend":
      fieldValue = customer.totalSpend;
      break;
    case "orderCount":
      fieldValue = customer.orderCount;
      break;
    case "daysSinceLastPurchase":
      fieldValue = Math.floor(
        (now.getTime() - customer.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      break;
    case "daysSinceCreation":
      fieldValue = Math.floor(
        (now.getTime() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      break;
    case "city":
      fieldValue = customer.city ?? "";
      break;
    default:
      return false;
  }

  const ruleValue = rule.value;
  switch (rule.operator) {
    case ">=":
      return Number(fieldValue) >= Number(ruleValue);
    case "<=":
      return Number(fieldValue) <= Number(ruleValue);
    case ">":
      return Number(fieldValue) > Number(ruleValue);
    case "<":
      return Number(fieldValue) < Number(ruleValue);
    case "==":
      return String(fieldValue) === String(ruleValue);
    case "!=":
      return String(fieldValue) !== String(ruleValue);
    default:
      return false;
  }
}

export function filterCustomersByRules(
  customers: EnrichedCustomer[],
  rules: SegmentRule[],
  logic: "AND" | "OR"
): EnrichedCustomer[] {
  if (rules.length === 0) return customers;

  return customers.filter((customer) => {
    if (logic === "AND") return rules.every((rule) => matchesRule(customer, rule));
    return rules.some((rule) => matchesRule(customer, rule));
  });
}
