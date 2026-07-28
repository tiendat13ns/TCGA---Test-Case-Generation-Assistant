import { useState, useCallback } from "react";
import { Project } from "./ProjectManager";
import { DocumentItem } from "../App";
import { useProjects } from "../hooks/useProjects";
import { useProjectDocuments } from "../hooks/useDocuments";
import { useTestCases, useUpdateTestCase } from "../hooks/useTestCases";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export type StudioTestCaseItem = {
  id: string;
  requirement_id?: string;
  document_id?: string;
  title: string;
  scenario?: string;
  preconditions?: string;
  test_steps: string[];
  test_data?: string;
  expected_result?: string;
  priority: string;
  severity?: string;
  test_type?: string;
  automation_candidate?: boolean;
  execution_type?: string;
  status: string;
  version?: number;
  feature_name?: string;
  requirement_title?: string;
  project_id?: string;
  module_name?: string;
};

type StudioView = "projects" | "documents" | "testcases";

/* ── Icons ── */
const FlaskIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" /><path d="M10 9l-3 9a2 2 0 002 2h6a2 2 0 002-2l-3-9V3" /><path d="M7 14h10" />
  </svg>
);
const FolderIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
);
const FileTextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const SpinnerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "tcs-spin 0.7s linear infinite" }}>
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const CheckSquareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

