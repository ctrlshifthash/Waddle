interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A styled in-game yes/no dialog — replaces the browser's default window.confirm(). */
export function ConfirmDialog({
  title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger, onConfirm, onCancel,
}: Props) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2></div>
        <div className="modal-body">
          <p className="confirm-msg">{message}</p>
          <div className="confirm-actions">
            <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
            <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} autoFocus>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
