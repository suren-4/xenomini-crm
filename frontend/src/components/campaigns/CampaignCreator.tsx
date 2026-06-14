import { useState, useEffect, useMemo } from "react";
import { Megaphone, Send } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api, type Campaign, type MessageTone, type Segment } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { useIntelliSenseEnabled } from "@/context/IntelliSenseContext";
import { useIntelliSense, useChannelSuggestion } from "@/hooks/useIntelliSense";
import { AiIntelliSenseInput } from "@/components/ai/AiIntelliSenseInput";
import { AiIntelliSenseTextarea } from "@/components/ai/AiIntelliSenseTextarea";
import { AiChannelSuggestion } from "@/components/ai/AiChannelSuggestion";
import { IntelliSenseToggle } from "@/components/ai/IntelliSenseToggle";
import { IntelliSenseContextChips } from "@/components/ai/IntelliSenseContextChips";
import { MessageToneSelector } from "@/components/ai/MessageToneSelector";

const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp", hint: "92% delivery · best engagement" },
  { id: "sms", label: "SMS", hint: "88% delivery · fast reach" },
  { id: "email", label: "Email", hint: "78% delivery · detailed content" },
  { id: "rcs", label: "RCS", hint: "85% delivery · rich messaging" },
] as const;

const MESSAGE_PLACEHOLDER =
  "Hi {{name}}, we have something special for you in {{city}}! Shop now and save 20% with code SAVE20.";

interface CampaignCreatorProps {
  open: boolean;
  onClose: () => void;
  segments: Segment[];
  preselectedSegmentId?: string;
  onCreated?: (campaign: Campaign) => void;
}

