import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ManagerRoute } from "@/components/auth/ManagerRoute";
import { EmployeeRoute } from "@/components/auth/EmployeeRoute";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/Dashboard";
import Workshops from "./pages/Workshops";
import WorkshopDetail from "./pages/WorkshopDetail";
import EmployeeSetup from "./pages/employee/Setup";
import StaffLogs from "./pages/StaffLogs";
import NotFound from "./pages/NotFound";
import AuthRedirect from "./pages/AuthRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            
            {/* Role-based redirect */}
            <Route path="/" element={<AuthRedirect />} />
            
            {/* Manager routes */}
            <Route path="/dashboard" element={
              <ManagerRoute>
                <Dashboard />
              </ManagerRoute>
            } />
            <Route path="/workshops" element={
              <ManagerRoute>
                <Workshops />
              </ManagerRoute>
            } />
            <Route path="/workshops/:id" element={
              <ManagerRoute>
                <WorkshopDetail />
              </ManagerRoute>
            } />
            <Route path="/staff-logs" element={
              <ManagerRoute>
                <StaffLogs />
              </ManagerRoute>
            } />
            
            {/* Employee routes */}
            <Route path="/employee/setup" element={
              <EmployeeRoute>
                <EmployeeSetup />
              </EmployeeRoute>
            } />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
