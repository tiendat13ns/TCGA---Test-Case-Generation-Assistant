import "./styles.css";
import { useState } from "react";
import SourcesPanel from "./components/SourcesPanel";
import ChatPanel from "./components/ChatPanel";
import StudioPanel from "./components/StudioPanel";

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
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [refreshStudioTick, setRefreshStudioTick] = useState(0);

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

      {/* Main 3-Column Layout */}
      <main className="app-main">
        {/* Left Column: Sources */}
        <div className="panel-col">
          <SourcesPanel 
            activeDocumentId={activeDocumentId} 
            onSelectDocument={setActiveDocumentId} 
          />
        </div>

        {/* Middle Column: Chat */}
        <div className="panel-col">
          {activeDocumentId ? (
            <ChatPanel 
              documentId={activeDocumentId} 
              onDataGenerated={() => setRefreshStudioTick(t => t + 1)}
            />
          ) : (
            <div className="empty-state">
              <p>Chọn một tài liệu ở cột trái để bắt đầu trò chuyện</p>
            </div>
          )}
        </div>

        {/* Right Column: Studio */}
        <div className="panel-col">
          {activeDocumentId ? (
            <StudioPanel 
              documentId={activeDocumentId} 
              refreshTick={refreshStudioTick} 
            />
          ) : (
            <div className="empty-state">
              <p>Chưa có dữ liệu</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
