

import { useCallback, useEffect, useMemo, useState } from 'react';
import Panel from '../components/Panel';
import TableGrid from '../components/TableGrid';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import { api, endpoints, unwrap } from '../services/api';
import { DEMO_MODE, DEMO_BOOKINGS, DEMO_TABLES } from '../utils/constants';
import { formatDateTime } from '../utils/formatDate';

const TABLE_STATUSES = ['Available', 'Reserved', 'Occupied', 'Maintenance'];
const LOCATIONS = ['Indoor', 'Outdoor', 'Window', 'Private'];

const emptyForm = () => ({
  tableNumber: '', tableName: '', capacity: 2, location: 'Indoor', floor: 1, notes: '', status: 'Available',
});

function normalizeTable(t = {}) {
  return {
    ...t,
    id: t._id || t.id,
    number: t.tableNumber ?? t.number ?? t.tableNo,
    name: t.tableName || t.name || '',
    capacity: t.capacity ?? t.seats ?? 0,
    status: String(t.status || 'Available').replace(/^./, (x) => x.toUpperCase()),
    location: t.location || t.section || 'Indoor',
    floor: t.floor ?? 1,
    notes: t.notes || '',
  };
}

function normalizeBooking(b = {}) {
  return {
    ...b,
    id: b._id || b.id,
    customerName: b.customerName || b.customer?.fullName || b.customer?.name || b.guestName || 'Guest',
    customerPhone: b.customerPhone || b.customer?.phone || b.phone || '',
    tableNumber: b.tableNumber ?? b.table?.tableNumber ?? b.table?.number,
    bookingDate: b.bookingDate || b.date || b.createdAt,
    startTime: b.startTime || b.time || '',
    status: String(b.status || 'pending').toLowerCase(),
    guestCount: b.guestCount ?? b.guests ?? b.partySize ?? 0,
    bookingSource: b.bookingSource || b.source || 'dashboard',
  };
}

function extractArray(payload, keys = []) {
  const value = unwrap(payload, keys);
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.bookings)) return value.bookings;
  return [];
}

function scheduleValue(booking) {
  const date = String(booking.bookingDate || '').slice(0, 10);
  const time = booking.startTime || '23:59';
  return new Date(`${date}T${time}`).getTime() || Number.MAX_SAFE_INTEGER;
}

