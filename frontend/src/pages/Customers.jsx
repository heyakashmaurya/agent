import { useEffect, useMemo, useState } from "react";
import Panel from "../components/Panel";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Icon from "../components/Icon";
import { api, endpoints, unwrap } from "../services/api";
import { DEMO_BOOKINGS, DEMO_MODE } from "../utils/constants";
import { formatDate, formatDateTime, formatDuration } from "../utils/formatDate";

const asArray = (payload) => { const value = unwrap(payload); if (Array.isArray(value)) return value; if (Array.isArray(value?.customers)) return value.customers; if (Array.isArray(value?.items)) return value.items; return []; };
const normalize = (customer) => ({ ...customer, id: customer._id || customer.id, name: customer.fullName || customer.name || "Guest", phone: customer.phone || "—", email: customer.email || "—", bookings: customer.totalBookings ?? customer.bookings ?? 0, visits: customer.totalVisits ?? customer.visits ?? 0, lastActivity: customer.lastActivityAt || customer.lastBookingAt || customer.lastCallAt || customer.updatedAt || customer.createdAt, language: customer.preferredLanguage || "en", blocked: Boolean(customer.isBlocked) });

export default function Customers() {
  const [rows, setRows] = useState([]), [query, setQuery] = useState(""), [error, setError] = useState(""), [selected, setSelected] = useState(null), [detail, setDetail] = useState(null), [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); setError(""); try { const response = await api.get(`${endpoints.customers.list}?page=1&limit=100&search=${encodeURIComponent(query.trim())}`); const list = asArray(response).map(normalize); if (!list.length && DEMO_MODE) setRows(DEMO_BOOKINGS.map((b, i) => normalize({ _id: `demo-${i}`, fullName: b.customerName, phone: b.customerPhone, totalBookings: 1, lastBookingAt: b.bookingDate }))); else setRows(list); } catch (e) { if (DEMO_MODE) setRows(DEMO_BOOKINGS.map((b, i) => normalize({ _id: `demo-${i}`, fullName: b.customerName, phone: b.customerPhone, totalBookings: 1, lastBookingAt: b.bookingDate }))); else { setRows([]); setError(e.message); } } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => rows.filter((row) => `${row.name} ${row.phone} ${row.email}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const open = async (row) => { setSelected(row); setDetail(null); try { setDetail(unwrap(await api.get(endpoints.customers.one(row.id)))); } catch (e) { setError(e.message); } };
  const columns = [
    { key: "name", label: "Customer", render: (r) => <><strong>{r.name}</strong><span className="subtext">{r.phone}</span></> },
    { key: "email", label: "Email" },
    { key: "bookings", label: "Bookings" },
    { key: "visits", label: "Visits" },
    { key: "lastActivity", label: "Last activity", render: (r) => r.lastActivity ? formatDateTime(r.lastActivity) : "—" },
    { key: "language", label: "Language" },
    { key: "blocked", label: "Status", render: (r) => r.blocked ? "Blocked" : "Active" },
  ];
  return <div className="page-stack">
    <div className="page-intro"><div><span className="eyebrow">CUSTOMERS</span><h2>Customer directory and history.</h2><p>Customers are loaded from bookings and call activity on the backend, with search and per-customer history.</p></div><button className="secondary-button" type="button" onClick={load} disabled={loading}><Icon name="refresh" size={16}/>{loading ? "Loading…" : "Refresh"}</button></div>
    {error && <div className="alert alert--danger">{error}</div>}
    <Panel title="Customers" subtitle={`${filtered.length} shown`} action={<div className="searchbox"><Icon name="search" size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search name, phone or email"/></div>}>
      <DataTable columns={columns} rows={filtered} empty={loading ? "Loading customers…" : "No customer records found."} onRowClick={open}/>
    </Panel>
    <Modal open={Boolean(selected)} title={selected?.name || "Customer"} subtitle={selected?.phone} onClose={() => setSelected(null)}>
      {detail && <div className="detail-stack">
        <div className="detail-grid"><div><span>Email</span><strong>{detail.customer?.email || "—"}</strong></div><div><span>Bookings</span><strong>{detail.customer?.totalBookings || 0}</strong></div><div><span>Visits</span><strong>{detail.customer?.totalVisits || 0}</strong></div><div><span>Last call</span><strong>{detail.customer?.lastCallAt ? formatDateTime(detail.customer.lastCallAt) : "—"}</strong></div></div>
        <Panel title="Recent bookings"><DataTable columns={[{key:"confirmationCode",label:"Confirmation",render:r=>r.confirmationCode||"—"},{key:"bookingDate",label:"Date",render:r=>formatDate(r.bookingDate)},{key:"startTime",label:"Time"},{key:"status",label:"Status"}]} rows={detail.bookings || []} empty="No booking history."/></Panel>
        <Panel title="Recent calls"><DataTable columns={[{key:"startedAt",label:"Started",render:r=>formatDateTime(r.startedAt)},{key:"duration",label:"Duration",render:r=>formatDuration(r.duration)},{key:"provider",label:"Provider"},{key:"callStatus",label:"Status"},{key:"aiOutcome",label:"Outcome"}]} rows={detail.calls || []} empty="No call history."/></Panel>
      </div>}
    </Modal>
  </div>;
}
