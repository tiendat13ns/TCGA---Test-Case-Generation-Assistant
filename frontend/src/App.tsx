import "./styles.css";
import { useEffect, useState } from "react";
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

/* ── Nav Icons ─────────────────────────────────────────────── */
function TCGAMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function App() {
  const [newUploadedDocuments, setNewUploadedDocuments] = useState<DocumentItem[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("tcga-theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("tcga-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

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
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
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
