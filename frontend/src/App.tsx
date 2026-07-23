import "./styles.css";
import { useEffect, useState, useCallback } from "react";
import DocumentUpload from "./components/DocumentUpload";
import ProjectManager, { Project } from "./components/ProjectManager";
import ChatWorkspace, { Message } from "./components/ChatWorkspace";
import DocumentContextSidebar from "./components/DocumentContextSidebar";

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

function PanelLeftCloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="16 16 12 12 16 8" />
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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newUploadedDocuments, setNewUploadedDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
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

  // When project changes, reset document selection (not chat — chat loads from history)
  useEffect(() => {
    setNewUploadedDocuments([]);
    setSelectedDocumentIds([]);
  }, [selectedProject?.id]);

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

  return (
    <div className="app-shell">
      {/* Navigation */}
      <nav className="app-nav">
        {!isSidebarOpen && (
          <button
            className="icon-btn-ghost"
            onClick={() => setIsSidebarOpen(true)}
            title="Open sidebar"
            aria-label="Open sidebar"
            style={{ marginLeft: -12, marginRight: 2 }}
          >
            <PanelLeftOpenIcon />
          </button>
        )}

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
        {selectedProject && (
          <>
            <div className="app-nav-divider" />
            <span className="app-nav-project-crumb">
              <FolderIcon />
              {selectedProject.name}
            </span>
          </>
        )}

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </nav>

      {/* Main layout — project sidebar + content */}
      <div className="app-workspace">
        <div 
          style={{ 
            width: isSidebarOpen ? "240px" : "0px",
            minWidth: isSidebarOpen ? "240px" : "0px",
            overflow: "hidden",
            transition: "width var(--transition-slow), min-width var(--transition-slow)",
            flexShrink: 0,
            borderRight: isSidebarOpen ? "1px solid var(--border)" : "none",
          }}
        >
          <ProjectManager
            selectedProjectId={selectedProject?.id ?? null}
            onSelectProject={setSelectedProject}
            onCloseSidebar={() => setIsSidebarOpen(false)}
          />
        </div>

        <main className="app-main" style={{ flex: 1, minWidth: 0 }}>
          {selectedProject ? (
            <>
              {/* Project context banner */}
              <div className="project-context-banner">
                <FolderIcon />
                <span>
                  Project: <strong>{selectedProject.name}</strong>
                </span>
                {selectedProject.description && (
                  <span className="project-context-desc">— {selectedProject.description}</span>
                )}
              </div>

              {/* Main content grid: 3-column layout */}
              <div className="workspace-content-grid">
                {/* Middle column: Chat Workspace */}
                <ChatWorkspace
                  key={selectedProject.id}
                  projectId={selectedProject.id}
                  selectedDocumentIds={selectedDocumentIds}
                  initialMessages={getProjectMessages(selectedProject.id)}
                  onMessagesChange={(msgs) => handleMessagesChange(selectedProject.id, msgs)}
                />

                {/* Right sidebar: Upload on top, Document Context Sidebar below */}
                <div className="workspace-right-sidebar">
                  <DocumentUpload
                    projectId={selectedProject.id}
                    onUploadSuccess={setNewUploadedDocuments}
                  />
                  <DocumentContextSidebar
                    projectId={selectedProject.id}
                    newUploadedDocuments={newUploadedDocuments}
                    selectedDocumentIds={selectedDocumentIds}
                    onSelectionChange={setSelectedDocumentIds}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Empty state — no project selected */
            <div className="workspace-empty">
              <div className="workspace-empty-icon">📂</div>
              <div className="workspace-empty-title">Select a project to get started</div>
              <div className="workspace-empty-body">
                Choose an existing project from the sidebar, or create a new one to begin uploading
                documents and generating test cases.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
