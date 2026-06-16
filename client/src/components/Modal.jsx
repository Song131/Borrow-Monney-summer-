export default function Modal({ open, onClose, variant = 'center', size, children }) {
  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (variant === 'sheet') {
    return (
      <div className="modal-bg open sheet" onClick={handleBackdropClick}>
        <div className="modal-sheet">
          <div className="modal-handle" />
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-bg open" onClick={handleBackdropClick}>
      <div className={size === 'lg' ? 'modal modal-lg' : 'modal'}>{children}</div>
    </div>
  );
}
