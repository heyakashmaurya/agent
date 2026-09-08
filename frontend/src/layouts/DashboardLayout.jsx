import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { RESTAURANT_NAME } from '../utils/constants';

const titles = {
  '/dashboard': ['Overview', 'Your restaurant at a glance'], '/': ['Overview', 'Your restaurant at a glance'],
  '/reservations': ['Reservations', 'Manage upcoming and historical bookings'], '/tables': ['Tables', 'Live floor status and capacity'],
  '/calls': ['Call logs', 'Review AI and human conversations'], '/customers': ['Customers', 'Understand your regular guests'],
  '/ai': ['AI receptionist', 'Monitor the phone agent and voice stack'], '/outbound': ['Outbound calls', 'Start an AI-assisted guest call'],
  '/analytics': ['Analytics', 'Performance across bookings and calls'], '/settings': ['Settings', 'Restaurant and account configuration'],
};

export default function DashboardLayout({ pathname, children, onNavigate, onLogout, onRefresh, refreshing, user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [pathname]);
  const [title, subtitle] = useMemo(() => titles[pathname] || ['Overview', RESTAURANT_NAME], [pathname]);
  return <div className="app-shell"><Sidebar pathname={pathname} onNavigate={onNavigate} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} user={user}/><div className="main-area"><Navbar title={title} subtitle={subtitle} user={user} onMenu={() => setMobileOpen(true)} onLogout={onLogout} onRefresh={onRefresh} refreshing={refreshing}/><main className="page-content">{children}</main></div></div>;
}
