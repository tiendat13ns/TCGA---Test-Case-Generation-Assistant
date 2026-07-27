import React, { ReactNode, useEffect, useRef } from "react";

type ModalDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
};

export default function ModalDialog({ isOpen, onClose, title, children, width = "400px" }: ModalDialogProps) {
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

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
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
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleCancel}
      onClick={handleBackdropClick}
      className="confirm-dialog"
      style={{ width, maxWidth: "90vw" }}
    >
      <div className="confirm-dialog-content animate-in" style={{ backgroundColor: "var(--bg-surface)", padding: "24px", borderRadius: "var(--radius-card)" }}>
        <h3 style={{ margin: 0, marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
          {title}
        </h3>
        {children}
      </div>
    </dialog>
  );
}
