import { useMemo } from "react";
import { useProjects } from "../hooks/useProjects";
import { useUsageSummary } from "../hooks/useUsage";
import { useAuth } from "../contexts/AuthContext";
import {
  FolderGit2,
  FileText,
  CheckSquare,
  Zap,
  Clock,
  ArrowRight,
  Sparkles,
  Plus,
  ChevronRight,
  FolderOpen,
  Layers,
  Flame,
  Search,
  X,
} from "lucide-react";

import { useState } from "react";

type OverviewDashboardProps = {
  onNavigateToProjects: () => void;
  onSelectProject: (projectId: string) => void;
  onNavigateToTestCases: (projectId?: string) => void;
};

// Helper: Calculate relative time display (vi-VN)
function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return "Không rõ";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 172800) return "Hôm qua";
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;

  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function OverviewDashboard({
  onNavigateToProjects,
  onSelectProject,
  onNavigateToTestCases,
}: OverviewDashboardProps) {
  const { user } = useAuth();
  const { data: projects = [], isLoading: projectsLoading, isError: projectsError } = useProjects();
  const { data: usageSummary } = useUsageSummary();
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = user?.role === "admin";

  // Compute aggregated stats
  const totalProjects = projects.length;
  const totalRequirements = useMemo(
    () => projects.reduce((acc, p) => acc + (p.req_count || 0), 0),
    [projects]
  );
  const totalTestCases = useMemo(
    () => projects.reduce((acc, p) => acc + (p.test_case_count || 0), 0),
    [projects]
  );

  // Projects sorted by creation time: Newest -> Oldest
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [projects]);

  // Filtered projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return sortedProjects;
    return sortedProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [sortedProjects, searchQuery]);

  // Get Last Used Project from localStorage or default to newest project
  const lastUsedProject = useMemo(() => {
    const lastId = localStorage.getItem("tcga_last_project_id");
    if (lastId) {
      const found = projects.find((p) => p.id === lastId);
      if (found) return found;
    }
    return sortedProjects.length > 0 ? sortedProjects[0] : null;
  }, [projects, sortedProjects]);

  // Get Last Used Tester Studio Project from localStorage
  const lastUsedTesterStudioProject = useMemo(() => {
    const lastTesterProjectId = localStorage.getItem("tcga_last_tester_project_id");
    if (lastTesterProjectId) {
      const found = projects.find((p) => p.id === lastTesterProjectId);
      if (found) return found;
    }
    return lastUsedProject;
  }, [projects, lastUsedProject]);

  if (projectsLoading) {
    return (
      <div className="tcs-view" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "450px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", color: "var(--text-muted)" }}>
          <Sparkles className="animate-spin" size={28} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: "14px", fontWeight: 500 }}>Đang chuẩn bị không gian làm việc Overview...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tcs-view" style={{ height: "100%", overflowY: "auto" }}>
      {/* Header Banner */}
      <div
        className="tcs-view-header"
        style={{
          padding: "28px 32px",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(180deg, var(--bg-surface) 0%, var(--bg) 100%)",
        }}
      >
        <div className="tcs-view-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div className="tcs-title" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, var(--accent-glow) 0%, rgba(139, 105, 20, 0.2) 100%)",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(139, 105, 20, 0.12)",
              }}
            >
              <Layers size={24} />
            </div>
            <div>
              <div style={{ fontSize: "22px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                Tổng quan Hệ thống
                <span className="badge badge-accent" style={{ fontSize: "11px", letterSpacing: "0.5px", padding: "4px 8px" }}>
                  TCGA Workspace
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px" }}>
                Theo dõi toàn bộ dự án, yêu cầu chức năng, kịch bản test và lối tắt truy cập nhanh
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button className="btn btn-primary" onClick={onNavigateToProjects} style={{ height: "38px", padding: "0 16px" }}>
              <Plus size={16} /> Tạo Project mới
            </button>
          </div>
        </div>
      </div>

      <div className="tcs-view-body" style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "32px" }}>
        {/* Section 1: Quick Resume (Lối tắt Lần cuối sử dụng) */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <Clock size={16} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>
              Tiếp tục công việc (Lần cuối sử dụng)
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px" }}>
            {/* Card 1: Last Used Project */}
            <div
              className="card"
              style={{
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid var(--accent-glow-strong)",
                background: "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: "var(--shadow-card)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, right: 0, width: "120px", height: "120px", background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)", pointerEvents: "none" }} />
              
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="badge badge-accent" style={{ fontSize: "11px", fontWeight: 600 }}>
                    PROJECT GẦN ĐÂY
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={12} /> {formatRelativeTime(lastUsedProject?.updated_at || lastUsedProject?.created_at)}
                  </span>
                </div>

                {lastUsedProject ? (
                  <>
                    <h4 style={{ fontSize: "17px", fontWeight: 700, margin: "4px 0", color: "var(--text-primary)" }}>
                      {lastUsedProject.name}
                    </h4>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0, lineClamp: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {lastUsedProject.description || "Không có mô tả dự án"}
                    </p>

                    <div style={{ display: "flex", gap: "16px", marginTop: "14px", fontSize: "12px", color: "var(--text-secondary)" }}>
                      <span>📄 <strong>{lastUsedProject.file_count || 0}</strong> tài liệu</span>
                      <span>📋 <strong>{lastUsedProject.req_count || 0}</strong> yêu cầu</span>
                      <span>🧪 <strong>{lastUsedProject.test_case_count || 0}</strong> test case</span>
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Chưa có project nào trong tài khoản.</p>
                )}
              </div>

              <div>
                {lastUsedProject ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", justifyContent: "center", height: "36px", fontSize: "13px" }}
                    onClick={() => onSelectProject(lastUsedProject.id)}
                  >
                    <FolderOpen size={14} /> Mở Project Này <ArrowRight size={14} />
                  </button>
                ) : (
                  <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={onNavigateToProjects}>
                    <Plus size={14} /> Tạo Project Đầu Tiên
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: Last Used Tester Studio */}
            <div
              className="card"
              style={{
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span className="badge" style={{ fontSize: "11px", fontWeight: 600, background: "rgba(99, 102, 241, 0.12)", color: "#6366f1" }}>
                    TESTER STUDIO SESSIONS
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Sparkles size={12} style={{ color: "var(--warning)" }} /> AI Generator
                  </span>
                </div>

                <h4 style={{ fontSize: "17px", fontWeight: 700, margin: "4px 0", color: "var(--text-primary)" }}>
                  {lastUsedTesterStudioProject ? lastUsedTesterStudioProject.name : "Tester Studio Workspace"}
                </h4>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                  Sinh kịch bản test tự động, tinh chỉnh Human-in-the-Loop và xuất file Excel/Jira.
                </p>

                <div style={{ display: "flex", gap: "16px", marginTop: "14px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  <span>Kịch bản kiểm thử: <strong>{totalTestCases}</strong> cases</span>
                </div>
              </div>

              <div>
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "center", height: "36px", fontSize: "13px" }}
                  onClick={() => onNavigateToTestCases(lastUsedTesterStudioProject?.id)}
                >
                  <CheckSquare size={14} style={{ color: "var(--accent)" }} /> Mở Tester Studio <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Aggregated Metrics Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
          {/* Total Projects */}
          <div className="card" style={{ padding: "20px", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FolderGit2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Projects</div>
              <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "2px" }}>{totalProjects}</div>
            </div>
          </div>

          {/* Total Requirements */}
          <div className="card" style={{ padding: "20px", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Requirements</div>
              <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "2px" }}>{totalRequirements}</div>
            </div>
          </div>

          {/* Total Test Cases */}
          <div className="card" style={{ padding: "20px", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckSquare size={22} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Test Cases</div>
              <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "2px" }}>{totalTestCases}</div>
            </div>
          </div>

          {/* Credit Balance */}
          <div className="card" style={{ padding: "20px", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(139, 105, 20, 0.15)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Credit Balance</div>
              <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "2px", color: "var(--accent)" }}>
                {isAdmin ? "Unlimited (∞)" : (usageSummary?.credit_balance ?? user?.credit_balance ?? 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Featured Projects Timeline (Mới nhất -> Xa nhất) */}
        <div className="card" style={{ padding: "24px", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Flame size={18} style={{ color: "var(--accent)" }} />
                Danh sách Projects (Thời gian tạo mới nhất &rarr; Xa nhất)
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                Hiển thị tất cả dự án được sắp xếp theo thời gian khởi tạo giảm dần
              </p>
            </div>

            {/* Search Box (Styled matching DocumentContextSidebar / Work with Agent) */}
            <div style={{ position: "relative", width: "260px" }}>
              <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", display: "flex", pointerEvents: "none" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                type="text"
                className="input"
                placeholder="Lọc dự án..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "8px 30px 8px 34px",
                  borderRadius: "20px",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

          </div>

          {filteredProjects.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>📁</div>
              <div style={{ fontSize: "15px", fontWeight: 600 }}>Không tìm thấy dự án nào</div>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>Hãy tạo project mới để bắt đầu trích xuất yêu cầu và tạo kịch bản test.</p>
              <button className="btn btn-primary" style={{ marginTop: "12px" }} onClick={onNavigateToProjects}>
                <Plus size={14} /> Tạo Project
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
              {filteredProjects.map((p, idx) => {
                const isNewest = idx === 0;

                return (
                  <div
                    key={p.id}
                    className="card table-row-hover"
                    style={{
                      padding: "20px",
                      borderRadius: "10px",
                      border: isNewest ? "1px solid var(--accent)" : "1px solid var(--border-soft)",
                      background: "var(--bg-elevated)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "16px",
                      position: "relative",
                      transition: "all var(--transition)",
                    }}
                  >
                    {isNewest && (
                      <div
                        style={{
                          position: "absolute",
                          top: "-10px",
                          right: "16px",
                          background: "var(--accent)",
                          color: "#fff",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          letterSpacing: "0.5px",
                          boxShadow: "0 2px 6px rgba(139, 105, 20, 0.3)",
                        }}
                      >
                        NEWEST PROJECT
                      </div>
                    )}

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                        <h4 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                          {p.name}
                        </h4>
                      </div>

                      <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                        <Clock size={12} />
                        <span>Tạo: {formatRelativeTime(p.created_at)}</span>
                      </div>

                      <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineClamp: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {p.description || "Không có mô tả chi tiết."}
                      </p>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "var(--bg-surface)", borderRadius: "6px", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                        <div>📄 Docs: <strong>{p.file_count || 0}</strong></div>
                        <div>📋 Req: <strong>{p.req_count || 0}</strong></div>
                        <div>🧪 Tests: <strong>{p.test_case_count || 0}</strong></div>
                      </div>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn btn-primary"
                          style={{ flex: 1, justifyContent: "center", height: "32px", fontSize: "12px" }}
                          onClick={() => onSelectProject(p.id)}
                        >
                          Mở Project
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ height: "32px", padding: "0 10px", fontSize: "12px" }}
                          onClick={() => onNavigateToTestCases(p.id)}
                          title="Mở Tester Studio với Project này"
                        >
                          <CheckSquare size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
