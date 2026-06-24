import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const ROLE_NAV = {
  admin: ['*'],
  security: ['/', '/lookup', '/scan/gate', '/scan/lunch', '/notifications', '/visitors', '/staff', '/scan'],
  librarian: ['/', '/lookup', '/scan/library', '/notifications', '/scan'],
  cafeteria: ['/', '/lookup', '/scan/lunch', '/notifications', '/scan'],
  staff: ['/', '/lookup', '/notifications'],
  office_manager: ['/', '/lookup', '/notifications', '/office-dashboard'],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('kis_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setUser(data.user))
        .catch(() => { localStorage.removeItem('kis_token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('kis_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('kis_token');
    setToken(null);
    setUser(null);
  };

  const canAccess = (path) => {
    if (!user) return false;
    const allowed = ROLE_NAV[user.role] || [];
    if (allowed.includes('*')) return true;
    return allowed.some((p) => path === p || (p !== '/' && path.startsWith(p)));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
