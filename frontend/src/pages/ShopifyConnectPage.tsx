import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ShopifyConnectPage() {
  const [shop, setShop] = useState("");
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectedShop, setConnectedShop] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if redirected back with error
  const urlError = searchParams.get("error");

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("http://localhost:4000/api/shopify/status", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setIsConnected(data.connected);
          setConnectedShop(data.shop);
        }
      } finally {
        setIsLoading(false);
      }
    }
    checkStatus();
  }, []);

  const handleConnect = () => {
    if (!shop.trim()) {
      setError("Te rog introdu domeniul magazinului.");
      return;
    }

    let domain = shop.trim().toLowerCase();
    if (!domain.endsWith(".myshopify.com")) {
      domain = `${domain}.myshopify.com`;
    }

    setError("");
    window.location.href = `http://localhost:4000/api/shopify/install?shop=${domain}`;
  };

  return (
    <section className="space-y-6 soft-enter md:space-y-8">
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <span className="hero-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
          Integrare
        </span>
        <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">Conectare Shopify</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
          Conectează magazinul tău Shopify pentru a importa automat produsele și a crea landing pages cu AI.
        </p>
      </div>

      {urlError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          ⚠️ Eroare la conectare: {decodeURIComponent(urlError)}
        </div>
      )}

      {isLoading ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-slate-500">Se verifică starea conexiunii...</div>
      ) : isConnected ? (
        <div className="glass-card rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xl">✓</span>
            <div>
              <p className="font-semibold text-slate-900">Magazin conectat cu succes!</p>
              <p className="text-sm text-slate-500">{connectedShop}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/products")}
            className="mt-6 rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Vezi Produsele →
          </button>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 md:p-8">
          <h3 className="text-lg font-semibold text-slate-900">Conectează Magazinul Tău</h3>
          <p className="mt-1 text-sm text-slate-500">Introdu domeniul magazinului Shopify (ex: mystore sau mystore.myshopify.com)</p>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <div className="mt-4 flex gap-3">
            <input
              type="text"
              placeholder="mystore.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="flex-1 rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              onClick={handleConnect}
              className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Conectează
            </button>
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-700">Ce se întâmplă la conectare?</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Ești redirecționat pe Shopify să aprobi permisiunile</li>
              <li>Produsele tale sunt importate automat</li>
              <li>Stocul se sincronizează în timp real prin webhooks</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
