import { useState } from "react";
import { Check, Zap, Crown, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const plans = [
  {
    id: "FREE",
    name: "Free",
    price: "0",
    period: "pentru totdeauna",
    description: "Explorează platforma fără costuri.",
    icon: <Zap size={24} className="text-slate-500" />,
    color: "border-slate-200",
    headerBg: "bg-slate-50",
    btnClass: "bg-slate-200 text-slate-600 cursor-default",
    features: [
      { text: "1 Landing page", ok: true },
      { text: "Publish pe Shopify", ok: false },
      { text: "Image Studio (AI)", ok: false },
      { text: "Image Library", ok: false },
      { text: "Suport prioritar", ok: false },
    ],
  },
  {
    id: "STARTER",
    name: "Starter",
    price: "99",
    period: "/ lună",
    description: "Tot ce ai nevoie pentru a vinde mai mult.",
    icon: <Zap size={24} className="text-teal-600" />,
    color: "border-teal-500 shadow-xl shadow-teal-500/10",
    headerBg: "bg-gradient-to-br from-teal-50 to-emerald-50",
    btnClass: "bg-gradient-to-r from-teal-600 to-emerald-500 text-white hover:shadow-lg hover:-translate-y-0.5",
    badge: "Popular",
    features: [
      { text: "5 Landing pages", ok: true },
      { text: "Publish pe Shopify", ok: true },
      { text: "Image Studio (AI)", ok: true },
      { text: "Image Library (50 img)", ok: true },
      { text: "Suport prioritar", ok: false },
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "199",
    period: "/ lună",
    description: "Putere maximă pentru business-ul tău.",
    icon: <Crown size={24} className="text-violet-600" />,
    color: "border-violet-400 shadow-xl shadow-violet-500/10",
    headerBg: "bg-gradient-to-br from-violet-50 to-purple-50",
    btnClass: "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-lg hover:-translate-y-0.5",
    features: [
      { text: "Landing pages nelimitate", ok: true },
      { text: "Publish pe Shopify", ok: true },
      { text: "Image Studio (AI)", ok: true },
      { text: "Image Library (nelimitat)", ok: true },
      { text: "Suport prioritar", ok: true },
    ],
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (planId === "FREE") return;
    if (planId === user?.plan) return;

    setLoading(planId);
    try {
      const res = await fetch(`${API}/api/stripe/create-checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Eroare la creare sesiune de plată.");
      }
    } catch (err) {
      alert("Eroare de conexiune.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8 soft-enter">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-700 bg-teal-100 border border-teal-200 mb-4">
          Planuri & Prețuri
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Alege planul potrivit
        </h1>
        <p className="text-slate-500 mt-3 text-lg max-w-xl mx-auto">
          Indiferent de stadiul business-ului tău, avem un plan potrivit. Upgrade oricând.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = user?.plan === plan.id;
          const isLoading = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 ${plan.color} overflow-hidden flex flex-col transition-transform hover:-translate-y-1 duration-200`}
            >
              {plan.badge && (
                <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-600 text-white">
                  {plan.badge}
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-4 left-4 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
                  Plan curent
                </div>
              )}

              <div className={`${plan.headerBg} p-6 border-b border-slate-100`}>
                <div className="mb-3">{plan.icon}</div>
                <h3 className="text-xl font-extrabold text-slate-900">{plan.name}</h3>
                <p className="text-slate-500 text-sm mt-1">{plan.description}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-slate-500 text-sm mb-1">RON {plan.period}</span>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        f.ok ? "bg-emerald-100" : "bg-slate-100"
                      }`}>
                        {f.ok
                          ? <Check size={12} className="text-emerald-600" strokeWidth={3} />
                          : <span className="text-slate-300 text-xs">✕</span>
                        }
                      </div>
                      <span className={f.ok ? "text-slate-700" : "text-slate-400"}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.id === "FREE" || isCurrent || isLoading}
                  className={`mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${plan.btnClass} disabled:opacity-60 disabled:cursor-default disabled:transform-none`}
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Se procesează...</>
                  ) : isCurrent ? (
                    "✓ Plan Activ"
                  ) : plan.id === "FREE" ? (
                    "Gratuit"
                  ) : (
                    <>Alege {plan.name} <ArrowRight size={16} /></>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current plan info */}
      {user?.plan !== "FREE" && (
        <div className="text-center">
          <p className="text-sm text-slate-500">
            Vrei să anulezi abonamentul?{" "}
            <button
              onClick={() => navigate("/profile")}
              className="text-rose-600 font-semibold hover:underline"
            >
              Mergi la Profil
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
