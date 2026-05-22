import { useEffect, useState } from "react";
import { Users, TrendingUp, ShoppingBag, LayoutTemplate, Loader2, ShieldCheck, Trash2, ChevronDown } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useSocket } from "../lib/SocketContext";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-slate-100 text-slate-600",
  STARTER: "bg-teal-100 text-teal-700",
  PRO: "bg-violet-100 text-violet-700",
};

export default function AdminPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "ADMIN") { navigate("/"); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API}/api/admin/stats`, { credentials: "include" }),
        fetch(`${API}/api/admin/users`, { credentials: "include" }),
      ]);
      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      setStats(statsData);
      setUsers(usersData.users || []);
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates for Admin
  useEffect(() => {
    if (!socket || user?.role !== "ADMIN") return;

    const handleUserJoined = () => {
      // Refresh data when a new user joins
      loadData();
    };

    const handlePlanUpdated = (data: { userId: string; plan: string }) => {
      setUsers((prev) => prev.map((u) => (u.id === data.userId ? { ...u, plan: data.plan } : u)));
      // Option: Update stats locally or refresh
      loadData(); 
    };

    socket.on("admin:user-joined", handleUserJoined);
    socket.on("admin:plan-updated", handlePlanUpdated);

    return () => {
      socket.off("admin:user-joined", handleUserJoined);
      socket.off("admin:plan-updated", handlePlanUpdated);
    };
  }, [socket, user?.role]);

  const changePlan = async (userId: string, plan: string) => {
    setUpdatingId(userId);
    try {
      await fetch(`${API}/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, plan } : u)));
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Ștergi utilizatorul ${email}? Această acțiune este ireversibilă.`)) return;
    await fetch(`${API}/api/admin/users/${userId}`, { method: "DELETE", credentials: "include" });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  if (user?.role !== "ADMIN") return null;

  return (
    <div className="space-y-6 soft-enter">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 flex items-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center z-10">
          <ShieldCheck size={24} className="text-amber-400" />
        </div>
        <div className="z-10">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Panou Administrator</p>
          <h1 className="text-2xl font-extrabold text-white">Admin Dashboard</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-teal-500" />
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Utilizatori", value: stats.totalUsers, icon: <Users size={20} />, color: "text-teal-600", bg: "bg-teal-50" },
                { label: "Plan Free", value: stats.planCounts.FREE, icon: <TrendingUp size={20} />, color: "text-slate-600", bg: "bg-slate-50" },
                { label: "Plan Starter", value: stats.planCounts.STARTER, icon: <TrendingUp size={20} />, color: "text-teal-600", bg: "bg-teal-50" },
                { label: "Plan Pro", value: stats.planCounts.PRO, icon: <TrendingUp size={20} />, color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Landing Pages", value: stats.totalLandings, icon: <LayoutTemplate size={20} />, color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "Magazine Shopify", value: stats.totalShops, icon: <ShoppingBag size={20} />, color: "text-emerald-600", bg: "bg-emerald-50" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3 ${s.color}`}>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Utilizatori ({users.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Shopify</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Creat</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{u.email}</div>
                        {!u.emailVerified && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">neverificat</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.role === "ADMIN" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="relative inline-block">
                          <select
                            value={u.plan}
                            onChange={(e) => changePlan(u.id, e.target.value)}
                            disabled={updatingId === u.id || u.role === "ADMIN"}
                            className={`text-xs font-bold px-2.5 py-1 rounded-full appearance-none pr-6 cursor-pointer ${PLAN_COLORS[u.plan]} disabled:opacity-60`}
                          >
                            <option value="FREE">Free</option>
                            <option value="STARTER">Starter</option>
                            <option value="PRO">Pro</option>
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {u.shops?.[0]?.myshopifyDomain ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString("ro-RO")}
                      </td>
                      <td className="px-5 py-3.5">
                        {u.role !== "ADMIN" && (
                          <button
                            onClick={() => deleteUser(u.id, u.email)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
