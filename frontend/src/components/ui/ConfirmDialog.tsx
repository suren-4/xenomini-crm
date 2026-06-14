import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "warning",
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-[var(--overlay)] backdrop-blur-sm"
            onClick={loading ? undefined : onCancel}
            aria-hidden
          />
          <div className="fixed inset-0 z-[111] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              className="pointer-events-auto w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow-lg)] p-6"
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={cn(
                    "w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0",
                    variant === "danger"
                      ? "bg-[var(--error-bg)] text-[var(--error)]"
                      : "bg-[var(--warning-bg)] text-[var(--warning)]"
                  )}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="confirm-dialog-title"
                    className="text-lg font-semibold text-[var(--text-primary)]"
                  >
                    {title}
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{message}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel} disabled={loading}>
                  {cancelLabel}
                </Button>
                <Button
                  variant={variant === "danger" ? "danger" : "primary"}
                  onClick={onConfirm}
                  disabled={loading}
                >
                  {loading ? "Please wait..." : confirmLabel}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
