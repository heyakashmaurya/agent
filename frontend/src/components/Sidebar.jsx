import { NAV_ITEMS, RESTAURANT_NAME } from '../utils/constants';
import Icon from './Icon';
export default function Sidebar({ pathname, onNavigate, mobileOpen, onClose, user }) {
  const role = String(user?.role || user?.userType || 'Staff');
  return <><aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
    <div className="brand"><div className="brand-mark">R</div><div><strong>{RESTAURANT_NAME}</strong><span>AI operations</span></div></div>
    <div className="sidebar-label">Workspace</div>
    <nav>{NAV_ITEMS.map((item) => <button type="button" key={item.path} className={`nav-item ${pathname === item.path || (item.path === '/dashboard' && pathname === '/') ? 'nav-item--active' : ''}`} onClick={() => { onNavigate(item.path); onClose?.(); }}><Icon name={item.icon} size={17}/><span>{item.label}</span></button>)}</nav>
    <div className="sidebar-bottom"><div className="agent-card"><span className="live-dot"/><div><strong>AI phone agent</strong><small>Ready for calls</small></div></div><div className="role-pill"><span>{role}</span><span className="role-pill__dot"/></div></div>
  </aside>{mobileOpen && <button className="sidebar-overlay" onClick={onClose} aria-label="Close menu" type="button"/>}</>;
}
