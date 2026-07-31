import "./styles.css";
import { useEffect, useState, useCallback } from "react";
import GlobalSidebar from "./components/GlobalSidebar";
import ProjectsGrid from "./components/ProjectsGrid";
import ProjectDetailDashboard from "./components/ProjectDetailDashboard";
import TesterStudio from "./components/TestCaseStudio";
import { Project } from "./components/ProjectManager";
import { Message } from "./components/ChatWorkspace";

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

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
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

function PanelLeftOpenIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="14 8 18 12 14 16" />
    </svg>
  );
}

function App() {
  const [activeView, setActiveView] = useState<"overview" | "projects" | "project_detail" | "test_cases" | "usage" | "tutorial">("projects");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("tcga-theme") as "dark" | "light") || "dark";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Chat histories keyed by projectId — persisted to localStorage
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>({});

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("tcga-theme", theme);
  }, [theme]);

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

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const handleNavigate = (view: "overview" | "projects" | "test_cases" | "usage" | "tutorial") => {
    setActiveView(view);
    setSelectedProject(null);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setActiveView("project_detail");
  };

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
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
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
          />
        </div>

        <main className="app-main" style={{ flex: 1, minWidth: 0, padding: 0 }}>
          {activeView === "overview" && (
            <div style={{ padding: "32px", height: "100%", overflowY: "auto" }}>
              <h2>Overview</h2>
              <div className="workspace-empty" style={{ marginTop: "64px" }}>
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
            <TesterStudio />
          )}

          {activeView === "usage" && (
            <div style={{ padding: "32px", height: "100%", overflowY: "auto" }}>
              <div className="workspace-empty" style={{ marginTop: "64px" }}>
                <div className="workspace-empty-icon">💳</div>
                <div className="workspace-empty-title">Usage & Billing</div>
                <div className="workspace-empty-body">
                  Tính năng quản lý Credit và Token đang được phát triển.
                </div>
              </div>
            </div>
          )}

          {activeView === "tutorial" && (
            <div style={{ padding: "32px", height: "100%", overflowY: "auto" }}>
              <div className="workspace-empty" style={{ marginTop: "64px" }}>
                <div className="workspace-empty-icon">📖</div>
                <div className="workspace-empty-title">Tutorials</div>
                <div className="workspace-empty-body">
                  Hướng dẫn sử dụng và Prompt engineering sẽ được cập nhật tại đây.
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
