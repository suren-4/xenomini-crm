import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { IntelliSenseProvider } from "./context/IntelliSenseContext";
import { AgentContextProvider } from "./context/AgentContext";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { Segments } from "./pages/Segments";
import { Campaigns } from "./pages/Campaigns";
import { Analytics } from "./pages/Analytics";

export default function App() {
  return (
    <ThemeProvider>
      <IntelliSenseProvider>
      <BrowserRouter>
        <AgentContextProvider>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="segments" element={<Segments />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AgentContextProvider>
      </BrowserRouter>
      </IntelliSenseProvider>
    </ThemeProvider>
  );
}
