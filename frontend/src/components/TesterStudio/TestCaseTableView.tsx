import { Sparkles } from "lucide-react";
import { Project } from "../Projects/ProjectManager";
import { DocumentItem } from "../../App";
import {
  ArrowLeftIcon, AlertCircleIcon, CheckIcon, ChevronRightIcon, DownloadIcon,
  EditIcon, ExecutionSummaryBar, FlaskIcon, PriorityBadge, SpinnerIcon, XIcon,
} from "./shared";
import type { ExecutionSummary, StudioTestCaseItem } from "./shared";

type TestCaseTableViewProps = {
  selectedProject: Project | null;
  selectedDocument: DocumentItem | null;
  totalCount: number;
  testCases: StudioTestCaseItem[];
  isLoadingTCs: boolean;
  executionSummary: ExecutionSummary;
  exportUrl: string;

  filterPriority: string;
  onFilterPriorityChange: (v: string) => void;
  filterTestType: string;
  onFilterTestTypeChange: (v: string) => void;

  isGlobalEditing: boolean;
  draftTestCases: Record<string, Partial<StudioTestCaseItem>>;
  isBulkSaving: boolean;
  onStartGlobalEditing: () => void;
  onCancelGlobalEditing: () => void;
  onSaveBulkEditing: () => void;
  onDraftChange: (id: string, field: keyof StudioTestCaseItem, value: any) => void;

  isAddingRow: boolean;
  onAddRowClick: () => void;
  onCancelAddRow: () => void;
  newRowDraft: Partial<StudioTestCaseItem>;
  onNewRowDraftChange: (draft: Partial<StudioTestCaseItem>) => void;
  onAddNewRow: () => void;
  isCreatingRow: boolean;

  onExecutionStatusChange: (tc: StudioTestCaseItem, newStatus: string) => void;
  onOpenBugReportDrawer: (tc: StudioTestCaseItem) => void;

  onGoBackToProjects: () => void;
  onGoBackToDocuments: () => void;
};