function isToday(booking) {
  const d = new Date(booking.bookingDate);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const [tableResponse, bookingResponse] = await Promise.all([
        api.get(endpoints.tables.list),
        api.get(`${endpoints.bookings.list}?limit=50`),
      ]);
      const tableData = extractArray(tableResponse).map(normalizeTable).sort((a, b) => Number(a.number) - Number(b.number));
      const bookingData = extractArray(bookingResponse).map(normalizeBooking);
      const liveTables = tableData.length ? tableData : (DEMO_MODE ? DEMO_TABLES.map(normalizeTable) : []);
      const liveBookings = bookingData.length ? bookingData : (DEMO_MODE ? DEMO_BOOKINGS.map(normalizeBooking) : []);
      setTables(liveTables);
      setRecentBookings(liveBookings
        .filter((b) => b.status !== 'cancelled')
        .sort((a, b) => {
          const createdDiff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          if (createdDiff !== 0) return createdDiff;
          return scheduleValue(a) - scheduleValue(b);
        })
        .slice(0, 8));
    } catch (e) {
      if (DEMO_MODE) {
        setTables(DEMO_TABLES.map(normalizeTable));
        setRecentBookings(DEMO_BOOKINGS.map(normalizeBooking));
      } else setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => tables.filter((t) => filter === 'all' || t.status.toLowerCase() === filter.toLowerCase()),
    [tables, filter],
  );

  const updateStatus = async (table, nextStatus) => {
    setError('');
    try {
      if (DEMO_MODE && String(table.id).startsWith('demo-')) throw new Error('demo');
      const response = await api.patch(endpoints.tables.status(table.id), { status: nextStatus });
      const updated = normalizeTable(unwrap(response));
      setTables((current) => current.map((row) => row.id === table.id ? { ...row, ...updated, status: updated.status || nextStatus } : row));
    } catch (e) {
      if (DEMO_MODE) setTables((current) => current.map((row) => row.id === table.id ? { ...row, status: nextStatus } : row));
      else setError(e.message);
    }
  };

  const saveTable = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const form = modal.form;
    const payload = {
      tableNumber: Number(form.tableNumber),
      tableName: form.tableName.trim(),
      capacity: Number(form.capacity),
      location: form.location,
      floor: Number(form.floor),
      notes: form.notes.trim(),
    };
    try {
      if (modal.type === 'create') {
        const response = await api.post(endpoints.tables.create, payload);
        const created = normalizeTable(unwrap(response));
        setTables((current) => [...current, created].sort((a, b) => Number(a.number) - Number(b.number)));
      } else {
        const response = await api.put(endpoints.tables.one(modal.id), payload);
        const updated = normalizeTable(unwrap(response));
        setTables((current) => current.map((row) => row.id === modal.id ? { ...row, ...updated } : row).sort((a, b) => Number(a.number) - Number(b.number)));
      }
      setModal(null);
    } catch (e) {
      if (DEMO_MODE) {
        if (modal.type === 'create') {
          const created = normalizeTable({ ...form, id: `demo-${Date.now()}`, tableNumber: Number(form.tableNumber), status: 'Available' });
          setTables((current) => [...current, created]);
        } else {
          setTables((current) => current.map((row) => row.id === modal.id ? normalizeTable({ ...row, ...form }) : row));
        }
        setModal(null);
      } else setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setError('');
    setModal({ type: 'create', form: emptyForm() });
  };

  const openEdit = (table) => {
    setError('');
    setModal({
      type: 'edit', id: table.id,
      form: {
        tableNumber: table.number, tableName: table.name || '', capacity: table.capacity,
        location: table.location, floor: table.floor, notes: table.notes || '', status: table.status,
      },
    });
  };

  const nextStatus = (status) => status === 'Available' ? 'Occupied' : status === 'Occupied' ? 'Maintenance' : status === 'Maintenance' ? 'Available' : 'Occupied';
  const stats = useMemo(() => ({
    total: tables.length,
    available: tables.filter((t) => t.status === 'Available').length,
    occupied: tables.filter((t) => t.status === 'Occupied').length,
    reserved: tables.filter((t) => t.status === 'Reserved').length,
  }), [tables]);

  return <div className="page-stack">
    <div className="page-intro">
      <div><span className="eyebrow">FLOOR CONTROL</span><h2>Know every table at a glance.</h2><p>Manage table setup, live status and the next reservations from one place.</p></div>
      <button className="primary-button" onClick={openCreate} type="button"><Icon name="plus" size={16}/> Add table</button>
    </div>

    <div className="metrics-register">
      <div><span>Total tables</span><strong>{stats.total}</strong></div>
      <div><span>Available</span><strong>{stats.available}</strong></div>
      <div><span>Occupied</span><strong>{stats.occupied}</strong></div>
      <div><span>Reserved</span><strong>{stats.reserved}</strong></div>
    </div>

    <Panel title="Recent bookings" subtitle="Latest reservations to help staff prepare the floor" action={<button className="icon-button" onClick={load} type="button" title="Refresh"><Icon name="refresh" size={16}/></button>}>
      <div className="recent-bookings-list">
        {recentBookings.length ? recentBookings.map((booking) => <div className="recent-booking" key={booking.id}>
          <div className="recent-booking__main">
            <strong>{booking.customerName}</strong>
            <span>{booking.guestCount} guests · {booking.tableNumber ? `Table ${booking.tableNumber}` : 'Table auto-assigned'} · {String(booking.bookingSource).replace('_', ' ')}</span>
          </div>
          <div className="recent-booking__meta"><strong>{booking.startTime || '—'}</strong><span>{isToday(booking) ? 'Today' : formatDateTime(booking.bookingDate).split(',')[0]}</span></div>
          <StatusBadge status={booking.status}/>
        </div>) : <div className="empty-state">No recent bookings yet.</div>}
      </div>
    </Panel>

    <div className="filter-tabs">
      {['all', ...TABLE_STATUSES].map((value) => <button key={value} type="button" className={filter.toLowerCase() === value.toLowerCase() ? 'filter-tab--active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value}</button>)}
    </div>

    {error && <div className="alert alert--danger">{error}</div>}
    <Panel title={`${filtered.length} tables`} subtitle={busy ? 'Synchronizing…' : 'Click a table to cycle operational status'}>
      <TableGrid tables={filtered.map((t) => ({ ...t, section: t.location }))} onSelect={(table) => updateStatus(table, nextStatus(table.status))}/>
      <div className="table-helper"><StatusBadge status="available"/><span>Operational cycle: Available → Occupied → Maintenance → Available. Use the register for exact status and Edit for structural details.</span></div>
    </Panel>

    <Panel title="Table register" subtitle="Edit table number, capacity, location, floor and notes">
      <div className="register-grid">
        {filtered.map((table) => <div className="register-row register-row--table" key={table.id}>
          <div><strong>{table.name || `Table ${table.number}`}</strong><span>Table {table.number} · {table.capacity} seats · {table.location} · Floor {table.floor}</span></div>
          <StatusBadge status={table.status}/>
          <select value={table.status} onChange={(e) => updateStatus(table, e.target.value)} aria-label={`Status for table ${table.number}`}>
            {TABLE_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <button className="table-action" onClick={() => openEdit(table)} type="button"><Icon name="edit" size={14}/> Edit</button>
        </div>)}
      </div>
    </Panel>

    <Modal open={Boolean(modal)} title={modal?.type === 'edit' ? 'Edit table' : 'Add table'} subtitle="Locations use the backend-supported table locations: Indoor, Outdoor, Window and Private." onClose={() => !saving && setModal(null)} width={640}>
      {modal && <form className="form-grid" onSubmit={saveTable}>
        <label>Table number<input type="number" min="1" max="9999" required value={modal.form.tableNumber} onChange={(e) => setModal({ ...modal, form: { ...modal.form, tableNumber: e.target.value } })}/></label>
        <label>Table name<input value={modal.form.tableName} onChange={(e) => setModal({ ...modal, form: { ...modal.form, tableName: e.target.value } })} placeholder="Optional display name"/></label>
        <label>Capacity<input type="number" min="1" max="50" required value={modal.form.capacity} onChange={(e) => setModal({ ...modal, form: { ...modal.form, capacity: e.target.value } })}/></label>
        <label>Location / section<select required value={modal.form.location} onChange={(e) => setModal({ ...modal, form: { ...modal.form, location: e.target.value } })}>{LOCATIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Floor<input type="number" min="1" max="100" required value={modal.form.floor} onChange={(e) => setModal({ ...modal, form: { ...modal.form, floor: e.target.value } })}/></label>
        <label className="form-grid__wide">Notes<textarea rows="3" value={modal.form.notes} onChange={(e) => setModal({ ...modal, form: { ...modal.form, notes: e.target.value } })} placeholder="Optional operational notes"/></label>
        {error && <div className="alert alert--danger form-grid__wide">{error}</div>}
        <div className="modal-actions form-grid__wide"><button className="secondary-button" type="button" disabled={saving} onClick={() => setModal(null)}>Close</button><button className="primary-button" disabled={saving} type="submit">{saving ? 'Saving…' : modal.type === 'edit' ? 'Save table' : 'Create table'}</button></div>
      </form>}
    </Modal>
  </div>;
}




// import { useEffect, useMemo, useState } from "react";
// import Panel from "../components/Panel";
// import TableGrid from "../components/TableGrid";
// import StatusBadge from "../components/StatusBadge";
// import Modal from "../components/Modal";
// import Icon from "../components/Icon";
// import { api, endpoints, unwrap } from "../services/api";
// import { DEMO_MODE, DEMO_TABLES } from "../utils/constants";


// function normalize(t) {
//     return {
//         ...t,
//         id: t._id || t.id,
//         number: t.tableNumber ?? t.number ?? t.tableNo,
//         capacity: t.capacity ?? t.seats ?? 0,
//         status: String(t.status || "Available").toLowerCase(),
//         section: t.section || t.location || "Main room",
//     };
// }
// const values = (p) => {
//     const v = unwrap(p);
//     return Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : [];
// };
// export default function Tables() {
//     const [tables, setTables] = useState([]),
//         [busy, setBusy] = useState(true),
//         [error, setError] = useState(""),
//         [modal, setModal] = useState(false),
//         [form, setForm] = useState({
//             tableNumber: "",
//             capacity: 2,
//             section: "Main room",
//         }),
//         [saving, setSaving] = useState(false),
//         [filter, setFilter] = useState("all");
//     const load = async () => {
//         setBusy(true);
//         setError("");
//         try {
//             const p = await api.get(endpoints.tables.list);
//             const data = values(p).map(normalize);
//             setTables(
//                 data.length
//                     ? data
//                     : DEMO_MODE
//                       ? DEMO_TABLES.map(normalize)
//                       : [],
//             );
//         } catch (e) {
//             if (DEMO_MODE) setTables(DEMO_TABLES.map(normalize));
//             else setError(e.message);
//         } finally {
//             setBusy(false);
//         }
//     };
//     useEffect(() => {
//         load();
//     }, []);
//     const filtered = useMemo(
//         () => tables.filter((t) => filter === "all" || t.status === filter),
//         [tables, filter],
//     );
//     // async function status(t, next) {
//     //     try {
//     //         await api.patch(endpoints.tables.status(t.id), { status: next });
//     //         setTables((x) =>
//     //             x.map((r) => (r.id === t.id ? { ...r, status: next } : r)),
//     //         );
//     //     } catch (e) {
//     //         if (DEMO_MODE)
//     //             setTables((x) =>
//     //                 x.map((r) => (r.id === t.id ? { ...r, status: next } : r)),
//     //             );
//     //         else setError(e.message);
//     //     }
//     // }
//     async function status(t, next) {
//         const apiStatusMap = {
//             available: "Available",
//             reserved: "Reserved",
//             occupied: "Occupied",
//             maintenance: "Maintenance",
//         };

//         try {
//             await api.patch(endpoints.tables.status(t.id), {
//                 status: apiStatusMap[next],
//             });

//             setTables((x) =>
//                 x.map((r) => (r.id === t.id ? { ...r, status: next } : r)),
//             );
//         } catch (e) {
//             setError(e.message);
//         }
//     }
//     async function create(e) {
//         e.preventDefault();
//         setSaving(true);
//         try {
//             const p = await api.post(endpoints.tables.create, {
//                 tableNumber: Number(form.tableNumber),
//                 capacity: Number(form.capacity),
//                 section: form.section,
//             });
//             setTables((x) => [normalize(unwrap(p)), ...x]);
//             setModal(false);
//         } catch (e) {
//             if (DEMO_MODE) {
//                 setTables((x) => [
//                     {
//                         id: `demo-${Date.now()}`,
//                         number: Number(form.tableNumber),
//                         capacity: Number(form.capacity),
//                         section: form.section,
//                         status: "available",
//                     },
//                     ...x,
//                 ]);
//                 setModal(false);
//             } else setError(e.message);
//         } finally {
//             setSaving(false);
//         }
//     }
//     return (
//         <div className="page-stack">
//             <div className="page-intro">
//                 <div>
//                     <span className="eyebrow">FLOOR CONTROL</span>
//                     <h2>Know every table at a glance.</h2>
//                     <p>
//                         Change table states for staff and keep availability in
//                         sync with bookings.
//                     </p>
//                 </div>
//                 <button
//                     className="primary-button"
//                     onClick={() => setModal(true)}
//                     type="button"
//                 >
//                     <Icon name="plus" size={16} /> Add table
//                 </button>
//             </div>
//             <div className="filter-tabs">
//                 {["all", "available", "reserved", "occupied", "cleaning"].map(
//                     (s) => (
//                         <button
//                             key={s}
//                             type="button"
//                             className={filter === s ? "filter-tab--active" : ""}
//                             onClick={() => setFilter(s)}
//                         >
//                             {s === "all" ? "All" : s.replace("_", " ")}
//                         </button>
//                     ),
//                 )}
//             </div>
//             {error && <div className="alert alert--danger">{error}</div>}
//             <Panel
//                 title={`${filtered.length} tables`}
//                 subtitle={
//                     busy ? "Synchronizing…" : "Select a table to change status"
//                 }
//                 action={
//                     <button
//                         className="icon-button"
//                         onClick={load}
//                         type="button"
//                         title="Refresh"
//                     >
//                         <Icon name="refresh" size={16} />
//                     </button>
//                 }
//             >
//                 <TableGrid
//                     tables={filtered}
//                     onSelect={(t) => {
//                         // const next =
//                         //     t.status === "available"
//                         //         ? "occupied"
//                         //         : t.status === "occupied"
//                         //           ? "cleaning"
//                         //           : t.status === "cleaning"
//                         //             ? "available"
//                         //             : "available";
//                         const next =
//                             t.status === "available"
//                                 ? "occupied"
//                                 : t.status === "occupied"
//                                   ? "maintenance"
//                                   : "available";
//                         status(t, next);
//                     }}
//                 />
//                 <div className="table-helper">
//                     <StatusBadge status="available" />{" "}
//                     <span>
//                         Click a table to cycle staff status. Use the backend
//                         admin tools for structural changes.
//                     </span>
//                 </div>
//             </Panel>
//             <Panel title="Table register" subtitle="Capacity and current state">
//                 <div className="register-grid">
//                     {filtered.map((t) => (
//                         <div className="register-row" key={t.id}>
//                             <div>
//                                 <strong>Table {t.number}</strong>
//                                 <span>
//                                     {t.capacity} seats · {t.section}
//                                 </span>
//                             </div>
//                             <StatusBadge status={t.status} />
//                             <select
//                                 value={t.status}
//                                 onChange={(e) => status(t, e.target.value)}
//                             >
//                                 <option value="available">Available</option>
//                                 <option value="reserved">Reserved</option>
//                                 <option value="occupied">Occupied</option>
//                                 <option value="cleaning">Cleaning</option>
//                             </select>
//                         </div>
//                     ))}
//                 </div>
//             </Panel>
//             <Modal
//                 open={modal}
//                 title="Add table"
//                 subtitle="Owner and Manager roles are required by the backend."
//                 onClose={() => setModal(false)}
//             >
//                 <form className="form-grid" onSubmit={create}>
//                     <label>
//                         Table number
//                         <input
//                             type="number"
//                             min="1"
//                             required
//                             value={form.tableNumber}
//                             onChange={(e) =>
//                                 setForm({
//                                     ...form,
//                                     tableNumber: e.target.value,
//                                 })
//                             }
//                         />
//                     </label>
//                     <label>
//                         Capacity
//                         <input
//                             type="number"
//                             min="1"
//                             max="30"
//                             required
//                             value={form.capacity}
//                             onChange={(e) =>
//                                 setForm({ ...form, capacity: e.target.value })
//                             }
//                         />
//                     </label>
//                     <label className="form-grid__wide">
//                         Section
//                         <input
//                             value={form.section}
//                             onChange={(e) =>
//                                 setForm({ ...form, section: e.target.value })
//                             }
//                         />
//                     </label>
//                     <div className="modal-actions form-grid__wide">
//                         <button
//                             className="secondary-button"
//                             type="button"
//                             onClick={() => setModal(false)}
//                         >
//                             Close
//                         </button>
//                         <button
//                             className="primary-button"
//                             disabled={saving}
//                             type="submit"
//                         >
//                             {saving ? "Adding…" : "Add table"}
//                         </button>
//                     </div>
//                 </form>
//             </Modal>
//         </div>
//     );
// }
