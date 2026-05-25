import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { LineChart, Search, Link as LinkIcon, DollarSign, Target, Gift, Box, CheckCircle2, Sparkles } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

interface IntelligenceResult {
  scrapedData: {
    title: string;
    price: string;
    images: string[];
    scrapedUrl: string;
  };
  aiData: {
    marketAnalysis: string;
    recommendedPrice: string;
    recommendedOldPrice: string;
    pricingStrategy: string;
    bundleSuggestions: { qty: number; label: string; price: number; badge: string }[];
    promoOffers: string[];
  };
}

export default function PriceIntelligencePage() {
  const [searchParams] = useSearchParams();
  const notifProductId = searchParams.get("productId"); // vine din notificare

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntelligenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [mode, setMode] = useState<"url" | "shopify">("shopify");
  const autoAnalyzed = useRef(false); // previne dubluri

  // Fetch products on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/shopify/products`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        const prods = data.products || [];
        setProducts(prods);

        // Dacă am venit dintr-o notificare cu productId, selectăm produsul automat
        if (notifProductId && !autoAnalyzed.current) {
          const found = prods.find((p: any) => String(p.id) === String(notifProductId));
          if (found) {
            setSelectedProductId(String(found.id));
            setMode("shopify");
          }
        }
      })
      .catch(err => console.error("Error loading products:", err));
  }, [notifProductId]);

  // Odată ce produsul e selectat din notificare, rulează analiza automat
  useEffect(() => {
    if (
      notifProductId &&
      selectedProductId === String(notifProductId) &&
      products.length > 0 &&
      !autoAnalyzed.current &&
      !loading
    ) {
      autoAnalyzed.current = true;
      analyzeUrl();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId, products]);

  const analyzeUrl = async () => {
    if (mode === "url" && !url) return;
    if (mode === "shopify" && !selectedProductId) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let bodyData: any = { type: "url", url };

      if (mode === "shopify") {
        const prod = products.find(p => String(p.id) === selectedProductId);
        if (!prod) throw new Error("Produsul selectat nu a fost găsit.");
        bodyData = {
          type: "shopify",
          productData: {
            title: prod.title,
            price: prod.variants?.[0]?.price || "",
            images: prod.images?.map((i: any) => i.src) || []
          }
        };
      }

      const res = await fetch(`${API_BASE}/api/intelligence/analyze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Eroare la analizare.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6 soft-enter md:space-y-8 pb-10 max-w-5xl mx-auto">

      {/* Banner notificare — apare doar când venim dintr-o notificare */}
      {notifProductId && (
        <div className="flex items-center gap-4 bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 border border-indigo-200 rounded-2xl px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-indigo-800">Analiză pornită din notificare</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {loading
                ? "Se generează strategia AI pentru produsul tău..."
                : result
                ? "Analiza a fost completată. Vezi rezultatele mai jos."
                : "Produsul a fost selectat automat. Apasă „Generează Strategie" dacă analiza nu a pornit."}
            </p>
          </div>
          {loading && (
            <div className="flex-shrink-0 w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}

      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 dark-glass rounded-[2rem] p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />
        
        <div className="z-10 relative w-full">
          <span className="hero-chip inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-300 mb-3 shadow-inner">
            Analiză de Piață & Ofertare
          </span>
          <h2 className="text-3xl font-extrabold text-white md:text-5xl tracking-tight font-heading flex items-center gap-4">
            <LineChart className="text-indigo-400" size={40} />
            Price Intelligence
          </h2>
          <p className="mt-3 text-sm text-slate-300 max-w-xl leading-relaxed">
            Introdu link-ul unui produs (ex: AliExpress, Emag, sau un concurent), iar inteligența artificială va extrage produsul, va analiza piața și îți va recomanda cele mai bune prețuri, pachete și oferte pentru Shopify-ul tău.
          </p>

          <div className="mt-8">
            <div className="flex gap-4 mb-4">
              <button 
                onClick={() => setMode("shopify")}
                className={`text-sm font-bold px-4 py-2 rounded-xl transition-all ${mode === "shopify" ? "bg-indigo-500 text-white shadow-md" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}
              >
                🛒 Produsele Mele Shopify
              </button>
              <button 
                onClick={() => setMode("url")}
                className={`text-sm font-bold px-4 py-2 rounded-xl transition-all ${mode === "url" ? "bg-indigo-500 text-white shadow-md" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}
              >
                🌐 Analizează Competitor (URL)
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                {mode === "url" ? (
                  <>
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="https://ro.aliexpress.com/item/..." 
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && analyzeUrl()}
                      className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner backdrop-blur-md font-medium"
                    />
                  </>
                ) : (
                  <>
                    <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <select 
                      value={selectedProductId}
                      onChange={e => setSelectedProductId(e.target.value)}
                      className="w-full bg-slate-900 border border-white/20 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner backdrop-blur-md font-medium appearance-none cursor-pointer"
                    >
                      <option value="" className="text-white bg-slate-800">Alege un produs din magazinul tău...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} className="text-white bg-slate-800">{p.title}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
              <button 
                onClick={analyzeUrl}
                disabled={loading || (mode === "url" ? !url : !selectedProductId)}
                className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="animate-spin">⚙️</span> Se analizează...</>
                ) : (
                  <><Search size={20} /> {mode === "shopify" ? "Generează Strategie" : "Scanează & Analizează"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3">
          <span className="text-xl">⚠️</span> {error}
        </div>
      )}

      {/* Rezultate */}
      {result && (
        <div className="space-y-6 soft-enter">
          {/* Card Date Extrase */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="w-full md:w-1/3 flex-shrink-0">
              {result.scrapedData.images[0] ? (
                <img src={result.scrapedData.images[0]} alt="Product" className="w-full aspect-square object-cover rounded-2xl shadow-md border border-slate-100" />
              ) : (
                <div className="w-full aspect-square bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">Fără imagine</div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Date Extrase</p>
                <h3 className="text-xl font-bold text-slate-900">{result.scrapedData.title}</h3>
              </div>
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 font-bold">
                <DollarSign size={16} /> Preț Origine: {result.scrapedData.price}
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 leading-relaxed italic">
                "{result.aiData.marketAnalysis}"
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pricing Strategy */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Target size={20} /></div>
                <h3 className="font-bold text-slate-900 text-lg">Strategie de Preț (Recomandată)</h3>
              </div>
              <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div className="text-center w-1/2 border-r border-indigo-100">
                  <p className="text-xs font-bold text-indigo-400 uppercase">Preț Redus (Vânzare)</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{result.aiData.recommendedPrice}</p>
                </div>
                <div className="text-center w-1/2">
                  <p className="text-xs font-bold text-slate-400 uppercase">Preț Întreg (Ancoră)</p>
                  <p className="text-xl font-bold text-slate-500 line-through mt-1">{result.aiData.recommendedOldPrice}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <strong className="text-slate-800">De ce?</strong> {result.aiData.pricingStrategy}
              </p>
            </div>

            {/* Promo Offers */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Gift size={20} /></div>
                <h3 className="font-bold text-slate-900 text-lg">Cârlige Promoționale</h3>
              </div>
              <ul className="space-y-3 mt-2">
                {result.aiData.promoOffers.map((offer, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={18} />
                    <span className="text-slate-700 font-medium text-sm leading-relaxed">{offer}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bundles */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center"><Box size={20} /></div>
              <h3 className="font-bold text-slate-900 text-lg">Sugestii de Pachete (Upsell)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.aiData.bundleSuggestions.map((bundle, idx) => (
                <div key={idx} className={`relative p-5 rounded-2xl border-2 flex flex-col items-center text-center ${idx === 1 ? 'border-indigo-500 bg-indigo-50/30 shadow-md transform md:-translate-y-2' : 'border-slate-100 bg-slate-50'}`}>
                  {idx === 1 && (
                    <div className="absolute -top-3.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                      {bundle.badge || 'Recomandat'}
                    </div>
                  )}
                  {idx !== 1 && bundle.badge && (
                    <div className="absolute -top-3.5 bg-slate-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                      {bundle.badge}
                    </div>
                  )}
                  <h4 className="font-bold text-slate-900 mt-2">{bundle.label}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">{bundle.qty} x Bucăți</p>
                  <div className="mt-4 text-2xl font-black text-slate-800">{bundle.price} RON</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
