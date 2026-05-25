import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const calcDropdownPosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const dropW = Math.min(320, vw - 16);

    // Încearcă să pornească de la marginea stângă a bell-ului
    let left = rect.left;
    // Dacă iese din dreapta viewport-ului, mută-l spre stânga
    if (left + dropW > vw - 8) {
      left = vw - dropW - 8;
    }
    // Nu lăsa să iasă din stânga
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

  useEffect(() => {
    fetchNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleResizeOrScroll = () => {
      if (isOpen) calcDropdownPosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [isOpen, calcDropdownPosition]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      console.error("Failed to fetch notifications");
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(
      unread.map((n) =>
        fetch(`${API_BASE}/api/notifications/${n.id}/read`, {
          method: "PUT",
          credentials: "include",
        })
      )
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PUT",
        credentials: "include",
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      console.error("Failed to mark notification as read");
    }
  };

  const handleNotificationClick = (n: any) => {
    if (!n.isRead) markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef}>
      {/* Bell button */}
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

      {/* Dropdown — position:fixed, apare în zona de main content */}
      {isOpen && (
        <>
          {/* Backdrop invizibil pt click-outside */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="fixed z-[9999] bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col"
            style={{
              ...dropdownStyle,
              boxShadow:
                "0 20px 60px -10px rgba(15, 23, 42, 0.18), 0 4px 16px -4px rgba(15, 23, 42, 0.08)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Bell size={15} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-none">
                    Notificări
                  </h3>
                  {unreadCount > 0 && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {unreadCount} necitite
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    Marchează toate
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

            {/* Lista */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Bell size={20} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">
                    Nicio notificare momentan
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-5 py-4 flex gap-3 items-start cursor-pointer transition-colors group ${
                      !n.isRead
                        ? "bg-indigo-50/50 hover:bg-indigo-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Dot indicator */}
                    <div className="flex-shrink-0 mt-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          !n.isRead ? "bg-indigo-500" : "bg-slate-200"
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold leading-snug ${
                          !n.isRead ? "text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                        {new Date(n.createdAt).toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
