import { useState, FormEvent } from "react";
import { Project } from "./ProjectManager";
import { useProjects, useCreateProject } from "../hooks/useProjects";

function FolderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  );
}

function CheckSquareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"></polyline>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

function timeAgo(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}y ago`;
  } catch {
    return dateString;
  }
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return d; }
}

type ProjectsGridProps = {
  onSelectProject: (project: Project) => void;
};

export default function ProjectsGrid({ onSelectProject }: ProjectsGridProps) {
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const isCreating = createProject.isPending;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Project name is required."); return; }
    setError("");
    createProject.mutate(
      { name: name.trim(), description: description.trim() || null },
      {
        onSuccess: () => {
          setName(""); setDescription(""); setShowCreateModal(false);
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Error creating project.");
        },
      }
    );
  };

  return (
    <div className="projects-grid-container" style={{ padding: "32px", height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <h2>Projects</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <PlusIcon /> Create Project
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
          <SpinnerIcon /> Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="workspace-empty" style={{ marginTop: "64px" }}>
          <div className="workspace-empty-icon">📂</div>
          <div className="workspace-empty-title">No projects found</div>
          <div className="workspace-empty-body">
            You don't have any projects yet. Create your first project to start managing requirements and test cases.
          </div>
          <button className="btn btn-primary" style={{ marginTop: "16px" }} onClick={() => setShowCreateModal(true)}>
            <PlusIcon /> Create Project
          </button>
        </div>
      ) : (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
          gap: "24px" 
        }}>
          {projects.map(p => (
            <div 
              key={p.id} 
              className="project-card"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "20px",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}
              onClick={() => onSelectProject(p)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "10px", backgroundColor: "var(--bg)", borderRadius: "8px", color: "var(--primary)" }}>
                  <FolderIcon />
                </div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>{p.name}</h3>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {p.description || "No description"}
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }} title="Files">
                    <FileIcon /> {p.file_count || 0} files
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }} title="Requirements">
                    <ListIcon /> {p.req_count || 0} reqs
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }} title="Test Cases">
                    <CheckSquareIcon /> {p.test_case_count || 0} tests
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }} title={`Created at ${formatDate(p.created_at)}`}>
                  <ClockIcon /> {timeAgo(p.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Very simple modal for creation */}
      {showCreateModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            backgroundColor: "var(--surface)", padding: "24px", borderRadius: "12px",
            width: "400px", maxWidth: "90vw", border: "1px solid var(--border)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ margin: "0 0 16px 0" }}>Create New Project</h3>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                className="filter-control"
                placeholder="Project name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                style={{ padding: "10px", fontSize: "14px" }}
              />
              <textarea
                className="filter-control"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ padding: "10px", fontSize: "14px", minHeight: "80px", resize: "vertical" }}
              />
              {error && <div className="msg msg-error"><AlertIcon /> {error}</div>}
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateModal(false); setError(""); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                  {isCreating ? <><SpinnerIcon /> Creating...</> : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
