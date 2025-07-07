import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";
import Calendar from "./pages/Calendar";
import FindTutors from "./pages/FindTutors";
import Sessions from "./pages/Sessions";
import Students from "./pages/Students";
import TeachingSessions from "./pages/TeachingSessions";
import Earnings from "./pages/Earnings";
import TutorApplication from "./pages/TutorApplication";
import Admin from "./pages/Admin";
import AdminApplications from "./pages/AdminApplications";
import AdminUsers from "./pages/AdminUsers";
import Payments from "./pages/Payments";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/find-tutors" element={<FindTutors />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/students" element={<Students />} />
            <Route path="/teaching-sessions" element={<TeachingSessions />} />
            <Route path="/earnings" element={<Earnings />} />
            <Route path="/tutor-application" element={<TutorApplication />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-cancelled" element={<PaymentCancelled />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
