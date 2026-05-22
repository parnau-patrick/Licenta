import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default function SubscriptionSuccessPage() {
  const navigate = useNavigate();
  const { setUser, user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Re-fetch user to get updated plan
    setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } finally {
        setLoading(false);
      }
    }, 2000); // Delay pentru webhook Stripe să proceseze
  }, []);

  const planLabels: Record<string, string> = {
    STARTER: "Starter",
    PRO: "Pro",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        {loading ? (
          <>
            <Loader2 size={48} className="animate-spin text-teal-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800">Se activează planul...</h1>
            <p className="text-slate-500 text-sm mt-2">Te rugăm să aștepți câteva secunde.</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} className="text-emerald-500" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Felicitări! 🎉</h1>
            <p className="text-slate-600 mb-2">
              Abonamentul tău{" "}
              <strong className="text-teal-700">{planLabels[user?.plan ?? ""] ?? user?.plan}</strong>{" "}
              a fost activat cu succes.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Acum ai acces la toate funcționalitățile planului tău. Hai să construiești primul tău landing page!
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Mergi la Dashboard →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
