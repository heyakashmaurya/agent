export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDuration(seconds = 0) {
  const total = Math.max(0, Number(seconds) || 0);
  const min = Math.floor(total / 60);
  const sec = String(Math.floor(total % 60)).padStart(2, '0');
  return `${min}:${sec}`;
}

export function money(value, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function initials(name = '') {
  return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'R';
}
