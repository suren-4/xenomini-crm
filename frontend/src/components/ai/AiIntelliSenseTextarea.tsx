import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { IntelliSenseState } from "@/hooks/useIntelliSense";
import { IntelliSenseTextareaGhost, textareaFieldClass } from "./IntelliSenseTextareaGhost";
import {
  SuggestionChrome,
  syncCursor,
  useIntelliSenseKeyboard,
  useSyncInputCursor,
} from "./SuggestionChrome";

interface AiIntelliSenseTextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
  intellisense: IntelliSenseState;
}

export function AiIntelliSenseTextarea({
  value,
  onChange,
  intellisense,
  className,
  onKeyDown,
  onSelect,
  onClick,
  onKeyUp,
  onFocus,
  rows = 4,
  ...props
}: AiIntelliSenseTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useSyncInputCursor(textareaRef, intellisense.setCursorPosition, [
    value,
    intellisense.suggestion,
    intellisense.activeIndex,
  ]);

  const handleAccept = () => {
    onChange(intellisense.accept());
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const handleAcceptWord = () => {
    onChange(intellisense.acceptWord());
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const handleKeyboard = useIntelliSenseKeyboard(intellisense, handleAccept, handleAcceptWord);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!handleKeyboard(e)) onKeyDown?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    intellisense.invalidate();
    syncCursor(e.target, intellisense.setCursorPosition);
    onChange(e.target.value);
  };

  const handleCursor = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    syncCursor(e.currentTarget, intellisense.setCursorPosition);
    onSelect?.(e as React.SyntheticEvent<HTMLTextAreaElement>);
    onClick?.(e as React.MouseEvent<HTMLTextAreaElement>);
    onKeyUp?.(e as React.KeyboardEvent<HTMLTextAreaElement>);
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    syncCursor(e.currentTarget, intellisense.setCursorPosition);
    onFocus?.(e);
  };

  const showGhost = intellisense.hasSuggestion;

  return (
    <div>
      <div
        className={cn(
          "relative rounded-lg border border-[var(--border)] bg-[var(--bg-input)] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent-muted)]"
        )}
      >
        {showGhost && (
          <IntelliSenseTextareaGhost
            value={value}
            suggestion={intellisense.suggestion}
            cursorPosition={intellisense.cursorPosition}
            textareaRef={textareaRef}
          />
        )}
        <textarea
          {...props}
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleCursor}
          onClick={handleCursor}
          onKeyUp={handleCursor}
          onFocus={handleFocus}
          spellCheck={false}
          className={cn(textareaFieldClass, className)}
        />
      </div>
      <SuggestionChrome
        intellisense={intellisense}
        onAccept={handleAccept}
        onAcceptWord={handleAcceptWord}
        multilinePreview
      />
    </div>
  );
}
