import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useSocket } from "../lib/SocketContext";
import { User, Lock, Store, AlertCircle, CheckCircle, Unlink, Loader2, ShieldCheck, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  FREE: { label: "Free", color: "text-slate-600", bg: "bg-slate-100" },
  STARTER: { label: "Starter", color: "text-teal-700", bg: "bg-teal-100" },
  PRO: { label: "Pro", color: "text-violet-700", bg: "bg-violet-100" },
};

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Profile form
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Resend verification
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Shopify
  const [shopDomain, setShopDomain] = useState<string | null>(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/shopify/status`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.connected) setShopDomain(d.shop); })
      .finally(() => setShopLoading(false));
  }, []);

  // WebSocket listener pentru email verificat (fără polling)
  useEffect(() => {
    if (!socket || user?.emailVerified) return;

    const handleEmailVerified = (data: { emailVerified: boolean }) => {
      if (data.emailVerified) {
        setUser((prev) => prev ? { ...prev, emailVerified: true } : prev);
        setResendMsg({ type: "ok", text: "✅ Email verificat cu succes!" });
      }
    };

    socket.on("user:email-verified", handleEmailVerified);

    return () => {
      socket.off("user:email-verified", handleEmailVerified);
    };
  }, [socket, user?.emailVerified, setUser]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const body: any = {};
      if (email !== user?.email) body.email = email;
      if (currentPass && newPass) { body.currentPassword = currentPass; body.newPassword = newPass; }

      if (!Object.keys(body).length) {
        setProfileMsg({ type: "err", text: "Nicio modificare detectată." });
        return;
      }

      const res = await fetch(`${API}/api/auth/profile`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUser({ ...user!, ...data.user });
      setCurrentPass(""); setNewPass("");
      setProfileMsg({ type: "ok", text: data.message || "Profil actualizat!" });
    } catch (err: any) {
      setProfileMsg({ type: "err", text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const resendVerification = async () => {
    setResendLoading(true);
    setResendMsg(null);
    try {
      const res = await fetch(`${API}/api/auth/resend-verification`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResendMsg({ type: "ok", text: data.message });
    } catch (err: any) {
      setResendMsg({ type: "err", text: err.message });
    } finally {
      setResendLoading(false);
    }
  };

  const disconnectShopify = async () => {
    if (!confirm("Ești sigur că vrei să deconectezi magazinul Shopify?")) return;
    setDisconnecting(true);
    try {
      await fetch(`${API}/api/shopify/disconnect`, { method: "DELETE", credentials: "include" });
      setShopDomain(null);
    } finally {
      setDisconnecting(false);
    }
  };

  const plan = user?.plan ?? "FREE";
  const planInfo = PLAN_LABELS[plan];

  return (
    <div className="space-y-6 soft-enter max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 flex items-center gap-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(13,148,136,0.15),transparent_60%)]" />
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-900/40 flex-shrink-0 z-10">
          <User size={28} className="text-white" />
        </div>
        <div className="z-10">
          <h1 className="text-2xl font-extrabold text-white">{user?.email}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${planInfo.bg} ${planInfo.color}`}>
              {planInfo.label}
            </span>
            {user?.role === "ADMIN" && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                <ShieldCheck size={11} /> Admin
              </span>
            )}
            {!user?.emailVerified && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-600 flex items-center gap-1">
                <AlertCircle size={11} /> Email neverificat
              </span>
            )}
          </div>
        </div>
        {plan === "FREE" && (
          <button
            onClick={() => navigate("/pricing")}
            className="ml-auto z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-500 transition-all shadow-md"
          >
            ⚡ Upgrade Plan
          </button>
        )}
      </div>

        {!user?.emailVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">Email neverificat</p>
                <p className="text-xs text-amber-600">Verifică-ți emailul pentru acces complet la platformă.</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={resendVerification}
                disabled={resendLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-50 whitespace-nowrap"
              >
                {resendLoading ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                {resendLoading ? "Se trimite..." : "Trimite email verificare"}
              </button>
              {resendMsg && (
                <p className={`text-xs font-medium ${resendMsg.type === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
                  {resendMsg.text}
                </p>
              )}
            </div>
          </div>
        )}

      {/* Profile Update */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-teal-600" />
          <h2 className="font-bold text-slate-900 text-lg">Informații Cont</h2>
        </div>

        {profileMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-medium ${
            profileMsg.type === "ok"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}>
            {profileMsg.type === "ok" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {profileMsg.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={16} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Schimbare Parolă</span>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Parola curentă"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
              />
              <input
                type="password"
                placeholder="Parola nouă (min 6 caractere)"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
              />
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition disabled:opacity-50"
          >
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : null}
            {savingProfile ? "Se salvează..." : "Salvează modificările"}
          </button>
        </div>
      </div>

      {/* Shopify Connection */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-5">
          <Store size={18} className="text-teal-600" />
          <h2 className="font-bold text-slate-900 text-lg">Magazin Shopify</h2>
        </div>

        {shopLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Se verifică...
          </div>
        ) : shopDomain ? (
          <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-emerald-800 text-sm">Conectat</p>
                <p className="text-xs text-emerald-600">{shopDomain}</p>
              </div>
            </div>
            <button
              onClick={disconnectShopify}
              disabled={disconnecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-50"
            >
              {disconnecting ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
              Deconectează
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500">Niciun magazin conectat</p>
            <button
              onClick={() => navigate("/connect-shopify")}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition"
            >
              Conectează →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
