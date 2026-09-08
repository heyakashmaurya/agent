// const TOKEN_KEY = 'restaurant_ai_access_token';
const TOKEN_KEY = 'token';
const USER_KEY = 'restaurant_ai_user';

const safeStorage = {
  get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { if (value == null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, value); } catch { /* best effort */ } },
  remove(key) { try { window.localStorage.removeItem(key); } catch { /* best effort */ } },
};

export const authStore = {
  getToken: () => safeStorage.get(TOKEN_KEY),
  setToken: (token) => safeStorage.set(TOKEN_KEY, token || null),
  getUser() {
    try { const raw = safeStorage.get(USER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  setUser(user) { safeStorage.set(USER_KEY, user ? JSON.stringify(user) : null); },
  clear() { safeStorage.remove(TOKEN_KEY); safeStorage.remove(USER_KEY); },
};
