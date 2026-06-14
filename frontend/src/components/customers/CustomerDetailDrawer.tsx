import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Mail,
  Phone,
  Calendar,
  Layers,
  Megaphone,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { ChannelBadge } from "@/components/ui/Badge";
import {
  CustomerAvatar,
  CustomerStatusBadge,
  SpendCategoryBadge,
  CityChip,
} from "@/components/customers/CustomerBadges";
import { CustomerCommunicationJourney } from "@/components/customers/CustomerCommunicationJourney";
import { useFetch } from "@/hooks/useFetch";
import { api, type Customer, type CustomerCommunication, type Segment } from "@/lib/api";
import { filterCustomersByRules } from "@/lib/segments";
import {
  getAvgOrderValue,
  getSpendCategory,
} from "@/lib/customers";
import {
  formatCurrency,
  formatDate,
} from "@/lib/utils";

// Re-export formatters from utils where needed in drawer
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

interface CustomerDetailDrawerProps {
  customer: Customer | null;
  onClose: () => void;
}

export function CustomerDetailDrawer({ customer, onClose }: CustomerDetailDrawerProps) {
  const { data: segments } = useFetch(() => api.getSegments(), { cacheKey: "segments" });
  const [comms, setComms] = useState<CustomerCommunication[]>([]);
  const [commsLoading, setCommsLoading] = useState(false);

  useEffect(() => {
    if (!customer) {
      setComms([]);
      return;
    }
    setCommsLoading(true);
    api
      .getCustomerCommunications(customer.id)
      .then(setComms)
      .catch(() => setComms([]))
      .finally(() => setCommsLoading(false));
  }, [customer?.id]);

  const memberships = useMemo(() => {
    if (!customer || !segments) return [];
    return segments.filter((seg) => {
      const matches = filterCustomersByRules([customer], seg.rules, seg.ruleLogic);
      return matches.length > 0;
    });
  }, [customer, segments]);

  const orders = useMemo(() => {
    if (!customer?.orders) return [];
    return [...customer.orders]
      .filter((o) => o.customerId === customer.id)
      .sort(
        (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
      );
  }, [customer]);

  const avgOrder = customer ? getAvgOrderValue(customer) : 0;
  const spendCategory = customer ? getSpendCategory(customer.totalSpend) : "budget";

  return (
    <Drawer
      open={!!customer}
      onClose={onClose}
      title="Customer"
      width="w-[520px]"
    >
      {customer && (
        <div className="space-y-8 pb-8">
          {/* Profile */}
          <Section title="Profile" icon={Mail}>
            <div className="flex items-start gap-4">
              <CustomerAvatar name={customer.name} size="lg" />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">
                  {customer.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <CustomerStatusBadge customer={customer} />
                  <SpendCategoryBadge totalSpend={customer.totalSpend} />
                  <CityChip city={customer.city} />
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-[var(--text-muted)]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {customer.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    Customer since {formatDate(customer.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Spend */}
          <Section title="Spend" icon={TrendingUp}>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-muted)] border border-[var(--border)]">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-subtle)] mb-1">
                  Lifetime value
                </p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {formatCurrency(customer.totalSpend)}
                </p>
              </div>
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-muted)] border border-[var(--border)]">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-subtle)] mb-1">
                  Avg order
                </p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {customer.orderCount > 0 ? formatCurrency(avgOrder) : "—"}
                </p>
              </div>
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-muted)] border border-[var(--border)]">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-subtle)] mb-1">
                  Total orders
                </p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {customer.orderCount}
                </p>
              </div>
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-muted)] border border-[var(--border)]">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-subtle)] mb-1">
                  Spend tier
                </p>
                <SpendCategoryBadge category={spendCategory} />
              </div>
            </div>
          </Section>

          {/* Orders */}
          <Section title="Orders" icon={Receipt}>
            {orders.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-2">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-card)]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {formatDate(order.purchasedAt)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--accent)]">
                      {formatCurrency(order.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Segment memberships */}
          <Section title="Segment memberships" icon={Layers}>
            {memberships.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-2">
                Not in any segments yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {memberships.map((seg: Segment) => (
                  <span
                    key={seg.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--border)] bg-[var(--accent-muted)] text-[var(--accent)]"
                  >
                    <Layers className="w-3 h-3" />
                    {seg.name}
                    <span className="text-[var(--text-subtle)] font-normal">
                      ({seg.customerCount})
                    </span>
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* Communication journey */}
          <Section title="Communication journey" icon={Megaphone}>
            <CustomerCommunicationJourney communications={comms} loading={commsLoading} />
          </Section>
        </div>
      )}
    </Drawer>
  );
}
