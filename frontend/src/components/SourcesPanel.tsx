import { useEffect, useState } from "react";
import type { DocumentItem } from "../App";
import DocumentUpload from "./DocumentUpload";

const API_V1_DOCUMENTS_URL = "http://localhost:8000/api/documents";

type SourcesPanelProps = {
  activeDocumentId: string | null;
  onSelectDocument: (id: string) => void;
};

const FileTextIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

export default function SourcesPanel({ activeDocumentId, onSelectDocument }: SourcesPanelProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      // we can fetch all for now
      const res = await fetch(`${API_V1_DOCUMENTS_URL}?limit=50`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      // Filter only active or uploaded
      setDocuments(data || []); // data is an array according to the API, not { documents: ... }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="sources-panel" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-header" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <h2 className="panel-title">Tài liệu</h2>
      </div>
      
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <DocumentUpload onUploadSuccess={(docs) => {
          fetchDocuments();
          if (docs && docs.length > 0) {
            onSelectDocument(docs[0].id);
          }
        }} />
      </div>

      <div className="sources-list" style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {isLoading ? (
          <div style={{ padding: "16px", color: "var(--text-muted)", fontSize: 13 }}>Đang tải...</div>
        ) : documents.length === 0 ? (
          <div style={{ padding: "16px", color: "var(--text-muted)", fontSize: 13 }}>Chưa có tài liệu nào</div>
        ) : (
          documents.map(doc => {
            const isActive = doc.id === activeDocumentId;
            return (
              <div 
                key={doc.id}
                onClick={() => onSelectDocument(doc.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: isActive ? "var(--bg-hover)" : "transparent",
                  border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                  marginBottom: "4px"
                }}
              >
                <div style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}>
                  <FileTextIcon />
                </div>
                <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px", color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                  {doc.original_filename}
                </div>
                {isActive && <div style={{ color: "var(--accent)" }}><CheckIcon /></div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
