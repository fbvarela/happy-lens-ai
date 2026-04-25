"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext({ user: null, loading: true, refresh: () => {}, signOut: () => {}, testLogin: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const d = await r.json();
      setUser(d.user || null);
    } catch { setUser(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const testLogin = useCallback(async (email = "test@happyfactory.app") => {
    const r = await fetch("/api/auth/test-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error || `Sign-in failed (${r.status})`);
    }
    await refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signOut, testLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
