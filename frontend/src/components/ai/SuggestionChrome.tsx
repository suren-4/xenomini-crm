import { useLayoutEffect } from "react";
import { Check, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntelliSenseState } from "@/hooks/useIntelliSense";

interface SuggestionChromeProps {
  intellisense: IntelliSenseState;
  onAccept: () => void;
  onAcceptWord?: () => void;
  className?: string;
  /** Preserve newlines in the "Will add" preview (message field) */
  multilinePreview?: boolean;
}

export function SuggestionChrome({
  intellisense,
  onAccept,
  onAcceptWord,
  className,
  multilinePreview,
}: SuggestionChromeProps) {
  if (!intellisense.hasSuggestion && !intellisense.loading) return null;

  const preview = multilinePreview
    ? intellisense.suggestion.replace(/^\s+/, "")
    : intellisense.suggestion.trim();

  return (
    <div className={cn("mt-1.5 space-y-1", className)}>
      {intellisense.hasSuggestion && preview && (
        <p
          className={cn(
            "text-[11px] text-[var(--text-muted)] px-2 py-1 rounded border border-[var(--border-muted)] bg-[var(--bg-muted)]",
            multilinePreview
              ? "whitespace-pre-wrap max-h-24 overflow-y-auto"
              : "truncate"
          )}
        >
          <span className="text-[var(--text-subtle)]">Will add: </span>
          <span className="font-medium text-[var(--accent)]">{preview}</span>
        </p>
      )}

      {intellisense.hasSuggestion && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-[var(--accent)] bg-[var(--accent-muted)] hover:bg-[var(--accent-light)] transition-colors"
            title="Accept suggestion (Tab)"
          >
            <Check className="w-3 h-3" />
            Accept
          </button>
          {onAcceptWord && (
            <button
              type="button"
              onClick={onAcceptWord}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Accept one word (Ctrl+→)"
            >
              + Word
            </button>
          )}
          <button
            type="button"
            onClick={intellisense.dismiss}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
            title="Dismiss suggestion (Esc)"
          >
            <X className="w-3 h-3" />
            Dismiss
          </button>

          {intellisense.reason && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-[var(--text-subtle)] cursor-help"
              title={intellisense.reason}
            >
              <HelpCircle className="w-3 h-3" />
              Why this?
              <span className="text-[var(--text-muted)]">
                ({Math.round(intellisense.confidence * 100)}%)
              </span>
            </span>
          )}

          {intellisense.hasMultiple && (
            <span className="text-[10px] text-[var(--text-subtle)] font-medium">
              {intellisense.activeIndex + 1}/{intellisense.suggestions.length} · Alt+] next
            </span>
          )}
        </div>
      )}

      <p className="text-[10px] text-[var(--text-subtle)]">
        {intellisense.loading
          ? "Thinking…"
          : "Tab accept · Ctrl+→ one word · Esc dismiss · Alt+] / Alt+[ cycle variants"}
      </p>
    </div>
  );
}

interface IntelliSenseGhostProps {
  value: string;
  suggestion: string;
  cursorPosition: number;
  multiline?: boolean;
  className?: string;
}

/** Mirror layer behind a transparent input — shows typed text + ghost continuation */
export function IntelliSenseGhost({
  value,
  suggestion,
  cursorPosition,
  multiline,
  className,
}: IntelliSenseGhostProps) {
  if (!suggestion) return null;

  const before = value.slice(0, cursorPosition);
  const after = value.slice(cursorPosition);
  const wrap = multiline ? "whitespace-pre-wrap break-words" : "whitespace-pre";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none px-3 py-2.5 text-sm leading-relaxed text-[var(--text-primary)] overflow-hidden",
        multiline ? "min-h-[2.5rem]" : "flex items-center min-h-[2.5rem]",
        className
      )}
    >
      <span className={cn(wrap, "block w-full")}>
        {before}
        <span className="text-[var(--text-muted)] opacity-80 font-normal">{suggestion}</span>
        {after}
      </span>
    </div>
  );
}

export function syncCursor(
  el: HTMLInputElement | HTMLTextAreaElement,
  setCursor: (n: number) => void
) {
  const pos = el.selectionStart ?? el.value.length;
  setCursor(pos);
}

/** Keep hook cursor aligned with the real caret after paint */
export function useSyncInputCursor(
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  setCursor: (n: number) => void,
  deps: unknown[]
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) syncCursor(el, setCursor);
  }, deps);
}

export function useIntelliSenseKeyboard(
  intellisense: IntelliSenseState,
  onAccept: () => void,
  onAcceptWord?: () => void
) {
  return (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Tab" && intellisense.hasSuggestion && !e.shiftKey) {
      e.preventDefault();
      onAccept();
      return true;
    }
    if (e.key === "Escape" && intellisense.hasSuggestion) {
      e.preventDefault();
      intellisense.dismiss();
      return true;
    }
    if (e.altKey && (e.key === "]" || e.code === "BracketRight") && intellisense.hasMultiple) {
      e.preventDefault();
      intellisense.nextSuggestion();
      return true;
    }
    if (e.altKey && (e.key === "[" || e.code === "BracketLeft") && intellisense.hasMultiple) {
      e.preventDefault();
      intellisense.prevSuggestion();
      return true;
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key === "ArrowRight" &&
      intellisense.hasSuggestion &&
      onAcceptWord
    ) {
      e.preventDefault();
      onAcceptWord();
      return true;
    }
    return false;
  };
}

export const intelliSenseInputBaseClass =
  "relative z-10 w-full bg-transparent py-2.5 px-3 text-sm caret-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none selection:bg-[var(--accent-muted)]";

export function intelliSenseInputActiveClass(hasSuggestion: boolean) {
  return hasSuggestion
    ? cn(intelliSenseInputBaseClass, "text-transparent")
    : cn(intelliSenseInputBaseClass, "text-[var(--text-primary)]");
}

export const intelliSenseFieldGrid =
  "grid [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:col-end-2 [&>*]:row-end-2";