/* ── Helper components ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    ai_generated: { cls: "badge-processing", label: "AI Generated" },
    reviewed: { cls: "badge-uploaded", label: "Reviewed" },
    approved: { cls: "badge-completed", label: "Approved" },
    rejected: { cls: "badge-error", label: "Rejected" },
    exported: { cls: "badge-completed", label: "Exported" },
  };
  const info = map[status] || { cls: "badge-uploaded", label: status };
  return <span className={`badge ${info.cls}`}><span className="badge-dot" />{info.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colorMap: Record<string, string> = {
    High: "var(--danger)",
    Medium: "var(--warning)",
    Low: "var(--accent)",
  };
  const color = colorMap[priority] || "var(--text-muted)";
  return (
    <span style={{
      fontSize: "11px", fontWeight: 600, fontFamily: "var(--font-mono)",
      color, padding: "2px 8px", borderRadius: "4px",
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      whiteSpace: "nowrap",
    }}>
      {priority}
    </span>
  );
}

function timeAgo(dateString: string) {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 2592000)}mo ago`;
  } catch { return dateString; }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function TestCaseStudio() {
  const [view, setView] = useState<StudioView>("projects");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);

  // TC Filters
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTestType, setFilterTestType] = useState("");

  // Bulk Editing
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);
  const [draftTestCases, setDraftTestCases] = useState<Record<string, Partial<StudioTestCaseItem>>>({});
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /* ── Hooks ── */
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects();
  
  const { data: documents = [], isLoading: isLoadingDocs } = useProjectDocuments(
    view === "documents" ? selectedProject?.id || null : null
  );

  const testCaseFilters = {
    project_id: selectedProject?.id,
    document_id: selectedDocument?.id,
    priority: filterPriority,
    status: filterStatus,
    test_type: filterTestType
  };
  
  const { data: testCaseData, isLoading: isLoadingTCs } = useTestCases(
    testCaseFilters,
    view === "testcases" // Only fetch if we're on the test case view
  );
  
  const testCases = testCaseData?.test_cases || [];
  const totalCount = testCaseData?.total_test_cases || 0;

  const updateTestCase = useUpdateTestCase();
  const isSaving = updateTestCase.isPending;

  /* ── Navigation ── */
  const goToDocuments = (project: Project) => {
    setSelectedProject(project);
    setSelectedDocument(null);
    setView("documents");
  };

  const goToTestCases = (doc: DocumentItem) => {
    setSelectedDocument(doc);
    setFilterPriority("");
    setFilterStatus("");
    setFilterTestType("");
    setIsGlobalEditing(false);
    setDraftTestCases({});
    setView("testcases");
  };

  const goBackToProjects = () => {
    setSelectedProject(null);
    setSelectedDocument(null);
    setView("projects");
  };

  const goBackToDocuments = () => {
    setSelectedDocument(null);
    setIsGlobalEditing(false);
    setDraftTestCases({});
    setView("documents");
  };

  /* ── Bulk Editing ── */
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const startGlobalEditing = () => {
    setIsGlobalEditing(true);
    setDraftTestCases({});
  };

  const cancelGlobalEditing = () => {
    setIsGlobalEditing(false);
    setDraftTestCases({});
  };

  const handleDraftChange = (id: string, field: keyof StudioTestCaseItem, value: any) => {
    setDraftTestCases(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const saveBulkEditing = async () => {
    const modifiedIds = Object.keys(draftTestCases);
    if (modifiedIds.length === 0) {
      setIsGlobalEditing(false);
      return;
    }
    
    setIsBulkSaving(true);
    try {
      await Promise.all(
        modifiedIds.map(id => updateTestCase.mutateAsync({ id, data: draftTestCases[id] }))
      );
      showToast(`Saved changes to ${modifiedIds.length} test cases`);
      setIsGlobalEditing(false);
      setDraftTestCases({});
    } catch (err) {
      showToast("Failed to save some changes");
    } finally {
      setIsBulkSaving(false);
    }
  };

  /* ══════════════════════════════════════════════════════════
     VIEW 1: PROJECT SELECTION
     ══════════════════════════════════════════════════════════ */
  const renderProjectSelection = () => (
    <div className="tcs-view">
      <div className="tcs-view-header">
        <div className="tcs-view-title-row">
          <div className="tcs-title">
            <div className="tcs-title-icon"><FlaskIcon /></div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 600 }}>Test Case Studio</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px" }}>
                Select a project to browse its test cases
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tcs-view-body">
        {isLoadingProjects ? (
          <div className="tcs-loading"><SpinnerIcon /> <span>Loading projects...</span></div>
        ) : projects.length === 0 ? (
          <div className="tcs-empty">
            <div className="tcs-empty-icon"><FolderIcon /></div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)" }}>No projects yet</div>
            <div style={{ fontSize: "13px", maxWidth: "320px", textAlign: "center", lineHeight: 1.6 }}>
              Create a project from the Projects page first, then come back here to browse its test cases.
            </div>
          </div>
        ) : (
          <div className="tcs-project-grid">
            {projects.map(p => (
              <div
                key={p.id}
                className="tcs-project-card"
                onClick={() => goToDocuments(p)}
              >
                <div className="tcs-project-card-icon">
                  <FolderIcon />
                </div>
                <div className="tcs-project-card-body">
                  <div className="tcs-project-card-name">{p.name}</div>
                  {p.description && (
                    <div className="tcs-project-card-desc">{p.description}</div>
                  )}
                  <div className="tcs-project-card-meta">
                    <span><CheckSquareIcon /> {p.test_case_count || 0} tests</span>
                    <span>{timeAgo(p.created_at)}</span>
                  </div>
                </div>
                <div className="tcs-project-card-arrow"><ChevronRightIcon /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════
     VIEW 2: DOCUMENT SELECTION
     ══════════════════════════════════════════════════════════ */
  const renderDocumentSelection = () => (
    <div className="tcs-view">
      <div className="tcs-view-header">
        <div className="tcs-breadcrumb">
          <button className="tcs-breadcrumb-btn" onClick={goBackToProjects}>
            <ArrowLeftIcon /> All Projects
          </button>
          <ChevronRightIcon />
          <span className="tcs-breadcrumb-current">{selectedProject?.name}</span>
        </div>
        <div className="tcs-view-title-row" style={{ marginTop: "12px" }}>
          <div className="tcs-title">
            <div className="tcs-title-icon" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
              <FileTextIcon />
            </div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 600 }}>Documents</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px" }}>
                Select a document to view its generated test cases
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tcs-view-body">
        {isLoadingDocs ? (
          <div className="tcs-loading"><SpinnerIcon /> <span>Loading documents...</span></div>
        ) : documents.length === 0 ? (
          <div className="tcs-empty">
            <div className="tcs-empty-icon"><FileTextIcon /></div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)" }}>No documents found</div>
            <div style={{ fontSize: "13px", maxWidth: "320px", textAlign: "center", lineHeight: 1.6 }}>
              Upload documents from the project dashboard to generate requirements and test cases.
            </div>
          </div>
        ) : (
          <div className="tcs-doc-list">
            {documents.map((doc: DocumentItem) => (
              <div key={doc.id} className="tcs-doc-row">
                <div className="tcs-doc-row-icon">
                  <FileTextIcon />
                </div>
                <div className="tcs-doc-row-info">
                  <div className="tcs-doc-row-name">{doc.original_filename}</div>
                  <div className="tcs-doc-row-meta">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>{doc.file_type.toUpperCase()}</span>
                    <span>{timeAgo(doc.uploaded_at)}</span>
                  </div>
                </div>
                <div className="tcs-doc-row-actions">
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: "12px", padding: "6px 14px", gap: "5px" }}
                    onClick={() => goToTestCases(doc)}
                  >
                    <EyeIcon /> View TCs
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════
     VIEW 3: TEST CASE TABLE
     ══════════════════════════════════════════════════════════ */
  const exportUrl = (() => {
    const params = new URLSearchParams();
    if (selectedProject) params.append("project_id", selectedProject.id);
    const qs = params.toString();
    return `${API_BASE}/api/v1/test-cases/export${qs ? `?${qs}` : ""}`;
  })();

  const renderTestCaseTable = () => (
    <div className="tcs-view">
      <div className="tcs-view-header">
        <div className="tcs-breadcrumb">
          <button className="tcs-breadcrumb-btn" onClick={goBackToProjects}>
            <ArrowLeftIcon /> All Projects
          </button>
          <ChevronRightIcon />
          <button className="tcs-breadcrumb-btn" onClick={goBackToDocuments}>
            {selectedProject?.name}
          </button>
          <ChevronRightIcon />
          <span className="tcs-breadcrumb-current">{selectedDocument?.original_filename}</span>
        </div>

        <div className="tcs-view-title-row" style={{ marginTop: "12px", alignItems: "flex-end" }}>
          {/* Left Side: Edit Mode Controls & Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px", fontWeight: 600 }}>Test Cases</span>
              <span className="tc-count-badge">{totalCount}</span>
            </div>
            
            {testCases.length > 0 && (
              <div className="tcs-global-edit-bar">
                {!isGlobalEditing ? (
                  <button className="btn btn-secondary" onClick={startGlobalEditing} style={{ padding: "6px 14px", fontSize: "12px", gap: "6px" }}>
                    <EditIcon /> Edit All
                  </button>
                ) : (
                  <>
                    <button className="btn btn-primary" onClick={saveBulkEditing} disabled={isBulkSaving} style={{ padding: "6px 14px", fontSize: "12px", gap: "6px" }}>
                      {isBulkSaving ? <SpinnerIcon /> : <CheckIcon />} Save
                    </button>
                    <button className="btn" onClick={cancelGlobalEditing} disabled={isBulkSaving} style={{ padding: "6px 14px", fontSize: "12px", gap: "6px", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                      <XIcon /> Cancel
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
            {/* Filters */}
            <div className="tcs-filters">
              <div className="tcs-filter-group">
                <label className="tcs-filter-label">Priority</label>
                <select className="tcs-filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="">All</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="tcs-filter-group">
                <label className="tcs-filter-label">Status</label>
                <select className="tcs-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="ai_generated">AI Generated</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="tcs-filter-group">
                <label className="tcs-filter-label">Type</label>
                <select className="tcs-filter-select" value={filterTestType} onChange={e => setFilterTestType(e.target.value)}>
                  <option value="">All</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                  <option value="Boundary">Boundary</option>
                  <option value="Validation">Validation</option>
                  <option value="Integration">Integration</option>
                  <option value="Security">Security</option>
                </select>
              </div>
            </div>

            {totalCount > 0 && (
              <a href={exportUrl} className="btn btn-secondary" target="_blank" rel="noopener noreferrer"
                 style={{ gap: "6px", textDecoration: "none", fontSize: "12px", padding: "6px 14px", height: "32px", marginLeft: "4px" }}>
                <DownloadIcon /> Export Excel
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="tcs-view-body">
        {isLoadingTCs ? (
          <div className="tcs-loading"><SpinnerIcon /> <span>Loading test cases...</span></div>
        ) : testCases.length === 0 ? (
          <div className="tcs-empty">
            <div className="tcs-empty-icon"><FlaskIcon /></div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)" }}>No test cases</div>
            <div style={{ fontSize: "13px", maxWidth: "360px", textAlign: "center", lineHeight: 1.6 }}>
              No test cases have been generated for this document yet. Go to the project dashboard to generate them.
            </div>
          </div>
        ) : (
          <div className="tcs-table-wrap">
            <table className="tc-table">
              <thead>
                <tr>
                  <th className="tcs-sticky-header" style={{ width: "10%" }}>Feature</th>
                  <th className="tcs-sticky-header" style={{ width: "6%" }}>TC ID</th>
                  <th className="tcs-sticky-header" style={{ width: "14%" }}>Title</th>
                  <th className="tcs-sticky-header" style={{ width: "12%" }}>Preconditions</th>
                  <th className="tcs-sticky-header" style={{ width: "18%" }}>Test Steps</th>
                  <th className="tcs-sticky-header" style={{ width: "10%" }}>Test Data</th>
                  <th className="tcs-sticky-header" style={{ width: "12%" }}>Expected Result</th>
                  <th className="tcs-sticky-header" style={{ width: "7%" }}>Priority</th>
                  <th className="tcs-sticky-header" style={{ width: "8%" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {testCases.map((tc: StudioTestCaseItem, idx: number) => {
                  const draft = draftTestCases[tc.id] || {};
                  const currentTC = { ...tc, ...draft };
                  
                  return (
                    <tr
                      key={tc.id}
                      className={isGlobalEditing ? "tcs-row-editing" : ""}
                    >
                      <td>
                        <span style={{ fontSize: "12px", fontWeight: 500 }}>
                          {currentTC.feature_name || currentTC.module_name || "-"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--accent)" }}>
                          TC-{String(idx + 1).padStart(2, "0")}
                        </span>
                      </td>

                      {/* Title */}
                      <td>
                        {isGlobalEditing ? (
                          <textarea className="tcs-cell-seamless" value={currentTC.title || ""} rows={2}
                            onChange={e => handleDraftChange(tc.id, "title", e.target.value)} />
                        ) : <span style={{ fontWeight: 500 }}>{currentTC.title}</span>}
                      </td>

                      {/* Preconditions */}
                      <td>
                        {isGlobalEditing ? (
                          <textarea className="tcs-cell-seamless" value={currentTC.preconditions || ""} rows={2}
                            onChange={e => handleDraftChange(tc.id, "preconditions", e.target.value)} />
                        ) : currentTC.preconditions || <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </td>

                      {/* Test Steps */}
                      <td>
                        {isGlobalEditing ? (
                          <textarea className="tcs-cell-seamless" value={(currentTC.test_steps || []).join("\n")} rows={4}
                            onChange={e => handleDraftChange(tc.id, "test_steps", e.target.value.split("\n"))}
                            placeholder="One step per line" />
                        ) : (currentTC.test_steps && currentTC.test_steps.length > 0) ? (
                          <ol style={{ margin: 0, paddingLeft: "16px" }}>
                            {currentTC.test_steps.map((s: string, si: number) => <li key={si}>{s}</li>)}
                          </ol>
                        ) : <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </td>

                      {/* Test Data */}
                      <td>
                        {isGlobalEditing ? (
                          <textarea className="tcs-cell-seamless" value={currentTC.test_data || ""} rows={2}
                            onChange={e => handleDraftChange(tc.id, "test_data", e.target.value)} />
                        ) : currentTC.test_data || <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </td>

                      {/* Expected Result */}
                      <td>
                        {isGlobalEditing ? (
                          <textarea className="tcs-cell-seamless" value={currentTC.expected_result || ""} rows={2}
                            onChange={e => handleDraftChange(tc.id, "expected_result", e.target.value)} />
                        ) : currentTC.expected_result || <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </td>

                      {/* Priority */}
                      <td>
                        {isGlobalEditing ? (
                          <select className="tcs-cell-seamless tcs-cell-seamless-select" value={currentTC.priority || "Medium"}
                            onChange={e => handleDraftChange(tc.id, "priority", e.target.value)}>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        ) : <PriorityBadge priority={currentTC.priority} />}
                      </td>

                      {/* Status */}
                      <td>
                        {isGlobalEditing ? (
                          <select className="tcs-cell-seamless tcs-cell-seamless-select" value={currentTC.status || "ai_generated"}
                            onChange={e => handleDraftChange(tc.id, "status", e.target.value)}>
                            <option value="ai_generated">AI Generated</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        ) : <StatusBadge status={currentTC.status} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  /* ── Render ── */
  return (
    <div className="tcs-container">
      {view === "projects" && renderProjectSelection()}
      {view === "documents" && renderDocumentSelection()}
      {view === "testcases" && renderTestCaseTable()}

      {toastMessage && (
        <div className="tcs-toast">
          <CheckIcon /> {toastMessage}
        </div>
      )}
    </div>
  );
}
