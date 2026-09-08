import { STATUS_META } from '../utils/constants';
export default function StatusBadge({ status }) {
  const key = String(status || 'neutral').toLowerCase().replaceAll(' ', '_');
  const meta = STATUS_META[key] || { label: status || 'Unknown', tone: 'neutral' };
  return <span className={`status-badge status-badge--${meta.tone}`}>{meta.label}</span>;
}
