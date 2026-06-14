import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";
import { api, type Customer } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { useAgentContext } from "@/context/AgentContext";
import {
  formatCurrency,
  formatRelativeDate,
} from "@/lib/utils";
import {
  getCustomerStatus,
  getSpendCategory,
  statusConfig,
  spendCategoryConfig,
  CUSTOMER_STATUSES,
  SPEND_CATEGORIES,
  type CustomerStatus,
  type SpendCategory,
} from "@/lib/customers";
import {
  CustomerAvatar,
  CustomerStatusBadge,
  SpendCategoryBadge,
  CityChip,
} from "@/components/customers/CustomerBadges";
import { CustomerDetailDrawer } from "@/components/customers/CustomerDetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

function FilterChip({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
        active
          ? "bg-[var(--accent)] text-[var(--text-on-accent)] border-[var(--accent)]"
          : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]",
        className
      )}
    >
      {label}
    </button>
  );
}

function FilterChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)] shrink-0 w-14">
        {label}
      </span>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {children}
      </div>
    </div>
  );
}

export function Customers() {
  const { data: customers, loading, error } = useFetch(() => api.getCustomers());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [spendFilter, setSpendFilter] = useState<SpendCategory | "all">("all");
  const [sortField, setSortField] = useState<keyof Customer>("totalSpend");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedCustomer, setSelectedCustomerLocal] = useState<Customer | null>(null);
  const { setSelectedCustomer } = useAgentContext();

  const openCustomer = (c: Customer) => {
    setSelectedCustomerLocal(c);
    setSelectedCustomer(c);
  };

  const closeCustomer = () => {
    setSelectedCustomerLocal(null);
    setSelectedCustomer(null);
  };

  const customerList = customers ?? [];

  const cities = useMemo(
    () => Array.from(new Set(customerList.map((c) => c.city))).sort(),
    [customerList]
  );

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "all" ||
    cityFilter !== "all" ||
    spendFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCityFilter("all");
    setSpendFilter("all");
    setPage(1);
  };

  const filteredCustomers = useMemo(() => {
    let res = customerList;

    if (search) {
      const s = search.toLowerCase();
      res = res.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s) ||
          c.phone.includes(s) ||
          c.city.toLowerCase().includes(s)
      );
    }

    if (statusFilter !== "all") {
      res = res.filter((c) => getCustomerStatus(c) === statusFilter);
    }

    if (cityFilter !== "all") {
      res = res.filter((c) => c.city === cityFilter);
    }

    if (spendFilter !== "all") {
      res = res.filter((c) => getSpendCategory(c.totalSpend) === spendFilter);
    }

    res = [...res].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });

    return res;
  }, [search, statusFilter, cityFilter, spendFilter, sortField, sortDesc, customerList]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const paginated = filteredCustomers.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: keyof Customer) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="h-8 w-40 bg-[var(--bg-muted)] animate-pulse rounded mb-2" />
            <div className="h-4 w-64 bg-[var(--bg-muted)] animate-pulse rounded" />
          </div>
        </div>
        <TableSkeleton rows={10} cols={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-[var(--error)]">Failed to load customers</p>
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">
            Customers
          </h1>
          <p className="text-[var(--text-muted)]">
            Manage and view your {customerList.length} customers.
          </p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Search + filter chips */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-muted)] shadow-[var(--shadow)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border-muted)]">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or city..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--bg-input)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          <FilterChipRow label="Status">
            <FilterChip
              label="All"
              active={statusFilter === "all"}
              onClick={() => {
                setStatusFilter("all");
                setPage(1);
              }}
            />
            {CUSTOMER_STATUSES.map((status) => (
              <FilterChip
                key={status}
                label={statusConfig[status].label}
                active={statusFilter === status}
                onClick={() => {
                  setStatusFilter(statusFilter === status ? "all" : status);
                  setPage(1);
                }}
              />
            ))}
          </FilterChipRow>

          <FilterChipRow label="City">
            <FilterChip
              label="All"
              active={cityFilter === "all"}
              onClick={() => {
                setCityFilter("all");
                setPage(1);
              }}
            />
            {cities.map((city) => (
              <FilterChip
                key={city}
                label={city}
                active={cityFilter === city}
                onClick={() => {
                  setCityFilter(cityFilter === city ? "all" : city);
                  setPage(1);
                }}
              />
            ))}
          </FilterChipRow>

          <FilterChipRow label="Spend">
            <FilterChip
              label="All"
              active={spendFilter === "all"}
              onClick={() => {
                setSpendFilter("all");
                setPage(1);
              }}
            />
            {SPEND_CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                label={spendCategoryConfig[cat].label}
                active={spendFilter === cat}
                onClick={() => {
                  setSpendFilter(spendFilter === cat ? "all" : cat);
                  setPage(1);
                }}
                className={
                  spendFilter === cat ? undefined : spendCategoryConfig[cat].className
                }
              />
            ))}
          </FilterChipRow>

          {hasActiveFilters && (
            <p className="text-xs text-[var(--text-subtle)] pt-1">
              Showing {filteredCustomers.length} of {customerList.length} customers
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-[var(--shadow)] overflow-hidden flex flex-col">
        {filteredCustomers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="We couldn't find any customers matching your current filters."
            action={
              <button onClick={clearFilters} className="text-[var(--accent)] font-medium">
                Clear Filters
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-muted)] border-b border-[var(--border)]">
                <tr>
                  <th
                    className="px-6 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)]"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Customer
                      {sortField === "name" &&
                        (sortDesc ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronUp className="w-3 h-3" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)]"
                    onClick={() => handleSort("city")}
                  >
                    <div className="flex items-center gap-1">
                      City
                      {sortField === "city" &&
                        (sortDesc ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronUp className="w-3 h-3" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)] text-right"
                    onClick={() => handleSort("totalSpend")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Spend
                      {sortField === "totalSpend" &&
                        (sortDesc ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronUp className="w-3 h-3" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)] text-right"
                    onClick={() => handleSort("orderCount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Orders
                      {sortField === "orderCount" &&
                        (sortDesc ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronUp className="w-3 h-3" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 font-medium cursor-pointer hover:text-[var(--text-primary)]"
                    onClick={() => handleSort("lastOrderDate")}
                  >
                    <div className="flex items-center gap-1">
                      Last order
                      {sortField === "lastOrderDate" &&
                        (sortDesc ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronUp className="w-3 h-3" />
                        ))}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-muted)]">
                {paginated.map((c) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-[var(--accent-muted)] transition-colors duration-150 cursor-pointer group"
                    onClick={() => openCustomer(c)}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <CustomerAvatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                              {c.name}
                            </span>
                            <CustomerStatusBadge customer={c} />
                          </div>
                          <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                            {c.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <CityChip city={c.city} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-medium text-[var(--text-primary)]">
                          {formatCurrency(c.totalSpend)}
                        </span>
                        <SpendCategoryBadge totalSpend={c.totalSpend} />
                      </div>
                    </td>
                    <td className="px-6 py-3 text-[var(--text-muted)] text-right">
                      {c.orderCount}
                    </td>
                    <td className="px-6 py-3 text-[var(--text-muted)]">
                      {c.orderCount > 0 ? formatRelativeDate(c.lastOrderDate) : "—"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-sm bg-[var(--bg-muted)]">
            <div className="text-[var(--text-muted)]">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, filteredCustomers.length)} of{" "}
              {filteredCustomers.length}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--bg-card)] bg-[var(--bg-card)] shadow-[var(--shadow)]"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--bg-card)] bg-[var(--bg-card)] shadow-[var(--shadow)]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <CustomerDetailDrawer customer={selectedCustomer} onClose={closeCustomer} />
    </motion.div>
  );
}
