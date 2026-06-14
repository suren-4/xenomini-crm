import { useState, useEffect, type MouseEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LayoutGrid, List, Inbox, Trash2 } from "lucide-react";
import { formatNumber, formatRelativeDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { StatusBadge, ChannelBadge } from "@/components/ui/Badge";
import { CampaignCreator } from "@/components/campaigns/CampaignCreator";
import { CampaignDetailDrawer } from "@/components/campaigns/CampaignDetailDrawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { useFetch, usePageVisible } from "@/hooks/useFetch";
import { useAgentContext } from "@/context/AgentContext";
import { api, type Campaign } from "@/lib/api";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  rcs: "RCS",
};

function StatChip({
  value,
  dotColor,
}: {
  value: number;
  dotColor?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-[var(--bg-muted)] text-[var(--text-secondary)] border border-[var(--border)] px-2 py-1 rounded-full text-xs">
      {dotColor && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
      {formatNumber(value)}
    </span>
  );
}

export function Campaigns() {
  const { data: campaignsList, loading, error, refetch } = useFetch(() => api.getCampaigns(), {
    cacheKey: "campaigns",
  });
  const { data: segments } = useFetch(() => api.getSegments(), { cacheKey: "segments" });
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchParams, setSearchParams] = useSearchParams();
  const [creatorOpen, setCreatorOpen] = useState(false);
  const { selectedCampaign, setSelectedCampaign } = useAgentContext();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState<Campaign | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Campaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const campaigns = campaignsList ?? [];

  const getAudienceSize = (segmentId: string) =>
    (segments ?? []).find((s) => s.id === segmentId)?.customerCount ?? 0;

  const openCampaign = (campaign: Campaign) => setSelectedCampaign(campaign);

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setCreatorOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const pageVisible = usePageVisible();
  const hasSendingCampaigns = campaigns.some((c) => c.status === "sending");

  useEffect(() => {
    if (!hasSendingCampaigns || !pageVisible) return;
    const interval = setInterval(() => refetch({ silent: true, force: true }), 5000);
    return () => clearInterval(interval);
  }, [hasSendingCampaigns, pageVisible, refetch]);

  useEffect(() => {
    if (!selectedCampaign || !campaignsList) return;
    const updated = campaignsList.find((c) => c.id === selectedCampaign.id);
    if (updated) setSelectedCampaign(updated);
  }, [campaignsList]);

  const requestSend = (campaign: Campaign) => {
    if (campaign.status !== "draft") return;
    setConfirmSend(campaign);
  };

  const executeSend = async () => {
    if (!confirmSend || confirmSend.status !== "draft") return;
    const campaign = confirmSend;
    setSendingId(campaign.id);
    try {
      const result = await api.sendCampaign(campaign.id);
      setToastMessage(`Sending ${result.count} messages — status updates automatically.`);
      setConfirmSend(null);
      refetch({ silent: true });
    } catch (e) {
      setToastMessage(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSendingId(null);
    }
  };

  const requestDelete = (campaign: Campaign, e?: MouseEvent) => {
    e?.stopPropagation();
    setConfirmDelete(campaign);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await api.deleteCampaign(confirmDelete.id);
      if (selectedCampaign?.id === confirmDelete.id) {
        setSelectedCampaign(null);
      }
      setConfirmDelete(null);
      await refetch({ silent: true });
      setToastMessage(`Deleted campaign "${confirmDelete.name}"`);
    } catch (e) {
      setToastMessage(e instanceof Error ? e.message : "Failed to delete campaign");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && !campaignsList) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="h-8 w-40 bg-[var(--bg-muted)] animate-pulse rounded mb-2"></div>
            <div className="h-4 w-64 bg-[var(--bg-muted)] animate-pulse rounded"></div>
          </div>
          <div className="flex gap-3">
             <div className="h-10 w-20 bg-[var(--bg-muted)] animate-pulse rounded-lg"></div>
             <div className="h-10 w-36 bg-[var(--bg-muted)] animate-pulse rounded-lg"></div>
          </div>
        </div>
        {view === "list" ? <TableSkeleton rows={5} cols={6} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3,4,5].map(i => <CardSkeleton key={i} />)}
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-[var(--error)]">Failed to load campaigns</p>
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 relative pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">Campaigns</h1>
          <p className="text-[var(--text-muted)]">Orchestrate and monitor your multi-channel outreach.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg flex p-1 shadow-[var(--shadow)]">
            <button 
              onClick={() => setView("list")}
              className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-[var(--bg-muted)] text-[var(--text-primary)]" : "text-[var(--text-subtle)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setView("grid")}
              className={`p-1.5 rounded transition-colors ${view === "grid" ? "bg-[var(--bg-muted)] text-[var(--text-primary)]" : "text-[var(--text-subtle)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={() => setCreatorOpen(true)}
            disabled={(segments ?? []).length === 0}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Campaign
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-[var(--shadow)] p-12">
          <EmptyState 
            icon={<Inbox className="w-8 h-8 text-[var(--text-subtle)]" />}
            title="No campaigns yet" 
            description="Create a segment first, then launch your first campaign to reach shoppers."
            action={
              <Button onClick={() => setCreatorOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="mt-4">
                Create Campaign
              </Button>
            }
          />
        </div>
      ) : view === "list" ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-[var(--shadow)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[var(--bg-muted)] text-[var(--text-muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-6 py-3 font-medium">Campaign</th>
                  <th className="px-6 py-3 font-medium">Channel & Status</th>
                  <th className="px-6 py-3 font-medium text-right">Performance</th>
                  <th className="px-6 py-3 font-medium text-right">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-muted)]">
                {campaigns.map((c) => (
                  <motion.tr
                    key={c.id}
                    variants={item}
                    onClick={() => openCampaign(c)}
                    className="hover:bg-[var(--bg-hover)] transition-all duration-200 group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{c.name}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">{c.segmentName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ChannelBadge channel={c.channel} />
                        <StatusBadge status={c.status} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.status !== "draft" ? (
                        <div className="flex items-center justify-end gap-2 text-xs flex-wrap">
                          <StatChip value={c.stats.sent} />
                          <StatChip value={c.stats.delivered} dotColor="bg-[var(--success)]" />
                          <StatChip value={c.stats.opened} dotColor="bg-[var(--info)]" />
                          <StatChip value={c.stats.clicked} dotColor="bg-[var(--warning)]" />
                        </div>
                      ) : (
                        <span className="text-[var(--text-subtle)] text-xs">Ready to send</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-[var(--text-muted)]">
                      {c.sentAt ? formatRelativeDate(c.sentAt) : formatRelativeDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === "draft" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              requestSend(c);
                            }}
                            disabled={sendingId === c.id}
                            className="text-[var(--accent)] hover:opacity-80 text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--accent-muted)] hover:bg-[var(--accent-light)] disabled:opacity-50"
                          >
                            {sendingId === c.id ? "Sending..." : "Send"}
                          </button>
                        )}
                        <button
                          onClick={(e) => requestDelete(c, e)}
                          disabled={deletingId === c.id}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error-bg)] transition-colors"
                          aria-label={`Delete ${c.name}`}
                          title="Delete campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <motion.div
              key={c.id}
              variants={item}
              onClick={() => openCampaign(c)}
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-[var(--shadow)] hover:bg-[var(--bg-hover)] transition-colors duration-200 flex flex-col cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <ChannelBadge channel={c.channel} />
                <StatusBadge status={c.status} />
              </div>
              <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1 truncate">{c.name}</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4 truncate">To: {c.segmentName}</p>
              
              <div className="bg-[var(--bg-muted)] rounded-lg p-3 grid grid-cols-4 gap-2 text-center border border-[var(--border-muted)] mb-4">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-[var(--text-subtle)] mb-1">Sent</div>
                  <div className="text-sm font-semibold">{formatNumber(c.stats.sent)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] mb-1 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                    Deliv
                  </div>
                  <div className="text-sm font-semibold">{formatNumber(c.stats.delivered)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] mb-1 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--info)]" />
                    Open
                  </div>
                  <div className="text-sm font-semibold">{formatNumber(c.stats.opened)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] mb-1 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />
                    Click
                  </div>
                  <div className="text-sm font-semibold">{formatNumber(c.stats.clicked)}</div>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-[var(--text-subtle)] border-t border-[var(--border-muted)] pt-3 mt-auto">
                <span>{c.sentAt ? formatRelativeDate(c.sentAt) : formatRelativeDate(c.createdAt)}</span>
                <div className="flex items-center gap-1">
                  {c.status === "draft" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        requestSend(c);
                      }}
                      disabled={sendingId === c.id}
                      className="text-[var(--accent)] hover:opacity-80 text-xs font-medium px-2 py-1 rounded border border-[var(--accent-muted)] hover:bg-[var(--accent-light)] disabled:opacity-50"
                    >
                      {sendingId === c.id ? "Sending..." : "Send"}
                    </button>
                  )}
                  <button
                    onClick={(e) => requestDelete(c, e)}
                    disabled={deletingId === c.id}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error-bg)] transition-colors"
                    aria-label={`Delete ${c.name}`}
                    title="Delete campaign"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CampaignDetailDrawer
        campaign={selectedCampaign}
        audienceSize={selectedCampaign ? getAudienceSize(selectedCampaign.segmentId) : 0}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onSend={requestSend}
        onDelete={requestDelete}
        sending={selectedCampaign ? sendingId === selectedCampaign.id : false}
        deleting={selectedCampaign ? deletingId === selectedCampaign.id : false}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete campaign?"
        message={
          confirmDelete
            ? confirmDelete.status === "sending"
              ? `Delete stuck campaign "${confirmDelete.name}"? It is still marked as sending but can be removed from your list.`
              : `Permanently delete "${confirmDelete.name}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        loading={!!deletingId}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={!!confirmSend}
        title="Send campaign?"
        message={
          confirmSend
            ? `Send this campaign to ${formatNumber(getAudienceSize(confirmSend.segmentId))} customers via ${CHANNEL_LABELS[confirmSend.channel] ?? confirmSend.channel}?`
            : ""
        }
        confirmLabel="Send now"
        variant="warning"
        loading={!!sendingId}
        onConfirm={executeSend}
        onCancel={() => setConfirmSend(null)}
      />

      <CampaignCreator
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        segments={segments ?? []}
        onCreated={() => {
          refetch({ silent: true });
          setToastMessage("Campaign created successfully!");
        }}
      />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-[var(--text-primary)] text-[var(--bg-card)] px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
