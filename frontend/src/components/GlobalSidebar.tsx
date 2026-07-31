import { Project } from "./ProjectManager"; // Reusing type for now

function PieChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 118 2.83" /><path d="M22 12A10 10 0 0012 2v10z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ClipboardCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}

function PanelLeftCloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="16 16 12 12 16 8" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
    </svg>
  );
}

function HelpCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  );
}

type GlobalSidebarProps = {
  activeView: "overview" | "projects" | "project_detail" | "test_cases" | "usage" | "tutorial";
  onNavigate: (view: "overview" | "projects" | "test_cases" | "usage" | "tutorial") => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export default function GlobalSidebar({ activeView, onNavigate, isSidebarOpen, onToggleSidebar }: GlobalSidebarProps) {
  return (
    <aside className="global-sidebar project-sidebar" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="sidebar-header" style={{ justifyContent: isSidebarOpen ? "space-between" : "center", padding: isSidebarOpen ? "14px 20px" : "14px 0" }}>
        {isSidebarOpen ? (
          <>
            <span className="sidebar-title">Menu</span>
            <button type="button" className="icon-btn-ghost" onClick={onToggleSidebar} title="Close sidebar">
              <PanelLeftCloseIcon />
            </button>
          </>
        ) : (
          <button type="button" className="icon-btn-ghost" onClick={onToggleSidebar} title="Open sidebar">
            <MenuIcon />
          </button>
        )}
      </div>

      <ul className="project-list" style={{ marginTop: "16px", flex: 1, padding: isSidebarOpen ? "0 12px" : "0 4px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <li 
          className={`project-item ${activeView === "overview" ? "active" : ""}`}
          onClick={() => onNavigate("overview")}
          style={{ justifyContent: isSidebarOpen ? "flex-start" : "center", padding: isSidebarOpen ? "10px 16px" : "12px", margin: 0 }}
          title={!isSidebarOpen ? "Overview" : undefined}
        >
          <div className="project-item-content" style={{ display: "flex", alignItems: "center", gap: "12px", flexDirection: "row", flex: isSidebarOpen ? 1 : "none" }}>
            <PieChartIcon />
            {isSidebarOpen && <div className="project-item-name">Overview</div>}
          </div>
        </li>
        <li 
          className={`project-item ${activeView === "projects" || activeView === "project_detail" ? "active" : ""}`}
          onClick={() => onNavigate("projects")}
          style={{ justifyContent: isSidebarOpen ? "flex-start" : "center", padding: isSidebarOpen ? "10px 16px" : "12px", margin: 0 }}
          title={!isSidebarOpen ? "Projects" : undefined}
        >
          <div className="project-item-content" style={{ display: "flex", alignItems: "center", gap: "12px", flexDirection: "row", flex: isSidebarOpen ? 1 : "none" }}>
            <GridIcon />
            {isSidebarOpen && <div className="project-item-name">Projects</div>}
          </div>
        </li>
        <li 
          className={`project-item ${activeView === "test_cases" ? "active" : ""}`}
          onClick={() => onNavigate("test_cases")}
          style={{ justifyContent: isSidebarOpen ? "flex-start" : "center", padding: isSidebarOpen ? "10px 16px" : "12px", margin: 0 }}
          title={!isSidebarOpen ? "Tester Studio" : undefined}
        >
          <div className="project-item-content" style={{ display: "flex", alignItems: "center", gap: "12px", flexDirection: "row", flex: isSidebarOpen ? 1 : "none" }}>
            <ClipboardCheckIcon />
            {isSidebarOpen && <div className="project-item-name">Tester Studio</div>}
          </div>
        </li>
        <li 
          className={`project-item ${activeView === "usage" ? "active" : ""}`}
          onClick={() => onNavigate("usage")}
          style={{ justifyContent: isSidebarOpen ? "flex-start" : "center", padding: isSidebarOpen ? "10px 16px" : "12px", margin: 0 }}
          title={!isSidebarOpen ? "Usage & Billing" : undefined}
        >
          <div className="project-item-content" style={{ display: "flex", alignItems: "center", gap: "12px", flexDirection: "row", flex: isSidebarOpen ? 1 : "none" }}>
            <BookOpenIcon />
            {isSidebarOpen && <div className="project-item-name">Usage & Billing</div>}
          </div>
        </li>
        <li 
          className={`project-item ${activeView === "tutorial" ? "active" : ""}`}
          onClick={() => onNavigate("tutorial")}
          style={{ justifyContent: isSidebarOpen ? "flex-start" : "center", padding: isSidebarOpen ? "10px 16px" : "12px", margin: 0 }}
          title={!isSidebarOpen ? "Tutorial" : undefined}
        >
          <div className="project-item-content" style={{ display: "flex", alignItems: "center", gap: "12px", flexDirection: "row", flex: isSidebarOpen ? 1 : "none" }}>
            <HelpCircleIcon />
            {isSidebarOpen && <div className="project-item-name">Tutorial</div>}
          </div>
        </li>
      </ul>
    </aside>
  );
}
