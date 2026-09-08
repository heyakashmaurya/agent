export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE || 'false').toLowerCase() === 'true';
export const RESTAURANT_NAME = import.meta.env.VITE_RESTAURANT_NAME || 'Restaurant AI';

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: 'grid' },
  { path: '/reservations', label: 'Reservations', icon: 'calendar' },
  { path: '/tables', label: 'Tables', icon: 'table' },
  { path: '/calls', label: 'Call logs', icon: 'phone' },
  { path: '/customers', label: 'Customers', icon: 'users' },
  { path: '/ai', label: 'AI receptionist', icon: 'spark' },
  { path: '/outbound', label: 'Outbound calls', icon: 'phone-out' },
  { path: '/analytics', label: 'Analytics', icon: 'chart' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export const STATUS_META = {
  confirmed: { label: 'Confirmed', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  completed: { label: 'Completed', tone: 'neutral' },
  no_show: { label: 'No show', tone: 'danger' },
  available: { label: 'Available', tone: 'success' },
  reserved: { label: 'Reserved', tone: 'warning' },
  occupied: { label: 'Occupied', tone: 'danger' },
  cleaning: { label: 'Cleaning', tone: 'neutral' },
};

export const DEMO_TABLES = Array.from({ length: 16 }, (_, i) => ({
  _id: String(i + 1),
  id: String(i + 1),
  tableNumber: i + 1,
  number: i + 1,
  capacity: [2, 2, 4, 4, 4, 6][i % 6],
  status: i % 7 === 0 ? 'occupied' : i % 5 === 0 ? 'reserved' : 'available',
  section: i < 8 ? 'Main room' : 'Terrace',
}));

export const DEMO_BOOKINGS = [
  { _id: 'b1', id: 'b1', customerName: 'Aarav Sharma', customerPhone: '+91 98765 43210', tableNumber: 4, guestCount: 3, bookingDate: new Date().toISOString(), startTime: '19:00', status: 'confirmed', bookingSource: 'AI', specialRequest: 'Window seat' },
  { _id: 'b2', id: 'b2', customerName: 'Priya Singh', customerPhone: '+91 99887 66554', tableNumber: 7, guestCount: 2, bookingDate: new Date(Date.now() + 3600000).toISOString(), startTime: '20:00', status: 'pending', bookingSource: 'Dashboard' },
  { _id: 'b3', id: 'b3', customerName: 'Rohan Mehta', customerPhone: '+91 98710 10203', tableNumber: 10, guestCount: 6, bookingDate: new Date(Date.now() + 86400000).toISOString(), startTime: '20:30', status: 'confirmed', bookingSource: 'AI' },
  { _id: 'b4', id: 'b4', customerName: 'Neha Verma', customerPhone: '+91 98100 44556', tableNumber: 2, guestCount: 2, bookingDate: new Date(Date.now() + 2 * 86400000).toISOString(), startTime: '18:30', status: 'cancelled', bookingSource: 'Dashboard' },
];

export const DEMO_CALLS = [
  { _id: 'c1', id: 'c1', phoneNumber: '+91 98765 43210', direction: 'inbound', callStatus: 'completed', aiOutcome: 'Booking confirmed', sentiment: 'positive', aiHandled: true, transferredToHuman: false, durationSeconds: 214, createdAt: new Date().toISOString(), summary: 'Booked a table for three guests.' },
  { _id: 'c2', id: 'c2', phoneNumber: '+91 99123 77654', direction: 'inbound', callStatus: 'completed', aiOutcome: 'FAQ resolved', sentiment: 'neutral', aiHandled: true, transferredToHuman: false, durationSeconds: 132, createdAt: new Date(Date.now() - 7200000).toISOString(), summary: 'Answered opening hours and parking questions.' },
  { _id: 'c3', id: 'c3', phoneNumber: '+91 98989 12345', direction: 'inbound', callStatus: 'transferred', aiOutcome: 'Human handoff', sentiment: 'negative', aiHandled: false, transferredToHuman: true, durationSeconds: 318, createdAt: new Date(Date.now() - 14400000).toISOString(), summary: 'Guest requested a manager.' },
];
