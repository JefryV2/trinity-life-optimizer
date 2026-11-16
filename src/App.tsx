import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Health from "./pages/Health";
import Insights from "./pages/Insights";
import Why from "./pages/Why";
import Experiments from "./pages/Experiments";
import Wealth from "./pages/Wealth";
import Relations from "./pages/Relations";
import NotFound from "./pages/NotFound";
import Onboarding from "@/components/Onboarding";
import ProgressCalendar from "@/components/trinity/ProgressCalendar";

const queryClient = new QueryClient();

/** Guest access: the UI is browsable without a session. Set to false to require sign-in. */
const ALLOW_GUEST = true;

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#232326] border-t-primary" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return ALLOW_GUEST ? <>{children}</> : <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const HomeRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return ALLOW_GUEST ? <>{children}</> : <Navigate to="/auth" replace />;
  if (!user.user_metadata?.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const OnboardingRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return ALLOW_GUEST ? <>{children}</> : <Navigate to="/auth" replace />;
  if (user.user_metadata?.onboarding_completed) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <HomeRoute>
                  <Index />
                </HomeRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <OnboardingRoute>
                  <Onboarding />
                </OnboardingRoute>
              }
            />
            <Route
              path="/experiments"
              element={
                <ProtectedRoute>
                  <Experiments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/why"
              element={
                <ProtectedRoute>
                  <Why />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/health"
              element={
                <ProtectedRoute>
                  <Health />
                </ProtectedRoute>
              }
            />
            <Route
              path="/insights"
              element={
                <ProtectedRoute>
                  <Insights />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wealth"
              element={
                <ProtectedRoute>
                  <Wealth />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relations"
              element={
                <ProtectedRoute>
                  <Relations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <ProgressCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
