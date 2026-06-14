import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { api, type SegmentRule } from "@/lib/api";
import { Button } from "@/components/ui/Button";

const EXAMPLES = [
  "Inactive high-spenders in Mumbai",
  "VIP customers who haven't ordered in 90 days",
  "Frequent buyers in Bangalore",
];

interface SuggestAudiencePanelProps {
  onApply: (result: {
    name: string;
    ruleLogic: "AND" | "OR";
    rules: SegmentRule[];
  }) => void;
}

export function SuggestAudiencePanel({ onApply }: SuggestAudiencePanelProps) {
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    const trimmed = intent.trim();
    if (trimmed.length < 3) return;

    setLoading(true);
    setError(null);
    setReason(null);

    try {
      const result = await api.suggestSegment(trimmed);
      if (!result.rules.length) {
        setError("Could not build rules — try a more specific description.");
        return;
      }
      onApply({
        name: result.name,
        ruleLogic: result.ruleLogic,
        rules: result.rules,
      });
      setReason(result.reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suggestion failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--accent-muted)] bg-[var(--accent-light)]/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Suggest audience</h3>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Describe who you want to reach in plain English — AI fills the rules below.
      </p>

      <textarea
        rows={2}
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        placeholder='e.g. "Inactive VIP shoppers in Delhi who spent over ₹10k"'
        className="w-full border border-[var(--border)] rounded-lg py-2 px-3 text-sm bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-muted)] resize-none"
      />

      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setIntent(ex)}
            className="text-[10px] px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        onClick={handleSuggest}
        disabled={loading || intent.trim().length < 3}
        leftIcon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      >
        {loading ? "Thinking…" : "Suggest audience"}
      </Button>

      {reason && (
        <p className="text-xs text-[var(--accent)] bg-[var(--accent-muted)] px-2 py-1.5 rounded-lg">
          {reason}
        </p>
      )}
      {error && (
        <p className="text-xs text-[var(--error)]">{error}</p>
      )}
    </div>
  );
}
