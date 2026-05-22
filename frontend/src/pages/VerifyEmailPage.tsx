import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("err"); setMessage("Token lipsă sau invalid."); return; }

    fetch(`${API}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.message) { setStatus("ok"); setMessage(d.message); }
        else { setStatus("err"); setMessage(d.error || "Eroare la verificare."); }
      })
      .catch(() => { setStatus("err"); setMessage("Eroare de conexiune."); });
  }, [token]);

  // Auto-redirect la /profile după 2s când e ok
  useEffect(() => {
    if (status === "ok") {
      const t = setTimeout(() => navigate("/profile"), 2000);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-white text-2xl">🪄</span>
        </div>

        {status === "loading" && (
          <>
            <Loader2 size={40} className="animate-spin text-teal-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800">Se verifică emailul...</h1>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Email confirmat! 🎉</h1>
            <p className="text-slate-500 mb-2">{message}</p>
            <p className="text-sm text-slate-400 mb-6">Vei fi redirecționat la profil în câteva secunde...</p>
            <button
              onClick={() => navigate("/profile")}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold hover:shadow-lg transition-all"
            >
              Mergi la Profil →
            </button>
          </>
        )}
        {status === "err" && (
          <>
            <XCircle size={48} className="text-rose-500 mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Eroare</h1>
            <p className="text-slate-500 mb-6">{message}</p>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all"
            >
              Înapoi la Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
