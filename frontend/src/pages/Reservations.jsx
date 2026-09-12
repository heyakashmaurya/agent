import { useEffect, useMemo, useState } from "react";
import Panel from "../components/Panel";
import StatusBadge from "../components/StatusBadge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Icon from "../components/Icon";
import { api, endpoints, unwrap } from "../services/api";
import { DEMO_BOOKINGS, DEMO_MODE } from "../utils/constants";
import { formatDateTime } from "../utils/formatDate";

const EMPTY_CREATE = () => ({
    customerName: "",
    customerPhone: "",
    bookingDate: new Date().toISOString().slice(0, 10),
    startTime: "19:00",
    guestCount: 2,
    specialRequest: "",
    occasion: "",
    notes: "",
});

function norm(b = {}) {
    return {
        ...b,
        id: b._id || b.id,
        customerName:
            b.customerName ||
            b.customer?.fullName ||
            b.customer?.name ||
            b.guestName ||
            "Guest",
        customerPhone: b.customerPhone || b.customer?.phone || b.phone || "",
        email: b.email || b.customer?.email || "",
        guestCount: b.guestCount ?? b.guests ?? b.partySize ?? 0,
        tableId: b.table?._id || b.table || "",
        tableNumber: b.tableNumber ?? b.table?.tableNumber ?? b.table?.number,
        tableLocation: b.table?.location || b.table?.section || "",
        bookingDate: b.bookingDate || b.date || b.createdAt,
        startTime: b.startTime || b.time || "",
        status: String(b.status || "pending").toLowerCase(),
        bookingSource: b.bookingSource || b.source || "dashboard",
        specialRequest: b.specialRequest || "",
        occasion: b.occasion || "",
        notes: b.notes || "",
    };
}

function list(payload) {
    const value = unwrap(payload);
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.bookings)) return value.bookings;
    if (Array.isArray(value?.items)) return value.items;
    return [];
}

