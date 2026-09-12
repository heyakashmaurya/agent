import { useEffect, useMemo, useState } from 'react';
import StatCard from '../components/StatCard';
import Panel from '../components/Panel';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import TableGrid from '../components/TableGrid';
import { BarChart, Donut } from '../components/Charts';
import { api, endpoints, unwrap } from '../services/api';
import { DEMO_BOOKINGS, DEMO_CALLS, DEMO_TABLES, DEMO_MODE } from '../utils/constants';
import { formatDateTime } from '../utils/formatDate';

function localDateString(date = new Date()) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getOverview(payload) {
  const value = unwrap(payload);
  return value?.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data : value || {};
}

function normBooking(b = {}) {
  return { ...b, id: b._id || b.id, customerName: b.customerName || b.customer?.fullName || b.customer?.name || b.guestName || 'Guest', guestCount: b.guestCount ?? b.guests ?? b.partySize ?? 0, tableNumber: b.tableNumber ?? b.table?.tableNumber ?? b.table?.number, date: b.bookingDate || b.date || b.createdAt, time: b.startTime || b.time || '', status: String(b.status || 'pending').toLowerCase() };
}
function normTable(t = {}) { return { ...t, id: t._id || t.id, number: t.tableNumber ?? t.number ?? t.tableNo, capacity: t.capacity ?? t.seats ?? 0, status: String(t.status || 'available').toLowerCase(), section: t.location || t.section || 'Indoor' }; }

export default function Dashboard({ onNavigate }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const response = await api.get(`${endpoints.dashboard.overview}?date=${localDateString()}`);
        if (!alive) return;
        setOverview(getOverview(response));
        setUsingDemo(false);
      } catch (e) {
        if (!alive) return;
        if (DEMO_MODE) {
          setUsingDemo(true);
          setOverview({
            metrics: { todayBookings: DEMO_BOOKINGS.filter((b) => String(b.bookingDate).slice(0, 10) === localDateString() && b.status !== 'cancelled').length, totalTables: DEMO_TABLES.length, occupiedTables: DEMO_TABLES.filter((t) => String(t.status).toLowerCase() === 'occupied').length, todayCalls: DEMO_CALLS.length },
            bookingStatus: { confirmed: DEMO_BOOKINGS.filter((b) => String(b.status).toLowerCase() === 'confirmed').length },
            recentBookings: DEMO_BOOKINGS,
            tables: DEMO_TABLES,
            recentCalls: DEMO_CALLS,
          });
        } else setError(e.message);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const metrics = overview?.metrics || {};
  const bookings = (overview?.recentBookings || []).map(normBooking);
  const tables = (overview?.tables || []).map(normTable);
  const calls = overview?.recentCalls || [];
  const confirmedToday = Number(overview?.bookingStatus?.confirmed || 0);
  const aiHandled = calls.length ? Math.round((calls.filter((c) => c.aiHandled !== false && !c.transferredToHuman).length / calls.length) * 100) : 0;

  const trend = useMemo(() => {
    const byDay = new Map((overview?.bookingVolume || []).map((item) => [item.date, Number(item.count) || 0]));
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - index));
      const key = localDateString(d);
      return { label: d.toLocaleDateString([], { weekday: 'short' }), value: byDay.get(key) || 0 };
    });
  }, [overview]);

  const columns = [
    { key: 'customerName', label: 'Guest', render: (r) => <><strong>{r.customerName}</strong><span className="subtext">{r.guestCount} guests</span></> },
    { key: 'tableNumber', label: 'Table', render: (r) => r.tableNumber ? `#${r.tableNumber}` : 'Unassigned' },
    { key: 'date', label: 'Schedule', render: (r) => formatDateTime(`${String(r.date || '').slice(0, 10)}T${r.time || '12:00'}`) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status}/> },
  ];

  return <div className="page-stack">
    <div className="page-intro"><div><span className="eyebrow">LIVE OPERATIONS</span><h2>Good service starts with visibility.</h2><p>Today's metrics come from the backend's local calendar day instead of browser UTC calculations.</p></div><div className="intro-actions"><span className="connection-pill"><i className={usingDemo ? '' : 'is-live'}/>{usingDemo ? 'Demo data' : loading ? 'Connecting…' : 'Backend connected'}</span><button className="secondary-button" onClick={() => onNavigate('/reservations')} type="button">Open reservations</button></div></div>
    {error && <div className="alert alert--danger">{error}</div>}
    <div className="stats-grid"><StatCard label="Today's bookings" value={loading ? '—' : Number(metrics.todayBookings || 0)} detail={`${confirmedToday} confirmed`} icon="calendar" tone="success" onClick={() => onNavigate('/reservations')}/><StatCard label="Tables occupied" value={loading ? '—' : `${Number(metrics.occupiedTables || 0)}/${Number(metrics.totalTables || 0)}`} detail="Live floor" icon="table" tone="warning" onClick={() => onNavigate('/tables')}/><StatCard label="Calls today" value={loading ? '—' : Number(metrics.todayCalls || 0)} detail={`${aiHandled}% AI handled in recent calls`} icon="phone" tone="neutral" onClick={() => onNavigate('/calls')}/><StatCard label="AI containment" value={loading ? '—' : `${aiHandled}%`} detail="Recent calls without human transfer" icon="spark" tone="success" onClick={() => onNavigate('/ai')}/></div>
    <div className="dashboard-grid"><Panel title="Booking volume" subtitle="Last 7 local calendar days"><BarChart data={trend}/></Panel><Panel title="AI coverage" subtitle="Recent calls returned by the dashboard API"><div className="donut-layout"><Donut value={aiHandled}/><div className="metric-list"><div><strong>{aiHandled}%</strong><span>AI handled</span></div><div><strong>{calls.filter((c) => c.transferredToHuman).length}</strong><span>Human handoffs</span></div><div><strong>{calls.filter((c) => c.sentiment === 'positive').length}</strong><span>Positive calls</span></div></div></div></Panel></div>
    <div className="dashboard-grid"><Panel title="Today's / recent reservations" subtitle="Sorted from backend activity" action={<button className="text-button" onClick={() => onNavigate('/reservations')} type="button">View all →</button>}><DataTable columns={columns} rows={bookings.slice(0, 8)} empty="No booking records yet."/></Panel><Panel title="Floor snapshot" subtitle="Current table state" action={<button className="text-button" onClick={() => onNavigate('/tables')} type="button">Manage →</button>}><TableGrid tables={tables.slice(0, 8)}/></Panel></div>
  </div>;
}




