import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TimelinePreferencesProvider } from "./contexts/TimelinePreferencesContext";
import { useVersionCheck } from "./hooks/useVersionCheck";
import Index from "./pages/Index";
import Clients from "./pages/Clients";
import Calendar from "./pages/Calendar";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import VisualTimeline from "./pages/VisualTimeline";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useVersionCheck();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Clients />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/visual-timeline" element={<VisualTimeline />} />
        <Route path="/auth" element={<Auth />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TimelinePreferencesProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </TimelinePreferencesProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
