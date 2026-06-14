import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type AiSuggestContext,
  type SuggestField,
  type SuggestionItem,
} from "@/lib/api";
import {
  isDismissed,
  recordDismissals,
} from "@/lib/intellisenseSession";
import { insertAtCursor, takeFirstWord } from "@/lib/intellisenseUtils";

const DEBOUNCE_MS = 600;

export interface IntelliSenseState {
  suggestion: string;
  suggestions: SuggestionItem[];
  activeIndex: number;
  confidence: number;
  reason: string;
  loading: boolean;
  hasSuggestion: boolean;
  hasMultiple: boolean;
  cursorPosition: number;
  setCursorPosition: (pos: number) => void;
  accept: () => string;
  acceptWord: () => string;
  dismiss: () => void;
  invalidate: () => void;
  nextSuggestion: () => void;
  prevSuggestion: () => void;
}

function applyActive(
  items: SuggestionItem[],
  index: number
): Pick<IntelliSenseState, "suggestion" | "confidence" | "reason" | "activeIndex"> {
  const item = items[index];
  if (!item) {
    return { suggestion: "", confidence: 0, reason: "", activeIndex: 0 };
  }
  return {
    suggestion: item.suggestion,
    confidence: item.confidence,
    reason: item.reason,
    activeIndex: index,
  };
}

export function useIntelliSense({
  field,
  value,
  context,
  enabled,
  minLength = 2,
}: {
  field: SuggestField;
  value: string;
  context?: AiSuggestContext;
  enabled: boolean;
  minLength?: number;
}): IntelliSenseState {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestion, setSuggestion] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(value.length);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setCursorPosition((pos) => Math.min(Math.max(pos, 0), value.length));
  }, [value]);

  const partial = value.slice(0, cursorPosition);

  const clearSuggestionState = useCallback(() => {
    setSuggestions([]);
    setSuggestion("");
    setConfidence(0);
    setReason("");
    setActiveIndex(0);
  }, []);

  const invalidate = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearSuggestionState();
    setLoading(false);
  }, [clearSuggestionState]);

  const dismiss = useCallback(() => {
    recordDismissals(
      field,
      partial,
      suggestions.length ? suggestions : suggestion ? [{ suggestion }] : []
    );
    invalidate();
  }, [field, partial, suggestions, suggestion, invalidate]);

  const accept = useCallback(() => {
    if (!suggestion) return value;
    const next = insertAtCursor(value, cursorPosition, suggestion);
    clearSuggestionState();
    setCursorPosition(cursorPosition + suggestion.length);
    return next;
  }, [value, cursorPosition, suggestion, clearSuggestionState]);

  const acceptWord = useCallback(() => {
    if (!suggestion) return value;
    const { word, remaining } = takeFirstWord(suggestion);
    if (!word) return accept();
    const next = insertAtCursor(value, cursorPosition, word);
    const newCursor = cursorPosition + word.length;
    setCursorPosition(newCursor);
    if (remaining) {
      setSuggestion(remaining);
      setSuggestions((prev) => {
        const updated = [...prev];
        if (updated[activeIndex]) {
          updated[activeIndex] = { ...updated[activeIndex], suggestion: remaining };
        }
        return updated;
      });
    } else {
      clearSuggestionState();
    }
    return next;
  }, [value, cursorPosition, suggestion, activeIndex, accept, clearSuggestionState]);

  const setActive = useCallback((items: SuggestionItem[], index: number) => {
    setSuggestions(items);
    const active = applyActive(items, index);
    setActiveIndex(active.activeIndex);
    setSuggestion(active.suggestion);
    setConfidence(active.confidence);
    setReason(active.reason);
  }, []);

  const nextSuggestion = useCallback(() => {
    if (suggestions.length <= 1) return;
    const next = (activeIndex + 1) % suggestions.length;
    const active = applyActive(suggestions, next);
    setActiveIndex(active.activeIndex);
    setSuggestion(active.suggestion);
    setConfidence(active.confidence);
    setReason(active.reason);
  }, [suggestions, activeIndex]);

  const prevSuggestion = useCallback(() => {
    if (suggestions.length <= 1) return;
    const prev = (activeIndex - 1 + suggestions.length) % suggestions.length;
    const active = applyActive(suggestions, prev);
    setActiveIndex(active.activeIndex);
    setSuggestion(active.suggestion);
    setConfidence(active.confidence);
    setReason(active.reason);
  }, [suggestions, activeIndex]);

  useEffect(() => {
    if (!enabled) {
      invalidate();
      return;
    }

    if (partial.trim().length < minLength) {
      clearSuggestionState();
      setLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    clearSuggestionState();

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      const reqId = ++requestIdRef.current;
      setLoading(true);

      api
        .suggest({ field, partial, context }, controller.signal)
        .then((result) => {
          if (controller.signal.aborted || reqId !== requestIdRef.current) return;

          const filtered = (result.suggestions ?? []).filter(
            (item) =>
              item.suggestion.length > 0 &&
              !isDismissed(field, partial, item.suggestion)
          );

          if (!filtered.length && result.suggestion) {
            const single = {
              suggestion: result.suggestion,
              confidence: result.confidence,
              reason: result.reason,
            };
            if (!isDismissed(field, partial, single.suggestion)) {
              filtered.push(single);
            }
          }

          if (filtered.length) {
            setActive(filtered, 0);
          }
        })
        .catch(() => {
          /* silent */
        })
        .finally(() => {
          if (!controller.signal.aborted && reqId === requestIdRef.current) {
            setLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    partial,
    field,
    context?.segmentName,
    context?.channel,
    context?.tone,
    enabled,
    minLength,
    clearSuggestionState,
    setActive,
    invalidate,
  ]);

  return {
    suggestion,
    suggestions,
    activeIndex,
    confidence,
    reason,
    loading,
    hasSuggestion: suggestion.length > 0,
    hasMultiple: suggestions.length > 1,
    cursorPosition,
    setCursorPosition,
    accept,
    acceptWord,
    dismiss,
    invalidate,
    nextSuggestion,
    prevSuggestion,
  };
}

export interface ChannelSuggestionState {
  channel: string | null;
  confidence: number;
  reason: string;
  stats?: { openRate: number; deliveryRate: number; clickRate: number };
  loading: boolean;
  dismissed: boolean;
  dismiss: () => void;
  resetDismiss: () => void;
}

export function useChannelSuggestion(segmentId: string, enabled: boolean): ChannelSuggestionState {
  const [channel, setChannel] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [reason, setReason] = useState("");
  const [stats, setStats] = useState<ChannelSuggestionState["stats"]>();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !segmentId) {
      setChannel(null);
      setConfidence(0);
      setReason("");
      setStats(undefined);
      setDismissed(false);
      return;
    }

    setDismissed(false);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    api
      .suggestChannel(segmentId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setChannel(result.channel);
        setConfidence(result.confidence);
        setReason(result.reason);
        setStats(result.stats);
      })
      .catch(() => {
        /* silent */
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [segmentId, enabled]);

  return {
    channel,
    confidence,
    reason,
    stats,
    loading,
    dismissed,
    dismiss: () => setDismissed(true),
    resetDismiss: () => setDismissed(false),
  };
}
