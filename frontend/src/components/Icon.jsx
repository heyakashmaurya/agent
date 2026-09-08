const paths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  table: <><path d="M4 7h16M6 7v10M18 7v10M4 17h16"/><path d="M2 21h20"/></>,
  phone: <><path d="M6 3h3l2 5-2 2a15 15 0 0 0 5 5l2-2 5 2v3c0 1.1-.9 2-2 2C10.8 20 4 13.2 4 5c0-1.1.9-2 2-2Z"/></>,
  'phone-out': <><path d="M6 3h3l2 5-2 2a15 15 0 0 0 5 5l2-2 5 2v3c0 1.1-.9 2-2 2C10.8 20 4 13.2 4 5c0-1.1.9-2 2-2Z"/><path d="M15 3h6v6M21 3l-7 7"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M18 8a4 4 0 0 1 0 8M21 21v-2a4 4 0 0 0-3-3.87"/></>,
  spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></>,
  chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 3-3 3 2 5-6"/></>,
  settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1.2a2 2 0 0 1-2.7 2.7l-.2-.1a2 2 0 0 0-2 .8l-.1.2a2 2 0 0 1-4.1 0l-.1-.2a2 2 0 0 0-2-.8l-.2.1a2 2 0 0 1-2.7-2.7l.1-.2a2 2 0 0 0-.8-2l-.2-.1a2 2 0 0 1 0-4.1l.2-.1a2 2 0 0 0 .8-2l-.1-.2a2 2 0 0 1 2.7-2.7l.2.1a2 2 0 0 0 2-.8l.1-.2a2 2 0 0 1 4.1 0l.1.2a2 2 0 0 0 2 .8l.2-.1a2 2 0 0 1 2.7 2.7l-.1.2a2 2 0 0 0 .8 2l.2.1a2 2 0 0 1 0 4.1l-.2.1a2 2 0 0 0-.8 2Z"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  x: <><path d="M6 6l12 12M18 6 6 18"/></>,
  search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></>,
};

export default function Icon({ name, size = 18, strokeWidth = 1.8, className = '' }) {
  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.grid}</svg>;
}
