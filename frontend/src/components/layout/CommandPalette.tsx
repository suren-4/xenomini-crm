import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Layers,
  Megaphone,
  BarChart3,
  Bot,
  Plus,
  Search,
} from "lucide-react";
import { fuzzyFilter } from "@/lib/fuzzySearch";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  label: string;
  keywords?: string[];
  group: "Pages" | "Actions";
  icon: ReactNode;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenCampaignGPT: () => void;
}

export function CommandPalette({ open, onClose, onOpenCampaignGPT }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "customers",
        label: "Customers",
        keywords: ["users", "contacts", "people"],
        group: "Pages",
        icon: <Users className="w-4 h-4" strokeWidth={1.75} />,
        run: () => navigate("/customers"),
      },
      {
        id: "segments",
        label: "Segments",
        keywords: ["audience", "groups", "lists"],
        group: "Pages",
        icon: <Layers className="w-4 h-4" strokeWidth={1.75} />,
        run: () => navigate("/segments"),
      },
      {
        id: "campaigns",
        label: "Campaigns",
        keywords: ["messages", "outreach", "marketing"],
        group: "Pages",
        icon: <Megaphone className="w-4 h-4" strokeWidth={1.75} />,
        run: () => navigate("/campaigns"),
      },
      {
        id: "analytics",
        label: "Analytics",
        keywords: ["stats", "metrics", "reports", "funnel", "pages"],
        group: "Pages",
        icon: <BarChart3 className="w-4 h-4" strokeWidth={1.75} />,
        run: () => navigate("/analytics"),
      },
      {
        id: "create-campaign",
        label: "Create Campaign",
        keywords: ["new", "launch", "send"],
        group: "Actions",
        icon: <Plus className="w-4 h-4" strokeWidth={1.75} />,
        run: () => navigate("/campaigns?action=create"),
      },
      {
        id: "create-segment",
        label: "Create Segment",
        keywords: ["new", "audience", "group"],
        group: "Actions",
        icon: <Plus className="w-4 h-4" strokeWidth={1.75} />,
        run: () => navigate("/segments?action=create"),
      },
      {
        id: "open-gpt",
        label: "Open CampaignGPT",
        keywords: ["ai", "agent", "chat", "assistant"],
        group: "Actions",
        icon: <Bot className="w-4 h-4" strokeWidth={1.75} />,
        run: () => onOpenCampaignGPT(),
      },
      {
        id: "go-dashboard",
        label: "Go To Dashboard",
        keywords: ["home", "overview", "main"],
        group: "Actions",
        icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.75} />,
        run: () => navigate("/"),
      },
    ],
    [navigate, onOpenCampaignGPT]
  );

  const filtered = useMemo(
    () =>
      fuzzyFilter(commands, query, (cmd) =>
        [cmd.label, cmd.group, ...(cmd.keywords ?? [])].join(" ")
      ),
    [commands, query]
  );

  const grouped = useMemo(() => {
    const groups: { name: CommandItem["group"]; items: CommandItem[] }[] = [];
    for (const group of ["Pages", "Actions"] as const) {
      const items = filtered.filter((c) => c.group === group);
      if (items.length > 0) groups.push({ name: group, items });
    }
    return groups;
  }, [filtered]);

  const flatFiltered = useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped]
  );

  const execute = useCallback(
    (item: CommandItem) => {
      item.run();
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(flatFiltered.length, 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) =>
          i === 0 ? Math.max(flatFiltered.length - 1, 0) : i - 1
        );
      }
      if (e.key === "Enter" && flatFiltered[activeIndex]) {
        e.preventDefault();
        execute(flatFiltered[activeIndex]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatFiltered, activeIndex, execute, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let runningIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-[var(--overlay)] backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[12vh] px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="pointer-events-auto w-full max-w-lg bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius)] shadow-[var(--shadow-lg)] overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
            >
              <div className="flex items-center gap-3 px-4 border-b border-[var(--border)]">
                <Search className="w-4 h-4 text-[var(--text-subtle)] shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages and actions..."
                  className="flex-1 h-12 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]"
                  autoComplete="off"
                  spellCheck={false}
                />
                <kbd className="hidden sm:inline-flex text-[10px] font-mono text-[var(--text-subtle)] px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-muted)]">
                  esc
                </kbd>
              </div>

              <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
                {flatFiltered.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                ) : (
                  grouped.map((group) => (
                    <div key={group.name} className="mb-1">
                      <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                        {group.name}
                      </p>
                      {group.items.map((cmd) => {
                        const idx = runningIndex++;
                        const isActive = idx === activeIndex;
                        return (
                          <button
                            key={cmd.id}
                            type="button"
                            data-cmd-index={idx}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => execute(cmd)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                              isActive
                                ? "bg-[var(--accent-muted)] text-[var(--text-primary)]"
                                : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                            )}
                          >
                            <span
                              className={cn(
                                "w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 border",
                                isActive
                                  ? "bg-[var(--bg-card)] border-[var(--accent)] text-[var(--accent)]"
                                  : "bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text-muted)]"
                              )}
                            >
                              {cmd.icon}
                            </span>
                            <span className="flex-1 text-sm font-medium">{cmd.label}</span>
                            {isActive && (
                              <kbd className="text-[10px] font-mono text-[var(--text-subtle)]">↵</kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-muted)] flex items-center justify-between text-[10px] text-[var(--text-subtle)]">
                <span className="flex items-center gap-2">
                  <kbd className="px-1 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-card)] font-mono">↑↓</kbd>
                  navigate
                  <kbd className="px-1 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-card)] font-mono ml-1">↵</kbd>
                  select
                </span>
                <span className="font-mono">Ctrl+K</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
