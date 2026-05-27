import { NavLink, Route, Routes, useNavigate, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Wand2,
  Image as ImageIcon,
  LayoutTemplate,
  ShoppingCart,
  LogOut,
  UserCircle,
  CreditCard,
  ShieldCheck,
  LineChart,
  Lock,
} from "lucide-react";
import DashboardPage from "./pages/DashboardPage";
import PriceIntelligencePage from "./pages/PriceIntelligencePage";
import LandingBuilderPage from "./pages/LandingBuilderPage";
import ImageStudioPage from "./pages/ImageStudioPage";
import ImageLibraryPage from "./pages/ImageLibraryPage";
import PublicLandingPage from "./pages/PublicLandingPage";
import DraftsPage from "./pages/DraftsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ShopifyConnectPage from "./pages/ShopifyConnectPage";
import ProductsPage from "./pages/ProductsPage";
import ProfilePage from "./pages/ProfilePage";
import PricingPage from "./pages/PricingPage";
import AdminPage from "./pages/AdminPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SubscriptionSuccessPage from "./pages/SubscriptionSuccessPage";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { SocketProvider } from "./lib/SocketContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import NotificationsBell from "./components/NotificationsBell";
import PlanGate from "./components/PlanGate";

const navItems = [
  { to: "/", label: "Dashboard", icon: <LayoutDashboard size={20} />, requiredPlan: null },
  { to: "/products", label: "Produse Shopify", icon: <ShoppingBag size={20} />, requiredPlan: null },
  { to: "/image-studio", label: "Image Studio", icon: <Wand2 size={20} />, requiredPlan: 'STARTER' },
  { to: "/image-library", label: "My Images", icon: <ImageIcon size={20} />, requiredPlan: null },
  { to: "/landing-builder", label: "Landing Builder", icon: <LayoutTemplate size={20} />, requiredPlan: 'STARTER' },
  { to: "/price-intelligence", label: "Price Intelligence", icon: <LineChart size={20} />, requiredPlan: 'PRO' },
  { to: "/drafts", label: "Drafts (Comenzi)", icon: <ShoppingCart size={20} />, requiredPlan: null },
];

const PLAN_ORDER: Record<string, number> = { FREE: 0, STARTER: 1, PRO: 2 };

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

function AppContent() {
  const { user, setUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        credentials: "omit",
      });
      setUser(null);
      navigate("/login");
    } catch {
      // Ignore
    }
  };

  // Loading state — evită flash de pagina alba
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center animate-pulse">
            <span className="text-white text-lg">🪄</span>
          </div>
          <p className="text-sm text-slate-400 font-medium">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // Public pages: login, register, verify-email, forgot-password, reset-password
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* Orice altă rută → redirect la login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    );
  }

  const planBadge: Record<string, { label: string; cls: string }> = {
    FREE: { label: "Free", cls: "bg-slate-200 text-slate-600" },
    STARTER: { label: "Starter", cls: "bg-teal-100 text-teal-700" },
    PRO: { label: "Pro", cls: "bg-violet-100 text-violet-700" },
  };
  const pb = planBadge[user.plan] ?? planBadge.FREE;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">

      {/* SIDEBAR */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200/60 bg-white shadow-xl shadow-slate-200/20 flex flex-col z-20">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Wand2 className="text-white" size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Licenta</p>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-heading">AI Studio</h1>
            </div>
          </div>

          {/* Plan badge & Notifications */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pb.cls}`}>
                {pb.label}
              </span>
              {user.role === "ADMIN" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
                  <ShieldCheck size={9} /> Admin
                </span>
              )}
            </div>
            
            <NotificationsBell />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-thin">
          <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 mt-2">Meniu Principal</p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const isLocked = user.role !== 'ADMIN' && item.requiredPlan
              ? PLAN_ORDER[user.plan] < PLAN_ORDER[item.requiredPlan]
              : false;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-teal-50 text-teal-700 shadow-sm shadow-teal-100"
                    : isLocked
                    ? "text-slate-400 hover:bg-slate-50 hover:text-slate-500"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className={`${isActive ? "text-teal-600" : isLocked ? "text-slate-300" : "text-slate-400"}`}>{item.icon}</div>
                <span className="flex-1">{item.label}</span>
                {isLocked && (
                  <Lock size={13} className="text-slate-300 flex-shrink-0" />
                )}
              </NavLink>
            );
          })}

          <div className="border-t border-slate-100 pt-3 mt-3">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cont</p>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <UserCircle size={20} className="text-slate-400" /> Profilul Meu
            </NavLink>
            <NavLink
              to="/pricing"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <CreditCard size={20} className="text-slate-400" /> Prețuri & Planuri
            </NavLink>

            {/* Admin — vizibil doar pentru ADMIN */}
            {user.role === "ADMIN" && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive ? "bg-amber-50 text-amber-700" : "text-amber-600 hover:bg-amber-50"
                  }`
                }
              >
                <ShieldCheck size={20} className="text-amber-500" /> Admin Panel
              </NavLink>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut size={20} className="text-slate-400" />
            Deconectare
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/price-intelligence" element={
                <PlanGate requiredPlan="PRO" featureName="Price Intelligence">
                  <PriceIntelligencePage />
                </PlanGate>
              } />
              <Route path="/landing-builder" element={
                <PlanGate requiredPlan="STARTER" featureName="Landing Builder">
                  <LandingBuilderPage />
                </PlanGate>
              } />
              <Route path="/image-studio" element={
                <PlanGate requiredPlan="STARTER" featureName="Image Studio">
                  <ImageStudioPage />
                </PlanGate>
              } />
              <Route path="/image-library" element={<ImageLibraryPage />} />
              <Route path="/drafts" element={<DraftsPage />} />
              <Route path="/connect-shopify" element={<ShopifyConnectPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            {/* Public pages accessible even when logged in */}
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          <Route path="/landing-preview/:id" element={<PublicLandingPage />} />
          <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
