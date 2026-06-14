import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { Campaign, Customer } from "@/lib/api";

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/customers": "Customers",
  "/segments": "Segments",
  "/campaigns": "Campaigns",
  "/analytics": "Analytics",
};

interface AgentContextValue {
  pageLabel: string;
  selectedCampaign: Campaign | null;
  selectedCustomer: Customer | null;
  setSelectedCampaign: (campaign: Campaign | null) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  openCampaignGPT: () => void;
  registerOpenCampaignGPT: (handler: () => void) => () => void;
}

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

export function AgentContextProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [pageLabel, setPageLabel] = useState("Dashboard");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const openCampaignGPTRef = useRef<(() => void) | null>(null);

  const registerOpenCampaignGPT = useCallback((handler: () => void) => {
    openCampaignGPTRef.current = handler;
    return () => {
      if (openCampaignGPTRef.current === handler) {
        openCampaignGPTRef.current = null;
      }
    };
  }, []);

  const openCampaignGPT = useCallback(() => {
    openCampaignGPTRef.current?.();
  }, []);

  useEffect(() => {
    setPageLabel(PAGE_LABELS[location.pathname] ?? "Dashboard");
    setSelectedCampaign(null);
    setSelectedCustomer(null);
  }, [location.pathname]);

  return (
    <AgentContext.Provider
      value={{
        pageLabel,
        selectedCampaign,
        selectedCustomer,
        setSelectedCampaign,
        setSelectedCustomer,
        openCampaignGPT,
        registerOpenCampaignGPT,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgentContext must be used within AgentContextProvider");
  }
  return context;
}
