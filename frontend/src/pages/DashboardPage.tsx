import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Search, 
  Filter, 
  Coins, 
  Package, 
  ShoppingCart,
  CheckCircle2,
  Clock
} from "lucide-react";
import DateRangePicker from "../components/DateRangePicker";

interface ShopifyProduct {
  id: number;
  title: string;
}

interface ShopifyOrder {
  id: number;
  name: string; // ex: #1001
  created_at: string;
  total_price: string;
  currency: string;
  financial_status: string; // paid, pending, refunded
  customer?: {
    first_name?: string;
    last_name?: string;
  };
  line_items: {
    id: number;
    product_id: number;
    title: string;
    quantity: number;
    price: string;
  }[];
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [shop, setShop] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justConnected = searchParams.get("connected") === "true";

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [ordersRes, productsRes] = await Promise.all([
          fetch("http://localhost:4000/api/shopify/orders", { credentials: "include" }),
          fetch("http://localhost:4000/api/shopify/products", { credentials: "include" })
        ]);

        if (ordersRes.status === 404 || productsRes.status === 404) {
          navigate("/connect-shopify");
          return;
        }

        if (!ordersRes.ok) throw new Error("Eroare la încărcarea comenzilor.");
        if (!productsRes.ok) throw new Error("Eroare la încărcarea produselor.");

        const ordersData = await ordersRes.json();
        const productsData = await productsRes.json();

        setShop(ordersData.shop);
        
        // Ensure orders exist, sometimes newly connected stores have no orders
        setOrders(ordersData.orders || []);
        
