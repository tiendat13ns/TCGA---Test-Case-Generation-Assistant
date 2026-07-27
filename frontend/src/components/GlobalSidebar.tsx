import { Project } from "./ProjectManager"; // Reusing type for now

function PieChartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 118 2.83" /><path d="M22 12A10 10 0 0012 2v10z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
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

type GlobalSidebarProps = {
  activeView: "overview" | "projects" | "project_detail";
  onNavigate: (view: "overview" | "projects") => void;
  onCloseSidebar: () => void;
};

export default function GlobalSidebar({ activeView, onNavigate, onCloseSidebar }: GlobalSidebarProps) {
  return (
    <aside className="global-sidebar project-sidebar" style={{ width: "240px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="sidebar-header" style={{ justifyContent: "space-between" }}>
        <span className="sidebar-title">Menu</span>
        <button type="button" className="icon-btn-ghost" onClick={onCloseSidebar} title="Close sidebar">
          <PanelLeftCloseIcon />
        </button>
      </div>

      <ul className="project-list" style={{ marginTop: "12px", flex: 1 }}>
        <li 
          className={`project-item ${activeView === "overview" ? "active" : ""}`}
          onClick={() => onNavigate("overview")}
        >
          <div className="project-item-content" style={{ display: "flex", alignItems: "center", gap: "8px", flexDirection: "row" }}>
            <PieChartIcon />
            <div className="project-item-name">Overview</div>
          </div>
        </li>
        <li 
          className={`project-item ${activeView === "projects" || activeView === "project_detail" ? "active" : ""}`}
          onClick={() => onNavigate("projects")}
        >
          <div className="project-item-content" style={{ display: "flex", alignItems: "center", gap: "8px", flexDirection: "row" }}>
            <GridIcon />
            <div className="project-item-name">Projects</div>
          </div>
        </li>
      </ul>
    </aside>
  );
}
