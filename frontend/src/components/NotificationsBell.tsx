import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const DROPDOWN_WIDTH = 320;
const DROPDOWN_GAP = 8; // px între bell și dropdown

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Calculează poziția dropdown-ului astfel încât să rămână mereu în viewport
  const calcDropdownPosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(DROPDOWN_WIDTH, vw - 16);

    // Încearcă să alinieze la dreapta bell-ului
    let left = rect.right - width;
    // Dacă iese pe stânga, ancora la stânga bell-ului
    if (left < 8) left = rect.left;
    // Dacă tot iese pe dreapta, clampuiește
    if (left + width > vw - 8) left = vw - width - 8;

    // Sub bell sau deasupra lui dacă nu e loc
    const topBelow = rect.bottom + DROPDOWN_GAP;
    const maxHeight = 384; // max-h-96
    const fitsBelow = topBelow + maxHeight < vh;
    const top = fitsBelow ? topBelow : rect.top - maxHeight - DROPDOWN_GAP;

    setDropdownStyle({ position: "fixed", top, left, width, zIndex: 9999 });
  }, []);

  const toggleOpen = () => {
    if (!isOpen) calcDropdownPosition();
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    fetchNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
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
      const res = await fetch(`${API_BASE}/api/notifications`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications");
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PUT",
        credentials: "include"
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
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
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden soft-enter"
          style={dropdownStyle}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Notificări</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                {unreadCount} noi
              </span>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                Nu ai nicio notificare momentan.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!n.isRead ? "bg-indigo-50/40" : ""}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex gap-3 items-start">
                      <div
                        className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${!n.isRead ? "bg-indigo-500" : "bg-slate-300"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 break-words">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed break-words">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                          {new Date(n.createdAt).toLocaleDateString("ro-RO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