// import { useEffect, useMemo, useState } from 'react';
// import StatCard from '../components/StatCard';
// import Panel from '../components/Panel';
// import StatusBadge from '../components/StatusBadge';
// import DataTable from '../components/DataTable';
// import TableGrid from '../components/TableGrid';
// import { BarChart, Donut } from '../components/Charts';
// import { api, endpoints, unwrap } from '../services/api';
// import { DEMO_BOOKINGS, DEMO_CALLS, DEMO_TABLES, DEMO_MODE } from '../utils/constants';
// import { formatDateTime } from '../utils/formatDate';

// const list = (payload, keys = []) => { const value = unwrap(payload, keys); return Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : []; };
// function normBooking(b) { return { ...b, id: b._id || b.id, customerName: b.customerName || b.customer?.name || b.guestName || 'Guest', guestCount: b.guestCount ?? b.guests ?? b.partySize ?? 0, tableNumber: b.tableNumber ?? b.table?.tableNumber ?? b.table?.number, status: String(b.status || 'pending').toLowerCase(), date: b.bookingDate || b.date || b.createdAt, time: b.startTime || b.time || '' }; }
// function normTable(t) { return { ...t, id: t._id || t.id, number: t.tableNumber ?? t.number ?? t.tableNo, capacity: t.capacity ?? t.seats ?? 0, status: String(t.status || 'available').toLowerCase() }; }

