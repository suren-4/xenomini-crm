import type { Customer, SegmentRule } from "./api";

function matchesRule(customer: Customer, rule: SegmentRule): boolean {
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
        (now.getTime() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      break;
    case "daysSinceCreation":
      fieldValue = Math.floor(
        (now.getTime() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      break;
    case "city":
      fieldValue = customer.city;
      break;
    default:
      return false;
  }

  const ruleValue = rule.value;
  switch (rule.operator) {
    case ">=": return Number(fieldValue) >= Number(ruleValue);
    case "<=": return Number(fieldValue) <= Number(ruleValue);
    case ">": return Number(fieldValue) > Number(ruleValue);
    case "<": return Number(fieldValue) < Number(ruleValue);
    case "==": return String(fieldValue) === String(ruleValue);
    case "!=": return String(fieldValue) !== String(ruleValue);
    default: return false;
  }
}

export function filterCustomersByRules(
  customers: Customer[],
  rules: SegmentRule[],
  logic: "AND" | "OR"
): Customer[] {
  if (rules.length === 0) return customers;
  return customers.filter((c) => {
    if (logic === "AND") return rules.every((r) => matchesRule(c, r));
    return rules.some((r) => matchesRule(c, r));
  });
}
