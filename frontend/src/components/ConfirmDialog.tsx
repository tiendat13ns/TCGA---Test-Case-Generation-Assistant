import { useEffect, useRef } from "react";
import "../styles.css";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = true,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Handle ESC key or clicking outside to cancel
  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onCancel();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY && 
      e.clientY <= rect.top + rect.height && 
      rect.left <= e.clientX && 
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      onCancel();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleCancel}
      onClick={handleBackdropClick}
      className="confirm-dialog"
    >
      <div 
        className="confirm-dialog-content animate-in"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          gap: "24px"
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>
            {title}
          </h3>
          <div style={{ marginTop: "8px", fontSize: "14px", lineHeight: "1.5", color: "var(--text-secondary)" }}>
            {message}
          </div>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          gap: "12px"
        }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`} 
            onClick={() => {
              onConfirm();
              onCancel(); // Close dialog after confirm
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}
