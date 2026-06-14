import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Layers,
  Megaphone,
  BarChart3,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";

const NAV_GROUPS = [
  {
    label: "WORKSPACE",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/customers", icon: Users, label: "Customers", countKey: "customers" as const },
    ]
  },
  {
    label: "MARKETING",
    items: [
      { to: "/segments", icon: Layers, label: "Segments", countKey: "segments" as const },
      { to: "/campaigns", icon: Megaphone, label: "Campaigns", countKey: "campaigns" as const },
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
    ]
  }
];

const NoiseFilter = () => (
  <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03] mix-blend-overlay z-0" aria-hidden="true">
    <filter id="noiseFilter">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noiseFilter)" />
  </svg>
);

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
}

export function Sidebar({ isCollapsed, onToggle, isChatOpen, onToggleChat }: SidebarProps) {
  const location = useLocation();
  const { data: counts } = useFetch(() => api.getCounts());

  const getCount = (countKey?: "customers" | "segments" | "campaigns") => {
    if (!countKey || !counts) return undefined;
    return String(counts[countKey]);
  };

  return (
    <>
      <aside
        className="shrink-0 sticky top-0 h-screen flex flex-col z-30 overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          width: isCollapsed ? 64 : 240,
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <NoiseFilter />

        {/* Inner content wrapper to keep z-index above noise */}
        <div className="relative z-10 flex flex-col h-full w-full">
          {/* Top Section — Brand */}
          <div className="h-16 flex items-center px-4 shrink-0">
            <div className={cn("flex items-center gap-3", isCollapsed && "w-full justify-center")}>
              <div 
                className="w-[28px] h-[28px] rounded-lg shrink-0"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hover))" }}
              />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[var(--text-primary)] font-semibold text-[15px] tracking-[-0.3px] whitespace-nowrap"
                >
                  Xeno CRM
                </motion.span>
              )}
            </div>
          </div>
          
          <div className="h-[1px] w-full bg-[var(--border)] shrink-0" />

          {/* Navigation Items */}
          <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto overflow-x-visible no-scrollbar">
            {NAV_GROUPS.map((group, groupIdx) => (
              <div key={group.label} className="space-y-1 relative">
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[9px] font-semibold tracking-[0.1em] text-[var(--text-muted)] opacity-70 px-3 mb-2 mt-4"
                  >
                    {group.label}
                  </motion.div>
                )}

                {group.items.map((item, itemIdx) => {
                  const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
                  const count = getCount("countKey" in item ? item.countKey : undefined);
                  // Calculate stagger index across all items
                  const globalIdx = groupIdx * NAV_GROUPS[0].items.length + itemIdx;

                  return (
                    <motion.div
                      key={item.to}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: globalIdx * 0.04, duration: 0.3 }}
                      className="relative group"
                    >
                      <NavLink
                        to={item.to}
                        end={item.to === "/"}
                        className={cn(
                          "relative flex items-center h-[40px] px-3 rounded-[10px] text-[13px] font-medium transition-all duration-150 ease-in-out",
                          isCollapsed ? "justify-center" : "gap-3",
                          isActive
                            ? "text-[var(--text-primary)]"
                            : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        )}
                        style={isActive ? {
                          background: "var(--accent-light)",
                          border: "1px solid var(--accent)",
                        } : {
                          border: "1px solid transparent"
                        }}
                      >
                        {/* Active Blur Glow Behind */}
                        {isActive && (
                          <div 
                            className="absolute inset-0 rounded-[10px] pointer-events-none"
                            style={{ background: "radial-gradient(ellipse at left, var(--accent-muted) 0%, transparent 70%)" }}
                          />
                        )}

                        {/* Active Left Pill */}
                        {isActive && (
                          <div className="absolute left-[-1px] top-1/2 -translate-y-1/2 h-[16px] w-[3px] bg-[var(--accent)] rounded-r-[4px]" style={{ boxShadow: "1px 0 4px var(--accent-muted)" }} />
                        )}

                        <div className={cn(
                          "relative flex items-center justify-center shrink-0 transition-colors duration-150",
                          isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                        )}>
                          <item.icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                          {/* Icon Glow on Hover (only when not active to prevent double glow) */}
                          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ boxShadow: "0 0 12px var(--accent-muted)" }} />
                        </div>

                        {!isCollapsed && (
                          <span className="whitespace-nowrap relative z-10 flex-1 flex items-center justify-between">
                            {item.label}
                            {count && (
                              <span className="bg-[var(--accent-light)] text-[var(--accent)] text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none border border-[var(--accent)]/10">
                                {count}
                              </span>
                            )}
                          </span>
                        )}

                        {/* Collapsed Tooltip */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[12px] font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-[var(--border)] shadow-[var(--shadow-lg)] transition-opacity duration-150">
                            {item.label}
                            {count ? ` (${count})` : ""}
                            {/* Tiny triangle for tooltip */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-y-[4px] border-y-transparent border-r-[4px] border-r-[var(--border)]" />
                          </div>
                        )}
                      </NavLink>
                    </motion.div>
                  );
                })}

                {group.label === "MARKETING" && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative group"
                  >
                    <button
                      type="button"
                      onClick={onToggleChat}
                      className={cn(
                        "relative flex items-center w-full h-[40px] px-3 rounded-[10px] text-[13px] font-medium transition-all duration-150 ease-in-out",
                        isCollapsed ? "justify-center" : "gap-2",
                        isChatOpen
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                      )}
                      style={
                        isChatOpen
                          ? {
                              background: "var(--accent-light)",
                              border: "1px solid var(--accent)",
                            }
                          : { border: "1px solid transparent" }
                      }
                    >
                      {isChatOpen && (
                        <>
                          <div
                            className="absolute inset-0 rounded-[10px] pointer-events-none"
                            style={{
                              background:
                                "radial-gradient(ellipse at left, var(--accent-muted) 0%, transparent 70%)",
                            }}
                          />
                          <div className="absolute left-[-1px] top-1/2 -translate-y-1/2 h-[16px] w-[3px] bg-[var(--accent)] rounded-r-[4px]" style={{ boxShadow: "1px 0 4px var(--accent-muted)" }} />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[var(--accent)]" />
                        </>
                      )}

                      <Sparkles
                        className={cn(
                          "w-[18px] h-[18px] shrink-0 transition-colors duration-150",
                          isChatOpen
                            ? "text-[var(--accent)]"
                            : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                        )}
                        strokeWidth={1.5}
                      />

                      {!isCollapsed && (
                        <span className="whitespace-nowrap relative z-10">
                          CampaignGPT
                        </span>
                      )}

                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[12px] font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-[var(--border)] shadow-[var(--shadow-lg)] transition-opacity duration-150">
                          CampaignGPT
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-y-[4px] border-y-transparent border-r-[4px] border-r-[var(--border)]" />
                        </div>
                      )}
                    </button>
                  </motion.div>
                )}
              </div>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="mt-auto shrink-0 pb-3 px-3">
            <div className="h-[1px] w-full bg-[var(--border)] mb-3" />
            
            <div className="flex flex-col gap-2">
              {/* User Profile */}
              <div className={cn(
                "flex items-center rounded-[10px] hover:bg-[var(--bg-hover)] transition-colors p-2 cursor-pointer",
                isCollapsed ? "justify-center" : "gap-3"
              )}>
                <div 
                  className="w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 text-[var(--text-inverse)] text-[11px] font-bold shadow-[var(--shadow-md)]"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--channel-email-text))" }}
                >
                  MM
                </div>
                {!isCollapsed && (
                  <>
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-[12px] text-[var(--text-primary)] font-medium truncate leading-tight mb-0.5">Marketing Manager</span>
                      <span className="text-[10px] text-[var(--text-muted)] truncate leading-none">Admin</span>
                    </div>
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  </>
                )}
              </div>

              {/* Collapse Toggle */}
              <button
                onClick={onToggle}
                className="w-full h-[36px] flex items-center justify-center gap-2 rounded-[10px] hover:bg-[var(--bg-hover)] transition-colors group"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-[18px] h-[18px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" strokeWidth={1.5} />
                ) : (
                  <>
                    <PanelLeftClose className="w-[18px] h-[18px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" strokeWidth={1.5} />
                    <span className="text-[11px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] font-medium transition-colors">Collapse</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
