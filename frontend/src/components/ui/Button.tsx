import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)] border border-transparent shadow-[var(--shadow)]",
  secondary:
    "bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border)]",
  ghost:
    "bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border border-transparent",
  outline:
    "bg-transparent text-[var(--accent)] hover:bg-[var(--accent-muted)] border border-[var(--accent)]",
  danger:
    "bg-[var(--error-bg)] text-[var(--error)] hover:opacity-90 border border-[var(--error-border)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-[var(--radius-sm)] transition-colors focus-ring disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
);

Button.displayName = "Button";
