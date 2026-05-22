import { useEffect, useState } from "react";
import { ShoppingCart, AlertCircle, Eye } from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/shopify/drafts`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("A apărut o eroare la extragerea draft-urilor.");
        return res.json();
      })
      .then((data) => setDrafts(data.drafts || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Filtrăm drafturile care vin de pe Landing Page
  const landingDrafts = drafts.filter(
    (d) => d.tags && d.tags.includes("landing-page")
  );

  return (
    <div className="space-y-6 soft-enter">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="hero-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800 mb-3 block">
            Comenzi & Abandonuri
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            🛒 Drafts (Shopify)
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Vizualizează comenzile ramburs și coșurile abandonate provenite din Landing Page.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-slate-400">
            <span className="animate-pulse">Se încarcă...</span>
          </div>
        ) : landingDrafts.length === 0 ? (
          <div className="p-16 text-center">
            <ShoppingCart className="mx-auto mb-4 text-slate-300" size={48} />
            <p className="text-slate-500 font-medium text-lg">Niciun draft momentan</p>
            <p className="text-slate-400 text-sm mt-1">Când clienții folosesc checkout-ul, vor apărea aici.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Status / Tip</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Dată</th>
                  <th className="px-6 py-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {landingDrafts.map((draft) => {
                  const isAbandon = draft.tags.includes("abandon");
                  const customerName =
                    draft.customer?.first_name || draft.customer?.last_name
                      ? `${draft.customer.first_name || ""} ${draft.customer.last_name || ""}`.trim()
                      : "Client Necunoscut";

                  return (
                    <tr key={draft.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isAbandon
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isAbandon ? <AlertCircle size={12} /> : <ShoppingCart size={12} />}
                          {isAbandon ? "Abandonat" : "Comandă Nouă"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{customerName}</p>
                        <p className="text-xs text-slate-500">Tel: {draft.customer?.phone || "-"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900">{draft.total_price} RON</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(draft.created_at).toLocaleString("ro-RO")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a
                          href={`https://admin.shopify.com/store/${draft.shop?.replace(".myshopify.com", "") || "my-store"}/draft_orders/${draft.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-teal-600 transition-colors"
                        >
                          <Eye size={14} /> Vezi în Shopify
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
