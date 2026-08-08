import { LogOut, Zap, ShieldCheck, ChevronRight } from "lucide-react";
import { TCGAAppIcon } from "./TCGALogo";
import { Project } from "./Projects/ProjectManager";
import { useUsageSummary, getCurrentPlanQuota } from "../hooks/useUsage";

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

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

function FolderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

export type GlobalViewType = "overview" | "projects" | "project_detail" | "test_cases" | "usage" | "tutorial" | "admin";

type GlobalSidebarProps = {
  activeView: GlobalViewType;
  selectedProject?: Project | null;
  onNavigate: (view: "overview" | "projects" | "test_cases" | "usage" | "tutorial" | "admin") => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  user: { email: string; role?: string; credit_balance: number } | null;
  onLogout: () => void;
  onGoToLanding?: () => void;
};

export default function GlobalSidebar({ activeView, selectedProject, onNavigate, isSidebarOpen, onToggleSidebar, user, onLogout, onGoToLanding }: GlobalSidebarProps) {
  const isAdmin = user?.role === "admin";
  // Admin không còn bypass credit ở backend — dùng chung logic quota/progress-bar với
  // mọi user (current_plan trả về đúng gói thật dựa trên credit_balance).
  const { data: usageSummary, isLoading: usageLoading } = useUsageSummary({ enabled: !!user });
  const currentPlanQuota = getCurrentPlanQuota(usageSummary);
  const creditPct = currentPlanQuota
    ? Math.max(0, Math.min(100, (user!.credit_balance / currentPlanQuota) * 100))
    : null;

  return (
    <aside className="global-sidebar project-sidebar" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="sidebar-header" style={{ justifyContent: isSidebarOpen ? "space-between" : "center", padding: isSidebarOpen ? "14px 20px" : "14px 0" }}>
        {isSidebarOpen ? (
          <>
            <button
              type="button"
              onClick={onGoToLanding}
              title="Test Case Generation Assistant · AI-powered — Về trang chủ"
              style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", padding: 0, cursor: onGoToLanding ? "pointer" : "default" }}
            >
              <TCGAAppIcon size={26} />
              <span className="sidebar-title" style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.02em" }}>TCGA</span>
            </button>
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

      {isSidebarOpen && activeView === "project_detail" && selectedProject && (
        <div
          className="sidebar-project-crumb"
          title={selectedProject.name}
          style={{ display: "flex", alignItems: "center", gap: "5px", margin: "10px 16px 4px", padding: "6px 10px", fontSize: "12px", fontWeight: 500, color: "var(--accent)", background: "var(--accent-glow)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", overflow: "hidden" }}
        >
          <FolderIcon />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedProject.name}</span>
        </div>
      )}

      <ul className="project-list" style={{ marginTop: "16px", flex: 1, padding: isSidebarOpen ? "0 12px" : "0 4px", display: "flex", flexDirection: "column", gap: "4px" }}>
        {isAdmin && (
          <li 
            className={`project-item ${activeView === "admin" ? "active" : ""}`}
            onClick={() => onNavigate("admin")}
            style={{ justifyContent: isSidebarOpen ? "flex-start" : "center", padding: isSidebarOpen ? "10px 16px" : "12px", margin: 0, background: activeView === "admin" ? "var(--accent-glow)" : undefined }}
            title={!isSidebarOpen ? "Admin Dashboard" : undefined}
          >
            <div className="project-item-content" style={{ display: "flex", alignItems: "center", gap: "12px", flexDirection: "row", flex: isSidebarOpen ? 1 : "none", color: "var(--accent)" }}>
              <ShieldCheck size={18} />
              {isSidebarOpen && <div className="project-item-name" style={{ fontWeight: 600 }}>Admin Dashboard</div>}
            </div>
          </li>
        )}

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

      {user && (
        <>
          <div style={{ height: "1px", background: "var(--border)", margin: "0 12px" }} />
          <div className="sidebar-user-footer" style={{ padding: isSidebarOpen ? "16px" : "16px 0", display: "flex", justifyContent: "center", alignItems: "center", gap: "12px" }}>
            <div className="sidebar-user-avatar" style={{ background: isAdmin ? "var(--accent)" : undefined, color: isAdmin ? "#fff" : undefined }}>
              {user.email.charAt(0).toUpperCase()}
            </div>
            {isSidebarOpen && (
              <>
                <div className="sidebar-user-info" style={{ flex: 1, minWidth: 0 }}>
                  <div className="sidebar-user-email" title={user.email} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
                    {user.email.split("@")[0]}
                  </div>
                  {creditPct !== null ? (
                    <button
                      type="button"
                      onClick={() => onNavigate("usage")}
                      title={`${user.credit_balance.toLocaleString()} / ${currentPlanQuota!.toLocaleString()} credits (${Math.round(creditPct)}%) — ${usageSummary?.current_plan}`}
                      style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer" }}
                    >
                      <div style={{ flex: 1, height: "6px", borderRadius: "999px", background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${creditPct}%`, background: "var(--accent)", borderRadius: "999px", transition: "width 0.6s ease" }} />
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {formatCompact(user.credit_balance)}/{formatCompact(currentPlanQuota!)}
                      </span>
                      <ChevronRight size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    </button>
                  ) : usageLoading ? (
                    // Skeleton — cùng hình dạng thanh bar thật, tránh nhấp nháy đổi layout
                    // khi usage summary còn đang fetch (~vài trăm ms sau khi đăng nhập).
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                      <div style={{ flex: 1, height: "6px", borderRadius: "999px", background: "var(--border)", overflow: "hidden" }}>
                        <div className="sidebar-credit-bar-skeleton" style={{ height: "100%", width: "40%", borderRadius: "999px" }} />
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", opacity: 0.5, flexShrink: 0 }}>···</span>
                    </div>
                  ) : (
                    <div className="sidebar-credit-badge" style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                      <Zap size={12} />
                      <span>{user.credit_balance.toLocaleString()} credits</span>
                    </div>
                  )}
                </div>
                <button type="button" className="sidebar-logout-btn icon-btn-ghost" onClick={onLogout} title="Log out" style={{ padding: "6px" }}>
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

