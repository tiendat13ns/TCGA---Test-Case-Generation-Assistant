import "./styles.css";
import { useEffect, useState, useCallback, useRef } from "react";
import GlobalSidebar from "./components/GlobalSidebar";
import ProjectsGrid from "./components/ProjectsGrid";
import ProjectDetailDashboard from "./components/ProjectDetailDashboard";
import TesterStudio from "./components/TestCaseStudio";
import UsageBilling from "./components/UsageBilling";
import { Project } from "./components/ProjectManager";
import { Message } from "./components/ChatWorkspace";
import { useProjects } from "./hooks/useProjects";

/* ── URL Routing Helpers ─────────────────────────────────── */
type ViewType = "overview" | "projects" | "project_detail" | "test_cases" | "usage" | "tutorial";

const VIEW_TO_PATH: Record<Exclude<ViewType, "project_detail">, string> = {
  overview: "/overview",
  projects: "/projects",
  test_cases: "/test-cases",
  usage: "/usage",
  tutorial: "/tutorial",
};

function pathToView(pathname: string): { view: ViewType; projectId: string | null } {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p.startsWith("/projects/")) {
    const id = p.slice("/projects/".length);
    if (id) return { view: "project_detail", projectId: id };
  }
  if (p === "/overview") return { view: "overview", projectId: null };
  if (p === "/projects") return { view: "projects", projectId: null };
  if (p === "/test-cases") return { view: "test_cases", projectId: null };
  if (p === "/usage") return { view: "usage", projectId: null };
  if (p === "/tutorial") return { view: "tutorial", projectId: null };
  // Default: /overview
  return { view: "overview", projectId: null };
}

function viewToPath(view: ViewType, projectId?: string): string {
  if (view === "project_detail" && projectId) return `/projects/${projectId}`;
  return VIEW_TO_PATH[view as keyof typeof VIEW_TO_PATH] || "/overview";
}

const CHAT_STORAGE_KEY = (projectId: string) => `tcga-chat-${projectId}`;

function loadChatHistory(projectId: string): Message[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY(projectId));
    if (raw) return JSON.parse(raw) as Message[];
  } catch {
    // ignore parse errors
  }
  return [
    { id: "1", role: "ai", content: `Xin chào! Bạn đã chọn tài liệu, hãy đặt câu hỏi hoặc yêu cầu phân tích.` },
  ];
}

function saveChatHistory(projectId: string, messages: Message[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY(projectId), JSON.stringify(messages));
  } catch {
    // quota exceeded or private mode — silent fail
  }
}

export type DocumentItem = {
  id: string;
  project_id?: string | null;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  file_path: string;
  status: string;
  uploaded_at: string;
  error_message?: string | null;
  updated_at?: string | null;
};

/* ── Nav Icons ─────────────────────────────────────────────── */
function TCGAMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  );
}



function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

function OverviewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function PanelLeftOpenIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="14 8 18 12 14 16" />
    </svg>
  );
}

import { useAuth } from "./contexts/AuthContext";
import LoginScreen from "./components/LoginScreen";

