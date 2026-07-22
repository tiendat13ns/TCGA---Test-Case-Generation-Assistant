import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { DocumentItem } from "../App";
import type { GenerateRequirementsResponse } from "./RequirementViewer";

const API_URL = "http://localhost:8000/api/documents";
const API_V1_DOCUMENTS_URL = "http://localhost:8000/api/v1/documents";

type DocumentListProps = {
  projectId: string | null;
  newUploadedDocuments: DocumentItem[];
  onViewRequirements: (data: GenerateRequirementsResponse, doc: DocumentItem) => void;
};

type Filters = { filename: string; status: string; timeOrder: string };
const defaultFilters: Filters = { filename: "", status: "", timeOrder: "newest" };

/* ── Icons ── */
const FilterIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;
const TrashIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>;
const EyeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
const ZapIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
const RefreshIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>;
const XIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const FileTextIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
const AlertIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
const SpinnerIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>;

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "completed" ? "badge-completed" : status === "processing" ? "badge-processing" : status === "error" ? "badge-error" : "badge-uploaded";
  return <span className={`badge ${cls}`}><span className="badge-dot" />{status}</span>;
}

export default function DocumentList({ projectId, newUploadedDocuments, onViewRequirements }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [generatingRequirementsId, setGeneratingRequirementsId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [existingRequirements, setExistingRequirements] = useState<Record<string, GenerateRequirementsResponse | null>>({});
  const [isLoadingRequirements, setIsLoadingRequirements] = useState<Record<string, boolean>>({});

  // Load existing requirements for completed docs
  useEffect(() => {
    documents.forEach(async (doc) => {
      if (doc.status === "completed" && existingRequirements[doc.id] === undefined && !isLoadingRequirements[doc.id]) {
        setIsLoadingRequirements((prev) => ({ ...prev, [doc.id]: true }));
        try {
          const r = await fetch(`${API_V1_DOCUMENTS_URL}/${doc.id}/requirements`);
          if (r.ok) {
            const d = await r.json();
            setExistingRequirements((prev) => ({ ...prev, [doc.id]: d.total_requirements > 0 ? d : null }));
          } else {
            setExistingRequirements((prev) => ({ ...prev, [doc.id]: null }));
          }
        } catch {
          setExistingRequirements((prev) => ({ ...prev, [doc.id]: null }));
        } finally {
          setIsLoadingRequirements((prev) => ({ ...prev, [doc.id]: false }));
        }
      }
    });
  }, [documents, existingRequirements, isLoadingRequirements]);

  // Load documents on project change
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      setMessage("");
      setExistingRequirements({});
      try {
        const url = projectId ? `${API_URL}?project_id=${projectId}` : API_URL;
        const response = await fetch(url);
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.detail || "Could not load documents.");
        setDocuments(data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Cannot connect to backend.");
      } finally {
        setIsLoading(false);
      }
    };
    loadDocuments();
  }, [projectId]);

  // Add newly uploaded docs to list
  useEffect(() => {
    if (newUploadedDocuments.length === 0) return;
    setDocuments((current) => {
      const currentIds = new Set(current.map((d) => d.id));
      return [...newUploadedDocuments.filter((d) => !currentIds.has(d.id)), ...current];
    });
  }, [newUploadedDocuments]);

  const filteredDocuments = useMemo(() => {
    return documents
      .filter((d) => {
        return (
          d.original_filename.toLowerCase().includes(filters.filename.toLowerCase()) &&
          (!filters.status || d.status === filters.status)
        );
      })
      .sort((a, b) => {
        const ta = new Date(a.uploaded_at).getTime();
        const tb = new Date(b.uploaded_at).getTime();
        return filters.timeOrder === "oldest" ? ta - tb : tb - ta;
      });
  }, [documents, filters]);

  const statuses = useMemo(() => Array.from(new Set(documents.map((d) => d.status))).sort(), [documents]);

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const clearUploadHistory = async () => {
    if (!window.confirm("Clear all uploaded document history?")) return;
    setIsClearing(true); setMessage("");
    try {
      const r = await fetch(API_URL, { method: "DELETE" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.detail || "Could not clear history.");
      setDocuments([]); setFilters(defaultFilters); setExistingRequirements({});
    } catch (e) { setMessage(e instanceof Error ? e.message : "Cannot connect to backend."); }
    finally { setIsClearing(false); }
  };

  const generateRequirements = async (doc: DocumentItem) => {
    setGeneratingRequirementsId(doc.id); setMessage("");
    try {
      const r = await fetch(`${API_V1_DOCUMENTS_URL}/${doc.id}/requirements/generate`, { method: "POST" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.detail || "Could not generate requirements.");
      setExistingRequirements((prev) => ({ ...prev, [doc.id]: d }));
      onViewRequirements(d, doc);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Cannot connect to backend."); }
    finally { setGeneratingRequirementsId(null); }
  };

  const deleteDocument = async (doc: DocumentItem) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.original_filename}"?`)) return;
    try {
      const r = await fetch(`${API_URL}/selected`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [doc.id] }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.detail || "Could not delete document.");
      
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setExistingRequirements((prev) => {
        const next = { ...prev };
        delete next[doc.id];
        return next;
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Cannot connect to backend.");
    }
  };

  return (
    <section className="panel animate-in" style={{ animationDelay: "60ms" }}>
      {/* Header */}
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="panel-title">Uploaded Documents</span>
          {documents.length > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1px 7px" }}>
              {filteredDocuments.length}
            </span>
          )}
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setShowFilters((f) => !f)}>
            <FilterIcon /> {showFilters ? "Hide" : "Filter"}
          </button>
          <button type="button" className="btn btn-danger" disabled={isClearing || documents.length === 0} onClick={clearUploadHistory}>
            {isClearing ? <><SpinnerIcon /> Clearing...</> : <><TrashIcon /> Clear</>}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ padding: "10px 14px", display: "grid", gap: "8px", borderBottom: "1px solid var(--border)" }}>
          <input
            className="filter-control"
            type="text"
            name="filename"
            value={filters.filename}
            onChange={handleFilterChange}
            placeholder="Search filename..."
            style={{ width: "100%", boxSizing: "border-box" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <select className="filter-control" name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All statuses</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="filter-control" name="timeOrder" value={filters.timeOrder} onChange={handleFilterChange}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <button type="button" className="btn btn-secondary" style={{ width: "fit-content" }} onClick={() => setFilters(defaultFilters)}>Reset</button>
        </div>
      )}

      {/* Error */}
      {message && (
        <div className="msg msg-error" style={{ margin: "0 14px 0" }}>
          <AlertIcon />{message}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ padding: "14px", display: "grid", gap: "6px" }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: "56px", borderRadius: "6px" }} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && documents.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 14px" }}>
          <div className="empty-state-icon"><FileTextIcon /></div>
          <div className="empty-state-title">No documents yet</div>
          <div className="empty-state-body">Upload a document to get started.</div>
        </div>
      )}

      {/* Document Card List */}
      {!isLoading && filteredDocuments.length > 0 && (
        <div className="doc-card-list">
          {filteredDocuments.map((doc) => {
            const hasReqs = !!existingRequirements[doc.id];
            const isGenerating = generatingRequirementsId === doc.id;
            const isLoadingReqs = !!isLoadingRequirements[doc.id];
            return (
              <div key={doc.id} className="doc-card">
                <div className="doc-card-main">
                  <div className="doc-card-name" title={doc.original_filename}>
                    {doc.original_filename}
                  </div>
                  <div className="doc-card-meta">
                    <span className="badge badge-filetype">{doc.file_type.toUpperCase()}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)" }}>
                      {formatFileSize(doc.file_size)}
                    </span>
                    <StatusBadge status={doc.status} />
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    {formatDate(doc.uploaded_at)}
                  </div>
                </div>
                <div className="doc-card-actions">
                  {doc.status === "completed" && hasReqs ? (
                    <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: "11px", padding: "4px 8px", flex: 1 }}
                        onClick={() => onViewRequirements(existingRequirements[doc.id]!, doc)}
                      >
                        <EyeIcon /> View Requirement
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                        disabled={isGenerating}
                        onClick={() => generateRequirements(doc)}
                        title="Re-generate requirements"
                      >
                        {isGenerating ? <SpinnerIcon /> : <RefreshIcon />}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                        onClick={() => deleteDocument(doc)}
                        title="Delete document"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ) : doc.status === "completed" ? (
                    <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: "11px", padding: "4px 8px", flex: 1 }}
                        disabled={isGenerating || isLoadingReqs}
                        onClick={() => generateRequirements(doc)}
                      >
                        {isGenerating ? <><SpinnerIcon /> Generating...</> : isLoadingReqs ? <><SpinnerIcon /> Loading...</> : <><ZapIcon /> Generate</>}
                      </button>
                      <div style={{ width: "30px", flexShrink: 0 }} />
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                        onClick={() => deleteDocument(doc)}
                        title="Delete document"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ fontSize: "11px", padding: "4px 8px", width: "100%", justifyContent: "center" }}
                      onClick={() => deleteDocument(doc)}
                    >
                      <TrashIcon /> Delete Document
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
