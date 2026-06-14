import { useState, useRef, useEffect, type ReactNode, type RefObject } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Layers,
  Megaphone,
  BarChart3,
  Bot,
  Command,
  Moon,
  Sun,
  Info,
  Bell,
  Sparkles,
  CheckCircle,
  Eye,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface TopBarProps {
  isChatOpen: boolean;
  onToggleChat: () => void;
  onOpenCommandPalette: () => void;
}

const ROUTE_META: Record<string, { icon: typeof LayoutDashboard; label: string }> = {
  "/": { icon: LayoutDashboard, label: "Dashboard" },
  "/customers": { icon: Users, label: "Customers" },
  "/segments": { icon: Layers, label: "Segments" },
  "/campaigns": { icon: Megaphone, label: "Campaigns" },
  "/analytics": { icon: BarChart3, label: "Analytics" },
};

const SHORTCUTS = [
  { action: "Command palette", keys: "⌘K" },
  { action: "Open CampaignGPT", keys: "Sidebar" },
  { action: "Search Customers", keys: "⌘F" },
  { action: "Toggle Sidebar", keys: "⌘B" },
  { action: "Toggle Theme", keys: "⌘⇧L" },
];

const ABOUT_ROWS = [
  { label: "Version", value: "1.0.0" },
  { label: "Built with", value: "React + Groq AI" },
  { label: "Backend", value: "Express + Prisma" },
  { label: "Database", value: "PostgreSQL" },
];

const ACTIVITY_ITEMS = [
  {
    icon: CheckCircle,
    iconClass: "text-[var(--success)]",
    bgClass: "bg-[var(--success-bg)]",
    title: "Diwali Campaign delivered",
    subtitle: "312 messages · 5d ago",
  },
  {
    icon: Eye,
    iconClass: "text-[var(--channel-sms-text)]",
    bgClass: "bg-[var(--channel-sms-bg)]",
    title: "Summer Clearance opened",
    subtitle: "139 opens · 2w ago",
  },
  {
    icon: Zap,
    iconClass: "text-[var(--warning)]",
    bgClass: "bg-[var(--warning-bg)]",
    title: "Win-Back Campaign clicked",
    subtitle: "24 clicks · 4w ago",
  },
  {
    icon: Users,
    iconClass: "text-[var(--channel-email-text)]",
    bgClass: "bg-[var(--channel-email-bg)]",
    title: "New segment created",
    subtitle: "Premium VIP · 1d ago",
  },
];

function Tooltip({ label }: { label: string }) {
  return (
    <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
      <div className="relative bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[10px] font-medium rounded-md px-2.5 py-1.5 border border-[var(--border)] whitespace-nowrap shadow-[var(--shadow-md)]">
        <span
          className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-[6px] h-[6px] bg-[var(--bg-elevated)] border-l border-t border-[var(--border)] rotate-45"
          aria-hidden
        />
        {label}
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  tooltip,
  active,
  children,
  className,
}: {
  onClick: () => void;
  tooltip: string;
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative w-[30px] h-[30px] rounded-[7px] flex items-center justify-center cursor-pointer transition-all duration-150 ease-in-out bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:shadow-[var(--shadow)] hover:text-[var(--text-primary)]",
          active && "text-[var(--accent)] bg-[var(--accent-muted)] border border-[var(--accent)]/25 shadow-none",
          className
        )}
      >
        {children}
      </button>
      <Tooltip label={tooltip} />
    </div>
  );
}

