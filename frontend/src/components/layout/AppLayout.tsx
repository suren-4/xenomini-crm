import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { useTheme } from "@/context/ThemeContext";
import { useAgentContext } from "@/context/AgentContext";
import { CampaignGPTPanel } from "@/components/campaigngpt/CampaignGPTPanel";
import { cn } from "@/lib/utils";

const PANEL_TRANSITION_MS = 200;

export function AppLayout() {
  const location = useLocation();
  const { toggleTheme } = useTheme();
  const { registerOpenCampaignGPT } = useAgentContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelWidth, setPanelWidth] = useState(380);
  const [isPanelResizing, setIsPanelResizing] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    return registerOpenCampaignGPT(() => setIsChatOpen(true));
  }, [registerOpenCampaignGPT]);

  useEffect(() => {
    if (isChatOpen) {
      setPanelMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setPanelMounted(false), PANEL_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [isChatOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }

      if (mod && e.key === "b") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }

      if (mod && e.shiftKey && e.key === "L") {
        e.preventDefault();
        toggleTheme();
      }

      if (e.key === "Escape") {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (isChatOpen) {
          setIsChatOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isChatOpen, commandPaletteOpen, toggleTheme]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-page)]">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((prev) => !prev)}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen((prev) => !prev)}
      />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <TopBar
          isChatOpen={isChatOpen}
          onToggleChat={() => setIsChatOpen((prev) => !prev)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        <main className="flex-1 min-w-0 overflow-auto">
          <div key={location.pathname} className="w-full p-8">
            <Outlet />
          </div>
        </main>
      </div>

      <div
        className={cn(
          "shrink-0 h-screen overflow-hidden",
          !isPanelResizing &&
            "transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
        )}
        style={{
          width: isChatOpen ? panelWidth : 0,
          borderLeft: isChatOpen ? "1px solid var(--border)" : "0 solid transparent",
        }}
      >
        {panelMounted && (
          <div className="h-full" style={{ width: panelWidth }}>
            <CampaignGPTPanel
              onClose={() => setIsChatOpen(false)}
              panelWidth={panelWidth}
              onPanelWidthChange={setPanelWidth}
              onResizingChange={setIsPanelResizing}
            />
          </div>
        )}
      </div>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenCampaignGPT={() => setIsChatOpen(true)}
      />
    </div>
  );
}
