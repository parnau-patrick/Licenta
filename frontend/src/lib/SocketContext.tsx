import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import type { User } from "./AuthContext";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Dacă nu avem user, nu inițializăm conexiunea
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(API, {
      withCredentials: true,
      transports: ["websocket", "polling"], // fallbacks
    });

    newSocket.on("connect", () => {
      console.log("🟢 Socket conectat:", newSocket.id);
      setIsConnected(true);
      // Ne identificăm cu userId pentru a primi notificări personale
      newSocket.emit("identify", user.id);
      // Dacă e admin, ne alăturăm room-ului de admin
      if (user.role === "ADMIN") {
        newSocket.emit("join:admin");
      }
    });

    // Ascultăm pentru actualizări de plan (Stripe webhooks / Admin actions)
    newSocket.on("user:plan-updated", (data: { plan: string }) => {
      console.log("💳 Plan actualizat:", data.plan);
      setUser((prev) => prev ? { ...prev, plan: data.plan as User['plan'] } : prev);
    });

    newSocket.on("disconnect", () => {
      console.log("🔴 Socket deconectat");
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