function DropdownModal({
  open,
  onClose,
  anchorRef,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        modalRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={modalRef}
      className={cn(
        "absolute top-11 right-0 w-[280px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-lg)] z-50",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TopBar({ isChatOpen, onToggleChat, onOpenCommandPalette }: TopBarProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [sunRotation, setSunRotation] = useState(0);

  const shortcutsRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);

  const routeKey =
    location.pathname === "/" ? "/" : `/${location.pathname.split("/")[1]}`;
  const meta = ROUTE_META[routeKey] ?? ROUTE_META["/"];
  const PageIcon = meta.icon;

  const closeOtherPanels = (except?: "shortcuts" | "about" | "activity") => {
    if (except !== "shortcuts") setShortcutsOpen(false);
    if (except !== "about") setAboutOpen(false);
    if (except !== "activity") setActivityOpen(false);
  };

  const handleThemeToggle = () => {
    if (theme === "light") {
      toggleTheme();
      setSunRotation(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSunRotation(180));
      });
    } else {
      setSunRotation(360);
      window.setTimeout(() => {
        toggleTheme();
        setSunRotation(0);
      }, 400);
    }
  };

  return (
    <>
      <style>{`
        @keyframes aipulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .topbar-aipulse {
          animation: aipulse 2s ease infinite;
        }
      `}</style>

      <header className="h-10 shrink-0 bg-[var(--bg-card)] border-b border-[var(--border)] px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PageIcon className="w-3 h-3 text-[var(--text-muted)]" strokeWidth={1.75} />
          <span className="text-[12px] text-[var(--text-muted)] font-medium">
            {meta.label}
          </span>
        </div>

        <div className="flex items-center bg-[var(--bg-hover)] border border-[var(--border)] rounded-[10px] p-[3px] gap-px">
          <IconButton
            onClick={onToggleChat}
            tooltip="CampaignGPT"
            active={isChatOpen}
          >
            <Bot className="w-4 h-4" strokeWidth={1.75} />
            {isChatOpen && (
              <span className="absolute top-[4px] right-[4px] w-[6px] h-[6px] bg-[var(--accent)] rounded-full topbar-aipulse" />
            )}
          </IconButton>

          <IconButton
            onClick={onOpenCommandPalette}
            tooltip="Command palette (Ctrl+K)"
          >
            <Command className="w-[15px] h-[15px]" strokeWidth={1.75} />
          </IconButton>

          <div className="relative" ref={shortcutsRef}>
            <IconButton
              onClick={() => {
                setShortcutsOpen((prev) => !prev);
                closeOtherPanels("shortcuts");
              }}
              tooltip="Keyboard shortcuts"
            >
              <span className="text-[10px] font-mono font-semibold">?</span>
            </IconButton>

            <DropdownModal
              open={shortcutsOpen}
              onClose={() => setShortcutsOpen(false)}
              anchorRef={shortcutsRef}
              className="p-4"
            >
              <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-3">
                Keyboard Shortcuts
              </p>
              <div className="space-y-1">
                {SHORTCUTS.map((item) => (
                  <div
                    key={item.action}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {item.action}
                    </span>
                    <span className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-[5px] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
                      {item.keys}
                    </span>
                  </div>
                ))}
              </div>
            </DropdownModal>
          </div>

          <IconButton
            onClick={handleThemeToggle}
            tooltip={
              theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"
            }
          >
            {theme === "light" ? (
              <div className="relative flex items-center justify-center">
                <Moon className="w-[15px] h-[15px]" strokeWidth={1.75} />
                <span className="absolute top-[1px] right-[1px] w-[3px] h-[3px] rounded-full bg-[var(--text-subtle)]" />
              </div>
            ) : (
              <Sun
                className="w-[15px] h-[15px] text-[var(--warning)]"
                strokeWidth={1.75}
                style={{
                  transform: `rotate(${sunRotation}deg)`,
                  transition: "transform 400ms ease",
                }}
              />
            )}
          </IconButton>

          <div className="w-px h-4 bg-[var(--border)] mx-0.5 shrink-0" />

          <div className="relative" ref={activityRef}>
            <IconButton
              onClick={() => {
                setActivityOpen((prev) => !prev);
                closeOtherPanels("activity");
              }}
              tooltip="Activity"
            >
              <Bell className="w-[15px] h-[15px]" strokeWidth={1.75} />
              {hasUnread && (
                <span className="absolute top-[5px] right-[5px] w-[5px] h-[5px] bg-[var(--error)] rounded-full border-[1.5px] border-[var(--bg-card)]" />
              )}
            </IconButton>

            <DropdownModal
              open={activityOpen}
              onClose={() => setActivityOpen(false)}
              anchorRef={activityRef}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[var(--border)] flex justify-between items-center">
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                  Activity
                </span>
                <button
                  type="button"
                  onClick={() => setHasUnread(false)}
                  className="text-[10px] text-[var(--accent)] cursor-pointer hover:text-[var(--accent-hover)] transition-colors"
                >
                  Mark all read
                </button>
              </div>

              <div>
                {ACTIVITY_ITEMS.map((item, i) => (
                  <div
                    key={item.title}
                    className={cn(
                      "px-4 py-3 flex items-start gap-3 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors",
                      i < ACTIVITY_ITEMS.length - 1 && "border-b border-[var(--border-muted)]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                        item.bgClass
                      )}
                    >
                      <item.icon
                        className={cn("w-3 h-3", item.iconClass)}
                        strokeWidth={2}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-[var(--text-primary)] leading-tight">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="w-full px-4 py-2.5 text-center text-[11px] text-[var(--accent)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors border-t border-[var(--border)]"
              >
                View all activity
              </button>
            </DropdownModal>
          </div>

          <div className="relative" ref={aboutRef}>
            <IconButton
              onClick={() => {
                setAboutOpen((prev) => !prev);
                closeOtherPanels("about");
              }}
              tooltip="About this project"
            >
              <Info className="w-[15px] h-[15px]" strokeWidth={1.75} />
            </IconButton>

            <DropdownModal
              open={aboutOpen}
              onClose={() => setAboutOpen(false)}
              anchorRef={aboutRef}
              className="p-4"
            >
              <div className="flex justify-center mb-3">
                <div
                  className="w-8 h-8 rounded-lg"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hover))" }}
                />
              </div>
              <p className="text-[14px] font-bold text-[var(--text-primary)] text-center">
                Xeno CRM
              </p>
              <p className="text-[11px] text-[var(--text-muted)] text-center mt-0.5">
                AI-Native Marketing CRM
              </p>
              <div className="h-px bg-[var(--border)] my-3" />
              <div>
                {ABOUT_ROWS.map((row, i) => (
                  <div
                    key={row.label}
                    className={cn(
                      "flex justify-between text-[11px] text-[var(--text-muted)] py-1.5",
                      i < ABOUT_ROWS.length - 1 && "border-b border-[var(--border)]"
                    )}
                  >
                    <span>{row.label}</span>
                    <span className="text-[var(--text-primary)]">{row.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center text-[var(--text-subtle)] mt-3">
                Built for Xeno Engineering Assignment
              </p>
            </DropdownModal>
          </div>
        </div>
      </header>
    </>
  );
}
