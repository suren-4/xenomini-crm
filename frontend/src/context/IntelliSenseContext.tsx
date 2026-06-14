import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "xeno-intellisense-enabled";

interface IntelliSenseContextType {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
}

const IntelliSenseContext = createContext<IntelliSenseContextType | undefined>(undefined);

export function IntelliSenseProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  const setEnabled = (value: boolean) => setEnabledState(value);
  const toggle = () => setEnabledState((prev) => !prev);

  return (
    <IntelliSenseContext.Provider value={{ enabled, setEnabled, toggle }}>
      {children}
    </IntelliSenseContext.Provider>
  );
}

export function useIntelliSenseEnabled() {
  const ctx = useContext(IntelliSenseContext);
  if (!ctx) {
    throw new Error("useIntelliSenseEnabled must be used within IntelliSenseProvider");
  }
  return ctx;
}
