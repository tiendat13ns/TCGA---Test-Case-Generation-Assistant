import { ReactNode } from "react";
import "../styles.css";

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

type SideDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
};

export default function SideDrawer({ isOpen, onClose, title, children, width = "450px" }: SideDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 998,
            transition: "opacity 0.3s ease",
          }}
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div 
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: width,
          backgroundColor: "var(--surface)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
          zIndex: 999,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid var(--border)"
        }}
      >
        <div 
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "var(--bg)"
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>{title}</h3>
          <button 
            type="button" 
            className="icon-btn-ghost" 
            onClick={onClose} 
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {children}
        </div>
      </div>
    </>
  );
}
