import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { DocumentItem } from "../App";

const API_URL = "http://localhost:8000/api/documents";
const API_V1_DOCUMENTS_URL = "http://localhost:8000/api/v1/documents";
const API_V1_REQUIREMENTS_URL = "http://localhost:8000/api/v1/requirements";

type DocumentListProps = {
  projectId: string | null;
  newUploadedDocuments: DocumentItem[];
};

type DocumentDetail = DocumentItem & { text_length: number; preview: string | null };

type RequirementItem = {
  id: string; title: string; description: string;
  functional_requirement: string | null; validation_rule: string[] | null;
  permission: string[] | null; workflow: string[] | null;
  state: string[] | null; error_handling: string[] | null;
  module_name: string | null; feature_name: string | null;
  actor: string | null; business_rules: string[] | null;
  inputs: string[] | null; outputs: string[] | null;
  preconditions: string[] | null; validation_rules: string[] | null;
  exception_flows: string[] | null; source_reference: string | null;
  confidence_score: number | null; status: string; version: number;
};

type GenerateRequirementsResponse = {
  document_id: string; project_id: string | null;
  total_requirements: number; requirements: RequirementItem[];
};

type TestCaseItem = {
  id: string; requirement_id: string; document_id: string | null;
  title: string; scenario: string | null; preconditions: string | null;
  test_steps: string[] | null; test_data: string | null;
  expected_result: string; priority: string; severity: string | null;
  test_type: string | null; automation_candidate: boolean;
  execution_type: string; status: string; version: number;
};

type GenerateTestCasesResponse = {
  requirement_id: string; document_id: string | null;
  total_test_cases: number; test_cases: TestCaseItem[];
};

type Filters = { filename: string; type: string; minSizeKb: string; maxSizeKb: string; status: string; timeOrder: string };

const defaultFilters: Filters = { filename: "", type: "", minSizeKb: "", maxSizeKb: "", status: "", timeOrder: "newest" };

/* ── Icons ── */
const FilterIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;
const TrashIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>;
const EyeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
const ZapIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
const RefreshIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>;
const ChevronDown = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;
const ChevronUp = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>;
const XIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const FileTextIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
const AlertIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
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
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

function RequirementFieldList({ items }: { items: string[] | null }) {
  if (!items || items.length === 0) return <span className="req-field-empty">None</span>;
  return (
    <ul className="req-field-list">
      {items.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}
    </ul>
  );
}