function App() {
  const { isAuthenticated, isLoading, login, user, logout } = useAuth();
  const initialRoute = pathToView(window.location.pathname);
  const [activeView, setActiveView] = useState<ViewType>(initialRoute.view);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(initialRoute.projectId);
  const { data: allProjects } = useProjects();
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Chat histories keyed by projectId — persisted to localStorage
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>({});

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

  // ── URL Routing: popstate listener (browser back/forward) ──
  useEffect(() => {
    const handlePopState = () => {
      const route = pathToView(window.location.pathname);
      setActiveView(route.view);
      if (route.view === "project_detail" && route.projectId) {
        // Try to find the project in cache
        const found = allProjects?.find(p => p.id === route.projectId) || null;
        setSelectedProject(found);
        if (!found) setPendingProjectId(route.projectId);
      } else {
        setSelectedProject(null);
        setPendingProjectId(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [allProjects]);

  // ── URL Routing: resolve pending project ID once data is available ──
  useEffect(() => {
    if (pendingProjectId && allProjects && allProjects.length > 0) {
      const found = allProjects.find(p => p.id === pendingProjectId);
      if (found) {
        setSelectedProject(found);
        setActiveView("project_detail");
      } else {
        // Project not found, fallback to projects list
        setActiveView("projects");
        window.history.replaceState(null, "", "/projects");
      }
      setPendingProjectId(null);
    }
  }, [pendingProjectId, allProjects]);

  // ── URL Routing: set initial URL on first authenticated load ──
  useEffect(() => {
    if (isAuthenticated && !pendingProjectId) {
      const currentPath = viewToPath(activeView, selectedProject?.id);
      if (window.location.pathname !== currentPath) {
        window.history.replaceState(null, "", currentPath);
      }
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load chat history for a project on first visit
  const getProjectMessages = useCallback((projectId: string): Message[] => {
    if (chatHistories[projectId]) return chatHistories[projectId];
    return loadChatHistory(projectId);
  }, [chatHistories]);

  // Called by ChatWorkspace whenever messages change
  const handleMessagesChange = useCallback((projectId: string, messages: Message[]) => {
    setChatHistories(prev => ({ ...prev, [projectId]: messages }));
    saveChatHistory(projectId, messages);
  }, []);



  const handleNavigate = (view: "overview" | "projects" | "test_cases" | "usage" | "tutorial") => {
    setActiveView(view);
    setSelectedProject(null);
    setPendingProjectId(null);
    const path = viewToPath(view);
    window.history.pushState(null, "", path);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setActiveView("project_detail");
    window.history.pushState(null, "", `/projects/${project.id}`);
  };

  if (isLoading) {
    return (
      <div className="auth-container">
        <div className="auth-glow" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", zIndex: 1 }}>
          <div className="auth-logo-mark" style={{ width: 48, height: 48 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <div style={{ color: "var(--text-auth-muted)", fontSize: "14px" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const pathname = window.location.pathname;
    const authMode = pathname === "/register" ? "register" : "login";
    // Redirect to /login or /register if not already there
    if (pathname !== "/login" && pathname !== "/register") {
      window.history.replaceState(null, "", "/login");
    }
    return (
      <LoginScreen
        onLoginSuccess={(token) => {
          login(token);
          setActiveView("overview");
          setSelectedProject(null);
          setPendingProjectId(null);
          window.history.replaceState(null, "", "/overview");
        }}
        initialMode={authMode}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Navigation */}
      <nav className="app-nav">
        <div className="app-nav-logo">
          <div className="app-nav-logo-mark">
            <TCGAMark />
          </div>
          TCGA
        </div>
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
            >
              {user.email.charAt(0).toUpperCase()}
            </button>
            
            {isNavDropdownOpen && (
              <div className="nav-user-dropdown">
                <div className="nav-dropdown-header">
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Credits: <span style={{ color: "var(--neon-green)" }}>{user.credit_balance}</span>
                  </div>
                </div>
                <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
                <button className="nav-dropdown-item" disabled style={{ opacity: 0.5, cursor: "not-allowed", width: "100%" }}>
                  Settings
                </button>
                <button className="nav-dropdown-item" onClick={logout} style={{ color: "#ef4444", width: "100%" }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Main layout */}
      <div className="app-workspace">
        <div 
          style={{ 
            width: isSidebarOpen ? "280px" : "64px",
            minWidth: isSidebarOpen ? "280px" : "64px",
            overflow: "hidden",
            transition: "width var(--transition-slow), min-width var(--transition-slow)",
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <GlobalSidebar 
            activeView={activeView}
            onNavigate={handleNavigate}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            user={user}
            onLogout={logout}
          />
        </div>

        <main className="app-main" style={{ flex: 1, minWidth: 0, padding: 0 }}>
          {activeView === "overview" && (
            <div className="tcs-view">
              <div className="tcs-view-header">
                <div className="tcs-view-title-row">
                  <div className="tcs-title">
                    <div className="tcs-title-icon" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                      <OverviewIcon />
                    </div>
                    <div>
                      <div style={{ fontSize: "20px", fontWeight: 600 }}>Overview</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px" }}>
                        System metrics and global activities dashboard
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="tcs-view-body" style={{ padding: "32px" }}>
                <div className="workspace-empty" style={{ marginTop: "48px" }}>
                  <div className="workspace-empty-icon">📊</div>
                  <div className="workspace-empty-title">Dashboard Coming Soon</div>
                  <div className="workspace-empty-body">
                    Statistics and global overview will be available in a future update.
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: "16px" }} onClick={() => handleNavigate("projects")}>
                    Go to Projects
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeView === "projects" && (
            <ProjectsGrid onSelectProject={handleSelectProject} />
          )}

          {activeView === "project_detail" && selectedProject && (
            <ProjectDetailDashboard 
              project={selectedProject}
              chatMessages={getProjectMessages(selectedProject.id)}
              onChatMessagesChange={(msgs) => handleMessagesChange(selectedProject.id, msgs)}
            />
          )}

          {activeView === "test_cases" && (
            <TesterStudio onNavigateToProjects={() => handleNavigate("projects")} />
          )}

          {activeView === "usage" && (
            <UsageBilling />
          )}

          {activeView === "tutorial" && (
            <div className="tcs-view">
              <div className="tcs-view-header">
                <div className="tcs-view-title-row">
                  <div className="tcs-title">
                    <div className="tcs-title-icon" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                      <BookOpenIcon />
                    </div>
                    <div>
                      <div style={{ fontSize: "20px", fontWeight: 600 }}>Tutorials</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px" }}>
                        User guide and prompt engineering documentation
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="tcs-view-body" style={{ padding: "32px" }}>
                <div className="workspace-empty" style={{ marginTop: "48px" }}>
                  <div className="workspace-empty-icon">📖</div>
                  <div className="workspace-empty-title">Tutorials</div>
                  <div className="workspace-empty-body">
                    Hướng dẫn sử dụng và Prompt engineering sẽ được cập nhật tại đây.
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
