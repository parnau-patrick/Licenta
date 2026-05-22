import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resReg = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const dataReg = await resReg.json();
      if (!resReg.ok) throw new Error(dataReg.error || "Registration failed");

      // auto login right after
      const resLog = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const dataLog = await resLog.json();
      if (resLog.ok) {
        setUser(dataLog.user);
        navigate("/");
      } else {
        navigate("/login");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-md pt-10">
      <div className="glass-card flex flex-col items-center rounded-3xl p-8 md:p-10">
        <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
        <p className="mt-2 text-sm text-slate-500">Sign up to get started</p>

        {error && <p className="mt-4 w-full rounded-md bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-8 w-full space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email Address</label>
            <input
              type="email"
              required
              className="mt-1 w-full rounded-xl bg-white/50 border border-slate-200 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              minLength={6}
              required
              className="mt-1 w-full rounded-xl bg-white/50 border border-slate-200 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-teal-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
