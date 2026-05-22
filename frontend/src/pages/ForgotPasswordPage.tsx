import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
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
          <span className="text-white text-2xl">🪄</span>
        </div>

        {sent ? (
          <div className="text-center">
            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Email trimis!</h1>
            <p className="text-slate-500 mb-6">
              Dacă emailul <strong>{email}</strong> există în sistem, vei primi un link de resetare în câteva minute.
            </p>
            <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700">
              <ArrowLeft size={16} /> Înapoi la Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1 text-center">Resetare Parolă</h1>
            <p className="text-slate-500 text-sm text-center mb-6">
              Introdu emailul asociat contului tău și îți vom trimite un link de resetare.
            </p>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="email@exemplu.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? "Se trimite..." : "Trimite link de resetare"}
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                <ArrowLeft size={14} /> Înapoi la Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
