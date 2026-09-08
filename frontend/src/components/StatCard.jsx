import Icon from './Icon';
export default function StatCard({ label, value, detail, icon = 'grid', tone = 'neutral', onClick }) {
  return <button className={`stat-card ${onClick ? 'stat-card--button' : ''}`} onClick={onClick} type="button">
    <div className="stat-card__top"><span className={`stat-icon stat-icon--${tone}`}><Icon name={icon} size={17}/></span>{detail && <span className="stat-card__detail">{detail}</span>}</div>
    <div className="stat-card__value">{value}</div><div className="stat-card__label">{label}</div>
  </button>;
}
