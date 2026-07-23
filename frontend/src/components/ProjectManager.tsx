import { useEffect, useRef, useState, ChangeEvent, FormEvent } from "react";
import "../styles.css";

const API_BASE = "http://localhost:8000";

/* ─── Types ──────────────────────────────────────────────── */
export type Project = {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
};

/* ─── Icons ──────────────────────────────────────────────── */
const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const PanelLeftCloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <polyline points="16 16 12 12 16 8" />
  </svg>
);

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const FolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
);
const SpinnerIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const AlertIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return d; }
}

type ProjectManagerProps = {
  selectedProjectId: string | null;
  onSelectProject: (project: Project | null) => void;
  onCloseSidebar: () => void;
};

function ProjectManager({ selectedProjectId, onSelectProject, onCloseSidebar }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/v1/projects`);
        const d = await r.json();
        setProjects(d.projects || []);
      } catch { }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Project name is required."); return; }
    setIsCreating(true); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/v1/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.detail || "Failed to create project.");
      setProjects((prev) => [d, ...prev]);
      setName(""); setDescription(""); setShowCreate(false);
      onSelectProject(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating project.");
    } finally { setIsCreating(false); }
  };

  const handleDelete = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Xóa project "${project.name}"? Toàn bộ tài liệu và test case liên quan sẽ bị xóa.`)) return;
    try {
      await fetch(`${API_BASE}/api/v1/projects/${project.id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      if (selectedProjectId === project.id) onSelectProject(null);
    } catch { }
  };

  return (
    <aside className="project-sidebar" style={{ width: "240px", height: "100%" }}>
      <div className="sidebar-header">
        <span className="sidebar-title">
          <FolderIcon /> Projects
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button className="btn btn-primary btn-xs" onClick={() => setShowCreate((v) => !v)} style={{ padding: "4px 8px" }} title="New Project">
            <PlusIcon />
          </button>
          <button 
            type="button"
            className="icon-btn-ghost" 
            onClick={onCloseSidebar} 
            title="Close sidebar" 
          >
            <PanelLeftCloseIcon />
          </button>
        </div>
      </div>

      {showCreate && (
        <form className="create-project-form" onSubmit={handleCreate}>
          <input
            className="filter-control"
            placeholder="Project name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            className="filter-control"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error && <div className="msg msg-error" style={{ fontSize: "11px", padding: "6px 8px" }}><AlertIcon /> {error}</div>}
          <div style={{ display: "flex", gap: "6px" }}>
            <button type="submit" className="btn btn-primary btn-xs" disabled={isCreating}>
              {isCreating ? <><SpinnerIcon /> Creating...</> : "Create"}
            </button>
            <button type="button" className="btn btn-secondary btn-xs" onClick={() => { setShowCreate(false); setError(""); }}>Cancel</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div style={{ padding: "12px 16px", display: "grid", gap: "6px" }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: "38px", borderRadius: "6px" }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="sidebar-empty">
          <div style={{ fontSize: "22px", marginBottom: "6px" }}>📂</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>No projects yet</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Create one to get started</div>
        </div>
      ) : (
        <ul className="project-list">
          {projects.map((p) => (
            <li
              key={p.id}
              className={`project-item${selectedProjectId === p.id ? " active" : ""}`}
              onClick={() => onSelectProject(p)}
            >
              <div className="project-item-content">
                <div className="project-item-name">{p.name}</div>
                {p.description && <div className="project-item-desc">{p.description}</div>}
                <div className="project-item-date">{formatDate(p.created_at)}</div>
              </div>
              <div className="project-item-actions">
                {selectedProjectId === p.id && <ChevronRightIcon />}
                <button
                  type="button"
                  className="btn btn-danger btn-xs"
                  onClick={(e) => handleDelete(p, e)}
                  title="Delete project"
                >
                  <TrashIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export default ProjectManager;
