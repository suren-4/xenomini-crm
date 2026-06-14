import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { IntelliSenseState } from "@/hooks/useIntelliSense";
import {
  IntelliSenseGhost,
  intelliSenseFieldGrid,
  intelliSenseInputActiveClass,
  SuggestionChrome,
  syncCursor,
  useIntelliSenseKeyboard,
  useSyncInputCursor,
} from "./SuggestionChrome";

interface AiIntelliSenseInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
  intellisense: IntelliSenseState;
}

export function AiIntelliSenseInput({
  value,
  onChange,
  intellisense,
  className,
  onKeyDown,
  onSelect,
  onClick,
  onKeyUp,
  onFocus,
  ...props
}: AiIntelliSenseInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useSyncInputCursor(inputRef, intellisense.setCursorPosition, [
    value,
    intellisense.suggestion,
    intellisense.activeIndex,
  ]);

  const handleAccept = () => {
    onChange(intellisense.accept());
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const handleAcceptWord = () => {
    onChange(intellisense.acceptWord());
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const handleKeyboard = useIntelliSenseKeyboard(intellisense, handleAccept, handleAcceptWord);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!handleKeyboard(e)) onKeyDown?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    intellisense.invalidate();
    syncCursor(e.target, intellisense.setCursorPosition);
    onChange(e.target.value);
  };

  const handleCursor = (e: React.SyntheticEvent<HTMLInputElement>) => {
    syncCursor(e.currentTarget, intellisense.setCursorPosition);
    onSelect?.(e as React.SyntheticEvent<HTMLInputElement>);
    onClick?.(e as React.MouseEvent<HTMLInputElement>);
    onKeyUp?.(e as React.KeyboardEvent<HTMLInputElement>);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    syncCursor(e.currentTarget, intellisense.setCursorPosition);
    onFocus?.(e);
  };

  return (
    <div>
      <div
        className={cn(
          "relative rounded-lg border border-[var(--border)] bg-[var(--bg-input)] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent-muted)]",
          intelliSenseFieldGrid
        )}
      >
        {intellisense.hasSuggestion && (
          <IntelliSenseGhost
            value={value}
            suggestion={intellisense.suggestion}
            cursorPosition={intellisense.cursorPosition}
          />
        )}
        <input
          {...props}
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleCursor}
          onClick={handleCursor}
          onKeyUp={handleCursor}
          onFocus={handleFocus}
          spellCheck={false}
          autoComplete="off"
          className={cn(intelliSenseInputActiveClass(intellisense.hasSuggestion), className)}
        />
      </div>
      <SuggestionChrome
        intellisense={intellisense}
        onAccept={handleAccept}
        onAcceptWord={handleAcceptWord}
      />
    </div>
  );
}
