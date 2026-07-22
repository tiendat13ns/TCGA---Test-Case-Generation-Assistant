import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { DocumentItem } from "../App";

const API_URL = "http://localhost:8000/api/documents";

type DocumentContextSidebarProps = {
  projectId: string;
  newUploadedDocuments: DocumentItem[];
  selectedDocumentIds: string[];
  onSelectionChange: (ids: string[]) => void;
};

type Filters = { filename: string; status: string; timeOrder: string };
const defaultFilters: Filters = { filename: "", status: "", timeOrder: "newest" };

const FileTextIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

export default function DocumentContextSidebar({
  projectId,
  newUploadedDocuments,
  selectedDocumentIds,
  onSelectionChange,
}: DocumentContextSidebarProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      setMessage("");
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

  const handleToggleSelection = (id: string) => {
    if (selectedDocumentIds.includes(id)) {
      onSelectionChange(selectedDocumentIds.filter((sel) => sel !== id));
    } else {
      onSelectionChange([...selectedDocumentIds, id]);
    }
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredDocuments.map((d) => d.id);
    const allSelected = allFilteredIds.every((id) => selectedDocumentIds.includes(id));
    if (allSelected) {
      // Deselect all filtered
      onSelectionChange(selectedDocumentIds.filter((id) => !allFilteredIds.includes(id)));
    } else {
      // Select all filtered
      const newSelections = new Set([...selectedDocumentIds, ...allFilteredIds]);
      onSelectionChange(Array.from(newSelections));
    }
  };

  return (
    <div className="panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div className="panel-header">
        <h2 className="panel-title">Nguồn tài liệu</h2>
        <div className="header-actions">
          <span className="badge badge-uploaded">{selectedDocumentIds.length} đã chọn</span>
        </div>
      </div>
      <div className="panel-body" style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <input
          type="text"
          className="input"
          placeholder="Tìm nguồn (File name)..."
          name="filename"
          value={filters.filename}
          onChange={(e) => setFilters({ ...filters, filename: e.target.value })}
          style={{ marginBottom: "12px", width: "100%" }}
        />

        {message && <div className="alert alert-error">{message}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-primary)" }}>
            <input
              type="checkbox"
              checked={
                filteredDocuments.length > 0 &&
                filteredDocuments.every((d) => selectedDocumentIds.includes(d.id))
              }
              onChange={handleSelectAll}
            />
            <span>Chọn tất cả</span>
          </label>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>Đang tải...</div>
        ) : filteredDocuments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>Không có tài liệu nào.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minHeight: 0, overflowY: "auto", paddingRight: "4px" }}>
            {filteredDocuments.map((doc) => (
              <label
                key={doc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: selectedDocumentIds.includes(doc.id) ? "var(--bg-active)" : "var(--bg-elevated)",
                  border: `1px solid ${selectedDocumentIds.includes(doc.id) ? "var(--accent)" : "var(--border)"}`,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedDocumentIds.includes(doc.id)}
                  onChange={() => handleToggleSelection(doc.id)}
                />
                <FileTextIcon />
                <span style={{ fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)" }}>
                  {doc.original_filename}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
