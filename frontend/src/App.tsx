import "./styles.css";
import { useEffect, useState } from "react";
import DocumentList from "./components/DocumentList";
import DocumentUpload from "./components/DocumentUpload";
import ProjectManager, { Project } from "./components/ProjectManager";
import RequirementViewer, { GenerateRequirementsResponse } from "./components/RequirementViewer";

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

function App() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newUploadedDocuments, setNewUploadedDocuments] = useState<DocumentItem[]>([]);
  const [activeRequirements, setActiveRequirements] = useState<GenerateRequirementsResponse | null>(null);
  const [activeDocument, setActiveDocument] = useState<DocumentItem | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("tcga-theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("tcga-theme", theme);
  }, [theme]);

  // Reset state when project changes
  useEffect(() => {
    setNewUploadedDocuments([]);
    setActiveRequirements(null);
    setActiveDocument(null);
  }, [selectedProject?.id]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const handleViewRequirements = (reqs: GenerateRequirementsResponse, doc: DocumentItem) => {
    setActiveRequirements(reqs);
    setActiveDocument(doc);
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
        <ProjectManager
          selectedProjectId={selectedProject?.id ?? null}
          onSelectProject={setSelectedProject}
        />

        <main className="app-main">
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

              {/* Main content grid: Requirement Viewer (left) + right sidebar (Upload + List) */}
              <div className="workspace-content-grid">
                {/* Left main area: Requirement & Test Case Viewer */}
                <RequirementViewer
                  requirements={activeRequirements}
                  document={activeDocument}
                  onClose={() => { setActiveRequirements(null); setActiveDocument(null); }}
                  onRequirementsUpdate={setActiveRequirements}
                />

                {/* Right sidebar: Upload on top, Document List below */}
                <div className="workspace-right-sidebar">
                  <DocumentUpload
                    projectId={selectedProject.id}
                    onUploadSuccess={setNewUploadedDocuments}
                  />
                  <DocumentList
                    projectId={selectedProject.id}
                    newUploadedDocuments={newUploadedDocuments}
                    onViewRequirements={handleViewRequirements}
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
