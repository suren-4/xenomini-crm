import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TEXTAREA_PAD = "px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words";

interface IntelliSenseTextareaGhostProps {
  value: string;
  suggestion: string;
  cursorPosition: number;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Positions ghost continuation at the caret without hiding textarea text.
 * Uses a hidden measure layer + scroll offset to match multiline caret position.
 */
export function IntelliSenseTextareaGhost({
  value,
  suggestion,
  cursorPosition,
  textareaRef,
}: IntelliSenseTextareaGhostProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 10, left: 12 });
  const [scrollTop, setScrollTop] = useState(0);

  const before = value.slice(0, cursorPosition);

  const measure = () => {
    const ta = textareaRef.current;
    const layer = measureRef.current;
    if (!ta || !layer) return;

    const anchor = layer.querySelector("[data-ghost-anchor]");
    const container = ta.parentElement;
    if (!anchor || !container) return;

    const anchorRect = anchor.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setPos({
      top: anchorRect.top - containerRect.top,
      left: anchorRect.left - containerRect.left,
    });
    setScrollTop(ta.scrollTop);
  };

  useLayoutEffect(() => {
    measure();
  }, [value, suggestion, cursorPosition, textareaRef]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onScroll = () => measure();
    ta.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      ta.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [textareaRef, value, cursorPosition, suggestion]);

  if (!suggestion) return null;

  return (
    <>
      <div
        ref={measureRef}
        aria-hidden
        className={cn(
          "absolute inset-0 overflow-hidden pointer-events-none select-none",
          TEXTAREA_PAD
        )}
        style={{ visibility: "hidden" }}
      >
        <div style={{ transform: `translateY(-${scrollTop}px)` }}>
          {before}
          <span data-ghost-anchor className="inline-block w-0 h-[1em] align-text-bottom" />
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          "absolute z-20 pointer-events-none text-[var(--text-muted)] opacity-90 text-sm leading-relaxed whitespace-pre-wrap break-words"
        )}
        style={{ top: pos.top, left: pos.left }}
      >
        {suggestion}
      </div>
    </>
  );
}

export const textareaFieldClass =
  "relative z-10 w-full bg-transparent py-2.5 px-3 text-sm leading-relaxed text-[var(--text-primary)] caret-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none resize-none min-h-[6.5rem] selection:bg-[var(--accent-muted)]";