function DocumentList({ projectId, newUploadedDocuments }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [generatingRequirementsId, setGeneratingRequirementsId] = useState<string | null>(null);
  const [selectedDocumentDetail, setSelectedDocumentDetail] = useState<DocumentDetail | null>(null);
  const [generatedRequirements, setGeneratedRequirements] = useState<GenerateRequirementsResponse | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [testCasesMap, setTestCasesMap] = useState<Record<string, GenerateTestCasesResponse | null>>({});
  const [generatingTestCasesId, setGeneratingTestCasesId] = useState<string | null>(null);
  const [expandedTestCasesId, setExpandedTestCasesId] = useState<string | null>(null);

  const [existingRequirements, setExistingRequirements] = useState<Record<string, GenerateRequirementsResponse | null>>({});
  const [isLoadingRequirements, setIsLoadingRequirements] = useState<Record<string, boolean>>({});

  useEffect(() => {
    documents.forEach(async (doc) => {
      if (doc.status === "completed" && existingRequirements[doc.id] === undefined && !isLoadingRequirements[doc.id]) {
        setIsLoadingRequirements((prev) => ({ ...prev, [doc.id]: true }));
        try {
          const r = await fetch(`${API_V1_DOCUMENTS_URL}/${doc.id}/requirements`);
          if (r.ok) {
            const d = await r.json();
            if (d.total_requirements > 0) {
              setExistingRequirements((prev) => ({ ...prev, [doc.id]: d }));
            } else {
              setExistingRequirements((prev) => ({ ...prev, [doc.id]: null }));
            }
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

  useEffect(() => {
    if (!generatedRequirements) return;
    generatedRequirements.requirements.forEach(async (req) => {
      if (testCasesMap[req.id] === undefined && !generatingTestCasesId) {
        try {
          const r = await fetch(`${API_V1_REQUIREMENTS_URL}/${req.id}/test-cases`);
          if (r.ok) {
            const d = await r.json();
            if (d.total_test_cases > 0) {
              setTestCasesMap((prev) => ({ ...prev, [req.id]: d }));
            } else {
              setTestCasesMap((prev) => ({ ...prev, [req.id]: null }));
            }
          } else {
            setTestCasesMap((prev) => ({ ...prev, [req.id]: null }));
          }
        } catch {}
      }
    });
  }, [generatedRequirements, testCasesMap, generatingTestCasesId]);

  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      setMessage("");
      try {
        // Filter by project if a project is selected
        const url = projectId
          ? `${API_URL}?project_id=${projectId}`
          : API_URL;
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

  useEffect(() => {
    if (newUploadedDocuments.length === 0) return;
    setDocuments((current) => {
      const currentIds = new Set(current.map((d) => d.id));
      return [...newUploadedDocuments.filter((d) => !currentIds.has(d.id)), ...current];
    });
  }, [newUploadedDocuments]);

  const fileTypes = useMemo(() => Array.from(new Set(documents.map((d) => d.file_type))).sort(), [documents]);
  const statuses = useMemo(() => Array.from(new Set(documents.map((d) => d.status))).sort(), [documents]);

  const filteredDocuments = useMemo(() => {
    const minSize = filters.minSizeKb ? Number(filters.minSizeKb) * 1024 : null;
    const maxSize = filters.maxSizeKb ? Number(filters.maxSizeKb) * 1024 : null;
    return documents
      .filter((d) => {
        return (
          d.original_filename.toLowerCase().includes(filters.filename.toLowerCase()) &&
          (!filters.type || d.file_type === filters.type) &&
          (!filters.status || d.status === filters.status) &&
          (minSize === null || d.file_size >= minSize) &&
          (maxSize === null || d.file_size <= maxSize)
        );
      })
      .sort((a, b) => {
        const ta = new Date(a.uploaded_at).getTime();
        const tb = new Date(b.uploaded_at).getTime();
        return filters.timeOrder === "oldest" ? ta - tb : tb - ta;
      });
  }, [documents, filters]);

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const toggleDocumentSelection = (id: string) => {
    setSelectedDocumentIds((ids) => ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]);
  };

  const toggleAllVisibleDocuments = () => {
    const visibleIds = filteredDocuments.map((d) => d.id);
    const allSelected = visibleIds.every((id) => selectedDocumentIds.includes(id));
    setSelectedDocumentIds((ids) =>
      allSelected ? ids.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...ids, ...visibleIds]))
    );
  };

  const clearUploadHistory = async () => {
    if (!window.confirm("Clear all uploaded document history?")) return;
    setIsClearing(true); setMessage("");
    try {
      const r = await fetch(API_URL, { method: "DELETE" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.detail || "Could not clear history.");
      setDocuments([]); setSelectedDocumentIds([]); setFilters(defaultFilters);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Cannot connect to backend."); }
    finally { setIsClearing(false); }
  };

  const deleteSelectedDocuments = async () => {
    if (selectedDocumentIds.length === 0) { setMessage("Please select at least one file to delete."); return; }
    if (!window.confirm(`Delete ${selectedDocumentIds.length} selected file(s)?`)) return;
    setIsDeletingSelected(true); setMessage("");
    try {
      const r = await fetch(`${API_URL}/selected`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedDocumentIds }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.detail || "Could not delete selected documents.");
      setDocuments((current) => current.filter((doc) => !selectedDocumentIds.includes(doc.id)));
      setSelectedDocumentDetail((detail) => detail && selectedDocumentIds.includes(detail.id) ? null : detail);
      setGeneratedRequirements((req) => req && selectedDocumentIds.includes(req.document_id) ? null : req);
      setSelectedDocumentIds([]);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Cannot connect to backend."); }
    finally { setIsDeletingSelected(false); }
  };

  const loadDocumentPreview = async (documentId: string) => {
    setLoadingPreviewId(documentId); setMessage("");
    try {
      const r = await fetch(`${API_URL}/${documentId}`);
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.detail || "Could not load document preview.");
      setSelectedDocumentDetail(d);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Cannot connect to backend."); }
    finally { setLoadingPreviewId(null); }
  };

  const generateRequirements = async (documentId: string) => {
    setGeneratingRequirementsId(documentId); setMessage(""); setGeneratedRequirements(null);
    try {
      const r = await fetch(`${API_V1_DOCUMENTS_URL}/${documentId}/requirements/generate`, { method: "POST" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.detail || "Could not generate requirements.");
      setGeneratedRequirements(d);
      setExistingRequirements((prev) => ({ ...prev, [documentId]: d }));
    } catch (e) { setMessage(e instanceof Error ? e.message : "Cannot connect to backend."); }
    finally { setGeneratingRequirementsId(null); }
  };

  const generateTestCases = async (requirementId: string) => {
    setGeneratingTestCasesId(requirementId); setMessage("");
    try {
      const r = await fetch(`${API_V1_REQUIREMENTS_URL}/${requirementId}/test-cases/generate`, { method: "POST" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.detail || "Could not generate test cases.");
      setTestCasesMap((prev) => ({ ...prev, [requirementId]: d }));
      setExpandedTestCasesId(requirementId);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Cannot connect to backend."); }
    finally { setGeneratingTestCasesId(null); }
  };

  const allVisibleSelected = filteredDocuments.length > 0 && filteredDocuments.every((d) => selectedDocumentIds.includes(d.id));

  return (
    <section className="panel animate-in" style={{ animationDelay: "60ms" }}>
      {/* Panel Header */}
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="panel-title">Uploaded Documents</span>
          {documents.length > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1px 7px" }}>
              {filteredDocuments.length}
            </span>
          )}
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setShowFilters((f) => !f)}>
            <FilterIcon /> {showFilters ? "Hide filters" : "Filter"}
          </button>
          <button type="button" className="btn btn-danger" disabled={isClearing || documents.length === 0} onClick={clearUploadHistory}>
            {isClearing ? <><SpinnerIcon /> Clearing...</> : <><TrashIcon /> Clear All</>}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="filters-grid">
          <label className="filter-label">
            Filename
            <input className="filter-control" type="text" name="filename" value={filters.filename} onChange={handleFilterChange} placeholder="Search..." />
          </label>
          <label className="filter-label">
            Type
            <select className="filter-control" name="type" value={filters.type} onChange={handleFilterChange}>
              <option value="">All types</option>
              {fileTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="filter-label">
            Min size (KB)
            <input className="filter-control" type="number" min="0" name="minSizeKb" value={filters.minSizeKb} onChange={handleFilterChange} />
          </label>
          <label className="filter-label">
            Max size (KB)
            <input className="filter-control" type="number" min="0" name="maxSizeKb" value={filters.maxSizeKb} onChange={handleFilterChange} />
          </label>
          <label className="filter-label">
            Status
            <select className="filter-control" name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All statuses</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="filter-label">
            Sort by time
            <select className="filter-control" name="timeOrder" value={filters.timeOrder} onChange={handleFilterChange}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setFilters(defaultFilters)}>Reset</button>
          </div>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className="msg msg-error" style={{ margin: "0 18px 0" }}>
          <AlertIcon />{message}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div style={{ padding: "18px", display: "grid", gap: "8px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: "44px", borderRadius: "6px" }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && documents.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><FileTextIcon /></div>
          <div className="empty-state-title">No documents uploaded yet</div>
          <div className="empty-state-body">Upload a PDF, Word, or text document above to get started.</div>
        </div>
      )}

      {!isLoading && documents.length > 0 && filteredDocuments.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">No results match your filters</div>
          <div className="empty-state-body">Try adjusting your filter criteria.</div>
        </div>
      )}

      {/* Table */}
      {documents.length > 0 && filteredDocuments.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, paddingLeft: 16 }}>
                  <input type="checkbox" checked={allVisibleSelected} disabled={filteredDocuments.length === 0} onChange={toggleAllVisibleDocuments} aria-label="Select all visible documents" />
                </th>
                <th>Filename</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="animate-in">
                  <td style={{ paddingLeft: 16, textAlign: "center" }}>
                    <input type="checkbox" checked={selectedDocumentIds.includes(doc.id)} onChange={() => toggleDocumentSelection(doc.id)} aria-label={`Select ${doc.original_filename}`} />
                  </td>
                  <td className="filename" title={doc.original_filename}>{doc.original_filename}</td>
                  <td><span className="badge badge-filetype">{doc.file_type.toUpperCase()}</span></td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>{formatFileSize(doc.file_size)}</td>
                  <td><StatusBadge status={doc.status} /></td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>{formatDate(doc.uploaded_at)}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn btn-secondary" disabled={loadingPreviewId === doc.id} onClick={() => loadDocumentPreview(doc.id)}>
                        {loadingPreviewId === doc.id ? <><SpinnerIcon /> Loading...</> : <><EyeIcon /> Preview</>}
                      </button>
                      {doc.status === "completed" && existingRequirements[doc.id] ? (
                        <>
                          <button type="button" className="btn btn-primary" onClick={() => setGeneratedRequirements(existingRequirements[doc.id]!)}>
                            <EyeIcon /> View Requirements
                          </button>
                          <button type="button" className="btn btn-secondary" disabled={generatingRequirementsId === doc.id} onClick={() => generateRequirements(doc.id)} title="Re-generate requirements">
                            {generatingRequirementsId === doc.id ? <><SpinnerIcon /></> : <><RefreshIcon /></>}
                          </button>
                        </>
                      ) : doc.status === "completed" ? (
                        <button type="button" className="btn btn-primary" disabled={generatingRequirementsId === doc.id || isLoadingRequirements[doc.id]} onClick={() => generateRequirements(doc.id)}>
                          {generatingRequirementsId === doc.id ? <><SpinnerIcon /> Generating...</> : isLoadingRequirements[doc.id] ? <><SpinnerIcon /> Loading...</> : <><ZapIcon /> Generate Requirements</>}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky bulk toolbar — appears when items are selected */}
      {selectedDocumentIds.length > 0 && (
        <div className="bulk-toolbar">
          <span className="bulk-toolbar-count"><span>{selectedDocumentIds.length}</span> selected</span>
          <button type="button" className="btn btn-secondary" onClick={() => setSelectedDocumentIds([])}>
            <XIcon /> Deselect
          </button>
          <button type="button" className="btn btn-danger" disabled={isDeletingSelected} onClick={deleteSelectedDocuments}>
            {isDeletingSelected ? <><SpinnerIcon /> Deleting...</> : <><TrashIcon /> Delete selected</>}
          </button>
        </div>
      )}

      {/* Document Preview */}
      {selectedDocumentDetail && (
        <div className="panel" style={{ margin: "16px 18px", border: "1px solid var(--border)" }}>
          <div className="panel-header">
            <span className="panel-title">Extracted Text Preview</span>
            <button type="button" className="btn btn-secondary" onClick={() => setSelectedDocumentDetail(null)}><XIcon /></button>
          </div>
          <div className="doc-preview-meta">
            <div className="doc-preview-meta-item">
              <span className="doc-preview-meta-key">Filename</span>
              <span className="doc-preview-meta-value">{selectedDocumentDetail.original_filename}</span>
            </div>
            <div className="doc-preview-meta-item">
              <span className="doc-preview-meta-key">Status</span>
              <StatusBadge status={selectedDocumentDetail.status} />
            </div>
            <div className="doc-preview-meta-item">
              <span className="doc-preview-meta-key">Text length</span>
              <span className="doc-preview-meta-value" style={{ fontFamily: "var(--font-mono)" }}>{selectedDocumentDetail.text_length.toLocaleString()} chars</span>
            </div>
          </div>
          {selectedDocumentDetail.error_message && (
            <div className="msg msg-error" style={{ margin: "12px 18px 0" }}><AlertIcon />{selectedDocumentDetail.error_message}</div>
          )}
          <pre className="text-preview">{selectedDocumentDetail.preview || "No extracted text preview available."}</pre>
        </div>
      )}

      {/* Generated Requirements */}
      {generatedRequirements && (
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Generated Requirements</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", padding: "1px 7px", borderRadius: "10px", background: "rgba(16,185,129,0.1)", color: "var(--accent)", border: "1px solid rgba(16,185,129,0.2)" }}>
                {generatedRequirements.total_requirements}
              </span>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => setGeneratedRequirements(null)}><XIcon /></button>
          </div>
          <div className="req-list">
            {generatedRequirements.requirements.map((req, idx) => (
              <article className="req-card animate-in" key={req.id} data-status={req.status}>
                <div className="req-card-header">
                  <span className="req-card-title">REQ-{String(idx + 1).padStart(2, "0")}</span>
                  <div className="req-card-actions">
                    <StatusBadge status={req.status} />
                    <button type="button" className="btn btn-purple" disabled={generatingTestCasesId === req.id} onClick={() => generateTestCases(req.id)}>
                      {generatingTestCasesId === req.id ? (
                        <><SpinnerIcon /> Generating...</>
                      ) : testCasesMap[req.id] ? (
                        <><RefreshIcon /> Re-generate Test Cases</>
                      ) : (
                        <><ZapIcon /> Generate Test Cases</>
                      )}
                    </button>
                    {testCasesMap[req.id] && (
                      <button type="button" className="btn btn-secondary" onClick={() => setExpandedTestCasesId((prev) => prev === req.id ? null : req.id)}>
                        {expandedTestCasesId === req.id ? <><ChevronUp /> Hide ({testCasesMap[req.id]!.total_test_cases})</> : <><ChevronDown /> Show ({testCasesMap[req.id]!.total_test_cases})</>}
                      </button>
                    )}
                  </div>
                </div>
                <div className="req-card-body">
                  {req.functional_requirement && (
                    <div className="req-field">
                      <div className="req-field-label">Functional Requirement</div>
                      <div className="req-field-value">{req.functional_requirement}</div>
                    </div>
                  )}
                  {req.validation_rule && req.validation_rule.length > 0 && (
                    <div className="req-field">
                      <div className="req-field-label">Validation Rules</div>
                      <RequirementFieldList items={req.validation_rule} />
                    </div>
                  )}
                  {req.workflow && req.workflow.length > 0 && (
                    <div className="req-field">
                      <div className="req-field-label">Workflow</div>
                      <RequirementFieldList items={req.workflow} />
                    </div>
                  )}
                  {req.error_handling && req.error_handling.length > 0 && (
                    <div className="req-field">
                      <div className="req-field-label">Error Handling</div>
                      <RequirementFieldList items={req.error_handling} />
                    </div>
                  )}
                  {req.confidence_score !== null && (
                    <div className="req-confidence">
                      <span>Confidence</span>
                      <div className="confidence-bar">
                        <div className="confidence-fill" style={{ width: `${(req.confidence_score * 100).toFixed(0)}%` }} />
                      </div>
                      <span>{(req.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  )}

                  {/* Test Cases Panel */}
                  {expandedTestCasesId === req.id && testCasesMap[req.id] && (
                    <div className="tc-panel" style={{ margin: "4px -14px -12px", borderRadius: "0 0 7px 7px" }}>
                      <div className="tc-panel-header">
                        <span className="tc-panel-title">Test Cases</span>
                        <span className="tc-count-badge">{testCasesMap[req.id]!.total_test_cases}</span>
                        <div style={{ flex: 1 }} />
                        <a
                          href={`${API_V1_REQUIREMENTS_URL}/${req.id}/test-cases/export`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "11px", gap: "6px", textDecoration: "none" }}
                        >
                          <FileTextIcon /> Export Excel
                        </a>
                      </div>
                      <div className="tc-table-wrap">
                        <table className="tc-table">
                          <thead>
                            <tr>
                              <th style={{ width: "8%" }}>Feature</th>
                              <th style={{ width: "8%" }}>Test Case ID</th>
                              <th style={{ width: "16%" }}>Test Item</th>
                              <th style={{ width: "15%" }}>Precondition</th>
                              <th style={{ width: "20%" }}>Test Steps</th>
                              <th style={{ width: "16%" }}>Test Data</th>
                              <th style={{ width: "16%" }}>Expected Output</th>
                            </tr>
                          </thead>
                          <tbody>
                            {testCasesMap[req.id]!.test_cases.map((tc, tcIdx) => (
                              <tr key={tc.id} className="animate-in">
                                <td>{req.feature_name || req.title || "N/A"}</td>
                                <td style={{ whiteSpace: "nowrap", fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                                  TC-{String(tcIdx + 1).padStart(2, "0")}
                                </td>
                                <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{tc.title}</td>
                                <td>{tc.preconditions || ""}</td>
                                <td>
                                  {tc.test_steps && tc.test_steps.length > 0 ? (
                                    <ol style={{ margin: 0, paddingLeft: "16px" }}>
                                      {tc.test_steps.map((step, si) => <li key={si}>{step}</li>)}
                                    </ol>
                                  ) : null}
                                </td>
                                <td>{tc.test_data || ""}</td>
                                <td>{tc.expected_result}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* General success msg */}
      {!message && generatedRequirements && (
        <div className="msg msg-success" style={{ margin: "0 18px 16px" }}>
          <CheckIcon />
          Generated {generatedRequirements.total_requirements} requirement{generatedRequirements.total_requirements === 1 ? "" : "s"} successfully.
        </div>
      )}
    </section>
  );
}

export default DocumentList;
