import { useEffect, useState } from "react";

const API_V1_REQUIREMENTS_URL = "http://localhost:8000/api/v1/requirements";
const API_V1_TESTCASES_URL = "http://localhost:8000/api/v1/test-cases";

type StudioPanelProps = {
  documentId: string;
  refreshTick: number;
};

type RequirementItem = {
  id: string; title: string; description: string; status: string;
};

type TestCaseItem = {
  id: string; title: string; scenario: string | null; status: string; priority: string; requirement_id: string;
};

const FileTextIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

function StatusBadge({ status }: { status: string }) {
  let colorClass = "badge-uploaded"; 
  if (status === "draft" || status === "ai_generated") colorClass = "badge-processing"; 
  else if (status === "confirmed" || status === "completed") colorClass = "badge-completed"; 
  else if (status === "rejected" || status === "error") colorClass = "badge-error"; 
  
  return (
    <span className={`badge ${colorClass}`} style={{ marginLeft: "auto" }}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

export default function StudioPanel({ documentId, refreshTick }: StudioPanelProps) {
  const [activeTab, setActiveTab] = useState<"req" | "tc">("req");
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [testCases, setTestCases] = useState<TestCaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const reqRes = await fetch(`${API_V1_REQUIREMENTS_URL}?document_id=${documentId}&limit=100`);
        let reqData = { items: [] };
        if (reqRes.ok) {
          reqData = await reqRes.json();
          setRequirements(reqData.items || []);
        }

        // Fetch Test cases for all requirements of this document
        const tcs: TestCaseItem[] = [];
        for (const req of reqData.items || []) {
          const tcRes = await fetch(`${API_V1_TESTCASES_URL}?requirement_id=${req.id}&limit=50`);
          if (tcRes.ok) {
            const tcData = await tcRes.json();
            tcs.push(...(tcData.items || []));
          }
        }
        setTestCases(tcs);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [documentId, refreshTick]);

  const handleUpdateReqStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_V1_REQUIREMENTS_URL}/${id}/status?status=${newStatus}`, { method: "PUT" });
      if (res.ok) {
        setRequirements(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTcStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_V1_TESTCASES_URL}/${id}/status?status=${newStatus}`, { method: "PUT" });
      if (res.ok) {
        setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, status: newStatus } : tc));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="studio-panel" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-header" style={{ padding: "0", borderBottom: "1px solid var(--border)", display: "flex" }}>
        <button 
          onClick={() => setActiveTab("req")}
          style={{
            flex: 1, padding: "12px", background: "transparent", border: "none", cursor: "pointer",
            borderBottom: activeTab === "req" ? "2px solid var(--accent)" : "2px solid transparent",
            color: activeTab === "req" ? "var(--text-primary)" : "var(--text-secondary)",
            fontSize: "13px", fontWeight: 600
          }}
        >
          Requirements
        </button>
        <button 
          onClick={() => setActiveTab("tc")}
          style={{
            flex: 1, padding: "12px", background: "transparent", border: "none", cursor: "pointer",
            borderBottom: activeTab === "tc" ? "2px solid var(--accent)" : "2px solid transparent",
            color: activeTab === "tc" ? "var(--text-primary)" : "var(--text-secondary)",
            fontSize: "13px", fontWeight: 600
          }}
        >
          Test Cases
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {isLoading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Đang tải...</div>
        ) : activeTab === "req" ? (
          requirements.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Chưa có requirement nào.</div>
          ) : (
            requirements.map(req => (
              <div key={req.id} style={{
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px"
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ color: "var(--info)", marginTop: "2px" }}><FileTextIcon /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{req.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>{req.description}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
                  <StatusBadge status={req.status} />
                  <div style={{ display: "flex", gap: "8px", marginLeft: "12px" }}>
                    <button onClick={() => handleUpdateReqStatus(req.id, "confirmed")} style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}>Confirm</button>
                    <button onClick={() => handleUpdateReqStatus(req.id, "rejected")} style={{ background: "var(--danger-dim)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.12)", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}>Reject</button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          testCases.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Chưa có test case nào.</div>
          ) : (
            testCases.map(tc => (
              <div key={tc.id} style={{
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px"
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ color: "var(--accent)", marginTop: "2px" }}><CheckIcon /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{tc.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>{tc.scenario}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg)", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--border)" }}>{tc.priority}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <StatusBadge status={tc.status} />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleUpdateTcStatus(tc.id, "confirmed")} style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}>Confirm</button>
                      <button onClick={() => handleUpdateTcStatus(tc.id, "rejected")} style={{ background: "var(--danger-dim)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.12)", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}>Reject</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
