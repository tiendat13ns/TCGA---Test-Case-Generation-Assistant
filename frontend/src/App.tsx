import "./styles.css";
import { useState } from "react";
import DocumentList from "./components/DocumentList";
import DocumentUpload from "./components/DocumentUpload";

export type DocumentItem = {
  id: string;
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

/* ── Nav Icon ─────────────────────────────────────────────── */
function TCGAMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
    </svg>
  );
}

function App() {
  const [newUploadedDocuments, setNewUploadedDocuments] = useState<DocumentItem[]>([]);

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
      </nav>

      {/* Main */}
      <main className="app-main">
        <DocumentUpload onUploadSuccess={setNewUploadedDocuments} />
        <DocumentList newUploadedDocuments={newUploadedDocuments} />
      </main>
    </div>
  );
}

export default App;
