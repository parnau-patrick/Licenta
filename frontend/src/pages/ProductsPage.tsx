import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, PackageOpen, TrendingUp, Search, Filter } from "lucide-react";

interface ShopifyVariant {
  id: number;
  price: string;
  inventory_quantity: number;
  title: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  status: string;
  images: { src: string }[];
  variants: ShopifyVariant[];
  sales: number; 
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [shop, setShop] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justConnected = searchParams.get("connected") === "true";

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); 

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("http://localhost:4000/api/shopify/products", {
          credentials: "include",
        });

        if (res.status === 404) {
          navigate("/connect-shopify");
          return;
        }

        if (!res.ok) throw new Error("Eroare la încărcarea produselor.");

        const data = await res.json();
        setShop(data.shop);
        setProducts(data.products || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, [navigate]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (searchQuery) {
      result = result.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (filter === "in_stock") {
      result = result.filter(p => p.variants.some(v => v.inventory_quantity > 0));
    } else if (filter === "out_of_stock") {
      result = result.filter(p => !p.variants.some(v => v.inventory_quantity > 0));
    } else if (filter === "best_sellers") {
      result = [...result].sort((a, b) => b.sales - a.sales);
    }

    return result;
  }, [products, searchQuery, filter]);

  const totalSales = products.reduce((acc, p) => acc + p.sales, 0);
  const totalStock = products.reduce((acc, p) => acc + p.variants.reduce((s, v) => s + (v.inventory_quantity || 0), 0), 0);

  return (
    <section className="space-y-6 soft-enter md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card rounded-3xl p-6 md:p-8">
        <div>
          <span className="hero-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800">
            Analytics Dashboard
          </span>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-3xl">Performanță Produse</h2>
          {shop && (
            <p className="mt-2 text-sm text-slate-500">
              Sincronizat live din <span className="font-semibold text-teal-700">{shop}</span>
            </p>
          )}
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col rounded-2xl bg-white p-4 shadow-sm border border-slate-100 min-w-[140px]">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <TrendingUp size={16} />
              <span className="text-xs font-semibold uppercase">Total Vânzări</span>
            </div>
            <span className="text-2xl font-black text-slate-800">{totalSales} <span className="text-sm font-medium text-slate-400">buc.</span></span>
          </div>
          <div className="flex flex-col rounded-2xl bg-white p-4 shadow-sm border border-slate-100 min-w-[140px]">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <PackageOpen size={16} />
              <span className="text-xs font-semibold uppercase">Stoc Total</span>
            </div>
            <span className="text-2xl font-black text-slate-800">{totalStock} <span className="text-sm font-medium text-slate-400">buc.</span></span>
          </div>
        </div>
      </div>

      {justConnected && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
          ✅ Magazinul a fost conectat cu succes! Ai acces la datele analitice in timp real.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {isLoading ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-slate-500">Se sincronizeaza datele cu Shopify...</div>
      ) : (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Cauta produs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-slate-400" size={18} />
              <select 
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white/50 py-2.5 px-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 min-w-[180px]"
              >
                <option value="all">Toate produsele</option>
                <option value="best_sellers">Cele mai vandute (Top)</option>
                <option value="in_stock">In Stoc</option>
                <option value="out_of_stock">Stoc Epuizat</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pl-4 font-semibold">Produs</th>
                  <th className="pb-3 px-4 font-semibold">Status</th>
                  <th className="pb-3 px-4 font-semibold">Preț</th>
                  <th className="pb-3 px-4 font-semibold text-center">Stoc</th>
                  <th className="pb-3 pr-4 font-semibold text-right">Vânzări</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const mainImage = product.images?.[0]?.src;
                  const minPrice = Math.min(...product.variants.map((v) => parseFloat(v.price)));
                  const stock = product.variants.reduce((s, v) => s + (v.inventory_quantity || 0), 0);

                  return (
                    <tr key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pl-4">
                        <div className="flex items-center gap-4">
                          <img 
                            src={mainImage || "https://placehold.co/100x100?text=Fara+Imagine"} 
                            alt={product.title} 
                            className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">{product.title}</p>
                            <p className="text-xs text-slate-500">{product.vendor}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-700">
                        {minPrice.toFixed(2)} RON
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`text-sm font-bold ${
                          stock > 10 ? 'text-slate-700' : stock > 0 ? 'text-orange-500' : 'text-red-500'
                        }`}>
                          {stock}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-sm font-bold text-teal-700">
                          <ShoppingCart size={14} />
                          {product.sales}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                      Niciun produs gasit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
