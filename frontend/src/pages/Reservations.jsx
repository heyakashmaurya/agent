import { useEffect, useMemo, useState } from "react";
import Panel from "../components/Panel";
import StatusBadge from "../components/StatusBadge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Icon from "../components/Icon";
import { api, endpoints, unwrap } from "../services/api";
import { DEMO_BOOKINGS, DEMO_MODE, DEMO_TABLES } from "../utils/constants";
import { formatDateTime } from "../utils/formatDate";

function norm(b) {
    return {
        ...b,
        id: b._id || b.id,
        customerName:
            b.customerName || b.customer?.name || b.guestName || "Guest",
        customerPhone: b.customerPhone || b.customer?.phone || b.phone || "",
        guestCount: b.guestCount ?? b.guests ?? b.partySize ?? 0,
        tableNumber: b.tableNumber ?? b.table?.tableNumber ?? b.table?.number,
        bookingDate: b.bookingDate || b.date || b.createdAt,
        startTime: b.startTime || b.time || "",
        status: String(b.status || "pending").toLowerCase(),
        bookingSource: b.bookingSource || b.source || "Dashboard",
        specialRequest: b.specialRequest || b.notes || "",
    };
}
const list = (p) => {
    const v = unwrap(p);
    return Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : [];
};
export default function Reservations() {
    const [rows, setRows] = useState([]),
        [loading, setLoading] = useState(true),
        [query, setQuery] = useState(""),
        [status, setStatus] = useState("all"),
        [modal, setModal] = useState(false),
        [saving, setSaving] = useState(false),
        [error, setError] = useState("");
    const [form, setForm] = useState({
        customerName: "",
        customerPhone: "",
        bookingDate: new Date().toISOString().slice(0, 10),
        startTime: "19:00",
        guestCount: 2,
        tableNumber: "",
        specialRequest: "",
    });
    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const p = await api.get(endpoints.bookings.list + "?limit=100");
            const data = list(p).map(norm);
            setRows(
                data.length ? data : DEMO_MODE ? DEMO_BOOKINGS.map(norm) : [],
            );
        } catch (e) {
            if (DEMO_MODE) setRows(DEMO_BOOKINGS.map(norm));
            else setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);
    const filtered = useMemo(
        () =>
            rows.filter((r) => {
                const hay =
                    `${r.customerName} ${r.customerPhone} ${r.tableNumber || ""}`.toLowerCase();
                return (
                    (!query || hay.includes(query.toLowerCase())) &&
                    (status === "all" || r.status === status)
                );
            }),
        [rows, query, status],
    );
    async function create(e) {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const p = await api.post(endpoints.bookings.create, {
                ...form,
                guestCount: Number(form.guestCount),
                tableNumber: form.tableNumber
                    ? Number(form.tableNumber)
                    : undefined,
            });
            const created = norm(unwrap(p));
            setRows((x) => [created, ...x.filter((r) => r.id !== created.id)]);
            setModal(false);
            setForm((f) => ({
                ...f,
                customerName: "",
                customerPhone: "",
                specialRequest: "",
                tableNumber: "",
            }));
        } catch (e) {
            if (DEMO_MODE) {
                setRows((x) => [
                    {
                        ...form,
                        id: `demo-${Date.now()}`,
                        status: "confirmed",
                        bookingSource: "Dashboard",
                        customerName: form.customerName,
                        guestCount: Number(form.guestCount),
                        bookingDate: form.bookingDate,
                        startTime: form.startTime,
                        tableNumber: form.tableNumber || null,
                    },
                    ...x,
                ]);
                setModal(false);
            } else setError(e.message);
        } finally {
            setSaving(false);
        }
    }
    async function cancel(row) {
        if (!window.confirm(`Cancel ${row.customerName}'s reservation?`))
            return;
        try {
            const response = await api.patch(
                endpoints.bookings.cancel(row.id),
                { reason: "Cancelled from dashboard" },
            );
            const payload = unwrap(response);
            const serverBooking =
                payload?.booking || payload?.data?.booking || null;
            setRows((x) =>
                x.map((r) =>
                    r.id === row.id
                        ? {
                              ...r,
                              status: "cancelled",
                              ...(serverBooking ? norm(serverBooking) : {}),
                          }
                        : r,
                ),
            );
        } catch (e) {
            setError(e.message);
        }
    }
    const columns = [
        {
            key: "customerName",
            label: "Guest",
            render: (r) => (
                <>
                    <strong>{r.customerName}</strong>
                    <span className="subtext">
                        {r.customerPhone || "No phone"}
                    </span>
                </>
            ),
        },
        {
            key: "bookingDate",
            label: "Date & time",
            render: (r) =>
                formatDateTime(
                    `${String(r.bookingDate).slice(0, 10)}T${r.startTime || "12:00"}`,
                ),
        },
        {
            key: "guestCount",
            label: "Party",
            render: (r) => `${r.guestCount} guests`,
        },
        {
            key: "tableNumber",
            label: "Table",
            render: (r) => (r.tableNumber ? `#${r.tableNumber}` : "—"),
        },
        { key: "bookingSource", label: "Source" },
        {
            key: "status",
            label: "Status",
            render: (r) => <StatusBadge status={r.status} />,
        },
        {
            key: "action",
            label: "",
            render: (r) =>
                r.status === "cancelled" ? null : (
                    <button
                        className="table-action"
                        onClick={(e) => {
                            e.stopPropagation();
                            cancel(r);
                        }}
                        type="button"
                    >
                        Cancel
                    </button>
                ),
        },
    ];
    return (
        <div className="page-stack">
            <div className="page-intro">
                <div>
                    <span className="eyebrow">RESERVATIONS</span>
                    <h2>Keep every seat accounted for.</h2>
                    <p>
                        Filter bookings, create manual reservations and cancel
                        safely.
                    </p>
                </div>
                <button
                    className="primary-button"
                    onClick={() => setModal(true)}
                    type="button"
                >
                    <Icon name="plus" size={16} /> New booking
                </button>
            </div>
            <Panel
                title="Reservations"
                subtitle={`${filtered.length} shown`}
                action={
                    <div className="toolbar">
                        <div className="searchbox">
                            <Icon name="search" size={15} />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search guests or phone"
                            />
                        </div>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="all">All statuses</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="pending">Pending</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                            <option value="no_show">No show</option>
                        </select>
                        <button
                            className="icon-button"
                            onClick={load}
                            type="button"
                            title="Refresh"
                        >
                            <Icon name="refresh" size={16} />
                        </button>
                    </div>
                }
            >
                {error && (
                    <div className="alert alert--danger page-alert">
                        {error}
                    </div>
                )}
                <DataTable
                    columns={columns}
                    rows={filtered}
                    empty={
                        loading
                            ? "Loading reservations…"
                            : "No reservations match your filters."
                    }
                />
            </Panel>
            <Modal
                open={modal}
                title="Create reservation"
                subtitle="The backend validates table availability before persisting."
                onClose={() => setModal(false)}
            >
                <form className="form-grid" onSubmit={create}>
                    <label>
                        Guest name
                        <input
                            required
                            value={form.customerName}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    customerName: e.target.value,
                                })
                            }
                        />
                    </label>
                    <label>
                        Phone
                        <input
                            value={form.customerPhone}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    customerPhone: e.target.value,
                                })
                            }
                        />
                    </label>
                    <label>
                        Date
                        <input
                            type="date"
                            required
                            value={form.bookingDate}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    bookingDate: e.target.value,
                                })
                            }
                        />
                    </label>
                    <label>
                        Time
                        <input
                            type="time"
                            required
                            value={form.startTime}
                            onChange={(e) =>
                                setForm({ ...form, startTime: e.target.value })
                            }
                        />
                    </label>
                    <label>
                        Guests
                        <input
                            type="number"
                            min="1"
                            max="30"
                            required
                            value={form.guestCount}
                            onChange={(e) =>
                                setForm({ ...form, guestCount: e.target.value })
                            }
                        />
                    </label>
                    <label>
                        Table
                        <select
                            value={form.tableNumber}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    tableNumber: e.target.value,
                                })
                            }
                        >
                            <option value="">Auto assign</option>
                            {DEMO_TABLES.map((t) => (
                                <option key={t.number} value={t.number}>
                                    Table {t.number} · {t.capacity} seats
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="form-grid__wide">
                        Special request
                        <textarea
                            rows="3"
                            value={form.specialRequest}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    specialRequest: e.target.value,
                                })
                            }
                            placeholder="Window seat, birthday, accessibility…"
                        />
                    </label>
                    {error && (
                        <div className="alert alert--danger form-grid__wide">
                            {error}
                        </div>
                    )}
                    <div className="modal-actions">
                        <button
                            className="secondary-button"
                            type="button"
                            onClick={() => setModal(false)}
                        >
                            Close
                        </button>
                        <button
                            className="primary-button"
                            disabled={saving}
                            type="submit"
                        >
                            {saving ? "Creating…" : "Create reservation"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// import { useEffect, useMemo, useState } from 'react';
// import Panel from '../components/Panel';
// import StatusBadge from '../components/StatusBadge';
// import DataTable from '../components/DataTable';
// import Modal from '../components/Modal';
// import Icon from '../components/Icon';
// import { api, endpoints, unwrap } from '../services/api';
// import { DEMO_BOOKINGS, DEMO_MODE, DEMO_TABLES } from '../utils/constants';
// import { formatDateTime } from '../utils/formatDate';

// function norm(b) { return { ...b, id:b._id || b.id, customerName:b.customerName || b.customer?.name || b.guestName || 'Guest', customerPhone:b.customerPhone || b.customer?.phone || b.phone || '', guestCount:b.guestCount ?? b.guests ?? b.partySize ?? 0, tableNumber:b.tableNumber ?? b.table?.tableNumber ?? b.table?.number, bookingDate:b.bookingDate || b.date || b.createdAt, startTime:b.startTime || b.time || '', status:String(b.status || 'pending').toLowerCase(), bookingSource:b.bookingSource || b.source || 'Dashboard', specialRequest:b.specialRequest || b.notes || '' }; }
// const list = (p) => { const v=unwrap(p); return Array.isArray(v)?v:Array.isArray(v?.items)?v.items:[]; };
// export default function Reservations() {
//  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[modal,setModal]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
//  const [form,setForm]=useState({customerName:'',customerPhone:'',bookingDate:new Date().toISOString().slice(0,10),startTime:'19:00',guestCount:2,tableNumber:'',specialRequest:''});
//  const load=async()=>{setLoading(true);setError('');try{const p=await api.get(endpoints.bookings.list+'?limit=100');const data=list(p).map(norm);setRows(data.length?data:(DEMO_MODE?DEMO_BOOKINGS.map(norm):[]));}catch(e){if(DEMO_MODE)setRows(DEMO_BOOKINGS.map(norm));else setError(e.message);}finally{setLoading(false);}};
//  useEffect(()=>{load();},[]);
//  const filtered=useMemo(()=>rows.filter(r=>{const hay=`${r.customerName} ${r.customerPhone} ${r.tableNumber||''}`.toLowerCase(); return (!query||hay.includes(query.toLowerCase()))&&(status==='all'||r.status===status);}),[rows,query,status]);
//  async function create(e){e.preventDefault();setSaving(true);setError('');try{const p=await api.post(endpoints.bookings.create,{...form,guestCount:Number(form.guestCount),tableNumber:form.tableNumber?Number(form.tableNumber):undefined});const created=norm(unwrap(p));setRows((x)=>[created,...x.filter((r)=>r.id!==created.id)]);setModal(false);setForm((f)=>({...f,customerName:'',customerPhone:'',specialRequest:'',tableNumber:''}));}catch(e){if(DEMO_MODE){setRows(x=>[{...form,id:`demo-${Date.now()}`,status:'confirmed',bookingSource:'Dashboard',customerName:form.customerName,guestCount:Number(form.guestCount),bookingDate:form.bookingDate,startTime:form.startTime,tableNumber:form.tableNumber||null},...x]);setModal(false);}else setError(e.message);}finally{setSaving(false);}}
//  async function cancel(row){if(!window.confirm(`Cancel ${row.customerName}'s reservation?`))return;try{await api.patch(endpoints.bookings.cancel(row.id),{reason:'Cancelled from dashboard'});setRows(x=>x.map(r=>r.id===row.id?{...r,status:'cancelled'}:r));}catch(e){setError(e.message);}}
//  const columns=[{key:'customerName',label:'Guest',render:r=><><strong>{r.customerName}</strong><span className="subtext">{r.customerPhone||'No phone'}</span></>},{key:'bookingDate',label:'Date & time',render:r=>formatDateTime(`${String(r.bookingDate).slice(0,10)}T${r.startTime||'12:00'}`)},{key:'guestCount',label:'Party',render:r=>`${r.guestCount} guests`},{key:'tableNumber',label:'Table',render:r=>r.tableNumber?`#${r.tableNumber}`:'—'},{key:'bookingSource',label:'Source'},{key:'status',label:'Status',render:r=><StatusBadge status={r.status}/>},{key:'action',label:'',render:r=>r.status==='cancelled'?null:<button className="table-action" onClick={(e)=>{e.stopPropagation();cancel(r)}} type="button">Cancel</button>}];
//  return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">RESERVATIONS</span><h2>Keep every seat accounted for.</h2><p>Filter bookings, create manual reservations and cancel safely.</p></div><button className="primary-button" onClick={()=>setModal(true)} type="button"><Icon name="plus" size={16}/> New booking</button></div><Panel title="Reservations" subtitle={`${filtered.length} shown`} action={<div className="toolbar"><div className="searchbox"><Icon name="search" size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search guests or phone"/></div><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option><option value="no_show">No show</option></select><button className="icon-button" onClick={load} type="button" title="Refresh"><Icon name="refresh" size={16}/></button></div>}>{error&&<div className="alert alert--danger page-alert">{error}</div>}<DataTable columns={columns} rows={filtered} empty={loading?'Loading reservations…':'No reservations match your filters.'}/></Panel><Modal open={modal} title="Create reservation" subtitle="The backend validates table availability before persisting." onClose={()=>setModal(false)}><form className="form-grid" onSubmit={create}><label>Guest name<input required value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/></label><label>Phone<input value={form.customerPhone} onChange={e=>setForm({...form,customerPhone:e.target.value})}/></label><label>Date<input type="date" required value={form.bookingDate} onChange={e=>setForm({...form,bookingDate:e.target.value})}/></label><label>Time<input type="time" required value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label>Guests<input type="number" min="1" max="30" required value={form.guestCount} onChange={e=>setForm({...form,guestCount:e.target.value})}/></label><label>Table<select value={form.tableNumber} onChange={e=>setForm({...form,tableNumber:e.target.value})}><option value="">Auto assign</option>{DEMO_TABLES.map(t=><option key={t.number} value={t.number}>Table {t.number} · {t.capacity} seats</option>)}</select></label><label className="form-grid__wide">Special request<textarea rows="3" value={form.specialRequest} onChange={e=>setForm({...form,specialRequest:e.target.value})} placeholder="Window seat, birthday, accessibility…"/></label>{error&&<div className="alert alert--danger form-grid__wide">{error}</div>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={()=>setModal(false)}>Close</button><button className="primary-button" disabled={saving} type="submit">{saving?'Creating…':'Create reservation'}</button></div></form></Modal></div>;
// }
