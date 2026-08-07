function BookOpenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export default function TutorialPlaceholder() {
  return (
    <div className="tcs-view">
      <div className="tcs-view-header">
        <div className="tcs-view-title-row">
          <div className="tcs-title">
            <div className="tcs-title-icon" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
              <BookOpenIcon />
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 600 }}>Tutorials</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px" }}>
                User guide and prompt engineering documentation
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="tcs-view-body" style={{ padding: "32px" }}>
        <div className="workspace-empty" style={{ marginTop: "48px" }}>
          <div className="workspace-empty-icon">📖</div>
          <div className="workspace-empty-title">Tutorials</div>
          <div className="workspace-empty-body">
            Hướng dẫn sử dụng và Prompt engineering sẽ được cập nhật tại đây.
          </div>
        </div>
      </div>
    </div>
  );
}