export default function TestCaseTableView({
  selectedProject,
  selectedDocument,
  totalCount,
  testCases,
  isLoadingTCs,
  executionSummary,
  exportUrl,
  filterPriority,
  onFilterPriorityChange,
  filterTestType,
  onFilterTestTypeChange,
  isGlobalEditing,
  draftTestCases,
  isBulkSaving,
  onStartGlobalEditing,
  onCancelGlobalEditing,
  onSaveBulkEditing,
  onDraftChange,
  isAddingRow,
  onAddRowClick,
  onCancelAddRow,
  newRowDraft,
  onNewRowDraftChange,
  onAddNewRow,
  isCreatingRow,
  onExecutionStatusChange,
  onOpenBugReportDrawer,
  onGoBackToProjects,
  onGoBackToDocuments,
}: TestCaseTableViewProps) {
  return (
    <div className="tcs-view">
      <div className="tcs-view-header">
        <div className="tcs-breadcrumb">
          <button className="tcs-breadcrumb-btn" onClick={onGoBackToProjects}>
            <ArrowLeftIcon /> All Projects
          </button>
          <ChevronRightIcon />
          <button className="tcs-breadcrumb-btn" onClick={onGoBackToDocuments}>
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

            {testCases.length > 0 && !isGlobalEditing && (
              <div className="tcs-global-edit-bar">
                <button className="btn btn-secondary" onClick={onAddRowClick} style={{ padding: "6px 14px", fontSize: "12px", gap: "6px" }}>
                  + Add Row
                </button>
                <button className="btn btn-secondary" onClick={onStartGlobalEditing} style={{ padding: "6px 14px", fontSize: "12px", gap: "6px" }}>
                  <EditIcon /> Edit All
                </button>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
            {/* Filters */}
            <div className="tcs-filters">
              <div className="tcs-filter-group">
                <label className="tcs-filter-label">Priority</label>
                <select className="tcs-filter-select" value={filterPriority} onChange={e => onFilterPriorityChange(e.target.value)}>
                  <option value="">All</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="tcs-filter-group">
                <label className="tcs-filter-label">Type</label>
                <select className="tcs-filter-select" value={filterTestType} onChange={e => onFilterTestTypeChange(e.target.value)}>
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

        {executionSummary.total > 0 && (
          <div style={{ marginTop: "14px" }}>
            <ExecutionSummaryBar summary={executionSummary} />
          </div>
        )}
      </div>

      <div className="tcs-view-body">
        {isLoadingTCs ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "64px 20px", color: "var(--text-muted)" }}>
            <Sparkles className="animate-spin" size={24} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Đang tải danh sách Test Cases...</span>
          </div>
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
            {/* Edit Mode Banner */}
            {isGlobalEditing && (
              <div className="tcs-edit-banner">
                <div className="tcs-edit-banner-left">
                  <div className="tcs-edit-banner-dot" />
                  <span className="tcs-edit-banner-label">Edit Mode</span>
                  <span className="tcs-edit-banner-hint">
                    {Object.keys(draftTestCases).length > 0
                      ? `${Object.keys(draftTestCases).length} row${Object.keys(draftTestCases).length > 1 ? "s" : ""} modified`
                      : "Click any cell to edit"}
                  </span>
                </div>
                <div className="tcs-edit-banner-actions">
                  <button className="tcs-edit-btn-save" onClick={onSaveBulkEditing} disabled={isBulkSaving}>
                    {isBulkSaving ? <SpinnerIcon /> : <CheckIcon />}
                    {isBulkSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button className="tcs-edit-btn-cancel" onClick={onCancelGlobalEditing} disabled={isBulkSaving}>
                    <XIcon /> Discard
                  </button>
                </div>
              </div>
            )}
            <table className="tc-table">
              <thead>
                <tr>
                  <th className="tcs-sticky-header" style={{ width: "9%" }}>Feature</th>
                  <th className="tcs-sticky-header" style={{ width: "5%" }}>TC ID</th>
                  <th className="tcs-sticky-header" style={{ width: "13%" }}>Title</th>
                  <th className="tcs-sticky-header" style={{ width: "11%" }}>Preconditions</th>
                  <th className="tcs-sticky-header" style={{ width: "16%" }}>Test Steps</th>
                  <th className="tcs-sticky-header" style={{ width: "9%" }}>Test Data</th>
                  <th className="tcs-sticky-header" style={{ width: "12%" }}>Expected Result</th>
                  <th className="tcs-sticky-header" style={{ width: "6%" }}>Priority</th>
                  <th className="tcs-sticky-header" style={{ width: "10%" }}>Execution</th>
                  <th className="tcs-sticky-header" style={{ width: "9%" }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {/* Adding Row View */}
                {isAddingRow && (
                  <tr className="tcs-row-editing" style={{ background: "color-mix(in srgb, var(--accent) 5%, transparent)" }}>
                    <td><div style={{ color: "var(--text-muted)", fontSize: "12px" }}>- Auto -</div></td>
                    <td><div style={{ color: "var(--text-muted)", fontSize: "12px" }}>- New -</div></td>
                    <td>
                      <textarea className="tcs-cell-seamless" placeholder="Title" value={newRowDraft.title || ""}
                        onChange={e => onNewRowDraftChange({ ...newRowDraft, title: e.target.value })} rows={2} />
                    </td>
                    <td>
                      <textarea className="tcs-cell-seamless" placeholder="Preconditions" value={newRowDraft.preconditions || ""}
                        onChange={e => onNewRowDraftChange({ ...newRowDraft, preconditions: e.target.value })} rows={2} />
                    </td>
                    <td>
                      <textarea className="tcs-cell-seamless" placeholder="One step per line" value={(newRowDraft.test_steps || []).join("\n")}
                        onChange={e => onNewRowDraftChange({ ...newRowDraft, test_steps: e.target.value.split("\n") })} rows={4} />
                    </td>
                    <td>
                      <textarea className="tcs-cell-seamless" placeholder="Data" value={newRowDraft.test_data || ""}
                        onChange={e => onNewRowDraftChange({ ...newRowDraft, test_data: e.target.value })} rows={2} />
                    </td>
                    <td>
                      <textarea className="tcs-cell-seamless" placeholder="Expected Result" value={newRowDraft.expected_result || ""}
                        onChange={e => onNewRowDraftChange({ ...newRowDraft, expected_result: e.target.value })} rows={2} />
                    </td>
                    <td>
                      <select className="tcs-cell-seamless tcs-cell-seamless-select" value={newRowDraft.priority || "Medium"}
                        onChange={e => onNewRowDraftChange({ ...newRowDraft, priority: e.target.value })}>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </td>
                    <td>-</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <button className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={onAddNewRow} disabled={isCreatingRow}>Save</button>
                        <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={onCancelAddRow}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}

                {testCases.map((tc: StudioTestCaseItem, idx: number) => {
                  const draft = draftTestCases[tc.id] || {};
                  const currentTC = { ...tc, ...draft };

                  return (
                    <tr
                      key={tc.id}
                      className={isGlobalEditing ? "tcs-row-editing" : ""}
                    >
                      <td>
                        <div title={currentTC.feature_name || currentTC.module_name || currentTC.requirement_title || "-"}>
                          {currentTC.feature_name || currentTC.module_name || currentTC.requirement_title || "-"}
                        </div>
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
                            onChange={e => onDraftChange(tc.id, "title", e.target.value)} />
                        ) : <span style={{ fontWeight: 500 }}>{currentTC.title}</span>}
                      </td>

                      {/* Preconditions */}
                      <td>
                        {isGlobalEditing ? (
                          <textarea className="tcs-cell-seamless" value={currentTC.preconditions || ""} rows={2}
                            onChange={e => onDraftChange(tc.id, "preconditions", e.target.value)} />
                        ) : currentTC.preconditions || <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </td>

                      {/* Test Steps */}
                      <td>
                        {isGlobalEditing ? (
                          <textarea className="tcs-cell-seamless" value={(currentTC.test_steps || []).join("\n")} rows={4}
                            onChange={e => onDraftChange(tc.id, "test_steps", e.target.value.split("\n"))}
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
                            onChange={e => onDraftChange(tc.id, "test_data", e.target.value)} />
                        ) : currentTC.test_data || <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </td>

                      {/* Expected Result */}
                      <td>
                        {isGlobalEditing ? (
                          <textarea className="tcs-cell-seamless" value={currentTC.expected_result || ""} rows={2}
                            onChange={e => onDraftChange(tc.id, "expected_result", e.target.value)} />
                        ) : currentTC.expected_result || <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </td>

                      {/* Priority */}
                      <td>
                        {isGlobalEditing ? (
                          <select className="tcs-cell-seamless tcs-cell-seamless-select" value={currentTC.priority || "Medium"}
                            onChange={e => onDraftChange(tc.id, "priority", e.target.value)}>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        ) : <PriorityBadge priority={currentTC.priority} />}
                      </td>

                      {/* Execution */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <select
                            className="tcs-dropdown"
                            value={currentTC.execution_status || "Untested"}
                            onChange={(e) => onExecutionStatusChange(tc, e.target.value)}
                            style={{
                              fontWeight: 600,
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid var(--border)",
                              background: "var(--bg)",
                              cursor: "pointer",
                              color: currentTC.execution_status === "Pass" ? "var(--success)" :
                                     currentTC.execution_status === "Fail" ? "var(--danger)" :
                                     currentTC.execution_status === "Blocked" ? "var(--warning)" : "var(--text-muted)"
                            }}
                          >
                            <option value="Untested">Untested</option>
                            <option value="Pass">Pass</option>
                            <option value="Fail">Fail</option>
                            <option value="Blocked">Blocked</option>
                          </select>
                          {currentTC.execution_status === "Fail" && (
                            <button
                              onClick={() => onOpenBugReportDrawer(currentTC as StudioTestCaseItem)}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                width: "26px", height: "26px", borderRadius: "6px",
                                border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
                                background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                                color: "var(--danger)", cursor: "pointer"
                              }}
                              title="View/Edit Bug Report"
                            >
                              <AlertCircleIcon />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Note */}
                      <td>
                        {isGlobalEditing ? (
                          <textarea className="tcs-cell-seamless" value={currentTC.note || ""} rows={2}
                            onChange={e => onDraftChange(tc.id, "note", e.target.value)}
                            placeholder="Add a note..." />
                        ) : (
                          <span style={{ fontSize: "12px", color: currentTC.note ? "var(--text-secondary)" : "var(--text-muted)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {currentTC.note || "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Edit Bar (always visible at bottom when editing) */}
      {isGlobalEditing && (
        <div className="tcs-edit-floating-bar">
          <div className="tcs-edit-floating-left">
            <div className="tcs-edit-banner-dot" />
            <span style={{ fontWeight: 600, fontSize: "13px" }}>Editing</span>
            <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
              {Object.keys(draftTestCases).length > 0
                ? `${Object.keys(draftTestCases).length} modified`
                : "No changes yet"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="tcs-edit-btn-cancel" onClick={onCancelGlobalEditing} disabled={isBulkSaving}>
              <XIcon /> Discard
            </button>
            <button className="tcs-edit-btn-save" onClick={onSaveBulkEditing} disabled={isBulkSaving}>
              {isBulkSaving ? <SpinnerIcon /> : <CheckIcon />}
              {isBulkSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