        // Products needed for the dropdown
        setProducts(productsData.products || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadDashboardData();
  }, [navigate]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    // Search by Order ID or Customer Name
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(order => 
        order.name.toLowerCase().includes(q) ||
        (order.customer?.first_name || "").toLowerCase().includes(q) ||
        (order.customer?.last_name || "").toLowerCase().includes(q)
      );
    }

    // Filter by Date Range
    if (startDate || endDate) {
      result = result.filter(order => {
        const orderTimestamp = new Date(order.created_at).getTime();

        if (startDate) {
          const [year, month, day] = startDate.split('-').map(Number);
          const s = new Date(year, month - 1, day, 0, 0, 0, 0);
          if (orderTimestamp < s.getTime()) return false;
        }

        if (endDate) {
          const [year, month, day] = endDate.split('-').map(Number);
          const e = new Date(year, month - 1, day, 23, 59, 59, 999);
          if (orderTimestamp > e.getTime()) return false;
        }

        return true;
      });
    }

    // Filter by specific product ID
    if (selectedProductId !== "all") {
      result = result.filter(order => 
        order.line_items.some(item => item.product_id?.toString() === selectedProductId)
      );
    }

    // Sort newest first
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, searchQuery, selectedProductId, startDate, endDate]);

  // Aggregate KPIs based on filtered results
  const totalRevenue = filteredOrders
    .filter(o => o.financial_status !== "refunded" && o.financial_status !== "voided")
    .reduce((acc, order) => acc + parseFloat(order.total_price), 0);
    
  const totalItemsSold = filteredOrders.reduce((acc, order) => 
    acc + order.line_items.reduce((sum, item) => sum + item.quantity, 0)
  , 0);

  return (
    <section className="space-y-6 soft-enter md:space-y-8 pb-10">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 dark-glass rounded-[2rem] p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        
        <div className="z-10 relative">
          <span className="hero-chip inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-300 mb-3 shadow-inner">
            Dashboard Overview
          </span>
          <h2 className="text-3xl font-extrabold text-white md:text-5xl tracking-tight font-heading">
            Live Sales Feed
          </h2>
          <p className="mt-3 text-sm text-slate-300 max-w-md leading-relaxed">
            Monitorizează performanța în timp real. Toate datele sunt sincronizate automat cu <span className="font-bold text-white">{shop || "Magazinul tău Shopify"}</span>.
          </p>
        </div>
        
        {/* Dynamic KPIs */}
        <div className="flex flex-wrap gap-4 z-10 relative">
          <div className="flex flex-col rounded-2xl bg-white/10 backdrop-blur-md p-5 border border-white/10 min-w-[160px] shadow-xl">
            <div className="flex items-center gap-2 text-teal-300 mb-2">
              <Coins size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Venit Total</span>
            </div>
            <span className="text-3xl font-black text-white">
              {totalRevenue.toLocaleString("ro-RO", { style: "currency", currency: "RON" })}
            </span>
          </div>

          <div className="flex flex-col rounded-2xl bg-white/10 backdrop-blur-md p-5 border border-white/10 min-w-[140px] shadow-xl">
            <div className="flex items-center gap-2 text-indigo-300 mb-2">
              <ShoppingCart size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Comenzi</span>
            </div>
            <span className="text-3xl font-black text-white">
              {filteredOrders.length} <span className="text-sm font-medium text-slate-400">cmd.</span>
            </span>
          </div>

          <div className="flex flex-col rounded-2xl bg-white/10 backdrop-blur-md p-5 border border-white/10 min-w-[140px] shadow-xl">
            <div className="flex items-center gap-2 text-amber-300 mb-2">
              <Package size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Produse</span>
            </div>
            <span className="text-3xl font-black text-white">
              {totalItemsSold} <span className="text-sm font-medium text-slate-400">buc.</span>
            </span>
          </div>
        </div>
      </div>

      {justConnected && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
          ✅ Conectat cu succes! Ai acces direct la toate datele tranzacționale din Shopify.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {/* Main Content */}
      <div className="glass-card rounded-3xl p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-20 text-slate-400 gap-3">
             <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
             Descărcare date financiare din Shopify...
          </div>
        ) : (
          <>
            {/* Filters Row */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 items-start lg:items-center">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Caută comandă (ex: #1001) sau client..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Product Filter */}
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <Filter className="text-slate-400" size={18} />
                <div className="relative w-full lg:w-auto">
                  <select 
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="appearance-none w-full lg:w-auto rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 min-w-[180px] shadow-sm cursor-pointer transition-all"
                  >
                    <option value="all">Toate Produsele</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id.toString()}>{p.title}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* Date Filter with Presets & Custom Calendar */}
              <div className="flex flex-col gap-2 w-full lg:w-auto">
                {/* Presets Row */}
                <div className="flex flex-wrap gap-1.5 px-1">
                  {[
                    { label: "Azi", get: () => { 
                      const d = new Date(); 
                      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      return [str, str]; 
                    }},
                    { label: "Ieri", get: () => { 
                      const d = new Date(Date.now() - 86400000); 
                      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      return [str, str]; 
                    }},
                    { label: "7 zile", get: () => {
                      const end = new Date();
                      const start = new Date(Date.now() - 7 * 86400000);
                      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
                      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
                      return [startStr, endStr];
                    }},
                    { label: "30 zile", get: () => {
                      const end = new Date();
                      const start = new Date(Date.now() - 30 * 86400000);
                      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
                      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
                      return [startStr, endStr];
                    }},
                  ].map(p => (
                    <button 
                      key={p.label}
                      onClick={() => { const [s, e] = p.get(); setStartDate(s); setEndDate(e); }}
                      className="text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <DateRangePicker 
                  startDate={startDate} 
                  endDate={endDate} 
                  onSelect={(start, end) => { setStartDate(start); setEndDate(end); }} 
                />
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="py-4 pl-6 font-semibold rounded-tl-xl">Comandă / Dată</th>
                    <th className="py-4 px-4 font-semibold">Client</th>
                    <th className="py-4 px-4 font-semibold">Produse Cumpărate</th>
                    <th className="py-4 px-4 font-semibold text-center">Status Plata</th>
                    <th className="py-4 pr-6 font-semibold text-right rounded-tr-xl">Total (RON)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const date = new Date(order.created_at);
                    
                    return (
                      <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pl-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{order.name}</span>
                            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                               <Clock size={12}/>
                               {date.toLocaleDateString('ro-RO')} {date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute:'2-digit' })}
                            </span>
                          </div>
                        </td>
                        
                        <td className="py-4 px-4">
                          <span className="text-sm text-slate-700 font-medium">
                            {order.customer?.first_name || ""} {order.customer?.last_name || "Guest"}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1 max-w-[300px]">
                            {order.line_items.map(item => (
                              <div key={item.id} className="text-sm flex items-start gap-2">
                                <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 rounded">{item.quantity}x</span>
                                <span className="text-slate-700 truncate" title={item.title}>{item.title}</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center">
                          {order.financial_status === "paid" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                              <CheckCircle2 size={14} /> Plătit
                            </span>
                          ) : order.financial_status === "pending" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                              În așteptare
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                              {order.financial_status}
                            </span>
                          )}
                        </td>

                        <td className="py-4 pr-6 text-right">
                           <span className="text-lg font-bold text-slate-900">
                             {parseFloat(order.total_price).toFixed(2)}
                           </span>
                           <span className="text-xs text-slate-500 ml-1">RON</span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="inline-flex items-center justify-center p-4 rounded-full bg-slate-100 mb-3">
                           <Search size={24} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Nu am găsit comenzi pentru filtrele selectate.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