// export default function Dashboard({ onNavigate }) {
//   const [bookings, setBookings] = useState([]); const [tables, setTables] = useState([]); const [calls, setCalls] = useState([]); const [loading, setLoading] = useState(true); const [usingDemo, setUsingDemo] = useState(false);
//   useEffect(() => { let alive = true; (async () => { setLoading(true); const results = await Promise.allSettled([api.get(endpoints.bookings.list + '?limit=10'), api.get(endpoints.tables.list), api.get(endpoints.calls.list + '?limit=10')]); if (!alive) return; const [b, t, c] = results; const nextB = b.status === 'fulfilled' ? list(b.value) : []; const nextT = t.status === 'fulfilled' ? list(t.value) : []; const nextC = c.status === 'fulfilled' ? list(c.value) : []; const fallback = DEMO_MODE && nextB.length === 0 && nextT.length === 0 && nextC.length === 0; setUsingDemo(fallback); setBookings((fallback ? DEMO_BOOKINGS : nextB).map(normBooking)); setTables((fallback ? DEMO_TABLES : nextT).map(normTable)); setCalls(fallback ? DEMO_CALLS : nextC); setLoading(false); })(); return () => { alive = false; }; }, []);
//   const today = new Date().toISOString().slice(0,10); const todays = bookings.filter((b) => String(b.date).slice(0,10) === today && b.status !== 'cancelled'); const confirmed = bookings.filter((b) => b.status === 'confirmed').length; const occupied = tables.filter((t) => t.status === 'occupied').length; const aiHandled = calls.length ? Math.round((calls.filter((c) => c.aiHandled !== false).length / calls.length) * 100) : 0;
//   const trend = useMemo(() => { const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6-i)); return d; }); return days.map((d) => ({ label: d.toLocaleDateString([], { weekday: 'short' }), value: bookings.filter((b) => String(b.date).slice(0,10) === d.toISOString().slice(0,10)).length || (usingDemo ? [5,8,4,9,7,11,8][d.getDay()] : 0) })); }, [bookings, usingDemo]);
//   const columns = [{ key:'customerName', label:'Guest', render:(r)=><><strong>{r.customerName}</strong><span className="subtext">{r.guestCount} guests</span></> }, { key:'tableNumber', label:'Table', render:(r)=>r.tableNumber ? `#${r.tableNumber}` : 'Unassigned' }, { key:'date', label:'Schedule', render:(r)=>formatDateTime(`${r.date?.slice(0,10) || ''}T${r.time || '12:00'}`) }, { key:'status', label:'Status', render:(r)=><StatusBadge status={r.status}/> }];
//   return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">LIVE OPERATIONS</span><h2>Good service starts with visibility.</h2><p>Monitor bookings, tables and AI calls from one workspace.</p></div><div className="intro-actions"><span className="connection-pill"><i className={usingDemo ? '' : 'is-live'}/>{usingDemo ? 'Demo data' : loading ? 'Connecting…' : 'Backend connected'}</span><button className="secondary-button" onClick={() => onNavigate('/reservations')} type="button">Open reservations</button></div></div>
//     <div className="stats-grid"><StatCard label="Today's bookings" value={loading ? '—' : todays.length} detail={`${confirmed} confirmed`} icon="calendar" tone="success" onClick={() => onNavigate('/reservations')}/><StatCard label="Tables occupied" value={loading ? '—' : `${occupied}/${tables.length || 0}`} detail="Live floor" icon="table" tone="warning" onClick={() => onNavigate('/tables')}/><StatCard label="Calls reviewed" value={loading ? '—' : calls.length} detail={`${aiHandled}% AI handled`} icon="phone" tone="neutral" onClick={() => onNavigate('/calls')}/><StatCard label="AI containment" value={loading ? '—' : `${aiHandled}%`} detail="No human transfer" icon="spark" tone="success" onClick={() => onNavigate('/ai')}/></div>
//     <div className="dashboard-grid"><Panel title="Booking volume" subtitle="Last 7 days"><BarChart data={trend}/></Panel><Panel title="AI coverage" subtitle="Share of recent calls handled without transfer"><div className="donut-layout"><Donut value={aiHandled} /><div className="metric-list"><div><strong>{aiHandled}%</strong><span>AI handled</span></div><div><strong>{calls.filter((c) => c.transferredToHuman).length || 0}</strong><span>Human handoffs</span></div><div><strong>{calls.filter((c) => c.sentiment === 'positive').length || 0}</strong><span>Positive calls</span></div></div></div></Panel></div>
//     <div className="dashboard-grid"><Panel title="Upcoming reservations" subtitle="Most recent booking activity" action={<button className="text-button" onClick={() => onNavigate('/reservations')} type="button">View all →</button>}><DataTable columns={columns} rows={bookings.slice(0,6)} empty="No booking records yet."/></Panel><Panel title="Floor snapshot" subtitle="Current table state" action={<button className="text-button" onClick={() => onNavigate('/tables')} type="button">Manage →</button>}><TableGrid tables={tables.slice(0,8)}/></Panel></div>
//   </div>;
// }
