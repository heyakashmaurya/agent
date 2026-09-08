import { useState } from 'react';
import Icon from './Icon';
import { initials } from '../utils/formatDate';
export default function Navbar({ title, subtitle, user, onMenu, onLogout, onRefresh, refreshing }) {
  const [open, setOpen] = useState(false);
  return <header className="topbar"><div className="topbar-left"><button className="menu-button" onClick={onMenu} type="button"><Icon name="menu" size={20}/></button><div><h1>{title}</h1>{subtitle && <span>{subtitle}</span>}</div></div><div className="topbar-actions"><button className="icon-button" onClick={onRefresh} disabled={refreshing} title="Refresh" type="button"><Icon name="refresh" size={18} className={refreshing ? 'spin' : ''}/></button><button className="icon-button" title="Notifications" type="button"><Icon name="bell" size={18}/><i className="notification-dot"/></button><div className="profile-menu"><button className="profile-chip" onClick={() => setOpen((v) => !v)} type="button"><span className="avatar">{initials(user?.name || user?.fullName || user?.email)}</span><span className="profile-chip__text"><strong>{user?.name || user?.fullName || 'Restaurant admin'}</strong><small>{user?.role || 'Staff'}</small></span></button>{open && <div className="profile-popover"><button type="button" onClick={onLogout}>Sign out</button></div>}</div></div></header>;
}