export default function Reservations() {
    const [rows, setRows] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("all");
    const [modal, setModal] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const [bookingResponse, tableResponse] = await Promise.all([
                api.get(`${endpoints.bookings.list}?limit=100`),
                api.get(endpoints.tables.list),
            ]);
            const bookings = list(bookingResponse).map(norm);
            const rawTables = list(tableResponse);
            setTables(
                rawTables.map((t) => ({
                    id: t._id || t.id,
                    number: t.tableNumber ?? t.number,
                    capacity: t.capacity ?? 0,
                    status: t.status || "Available",
                    location: t.location || t.section || "Indoor",
                })),
            );
            setRows(
                bookings.length
                    ? bookings
                    : DEMO_MODE
                      ? DEMO_BOOKINGS.map(norm)
                      : [],
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
                    `${r.customerName} ${r.customerPhone} ${r.tableNumber || ""} ${r.bookingSource}`.toLowerCase();
                return (
                    (!query || hay.includes(query.toLowerCase())) &&
                    (status === "all" || r.status === status)
                );
            }),
        [rows, query, status],
    );

    const openCreate = () => {
        setError("");
        setModal({ type: "create", form: EMPTY_CREATE() });
    };

    const openEdit = (row) => {
        setError("");
        setModal({
            type: "edit",
            id: row.id,
            form: {
                customerName: row.customerName,
                customerPhone: row.customerPhone,
                bookingDate: String(row.bookingDate).slice(0, 10),
                startTime: row.startTime || "19:00",
                guestCount: row.guestCount || 1,
                tableId: row.tableId || "",
                specialRequest: row.specialRequest || "",
                occasion: row.occasion || "",
                notes: row.notes || "",
                status: row.status,
            },
        });
    };

    const updateForm = (key, value) =>
        setModal((current) => ({
            ...current,
            form: { ...current.form, [key]: value },
        }));

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        const f = modal.form;
        try {
            if (modal.type === "create") {
                const response = await api.post(endpoints.bookings.create, {
                    name: f.customerName.trim(),
                    phone: f.customerPhone.trim(),
                    bookingDate: f.bookingDate,
                    startTime: f.startTime,
                    guestCount: Number(f.guestCount),
                    specialRequest: f.specialRequest.trim(),
                    occasion: f.occasion.trim(),
                    notes: f.notes.trim(),
                    bookingSource: "dashboard",
                });
                const value = unwrap(response);
                const created = norm(
                    value?.booking || value?.data?.booking || value,
                );
                if (!created.id)
                    throw new Error(
                        "Booking was created but the server returned no booking record.",
                    );
                setRows((current) => [
                    created,
                    ...current.filter((row) => row.id !== created.id),
                ]);
            } else {
                const response = await api.patch(
                    endpoints.bookings.update(modal.id),
                    {
                        phone: f.customerPhone.trim(),
                        bookingDate: f.bookingDate,
                        startTime: f.startTime,
                        guestCount: Number(f.guestCount),
                        specialRequest: f.specialRequest.trim(),
                        occasion: f.occasion.trim(),
                        notes: f.notes.trim(),
                        ...(f.tableId ? { tableId: f.tableId } : {}),
                    },
                );
                const value = unwrap(response);
                const updated = norm(
                    value?.booking || value?.data?.booking || value,
                );
                if (!updated.id)
                    throw new Error(
                        "Reservation update succeeded but the server returned no booking record.",
                    );
                setRows((current) =>
                    current.map((row) =>
                        row.id === updated.id ? updated : row,
                    ),
                );
            }
            setModal(null);
        } catch (e) {
            if (DEMO_MODE) {
                if (modal.type === "create")
                    setRows((current) => [
                        norm({
                            ...f,
                            id: `demo-${Date.now()}`,
                            status: "confirmed",
                            bookingSource: "dashboard",
                        }),
                        ...current,
                    ]);
                else
                    setRows((current) =>
                        current.map((row) =>
                            row.id === modal.id ? norm({ ...row, ...f }) : row,
                        ),
                    );
                setModal(null);
            } else setError(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function cancel(row) {
        if (!window.confirm(`Cancel ${row.customerName}'s reservation?`))
            return;
        setError("");
        try {
            const response = await api.patch(
                endpoints.bookings.cancel(row.id),
                { reason: "Cancelled from dashboard" },
            );
            const value = unwrap(response);
            const cancelled = norm(
                value?.booking || value?.data?.booking || {},
            );
            setRows((current) =>
                current.map((item) =>
                    item.id === row.id
                        ? { ...item, ...cancelled, status: "cancelled" }
                        : item,
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
            render: (r) => (r.tableNumber ? `#${r.tableNumber}` : "Auto"),
        },
        {
            key: "bookingSource",
            label: "Source",
            render: (r) => String(r.bookingSource).replace("_", " "),
        },
        {
            key: "status",
            label: "Status",
            render: (r) => <StatusBadge status={r.status} />,
        },
        {
            key: "action",
            label: "Actions",
            render: (r) => (
                <div className="row-actions">
                    {r.status === "confirmed" && (
                        <button
                            className="table-action"
                            onClick={(e) => {
                                e.stopPropagation();
                                openEdit(r);
                            }}
                            type="button"
                        >
                            <Icon name="edit" size={14} /> Edit
                        </button>
                    )}
                    {r.status !== "cancelled" &&
                        !["completed", "no_show"].includes(r.status) && (
                            <button
                                className="table-action table-action--danger"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    cancel(r);
                                }}
                                type="button"
                            >
                                Cancel
                            </button>
                        )}
                </div>
            ),
        },
    ];

    const title =
        modal?.type === "edit"
            ? "Edit confirmed reservation"
            : "Create reservation";
    return (
        <div className="page-stack">
            <div className="page-intro">
                <div>
                    <span className="eyebrow">RESERVATIONS</span>
                    <h2>Keep every seat accounted for.</h2>
                    <p>
                        Create reservations and safely adjust confirmed bookings
                        without changing the guest's reservation name.
                    </p>
                </div>
                <button
                    className="primary-button"
                    onClick={openCreate}
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
                            <option value="seated">Seated</option>
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
                open={Boolean(modal)}
                title={title}
                subtitle={
                    modal?.type === "edit"
                        ? "You can change phone, schedule, guests, table, requests and notes. The reservation name stays unchanged."
                        : "Dashboard bookings are created as confirmed and the system selects a suitable table automatically."
                }
                onClose={() => !saving && setModal(null)}
                width={700}
            >
                {modal && (
                    <form className="form-grid" onSubmit={submit}>
                        <label>
                            Customer name
                            <input
                                value={modal.form.customerName}
                                readOnly={modal.type === "edit"}
                                required
                                onChange={(e) =>
                                    updateForm("customerName", e.target.value)
                                }
                            />
                            {modal.type === "edit" && (
                                <span className="form-note">
                                    Customer/reservation name is locked for
                                    confirmed bookings.
                                </span>
                            )}
                        </label>
                        <label>
                            Phone
                            <input
                                required
                                type="tel"
                                value={modal.form.customerPhone}
                                onChange={(e) =>
                                    updateForm("customerPhone", e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Date
                            <input
                                type="date"
                                required
                                value={modal.form.bookingDate}
                                onChange={(e) =>
                                    updateForm("bookingDate", e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Time
                            <input
                                type="time"
                                required
                                value={modal.form.startTime}
                                onChange={(e) =>
                                    updateForm("startTime", e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Guests
                            <input
                                type="number"
                                min="1"
                                max="100"
                                required
                                value={modal.form.guestCount}
                                onChange={(e) =>
                                    updateForm("guestCount", e.target.value)
                                }
                            />
                        </label>
                        {modal.type === "edit" && (
                            <label>
                                Table
                                <select
                                    value={modal.form.tableId}
                                    onChange={(e) =>
                                        updateForm("tableId", e.target.value)
                                    }
                                >
                                    <option value="">Auto assign</option>
                                    {tables
                                        .filter(
                                            (t) =>
                                                ![
                                                    "Occupied",
                                                    "Maintenance",
                                                ].includes(String(t.status)),
                                        )
                                        .map((t) => (
                                            <option key={t.id} value={t.id}>
                                                Table {t.number} · {t.capacity}{" "}
                                                seats · {t.location} ·{" "}
                                                {t.status}
                                            </option>
                                        ))}
                                </select>
                            </label>
                        )}
                        <label>
                            Occasion
                            <input
                                value={modal.form.occasion || ""}
                                onChange={(e) =>
                                    updateForm("occasion", e.target.value)
                                }
                                placeholder="Birthday, anniversary…"
                            />
                        </label>
                        <label className="form-grid__wide">
                            Special request
                            <textarea
                                rows="3"
                                value={modal.form.specialRequest}
                                onChange={(e) =>
                                    updateForm("specialRequest", e.target.value)
                                }
                                placeholder="Window seat, accessibility…"
                            />
                        </label>
                        <label className="form-grid__wide">
                            Staff notes
                            <textarea
                                rows="3"
                                value={modal.form.notes}
                                onChange={(e) =>
                                    updateForm("notes", e.target.value)
                                }
                                placeholder="Internal notes…"
                            />
                        </label>
                        {error && (
                            <div className="alert alert--danger form-grid__wide">
                                {error}
                            </div>
                        )}
                        <div className="modal-actions form-grid__wide">
                            <button
                                className="secondary-button"
                                type="button"
                                disabled={saving}
                                onClick={() => setModal(null)}
                            >
                                Close
                            </button>
                            <button
                                className="primary-button"
                                disabled={saving}
                                type="submit"
                            >
                                {saving
                                    ? "Saving…"
                                    : modal.type === "edit"
                                      ? "Save changes"
                                      : "Create reservation"}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}

// import { useEffect, useMemo, useState } from "react";
// import Panel from "../components/Panel";
// import StatusBadge from "../components/StatusBadge";
// import DataTable from "../components/DataTable";
// import Modal from "../components/Modal";
// import Icon from "../components/Icon";
// import { api, endpoints, unwrap } from "../services/api";
// import { DEMO_BOOKINGS, DEMO_MODE, DEMO_TABLES } from "../utils/constants";
// import { formatDateTime } from "../utils/formatDate";

// function norm(b) {
//     return {
//         ...b,
//         id: b._id || b.id,
//         customerName:
//             b.customerName || b.customer?.name || b.guestName || "Guest",
//         customerPhone: b.customerPhone || b.customer?.phone || b.phone || "",
//         guestCount: b.guestCount ?? b.guests ?? b.partySize ?? 0,
//         tableNumber: b.tableNumber ?? b.table?.tableNumber ?? b.table?.number,
//         bookingDate: b.bookingDate || b.date || b.createdAt,
//         startTime: b.startTime || b.time || "",
//         status: String(b.status || "pending").toLowerCase(),
//         bookingSource: b.bookingSource || b.source || "Dashboard",
//         specialRequest: b.specialRequest || b.notes || "",
//     };
// }
// const list = (p) => {
//     const v = unwrap(p);
//     return Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : [];
// };
// export default function Reservations() {
//     const [rows, setRows] = useState([]),
//         [loading, setLoading] = useState(true),
//         [query, setQuery] = useState(""),
//         [status, setStatus] = useState("all"),
//         [modal, setModal] = useState(false),
//         [saving, setSaving] = useState(false),
//         [error, setError] = useState("");
//     const [form, setForm] = useState({
//         customerName: "",
//         customerPhone: "",
//         bookingDate: new Date().toISOString().slice(0, 10),
//         startTime: "19:00",
//         guestCount: 2,
//         tableNumber: "",
//         specialRequest: "",
//     });
//     const load = async () => {
//         setLoading(true);
//         setError("");
//         try {
//             const p = await api.get(endpoints.bookings.list + "?limit=100");
//             const data = list(p).map(norm);
//             setRows(
//                 data.length ? data : DEMO_MODE ? DEMO_BOOKINGS.map(norm) : [],
//             );
//         } catch (e) {
//             if (DEMO_MODE) setRows(DEMO_BOOKINGS.map(norm));
//             else setError(e.message);
//         } finally {
//             setLoading(false);
//         }
//     };
//     useEffect(() => {
//         load();
//     }, []);
//     const filtered = useMemo(
//         () =>
//             rows.filter((r) => {
//                 const hay =
//                     `${r.customerName} ${r.customerPhone} ${r.tableNumber || ""}`.toLowerCase();
//                 return (
//                     (!query || hay.includes(query.toLowerCase())) &&
//                     (status === "all" || r.status === status)
//                 );
//             }),
//         [rows, query, status],
//     );
//     async function create(e) {
//         e.preventDefault();
//         setSaving(true);
//         setError("");
//         try {
//             // const p = await api.post(endpoints.bookings.create, {
//             //     ...form,
//             //     guestCount: Number(form.guestCount),
//             //     tableNumber: form.tableNumber
//             //         ? Number(form.tableNumber)
//             //         : undefined,
//             // });

//             // const p = await api.post(endpoints.bookings.create, {
//             //     name: form.customerName.trim(),
//             //     phone: form.customerPhone.trim(),
//             //     bookingDate: form.bookingDate,
//             //     startTime: form.startTime,
//             //     guestCount: Number(form.guestCount),
//             //     specialRequest: form.specialRequest.trim(),
//             //     bookingSource: "dashboard",
//             // });

//             // const created = norm(unwrap(p));
//             const p = await api.post(endpoints.bookings.create, {
//                 name: form.customerName.trim(),
//                 phone: form.customerPhone.trim(),
//                 bookingDate: form.bookingDate,
//                 startTime: form.startTime,
//                 guestCount: Number(form.guestCount),
//                 specialRequest: form.specialRequest.trim(),
//                 bookingSource: "dashboard",
//             });

//             const payload = unwrap(p);

//             const booking =
//                 payload?.booking || payload?.data?.booking || payload;

//             const created = norm(booking);

//             if (!created?.id) {
//                 throw new Error(
//                     "Booking was created but the server returned an invalid booking.",
//                 );
//             }

//             setRows((current) => [
//                 created,
//                 ...current.filter((row) => row.id !== created.id),
//             ]);

//             setModal(false);

//             setForm((current) => ({
//                 ...current,
//                 customerName: "",
//                 customerPhone: "",
//                 specialRequest: "",
//                 tableNumber: "",
//             }));
//             setRows((x) => [created, ...x.filter((r) => r.id !== created.id)]);
//             setModal(false);
//             setForm((f) => ({
//                 ...f,
//                 customerName: "",
//                 customerPhone: "",
//                 specialRequest: "",
//                 tableNumber: "",
//             }));
//         } catch (e) {
//             if (DEMO_MODE) {
//                 setRows((x) => [
//                     {
//                         ...form,
//                         id: `demo-${Date.now()}`,
//                         status: "confirmed",
//                         bookingSource: "Dashboard",
//                         customerName: form.customerName,
//                         guestCount: Number(form.guestCount),
//                         bookingDate: form.bookingDate,
//                         startTime: form.startTime,
//                         tableNumber: form.tableNumber || null,
//                     },
//                     ...x,
//                 ]);
//                 setModal(false);
//             } else setError(e.message);
//         } finally {
//             setSaving(false);
//         }
//     }
//     async function cancel(row) {
//         if (!window.confirm(`Cancel ${row.customerName}'s reservation?`))
//             return;
//         try {
//             const response = await api.patch(
//                 endpoints.bookings.cancel(row.id),
//                 { reason: "Cancelled from dashboard" },
//             );
//             const payload = unwrap(response);
//             const serverBooking =
//                 payload?.booking || payload?.data?.booking || null;
//             setRows((x) =>
//                 x.map((r) =>
//                     r.id === row.id
//                         ? {
//                               ...r,
//                               status: "cancelled",
//                               ...(serverBooking ? norm(serverBooking) : {}),
//                           }
//                         : r,
//                 ),
//             );
//         } catch (e) {
//             setError(e.message);
//         }
//     }
//     const columns = [
//         {
//             key: "customerName",
//             label: "Guest",
//             render: (r) => (
//                 <>
//                     <strong>{r.customer.fullName}</strong>
//                     <span className="subtext">
//                         {r.customerPhone || "No phone"}
//                     </span>
//                 </>
//             ),
//         },
//         {
//             key: "bookingDate",
//             label: "Date & time",
//             render: (r) =>
//                 formatDateTime(
//                     `${String(r.bookingDate).slice(0, 10)}T${r.startTime || "12:00"}`,
//                 ),
//         },
//         {
//             key: "guestCount",
//             label: "Party",
//             render: (r) => `${r.guestCount} guests`,
//         },
//         {
//             key: "tableNumber",
//             label: "Table",
//             render: (r) => (r.tableNumber ? `#${r.tableNumber}` : "—"),
//         },
//         { key: "bookingSource", label: "Source" },
//         {
//             key: "status",
//             label: "Status",
//             render: (r) => <StatusBadge status={r.status} />,
//         },
//         {
//             key: "action",
//             label: "",
//             render: (r) =>
//                 r.status === "cancelled" ? null : (
//                     <button
//                         className="table-action"
//                         onClick={(e) => {
//                             e.stopPropagation();
//                             cancel(r);
//                         }}
//                         type="button"
//                     >
//                         Cancel
//                     </button>
//                 ),
//         },
//     ];
//     return (
//         <div className="page-stack">
//             <div className="page-intro">
//                 <div>
//                     <span className="eyebrow">RESERVATIONS</span>
//                     <h2>Keep every seat accounted for.</h2>
//                     <p>
//                         Filter bookings, create manual reservations and cancel
//                         safely.
//                     </p>
//                 </div>
//                 <button
//                     className="primary-button"
//                     onClick={() => setModal(true)}
//                     type="button"
//                 >
//                     <Icon name="plus" size={16} /> New booking
//                 </button>
//             </div>
//             <Panel
//                 title="Reservations"
//                 subtitle={`${filtered.length} shown`}
//                 action={
//                     <div className="toolbar">
//                         <div className="searchbox">
//                             <Icon name="search" size={15} />
//                             <input
//                                 value={query}
//                                 onChange={(e) => setQuery(e.target.value)}
//                                 placeholder="Search guests or phone"
//                             />
//                         </div>
//                         <select
//                             value={status}
//                             onChange={(e) => setStatus(e.target.value)}
//                         >
//                             <option value="all">All statuses</option>
//                             <option value="confirmed">Confirmed</option>
//                             <option value="pending">Pending</option>
//                             <option value="cancelled">Cancelled</option>
//                             <option value="completed">Completed</option>
//                             <option value="no_show">No show</option>
//                         </select>
//                         <button
//                             className="icon-button"
//                             onClick={load}
//                             type="button"
//                             title="Refresh"
//                         >
//                             <Icon name="refresh" size={16} />
//                         </button>
//                     </div>
//                 }
//             >
//                 {error && (
//                     <div className="alert alert--danger page-alert">
//                         {error}
//                     </div>
//                 )}
//                 <DataTable
//                     columns={columns}
//                     rows={filtered}
//                     empty={
//                         loading
//                             ? "Loading reservations…"
//                             : "No reservations match your filters."
//                     }
//                 />
//             </Panel>
//             <Modal
//                 open={modal}
//                 title="Create reservation"
//                 subtitle="The backend validates table availability before persisting."
//                 onClose={() => setModal(false)}
//             >
//                 <form className="form-grid" onSubmit={create}>
//                     <label>
//                         Guest name
//                         <input
//                             required
//                             value={form.customerName}
//                             onChange={(e) =>
//                                 setForm({
//                                     ...form,
//                                     customerName: e.target.value,
//                                 })
//                             }
//                         />
//                     </label>
//                     {/* <label>
//                         Phone
//                         <input
//                             value={form.customerPhone}
//                             onChange={(e) =>
//                                 setForm({
//                                     ...form,
//                                     customerPhone: e.target.value,
//                                 })
//                             }
//                         />
//                     </label> */}
//                     <label>
//                         Phone
//                         <input
//                             type="tel"
//                             required
//                             value={form.customerPhone}
//                             onChange={(e) =>
//                                 setForm({
//                                     ...form,
//                                     customerPhone: e.target.value,
//                                 })
//                             }
//                             placeholder="+1 555 123 4567"
//                         />
//                     </label>
//                     <label>
//                         Date
//                         <input
//                             type="date"
//                             required
//                             value={form.bookingDate}
//                             onChange={(e) =>
//                                 setForm({
//                                     ...form,
//                                     bookingDate: e.target.value,
//                                 })
//                             }
//                         />
//                     </label>
//                     <label>
//                         Time
//                         <input
//                             type="time"
//                             required
//                             value={form.startTime}
//                             onChange={(e) =>
//                                 setForm({ ...form, startTime: e.target.value })
//                             }
//                         />
//                     </label>
//                     <label>
//                         Guests
//                         <input
//                             type="number"
//                             min="1"
//                             max="30"
//                             required
//                             value={form.guestCount}
//                             onChange={(e) =>
//                                 setForm({ ...form, guestCount: e.target.value })
//                             }
//                         />
//                     </label>
//                     <label>
//                         Table
//                         <select
//                             value={form.tableNumber}
//                             onChange={(e) =>
//                                 setForm({
//                                     ...form,
//                                     tableNumber: e.target.value,
//                                 })
//                             }
//                         >
//                             <option value="">Auto assign</option>
//                             {/* {DEMO_TABLES.map((t) => (
//                                 <option key={t.number} value={t.number}>
//                                     Table {t.number} · {t.capacity} seats
//                                 </option>
//                             ))} */}
//                         </select>
//                     </label>
//                     <label className="form-grid__wide">
//                         Special request
//                         <textarea
//                             rows="3"
//                             value={form.specialRequest}
//                             onChange={(e) =>
//                                 setForm({
//                                     ...form,
//                                     specialRequest: e.target.value,
//                                 })
//                             }
//                             placeholder="Window seat, birthday, accessibility…"
//                         />
//                     </label>
//                     {error && (
//                         <div className="alert alert--danger form-grid__wide">
//                             {error}
//                         </div>
//                     )}
//                     <div className="modal-actions">
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
//                             {saving ? "Creating…" : "Create reservation"}
//                         </button>
//                     </div>
//                 </form>
//             </Modal>
//         </div>
//     );
// }

// // import { useEffect, useMemo, useState } from 'react';
// // import Panel from '../components/Panel';
// // import StatusBadge from '../components/StatusBadge';
// // import DataTable from '../components/DataTable';
// // import Modal from '../components/Modal';
// // import Icon from '../components/Icon';
// // import { api, endpoints, unwrap } from '../services/api';
// // import { DEMO_BOOKINGS, DEMO_MODE, DEMO_TABLES } from '../utils/constants';
// // import { formatDateTime } from '../utils/formatDate';

// // function norm(b) { return { ...b, id:b._id || b.id, customerName:b.customerName || b.customer?.name || b.guestName || 'Guest', customerPhone:b.customerPhone || b.customer?.phone || b.phone || '', guestCount:b.guestCount ?? b.guests ?? b.partySize ?? 0, tableNumber:b.tableNumber ?? b.table?.tableNumber ?? b.table?.number, bookingDate:b.bookingDate || b.date || b.createdAt, startTime:b.startTime || b.time || '', status:String(b.status || 'pending').toLowerCase(), bookingSource:b.bookingSource || b.source || 'Dashboard', specialRequest:b.specialRequest || b.notes || '' }; }
// // const list = (p) => { const v=unwrap(p); return Array.isArray(v)?v:Array.isArray(v?.items)?v.items:[]; };
// // export default function Reservations() {
// //  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[modal,setModal]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
// //  const [form,setForm]=useState({customerName:'',customerPhone:'',bookingDate:new Date().toISOString().slice(0,10),startTime:'19:00',guestCount:2,tableNumber:'',specialRequest:''});
// //  const load=async()=>{setLoading(true);setError('');try{const p=await api.get(endpoints.bookings.list+'?limit=100');const data=list(p).map(norm);setRows(data.length?data:(DEMO_MODE?DEMO_BOOKINGS.map(norm):[]));}catch(e){if(DEMO_MODE)setRows(DEMO_BOOKINGS.map(norm));else setError(e.message);}finally{setLoading(false);}};
// //  useEffect(()=>{load();},[]);
// //  const filtered=useMemo(()=>rows.filter(r=>{const hay=`${r.customerName} ${r.customerPhone} ${r.tableNumber||''}`.toLowerCase(); return (!query||hay.includes(query.toLowerCase()))&&(status==='all'||r.status===status);}),[rows,query,status]);
// //  async function create(e){e.preventDefault();setSaving(true);setError('');try{const p=await api.post(endpoints.bookings.create,{...form,guestCount:Number(form.guestCount),tableNumber:form.tableNumber?Number(form.tableNumber):undefined});const created=norm(unwrap(p));setRows((x)=>[created,...x.filter((r)=>r.id!==created.id)]);setModal(false);setForm((f)=>({...f,customerName:'',customerPhone:'',specialRequest:'',tableNumber:''}));}catch(e){if(DEMO_MODE){setRows(x=>[{...form,id:`demo-${Date.now()}`,status:'confirmed',bookingSource:'Dashboard',customerName:form.customerName,guestCount:Number(form.guestCount),bookingDate:form.bookingDate,startTime:form.startTime,tableNumber:form.tableNumber||null},...x]);setModal(false);}else setError(e.message);}finally{setSaving(false);}}
// //  async function cancel(row){if(!window.confirm(`Cancel ${row.customerName}'s reservation?`))return;try{await api.patch(endpoints.bookings.cancel(row.id),{reason:'Cancelled from dashboard'});setRows(x=>x.map(r=>r.id===row.id?{...r,status:'cancelled'}:r));}catch(e){setError(e.message);}}
// //  const columns=[{key:'customerName',label:'Guest',render:r=><><strong>{r.customerName}</strong><span className="subtext">{r.customerPhone||'No phone'}</span></>},{key:'bookingDate',label:'Date & time',render:r=>formatDateTime(`${String(r.bookingDate).slice(0,10)}T${r.startTime||'12:00'}`)},{key:'guestCount',label:'Party',render:r=>`${r.guestCount} guests`},{key:'tableNumber',label:'Table',render:r=>r.tableNumber?`#${r.tableNumber}`:'—'},{key:'bookingSource',label:'Source'},{key:'status',label:'Status',render:r=><StatusBadge status={r.status}/>},{key:'action',label:'',render:r=>r.status==='cancelled'?null:<button className="table-action" onClick={(e)=>{e.stopPropagation();cancel(r)}} type="button">Cancel</button>}];
// //  return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">RESERVATIONS</span><h2>Keep every seat accounted for.</h2><p>Filter bookings, create manual reservations and cancel safely.</p></div><button className="primary-button" onClick={()=>setModal(true)} type="button"><Icon name="plus" size={16}/> New booking</button></div><Panel title="Reservations" subtitle={`${filtered.length} shown`} action={<div className="toolbar"><div className="searchbox"><Icon name="search" size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search guests or phone"/></div><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option><option value="no_show">No show</option></select><button className="icon-button" onClick={load} type="button" title="Refresh"><Icon name="refresh" size={16}/></button></div>}>{error&&<div className="alert alert--danger page-alert">{error}</div>}<DataTable columns={columns} rows={filtered} empty={loading?'Loading reservations…':'No reservations match your filters.'}/></Panel><Modal open={modal} title="Create reservation" subtitle="The backend validates table availability before persisting." onClose={()=>setModal(false)}><form className="form-grid" onSubmit={create}><label>Guest name<input required value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/></label><label>Phone<input value={form.customerPhone} onChange={e=>setForm({...form,customerPhone:e.target.value})}/></label><label>Date<input type="date" required value={form.bookingDate} onChange={e=>setForm({...form,bookingDate:e.target.value})}/></label><label>Time<input type="time" required value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label>Guests<input type="number" min="1" max="30" required value={form.guestCount} onChange={e=>setForm({...form,guestCount:e.target.value})}/></label><label>Table<select value={form.tableNumber} onChange={e=>setForm({...form,tableNumber:e.target.value})}><option value="">Auto assign</option>{DEMO_TABLES.map(t=><option key={t.number} value={t.number}>Table {t.number} · {t.capacity} seats</option>)}</select></label><label className="form-grid__wide">Special request<textarea rows="3" value={form.specialRequest} onChange={e=>setForm({...form,specialRequest:e.target.value})} placeholder="Window seat, birthday, accessibility…"/></label>{error&&<div className="alert alert--danger form-grid__wide">{error}</div>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={()=>setModal(false)}>Close</button><button className="primary-button" disabled={saving} type="submit">{saving?'Creating…':'Create reservation'}</button></div></form></Modal></div>;
// // }
