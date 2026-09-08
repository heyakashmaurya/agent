import { useEffect, useState } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './hooks/useAuth';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Tables from './pages/Tables';
import CallLogs from './pages/CallLogs';
import Analytics from './pages/Analytics';
import Customers from './pages/Customers';
import AIReceptionist from './pages/AIReceptionist';
import OutboundCalls from './pages/OutboundCalls';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function usePath() {
  const [pathname, setPathname] = useState(window.location.pathname || '/');
  useEffect(() => { const onPop = () => setPathname(window.location.pathname || '/'); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  const navigate = (path) => { if (path === pathname) return; window.history.pushState({}, '', path); setPathname(path); window.scrollTo({ top: 0, behavior: 'auto' }); };
  return [pathname, navigate];
}

function ProtectedApp() {
  const [pathname, navigate] = usePath();
  const { authenticated, loading, user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { if (!loading && !authenticated && pathname !== '/login') navigate('/login'); else if (!loading && authenticated && pathname === '/login') navigate('/dashboard'); }, [authenticated, loading, navigate, pathname]);
  if (loading) return <div className="loading-screen"><div className="loading-mark">R</div><p>Checking session…</p></div>;
  if (!authenticated || pathname === '/login') return <Login onSuccess={() => navigate('/dashboard')} />;
  const refreshPage = () => { setRefreshing(true); window.dispatchEvent(new Event('restaurant:refresh')); setTimeout(() => { window.location.reload(); }, 250); };
  const Page = { '/': Dashboard, '/dashboard': Dashboard, '/reservations': Reservations, '/tables': Tables, '/calls': CallLogs, '/customers': Customers, '/ai': AIReceptionist, '/outbound': OutboundCalls, '/analytics': Analytics, '/settings': Settings }[pathname];
  const pageProps = { onNavigate: navigate };
  return <DashboardLayout pathname={pathname} onNavigate={navigate} onLogout={logout} onRefresh={refreshPage} refreshing={refreshing} user={user}>{Page ? <Page {...pageProps}/> : <NotFound onNavigate={navigate}/>}</DashboardLayout>;
}

export default function App() { return <AuthProvider><ProtectedApp /></AuthProvider>; }
