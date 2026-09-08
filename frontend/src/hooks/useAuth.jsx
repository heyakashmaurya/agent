import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authStore } from '../app/store';
import { DEMO_MODE } from '../utils/constants';
import { api, endpoints, unwrap } from '../services/api';

const AuthContext = createContext(null);

function tokenFrom(payload) { return payload?.token || payload?.accessToken || payload?.data?.token || payload?.data?.accessToken || null; }
function userFrom(payload) { return payload?.user || payload?.data?.user || null; }

export function AuthProvider({ children }) {
  const demoUser = DEMO_MODE && window.localStorage.getItem('restaurant_ai_demo_auth') === 'true' ? { name: 'Demo Operator', email: 'demo@restaurant.local', role: 'Owner', restaurantName: 'The Garden Table' } : null;
  const [user, setUser] = useState(authStore.getUser() || demoUser);
  const [loading, setLoading] = useState(Boolean(authStore.getToken()) && !demoUser);

  const refreshProfile = useCallback(async () => {
    try {
      const payload = await api.get(endpoints.auth.profile);
      const next = userFrom(payload) || (payload && !payload.message ? unwrap(payload) : null);
      if (next && typeof next === 'object') { authStore.setUser(next); setUser(next); }
      return next;
    } catch (error) {
      if (error.status === 401) { authStore.clear(); setUser(null); }
      return null;
    }
  }, []);

  useEffect(() => { if (!authStore.getToken()) { setLoading(false); return; } refreshProfile().finally(() => setLoading(false)); }, [refreshProfile]);

  const login = useCallback(async (credentials) => {
    const payload = await api.post(endpoints.auth.login, credentials);
    const token = tokenFrom(payload);
    if (token) authStore.setToken(token);
    const next = userFrom(payload);
    if (next) { authStore.setUser(next); setUser(next); }
    else if (token) await refreshProfile();
    return unwrap(payload);
  }, [refreshProfile]);

  const register = useCallback(async (details) => api.post(endpoints.auth.register, details), []);

  const logout = useCallback(() => {
    authStore.clear();
    try { window.localStorage.removeItem('restaurant_ai_demo_auth'); } catch { /* best effort */ }
    setUser(null); window.history.replaceState({}, '', '/login'); window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const value = useMemo(() => ({ user, loading, authenticated: DEMO_MODE && user?.email === 'demo@restaurant.local' || Boolean(authStore.getToken()) || Boolean(user), login, register, logout, refreshProfile }), [loading, login, logout, refreshProfile, register, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }


// import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
// import { authStore } from '../app/store';
// import { DEMO_MODE } from '../utils/constants';
// import { api, endpoints, unwrap } from '../services/api';

// const AuthContext = createContext(null);

// function tokenFrom(payload) { return payload?.token || payload?.accessToken || payload?.data?.token || payload?.data?.accessToken || null; }
// function userFrom(payload) { return payload?.user || payload?.data?.user || null; }

// export function AuthProvider({ children }) {
//   const demoUser = DEMO_MODE && window.localStorage.getItem('restaurant_ai_demo_auth') === 'true' ? { name: 'Demo Operator', email: 'demo@restaurant.local', role: 'Owner', restaurantName: 'The Garden Table' } : null;
//   const [user, setUser] = useState(authStore.getUser() || demoUser);
//   const [loading, setLoading] = useState(Boolean(authStore.getToken()) && !demoUser);

//   const refreshProfile = useCallback(async () => {
//     try {
//       const payload = await api.get(endpoints.auth.profile);
//       const next = userFrom(payload) || (payload && !payload.message ? unwrap(payload) : null);
//       if (next && typeof next === 'object') { authStore.setUser(next); setUser(next); }
//       return next;
//     } catch (error) {
//       if (error.status === 401) { authStore.clear(); setUser(null); }
//       return null;
//     }
//   }, []);

//   useEffect(() => { if (!authStore.getToken()) { setLoading(false); return; } refreshProfile().finally(() => setLoading(false)); }, [refreshProfile]);

//   const login = useCallback(async (credentials) => {
//     const payload = await api.post(endpoints.auth.login, credentials);
//     const token = tokenFrom(payload);
//     if (token) authStore.setToken(token);
//     const next = userFrom(payload);
//     if (next) { authStore.setUser(next); setUser(next); }
//     else if (token) await refreshProfile();
//     return unwrap(payload);
//   }, [refreshProfile]);

//   const register = useCallback(async (details) => api.post(endpoints.auth.register, details), []);

//   const logout = useCallback(() => {
//     authStore.clear();
//     try { window.localStorage.removeItem('restaurant_ai_demo_auth'); } catch { /* best effort */ }
//     setUser(null); window.history.replaceState({}, '', '/login'); window.dispatchEvent(new PopStateEvent('popstate'));
//   }, []);

//   const value = useMemo(() => ({ user, loading, authenticated: DEMO_MODE && user?.email === 'demo@restaurant.local' || Boolean(authStore.getToken()) || Boolean(user), login, register, logout, refreshProfile }), [loading, login, logout, refreshProfile, register, user]);
//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// }

// export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
