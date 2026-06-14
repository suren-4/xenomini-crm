import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, PieChart, Trash2, ArrowRight } from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { Drawer } from "@/components/ui/Drawer";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { CampaignCreator } from "@/components/campaigns/CampaignCreator";
import { SuggestAudiencePanel } from "@/components/segments/SuggestAudiencePanel";
import { useFetch } from "@/hooks/useFetch";
import { api, type Segment, type SegmentRule, type Customer } from "@/lib/api";
import { filterCustomersByRules } from "@/lib/segments";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function Segments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: segmentsList, loading, error, refetch } = useFetch(() => api.getSegments());
  const { data: customers } = useFetch(() => api.getCustomers());
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [campaignCreatorOpen, setCampaignCreatorOpen] = useState(false);
  const [campaignSegmentId, setCampaignSegmentId] = useState<string | undefined>();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [membersSegment, setMembersSegment] = useState<Segment | null>(null);
  const [members, setMembers] = useState<Customer[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setIsCreatorOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Creator state
  const [name, setName] = useState("");
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [rules, setRules] = useState<SegmentRule[]>([
    { id: "init-1", field: "totalSpend", operator: ">=", value: 5000 }
  ]);

  const addRule = () => {
    setRules([...rules, { id: Math.random().toString(36).substr(2, 9), field: "totalSpend", operator: ">=", value: 0 }]);
  };

  const updateRule = (id: string, updates: Partial<SegmentRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const applySuggestedAudience = (result: {
    name: string;
    ruleLogic: "AND" | "OR";
    rules: SegmentRule[];
  }) => {
    setName(result.name);
    setLogic(result.ruleLogic);
    setRules(result.rules);
  };

  const previewCount = useMemo(() => {
    if (!customers) return 0;
    const validRules = rules.filter(r => r.value !== "" && r.value !== null);
    if (validRules.length === 0) return customers.length;
    return filterCustomersByRules(customers, validRules, logic).length;
  }, [rules, logic, customers]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.createSegment({ name, rules, ruleLogic: logic });
      await refetch();
      setIsCreatorOpen(false);
      setName("");
      setRules([{ id: "init-1", field: "totalSpend", operator: ">=", value: 5000 }]);
      setLogic("AND");
    } catch (e) {
      setToastMessage(e instanceof Error ? e.message : "Failed to save segment");
    } finally {
      setSaving(false);
    }
  };

  const openMembers = async (seg: Segment) => {
    setMembersSegment(seg);
    setMembersLoading(true);
    setMembers([]);
    try {
      const data = await api.getSegmentPreview(seg.id);
      setMembers(data.customers);
    } catch (e) {
      setToastMessage(e instanceof Error ? e.message : "Failed to load members");
      setMembersSegment(null);
    } finally {
      setMembersLoading(false);
    }
  };

  const openCampaignCreator = (segmentId: string) => {
    setCampaignSegmentId(segmentId);
    setCampaignCreatorOpen(true);
  };

  const formatRuleValue = (field: string, value: string | number) => {
    if (field === 'totalSpend') return formatCurrency(Number(value));
    return value;
  };

  const renderRuleSummary = (seg: Segment) => {
    if (seg.rules.length === 0) return "All Customers";
    
    // Check for special combined logic e.g. Spend between X and Y
    if (seg.rules.length === 2 && seg.ruleLogic === 'AND' && 
        seg.rules[0].field === 'totalSpend' && seg.rules[1].field === 'totalSpend' &&
        ((seg.rules[0].operator === '>=' && seg.rules[1].operator === '<=') || 
         (seg.rules[0].operator === '<=' && seg.rules[1].operator === '>='))) {
      const min = seg.rules.find(r => r.operator === '>=')?.value || 0;
      const max = seg.rules.find(r => r.operator === '<=')?.value || 0;
      return `Spend between ${formatCurrency(Number(min))} – ${formatCurrency(Number(max))}`;
    }

    const rulesStrs = seg.rules.map(r => {
      const val = formatRuleValue(r.field, r.value);
      if (r.field === "totalSpend") {
        if (r.operator === ">=") return `Spend ≥ ${val}`;
        if (r.operator === "<=") return `Spend ≤ ${val}`;
        if (r.operator === ">") return `Spend > ${val}`;
        if (r.operator === "<") return `Spend < ${val}`;
      }
      if (r.field === "daysSinceCreation") {
        if (r.operator === "<=") return `Joined within last ${val} days`;
        if (r.operator === ">=") return `Joined more than ${val} days ago`;
      }
      if (r.field === "daysSinceLastPurchase") {
        if (r.operator === ">=") return `Inactive for ${val}+ days`;
        if (r.operator === "<=") return `Purchased in last ${val} days`;
      }
      if (r.field === "orderCount") {
        if (r.operator === ">=") return `Made ${val} or more orders`;
        if (r.operator === "<=") return `Made ${val} or fewer orders`;
      }
      if (r.field === "city") {
        if (r.operator === "==") return `City is ${val}`;
        if (r.operator === "!=") return `City is not ${val}`;
      }
      
      let op = r.operator;
      if (op === ">=") op = "≥";
      if (op === "<=") op = "≤";
      if (op === "==") op = "is";
      if (op === "!=") op = "is not";
      
      return `${r.field} ${op} ${val}`;
    });
    return rulesStrs.join(` ${seg.ruleLogic} `);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="h-8 w-40 bg-[var(--bg-muted)] animate-pulse rounded mb-2"></div>
            <div className="h-4 w-64 bg-[var(--bg-muted)] animate-pulse rounded"></div>
          </div>
          <div className="h-10 w-36 bg-[var(--bg-muted)] animate-pulse rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-[var(--error)]">Failed to load segments</p>
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">Segments</h1>
          <p className="text-[var(--text-muted)]">Group your customers into targeted audiences.</p>
        </div>
        <Button onClick={() => setIsCreatorOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Create Segment
        </Button>
      </div>

      {!loading && (segmentsList ?? []).length === 0 ? (
        <EmptyState
          title="No segments yet"
          description="Create your first audience segment to target customers with campaigns."
          action={
            <button
              onClick={() => setIsCreatorOpen(true)}
              className="text-[var(--accent)] font-medium hover:opacity-80"
            >
              Create Segment
            </button>
          }
        />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(segmentsList ?? []).map((seg) => (
          <motion.div 
            key={seg.id} 
            variants={item} 
            className="relative bg-[var(--bg-card)] rounded-xl border border-[var(--border)] border-l-2 border-l-[var(--accent)] p-5 shadow-[var(--shadow)] hover:bg-[var(--bg-hover)] transition-colors duration-200 group overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg text-[var(--text-primary)] truncate pr-2">{seg.name}</h3>
              <div className="bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-bold px-2 py-1 rounded flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                <Users className="w-3 h-3 text-[var(--accent)]" />
                {formatNumber(seg.customerCount)}
              </div>
            </div>
            
            <div className="h-12 mb-4 bg-[var(--bg-muted)] rounded p-2 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed border border-[var(--border-muted)]">
              <span className="font-medium text-[var(--text-secondary)]">Rule: </span>
              {renderRuleSummary(seg)}
            </div>
            
            <div className="mt-auto relative">
              <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1 group-hover:opacity-0 transition-opacity duration-200">
                <span>% of total audience</span>
                <span className="font-medium text-[var(--text-secondary)]">{seg.percentOfTotal}%</span>
              </div>
              <div className="w-full bg-[var(--bg-muted)] rounded-full h-1.5 group-hover:opacity-0 transition-opacity duration-200">
                <div 
                  className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${seg.percentOfTotal}%` }}
                />
              </div>
              
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => openMembers(seg)}
                  className="flex-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)] py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                >
                  View members
                </button>
                <button
                  type="button"
                  onClick={() => openCampaignCreator(seg.id)}
                  className="flex-1 text-xs font-medium text-[var(--accent)] py-2 rounded-lg border border-[var(--accent-muted)] hover:bg-[var(--accent-light)] transition-colors flex items-center justify-center gap-1"
                >
                  Campaign <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      )}

      {/* Create Segment Drawer */}
      <Drawer
        open={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        title="Create New Segment"
        width="w-[600px]"
      >
        <div className="space-y-6 flex flex-col h-full">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Segment Name</label>
            <input 
              type="text" 
              placeholder="e.g. VIP Spenders"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg py-2 px-3 bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <SuggestAudiencePanel onApply={applySuggestedAudience} />

          <div className="flex-1 bg-[var(--bg-muted)] rounded-xl p-5 border border-[var(--border)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rules</h3>
              <div className="flex items-center gap-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-1">
                <button 
                  onClick={() => setLogic("AND")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${logic === "AND" ? "bg-[var(--accent-light)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"}`}
                >
                  AND
                </button>
                <button 
                  onClick={() => setLogic("OR")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${logic === "OR" ? "bg-[var(--accent-light)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"}`}
                >
                  OR
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {rules.map((rule, idx) => (
                  <motion.div 
                    key={rule.id}
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="flex items-center gap-2 overflow-hidden"
                  >
                    {idx > 0 && <div className="text-xs font-bold text-[var(--text-subtle)] w-8 text-center">{logic}</div>}
                    {idx === 0 && <div className="w-8" />}
                    
                    <div className="flex-1 flex gap-2">
                      <select 
                        value={rule.field}
                        onChange={e => updateRule(rule.id, { field: e.target.value })}
                        className="w-1/3 border border-[var(--border)] rounded-lg py-2 px-2 text-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      >
                        <option value="totalSpend">Total Spend</option>
                        <option value="orderCount">Order Count</option>
                        <option value="daysSinceLastPurchase">Days Inactive</option>
                        <option value="city">City</option>
                      </select>
                      
                      <select 
                        value={rule.operator}
                        onChange={e => updateRule(rule.id, { operator: e.target.value })}
                        className="w-1/4 border border-[var(--border)] rounded-lg py-2 px-2 text-sm bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      >
                        <option value=">=">{'≥'}</option>
                        <option value="<=">{'≤'}</option>
                        <option value="==">is</option>
                        <option value="!=">is not</option>
                      </select>
                      
                      <input 
                        type={rule.field === "city" ? "text" : "number"}
                        value={rule.value}
                        onChange={e => updateRule(rule.id, { value: e.target.value })}
                        placeholder="Value"
                        className="flex-1 border border-[var(--border)] rounded-lg py-2 px-3 text-sm bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    
                    <button 
                      onClick={() => removeRule(rule.id)}
                      disabled={rules.length === 1}
                      className="p-2 text-[var(--text-subtle)] hover:text-[var(--error)] disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            <button 
              onClick={addRule}
              className="mt-2 text-sm font-medium text-[var(--accent)] hover:opacity-80 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Condition
            </button>
          </div>

          {/* Live Preview Panel */}
          <div className="bg-[var(--info-bg)] rounded-xl p-5 border border-[var(--info-border)] flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--info-bg)] rounded-full flex items-center justify-center shrink-0 border border-[var(--info-border)]">
              <PieChart className="w-6 h-6 text-[var(--info)]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Live Audience Preview</h4>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-[var(--info)]">{formatNumber(previewCount)}</span>
                <span className="text-sm text-[var(--text-muted)] mb-1">customers match this segment</span>
              </div>
              <p className="text-xs text-[var(--text-subtle)] mt-1">({customers ? Math.round((previewCount/customers.length)*100) : 0}% of total audience)</p>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] mt-auto flex justify-end gap-3">
            <button 
              onClick={() => setIsCreatorOpen(false)}
              className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Cancel
            </button>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? "Saving..." : "Save Segment"}
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={!!membersSegment}
        onClose={() => setMembersSegment(null)}
        title={membersSegment ? `${membersSegment.name} — Members` : "Members"}
        width="w-[480px]"
      >
        {membersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-[var(--bg-muted)] animate-pulse rounded-lg" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No customers match this segment.</p>
        ) : (
          <div className="space-y-2">
            {members.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{c.email}</p>
                  <p className="text-xs text-[var(--text-subtle)]">{c.city}</p>
                </div>
                <p className="text-sm font-semibold text-[var(--accent)] shrink-0 ml-3">
                  {formatCurrency(c.totalSpend)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <CampaignCreator
        open={campaignCreatorOpen}
        onClose={() => {
          setCampaignCreatorOpen(false);
          setCampaignSegmentId(undefined);
        }}
        segments={segmentsList ?? []}
        preselectedSegmentId={campaignSegmentId}
        onCreated={() => {
          setToastMessage("Campaign created! Check Campaigns page to view or send.");
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-[var(--text-primary)] text-[var(--bg-card)] px-4 py-3 rounded-lg shadow-xl z-50 text-sm font-medium"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
