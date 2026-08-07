import { useEffect, useRef, useState } from "react";
import { TCGAMark } from "./TCGALogo";
import { Project } from "./Projects/ProjectManager";
import type { ViewType } from "../hooks/useAppRouter";

function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

type AppNavUser = {
  email: string;
  role: string;
  credit_balance: number;
} | null;

type AppNavProps = {
  activeView: ViewType;
  selectedProject: Project | null;
  user: AppNavUser;
  onLogout: () => void;
  onGoToLanding: () => void;
};

export default function AppNav({ activeView, selectedProject, user, onLogout, onGoToLanding }: AppNavProps) {
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNavDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className="app-nav">
      <button
        type="button"
        className="app-nav-logo"
        onClick={onGoToLanding}
        title="Về trang chủ"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <div className="app-nav-logo-mark">
          <TCGAMark />
        </div>
        TCGA
      </button>
      <div className="app-nav-divider" />
      <span className="app-nav-title">Test Case Generation Assistant</span>
      <span className="app-nav-badge">AI-powered</span>

      {/* Active Project Breadcrumb */}
      {selectedProject && activeView === "project_detail" && (
        <>
          <div className="app-nav-divider" />
          <span className="app-nav-project-crumb">
            <FolderIcon />
            {selectedProject.name}
          </span>
        </>
      )}

      <div style={{ flex: 1 }} />

      {user && (
        <div className="nav-user-container" style={{ position: "relative" }} ref={dropdownRef}>
          <button
            className="nav-user-avatar"
            onClick={() => setIsNavDropdownOpen(!isNavDropdownOpen)}
            style={{ background: user.role === "admin" ? "var(--accent)" : undefined, color: user.role === "admin" ? "#fff" : undefined }}
          >
            {user.email.charAt(0).toUpperCase()}
          </button>

          {isNavDropdownOpen && (
            <div className="nav-user-dropdown">
              <div className="nav-dropdown-header">
                <div style={{ fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Credits: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{user.credit_balance.toLocaleString()} ({user.role === "admin" ? "Pro Plan" : "Free Plan"})</span>
                </div>
              </div>
              <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
              <button className="nav-dropdown-item" disabled style={{ opacity: 0.5, cursor: "not-allowed", width: "100%" }}>
                Settings
              </button>
              <button className="nav-dropdown-item" onClick={onLogout} style={{ color: "#ef4444", width: "100%" }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
