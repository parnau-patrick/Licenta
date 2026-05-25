import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, Sparkles, ExternalLink, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null); // notificarea deschisă în modal
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /* ── Poziție dropdown ── */
  const calcDropdownPosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dropW = Math.min(320, vw - 16);

    let left = rect.left;
    if (left + dropW > vw - 8) left = vw - dropW - 8;
    if (left < 8) left = 8;

    const topBelow = rect.bottom + 6;
    const availH = vh - topBelow - 8;

    setDropdownStyle({
      position: "fixed",
      top: topBelow,
      left,
      width: dropW,
      maxHeight: Math.min(availH, 480),
      zIndex: 9999,
    });
  }, []);

  const toggleOpen = () => {
    if (!isOpen) calcDropdownPosition();
    setIsOpen((prev) => !prev);
  };

  /* ── Event listeners ── */
  useEffect(() => {
    fetchNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleResize = () => { if (isOpen) calcDropdownPosition(); };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, calcDropdownPosition]);

  /* ── API ── */
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, { credentials: "include" });
      if (res.ok) setNotifications(await res.json());
    } catch { /* ignore */ }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, { method: "PUT", credentials: "include" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch { /* ignore */ }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) =>
      fetch(`${API_BASE}/api/notifications/${n.id}/read`, { method: "PUT", credentials: "include" })
    ));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  /* ── Click pe notificare → deschide modal ── */
  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) markAsRead(n.id);
    setSelected(n);
    setIsOpen(false);
  };

  /* ── Click pe butonul "Mergi la analiză" din modal ── */
  const handleGoToAnalysis = () => {
    if (selected?.link) {
      navigate(selected.link);
      setSelected(null);
    }
  };

  return (
    <>
      {/* ─── Bell button ─── */}
      <div ref={wrapperRef}>
        <button
          onClick={toggleOpen}
          className="relative p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          aria-label="Notificări"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* ─── Dropdown listă ─── */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
            <div
              className="fixed z-[9999] bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col"
              style={{
                ...dropdownStyle,
                boxShadow: "0 20px 60px -10px rgba(15,23,42,0.18), 0 4px 16px -4px rgba(15,23,42,0.08)",
              }}
            >
              {/* Header dropdown */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Bell size={15} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-none">Notificări</h3>
                    {unreadCount > 0 && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{unreadCount} necitite</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <CheckCheck size={13} /> Toate citite
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Lista notificări */}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Bell size={20} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-400">Nicio notificare momentan</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-5 py-4 flex gap-3 items-start transition-colors group ${
                        !n.isRead ? "bg-indigo-50/50 hover:bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1.5">
                        <div className={`w-2 h-2 rounded-full ${!n.isRead ? "bg-indigo-500" : "bg-slate-200"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold leading-snug text-left ${!n.isRead ? "text-slate-900" : "text-slate-600"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2 text-left">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                          {new Date(n.createdAt).toLocaleDateString("ro-RO", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <ExternalLink size={13} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Modal detalii notificare ─── */}
      {selected && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeInScale 0.2s ease" }}
          >
            {/* Modal header */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -mr-10 -mt-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 -ml-6 -mb-6 pointer-events-none" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-indigo-200 text-[11px] font-bold uppercase tracking-widest mb-1">
                      Recomandare AI
                    </p>
                    <h3 className="text-white font-bold text-lg leading-snug">
                      {selected.title}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-[11px] text-indigo-200 mt-4 font-medium">
                {new Date(selected.createdAt).toLocaleDateString("ro-RO", {
                  weekday: "long", day: "numeric", month: "long",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>

            {/* Modal body */}
            <div className="p-6">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Detalii recomandare
                </p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selected.message}
                </p>
              </div>

              {/* Buton acțiune */}
              {selected.link && (
                <button
                  onClick={handleGoToAnalysis}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-500/30 transition-all"
                >
                  <Sparkles size={16} />
                  Generează Analiza Completă
                  <ExternalLink size={14} className="opacity-70" />
                </button>
              )}

              <button
                onClick={() => setSelected(null)}
                className="mt-3 w-full py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