export function CampaignCreator({
  open,
  onClose,
  segments,
  preselectedSegmentId,
  onCreated,
}: CampaignCreatorProps) {
  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [channel, setChannel] = useState<string>("whatsapp");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [messageTone, setMessageTone] = useState<MessageTone>("friendly");

  const { enabled: intelliSenseOn } = useIntelliSenseEnabled();

  const CHANNEL_LABELS: Record<string, string> = {
    whatsapp: "WhatsApp",
    sms: "SMS",
    email: "Email",
    rcs: "RCS",
  };

  useEffect(() => {
    if (open) {
      setSegmentId(preselectedSegmentId ?? segments[0]?.id ?? "");
      setName("");
      setChannel("whatsapp");
      setMessage("");
      setMessageTone("friendly");
      setError(null);
    }
  }, [open, preselectedSegmentId, segments]);

  const selectedSegment = segments.find((s) => s.id === segmentId);

  const suggestContext = useMemo(
    () => ({
      segmentName: selectedSegment?.name,
      channel,
      tone: messageTone,
    }),
    [selectedSegment?.name, channel, messageTone]
  );

  const nameIntelliSense = useIntelliSense({
    field: "campaignName",
    value: name,
    context: suggestContext,
    enabled: intelliSenseOn && open,
    minLength: 2,
  });

  const messageIntelliSense = useIntelliSense({
    field: "campaignMessage",
    value: message,
    context: suggestContext,
    enabled: intelliSenseOn && open,
    minLength: 3,
  });

  const channelSuggestion = useChannelSuggestion(segmentId, intelliSenseOn && open);

  const handleSave = async (andSend = false) => {
    if (!name.trim() || !segmentId || !message.trim()) {
      setError("Please fill in campaign name, segment, and message.");
      return;
    }

    if (andSend) {
      setConfirmSendOpen(true);
      return;
    }

    await saveCampaign(false);
  };

  const saveCampaign = async (andSend: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const campaign = await api.createCampaign({
        name: name.trim(),
        segmentId,
        message: message.trim(),
        channel,
      });

      if (andSend) {
        await api.sendCampaign(campaign.id);
      }

      onCreated?.(campaign);
      setConfirmSendOpen(false);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create Campaign"
      width="w-[600px]"
    >
      <div className="space-y-6 flex flex-col h-full pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 p-4 bg-[var(--accent-light)] rounded-xl border border-[var(--accent)]/20 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[var(--accent-muted)] flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">New outreach campaign</p>
              <p className="text-xs text-[var(--accent)]">
                Messages will be personalised with {"{{name}}"} and {"{{city}}"}
              </p>
            </div>
          </div>
          <IntelliSenseToggle className="shrink-0" />
        </div>

        {intelliSenseOn && (
          <IntelliSenseContextChips
            segmentName={selectedSegment?.name}
            audienceSize={selectedSegment?.customerCount}
            channel={channel}
            tone={messageTone}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Campaign name
          </label>
          {intelliSenseOn ? (
            <AiIntelliSenseInput
              placeholder="e.g. Diwali Mega Sale"
              value={name}
              onChange={setName}
              intellisense={nameIntelliSense}
            />
          ) : (
            <input
              type="text"
              placeholder="e.g. Diwali Mega Sale"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg py-2.5 px-3 text-sm bg-[var(--bg-input)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)]"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Target segment
          </label>
          <select
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            disabled={!!preselectedSegmentId}
            className="w-full border border-[var(--border)] rounded-lg py-2.5 px-3 text-sm bg-[var(--bg-input)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-70"
          >
            {segments.map((seg) => (
              <option key={seg.id} value={seg.id}>
                {seg.name} ({formatNumber(seg.customerCount)} customers)
              </option>
            ))}
          </select>
          {selectedSegment && (
            <p className="text-xs text-[var(--text-muted)] mt-1.5">
              Reaching {formatNumber(selectedSegment.customerCount)} shoppers
              ({selectedSegment.percentOfTotal}% of audience)
            </p>
          )}
          {intelliSenseOn &&
            !channelSuggestion.dismissed &&
            segmentId &&
            (channelSuggestion.loading || channelSuggestion.channel) && (
              <div className="mt-3">
                <AiChannelSuggestion
                  channel={channelSuggestion.channel ?? "whatsapp"}
                  confidence={channelSuggestion.confidence}
                  reason={channelSuggestion.reason}
                  stats={channelSuggestion.stats}
                  currentChannel={channel}
                  loading={channelSuggestion.loading}
                  onAccept={(ch) => {
                    setChannel(ch);
                    channelSuggestion.dismiss();
                  }}
                  onDismiss={channelSuggestion.dismiss}
                />
              </div>
            )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Channel
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannel(ch.id)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  channel === ch.id
                    ? "border-[var(--accent)] bg-[var(--accent-light)] ring-1 ring-[var(--accent)]"
                    : "border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {ch.label}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  {ch.hint}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Message
            </label>
            {intelliSenseOn && (
              <MessageToneSelector value={messageTone} onChange={setMessageTone} />
            )}
          </div>
          {intelliSenseOn ? (
            <AiIntelliSenseTextarea
              rows={4}
              value={message}
              onChange={setMessage}
              intellisense={messageIntelliSense}
              placeholder={MESSAGE_PLACEHOLDER}
            />
          ) : (
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={MESSAGE_PLACEHOLDER}
              className="w-full border border-[var(--border)] rounded-lg py-2.5 px-3 text-sm bg-[var(--bg-input)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] resize-none"
            />
          )}
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Tokens: {"{{name}}"}, {"{{city}}"} — replaced per customer on send
          </p>
        </div>

        {error && (
          <p className="text-sm text-[var(--error)] bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="pt-4 border-t border-[var(--border-muted)] mt-auto flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 border border-[var(--accent)]/30 text-[var(--accent)] rounded-lg text-sm font-medium hover:bg-[var(--accent-muted)] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save as Draft"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-on-accent)] rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {saving ? "Sending..." : "Create & Send"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSendOpen}
        title="Create & send campaign?"
        message={`Send this campaign to ${formatNumber(selectedSegment?.customerCount ?? 0)} customers via ${CHANNEL_LABELS[channel] ?? channel}?`}
        confirmLabel="Create & Send"
        variant="warning"
        loading={saving}
        onConfirm={() => saveCampaign(true)}
        onCancel={() => setConfirmSendOpen(false)}
      />
    </Drawer>
  );
}
