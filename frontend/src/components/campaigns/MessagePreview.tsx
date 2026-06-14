import { cn } from "@/lib/utils";
import { Mail, MessageCircle, Smartphone, Radio } from "lucide-react";

interface MessagePreviewProps {
  channel: string;
  message: string;
  campaignName?: string;
}

function PreviewLabel({ channel }: { channel: string }) {
  const labels: Record<string, { icon: typeof Mail; text: string }> = {
    whatsapp: { icon: MessageCircle, text: "WhatsApp Preview" },
    sms: { icon: Smartphone, text: "SMS Preview" },
    email: { icon: Mail, text: "Email Preview" },
    rcs: { icon: Radio, text: "RCS Preview" },
  };
  const config = labels[channel] ?? labels.sms;
  const Icon = config.icon;
  return (
    <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wide flex items-center gap-1.5 mb-3">
      <Icon className="w-3 h-3" />
      {config.text}
    </p>
  );
}

function WhatsAppPreview({ message }: { message: string }) {
  return (
    <div
      className="rounded-[var(--radius)] p-4 min-h-[140px]"
      style={{
        backgroundColor: "#e5ddd5",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      }}
    >
      <div className="flex items-end gap-2">
        <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center text-white text-xs font-bold shrink-0">
          X
        </div>
        <div className="relative max-w-[85%] bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm">
          <div
            className="absolute -left-2 bottom-3 w-0 h-0"
            style={{
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderRight: "8px solid white",
            }}
          />
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{message}</p>
          <p className="text-[10px] text-gray-400 text-right mt-1">12:30 PM ✓✓</p>
        </div>
      </div>
    </div>
  );
}

function SmsPreview({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-muted)] p-4">
      <div className="mx-auto max-w-[260px] rounded-2xl border-4 border-gray-800 bg-gray-900 overflow-hidden shadow-lg">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">9:41</span>
          <div className="flex gap-1">
            <span className="w-3 h-1.5 rounded-sm bg-gray-600" />
            <span className="w-3 h-1.5 rounded-sm bg-gray-600" />
          </div>
        </div>
        <div className="bg-gray-950 px-3 py-4 min-h-[120px]">
          <p className="text-[10px] text-gray-500 text-center mb-3">Messages</p>
          <div className="flex justify-start">
            <div className="max-w-[90%] bg-[#34c759] text-white text-sm rounded-2xl rounded-bl-sm px-3 py-2 leading-relaxed">
              {message}
            </div>
          </div>
          <p className="text-[9px] text-gray-600 mt-1 ml-1">Text Message · Now</p>
        </div>
      </div>
    </div>
  );
}

function EmailPreview({ message, campaignName }: { message: string; campaignName?: string }) {
  const subject = campaignName ? `${campaignName} — Special offer inside` : "Your exclusive offer";
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] overflow-hidden">
      <div className="bg-[var(--bg-muted)] px-4 py-3 border-b border-[var(--border)] space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-subtle)] w-12 shrink-0">From</span>
          <span className="text-[var(--text-primary)] font-medium">Xeno CRM &lt;hello@xeno.in&gt;</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-subtle)] w-12 shrink-0">Subject</span>
          <span className="text-[var(--text-primary)] font-semibold">{subject}</span>
        </div>
      </div>
      <div className="bg-[var(--bg-card)] p-4">
        <div className="border border-[var(--border)] rounded-[var(--radius-sm)] p-4 bg-[var(--bg-elevated)]">
          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--accent)] flex items-center justify-center text-[var(--text-on-accent)] font-bold text-sm mb-3">
            X
          </div>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{message}</p>
          <div className="mt-4 pt-3 border-t border-[var(--border-muted)]">
            <span className="inline-block px-4 py-2 bg-[var(--accent)] text-[var(--text-on-accent)] text-xs font-semibold rounded-[var(--radius-sm)]">
              Shop Now
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RcsPreview({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-gradient-to-br from-[var(--channel-rcs-bg)] to-[var(--bg-muted)] p-4">
      <div className="bg-[var(--bg-card)] rounded-[var(--radius)] border border-[var(--channel-rcs-border)] overflow-hidden shadow-[var(--shadow)]">
        <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-500" />
        <div className="p-4">
          <p className="text-xs font-semibold text-[var(--channel-rcs-text)] mb-2">Rich Message</p>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{message}</p>
          <div className="mt-3 flex gap-2">
            <span className="text-xs font-medium text-[var(--accent)] px-3 py-1.5 rounded-full border border-[var(--accent)]">
              View Offer
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)] px-3 py-1.5 rounded-full border border-[var(--border)]">
              Dismiss
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MessagePreview({ channel, message, campaignName }: MessagePreviewProps) {
  return (
    <div>
      <PreviewLabel channel={channel} />
      {channel === "whatsapp" && <WhatsAppPreview message={message} />}
      {channel === "sms" && <SmsPreview message={message} />}
      {channel === "email" && <EmailPreview message={message} campaignName={campaignName} />}
      {channel === "rcs" && <RcsPreview message={message} />}
      {!["whatsapp", "sms", "email", "rcs"].includes(channel) && <SmsPreview message={message} />}
    </div>
  );
}
