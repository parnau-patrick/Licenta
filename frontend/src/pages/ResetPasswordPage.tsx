import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Lock, Loader2, CheckCircle } from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Parolele nu coincid."); return; }
    if (password.length < 6) { setError("Parola trebuie să aibă minim 6 caractere."); return; }

    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Lock size={24} className="text-white" />
        </div>

        {success ? (
          <div className="text-center">
            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Parolă schimbată! 🎉</h1>
            <p className="text-slate-500 mb-6">Parola ta a fost actualizată cu succes. Te poți loga cu noua parolă.</p>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold hover:shadow-lg transition-all"
            >
              Mergi la Login →
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1 text-center">Parolă nouă</h1>
            <p className="text-slate-500 text-sm text-center mb-6">Introdu noua parolă pentru contul tău.</p>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                placeholder="Parolă nouă (min 6 caractere)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
              <input
                type="password"
                placeholder="Confirmă parola"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? "Se salvează..." : "Schimbă Parola"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
