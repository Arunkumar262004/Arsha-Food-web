import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  const logout = useCallback(async (silent) => {
    if (!silent && tokenStore.get()) api.post("/api/admin/logout").catch(() => {});
    tokenStore.clear();
    setAdmin(null);
  }, []);

  // Restore session on load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get("/api/admin/me")
      .then((r) => setAdmin(r.data.admin))
      .catch(() => logout(true))
      .finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    const onUnauthorized = () => logout(true);
    window.addEventListener("admin:unauthorized", onUnauthorized);
    return () => window.removeEventListener("admin:unauthorized", onUnauthorized);
  }, [logout]);

  const login = async ({ email, password, remember }) => {
    const r = await api.post("/api/admin/login", { email, password, remember });
    tokenStore.set(r.data.token, remember);
    setAdmin(r.data.admin);
    return r.data.admin;
  };

  const can = useCallback(
    (perm) => !perm || !!admin?.permissions?.some((p) => p === "*" || p === perm),
    [admin]
  );

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
