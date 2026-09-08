import Icon from './Icon';
export default function Modal({ open, title, subtitle, children, onClose, width = 560 }) {
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}><div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} type="button" aria-label="Close"><Icon name="x" size={18}/></button></div>{children}</div></div>;
}
