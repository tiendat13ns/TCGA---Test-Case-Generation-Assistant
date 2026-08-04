import { useState, useMemo } from "react";
import { useAdminStats, useAdminUsers, useUpdateUserCredits, AdminUser } from "../hooks/useAdmin";
import {
  Users,
  FolderGit2,
  FileText,
  CheckSquare,
  Search,
  ShieldCheck,
  Edit3,
  Save,
  X,
  RefreshCw,
  Zap,
  Download,
  PlusCircle,
  TrendingUp,
  UserCheck,
  Sparkles,
  Filter,
  Activity,
  CheckCircle2,
} from "lucide-react";

type RoleFilter = "all" | "admin" | "user";
type SortOption = "created_desc" | "credit_desc" | "projects_desc" | "test_cases_desc";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrObj, refetch: refetchStats } = useAdminStats();
  const { data: users = [], isLoading: usersLoading, isError: usersError, error: usersErrObj, refetch: refetchUsers } = useAdminUsers();
  const updateCreditsMutation = useUpdateUserCredits();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created_desc");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editCreditValue, setEditCreditValue] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleRefresh = () => {
    refetchStats();
    refetchUsers();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStartEdit = (user: AdminUser) => {
    setEditingUserId(user.id);
    setEditCreditValue(user.credit_balance);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  const handleSaveCredit = async (userId: string, targetEmail: string) => {
    try {
      await updateCreditsMutation.mutateAsync({ userId, credit_balance: editCreditValue });
      setEditingUserId(null);
      showToast(`Đã cập nhật credit cho ${targetEmail} thành ${editCreditValue}`);
    } catch (err: any) {
      alert(err.message || "Cập nhật credit thất bại");
    }
  };

  const handleQuickAddCredit = async (user: AdminUser, amount: number) => {
    const newCredit = (user.credit_balance || 0) + amount;
    try {
      await updateCreditsMutation.mutateAsync({ userId: user.id, credit_balance: newCredit });
      showToast(`Đã cộng +${amount} credits cho ${user.email} (Tổng: ${newCredit})`);
    } catch (err: any) {
      alert(err.message || "Cộng credit thất bại");
    }
  };

  const handleExportCSV = () => {
    if (!users.length) return;
    const headers = ["ID", "Email", "Role", "Credit Balance", "Projects", "Requirements", "Test Cases", "Created At"];
    const rows = users.map((u) => [
      u.id,
      u.email,
      u.role,
      u.credit_balance,
      u.projects_count,
      u.requirements_count,
      u.test_cases_count,
      u.created_at || "",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tcga_admin_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and sort users
  const processedUsers = useMemo(() => {
    let result = users.filter((u) => {
      const matchSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === "all" ? true : u.role === roleFilter;
      return matchSearch && matchRole;
    });

    result.sort((a, b) => {
      if (sortBy === "credit_desc") return b.credit_balance - a.credit_balance;
      if (sortBy === "projects_desc") return b.projects_count - a.projects_count;
      if (sortBy === "test_cases_desc") return b.test_cases_count - a.test_cases_count;
      // Default: created_desc
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [users, searchQuery, roleFilter, sortBy]);

  const adminUsersCount = useMemo(() => users.filter((u) => u.role === "admin").length, [users]);
  const regularUsersCount = useMemo(() => users.filter((u) => u.role !== "admin").length, [users]);

  const isLoading = statsLoading || usersLoading;
  const isError = statsError || usersError;
  const errorMessage = (statsErrObj as Error)?.message || (usersErrObj as Error)?.message || "Đã xảy ra lỗi khi tải dữ liệu Admin.";

  if (isLoading) {
    return (
      <div className="tcs-view" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "450px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", color: "var(--text-muted)" }}>
          <Sparkles className="animate-spin" size={28} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: "14px", fontWeight: 500 }}>Đang kết nối trung tâm quản trị Admin HQ...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="tcs-view" style={{ padding: "32px" }}>
        <div style={{ padding: "24px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "12px", color: "#ef4444" }}>
          <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "6px" }}>⚠️ Không thể tải dữ liệu Admin Dashboard</div>
          <p style={{ margin: 0, fontSize: "13px" }}>{errorMessage}</p>
          <div style={{ marginTop: "16px" }}>
            <button className="btn btn-secondary" onClick={handleRefresh}>
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tcs-view" style={{ height: "100%", overflowY: "auto", position: "relative" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--accent)",
            boxShadow: "var(--shadow-elevated)",
            borderRadius: "8px",
            padding: "12px 18px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            fontWeight: 500,
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <CheckCircle2 size={16} style={{ color: "var(--accent)" }} />
          {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div
        className="tcs-view-header"
        style={{
          padding: "26px 32px",
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
                background: "linear-gradient(135deg, var(--accent-glow) 0%, rgba(139, 105, 20, 0.25) 100%)",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(139, 105, 20, 0.15)",
              }}
            >
              <ShieldCheck size={26} />
            </div>
            <div>
              <div style={{ fontSize: "22px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                Admin Control Center
                <span className="badge badge-accent" style={{ fontSize: "11px", letterSpacing: "0.5px", padding: "4px 8px" }}>
                  ADMIN HQ
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>Quản lý hệ thống người dùng, phân quyền & cấp phát Credit real-time</span>
                <span style={{ color: "#10b981", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} /> Live DB Connected
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button className="btn btn-secondary" onClick={handleExportCSV} title="Xuất báo cáo CSV">
              <Download size={14} /> Xuất Báo cáo CSV
            </button>
            <button className="btn btn-primary" onClick={handleRefresh} title="Làm mới dữ liệu">
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>
        </div>
      </div>

      <div className="tcs-view-body" style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* Metric KPI Cards */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
            {/* Card 1: Users */}
            <div
              className="card"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Người dùng Hệ thống
                </span>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={20} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800 }}>{stats.total_users}</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  ({adminUsersCount} Admins, {regularUsersCount} Users)
                </span>
              </div>
            </div>

            {/* Card 2: Projects */}
            <div
              className="card"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Tổng Projects
                </span>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FolderGit2 size={20} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800 }}>{stats.total_projects}</span>
                <span style={{ fontSize: "12px", color: "#10b981", display: "flex", alignItems: "center", gap: "3px" }}>
                  <Activity size={12} /> Active Workspaces
                </span>
              </div>
            </div>

            {/* Card 3: Requirements */}
            <div
              className="card"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Yêu cầu (Requirements)
                </span>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={20} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800 }}>{stats.total_requirements}</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  SRS Items Extracted
                </span>
              </div>
            </div>

            {/* Card 4: Test Cases */}
            <div
              className="card"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Test Cases AI
                </span>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckSquare size={20} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800 }}>{stats.total_test_cases}</span>
                <span style={{ fontSize: "12px", color: "var(--warning)", display: "flex", alignItems: "center", gap: "3px" }}>
                  <Sparkles size={12} /> AI Generated
                </span>
              </div>
            </div>
          </div>
        )}

        {/* User Management Section */}
        <div className="card" style={{ padding: "24px", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Controls Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <UserCheck size={18} style={{ color: "var(--accent)" }} />
                Danh sách Người dùng & Quyền hạn
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                Hiển thị {processedUsers.length} / {users.length} tài khoản trong hệ thống
              </p>
            </div>

            {/* Filters, Search & Sort */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {/* Role Filter Chips (Matching background theme & pill shape) */}
              <div style={{ display: "inline-flex", background: "var(--bg-surface)", padding: "3px", borderRadius: "20px", border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  style={{
                    height: "30px",
                    padding: "0 14px",
                    fontSize: "12px",
                    fontWeight: roleFilter === "all" ? 600 : 500,
                    borderRadius: "16px",
                    border: "none",
                    background: roleFilter === "all" ? "var(--accent)" : "transparent",
                    color: roleFilter === "all" ? "#ffffff" : "var(--text-secondary)",
                    boxShadow: roleFilter === "all" ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                    cursor: "pointer",
                    transition: "all var(--transition)",
                  }}
                  onClick={() => setRoleFilter("all")}
                >
                  Tất cả ({users.length})
                </button>
                <button
                  type="button"
                  style={{
                    height: "30px",
                    padding: "0 14px",
                    fontSize: "12px",
                    fontWeight: roleFilter === "admin" ? 600 : 500,
                    borderRadius: "16px",
                    border: "none",
                    background: roleFilter === "admin" ? "var(--accent)" : "transparent",
                    color: roleFilter === "admin" ? "#ffffff" : "var(--text-secondary)",
                    boxShadow: roleFilter === "admin" ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                    cursor: "pointer",
                    transition: "all var(--transition)",
                  }}
                  onClick={() => setRoleFilter("admin")}
                >
                  Admin ({adminUsersCount})
                </button>
                <button
                  type="button"
                  style={{
                    height: "30px",
                    padding: "0 14px",
                    fontSize: "12px",
                    fontWeight: roleFilter === "user" ? 600 : 500,
                    borderRadius: "16px",
                    border: "none",
                    background: roleFilter === "user" ? "var(--accent)" : "transparent",
                    color: roleFilter === "user" ? "#ffffff" : "var(--text-secondary)",
                    boxShadow: roleFilter === "user" ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                    cursor: "pointer",
                    transition: "all var(--transition)",
                  }}
                  onClick={() => setRoleFilter("user")}
                >
                  Users ({regularUsersCount})
                </button>
              </div>

              {/* Sort Dropdown (Pill shape, matching background theme) */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Filter size={14} style={{ color: "var(--text-secondary)" }} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  style={{
                    height: "36px",
                    fontSize: "12px",
                    fontWeight: 500,
                    padding: "0 14px",
                    borderRadius: "20px",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="created_desc" style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>Mới đăng ký nhất</option>
                  <option value="credit_desc" style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>Credit (Cao -&gt; Thấp)</option>
                  <option value="projects_desc" style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>Nhiều Projects nhất</option>
                  <option value="test_cases_desc" style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>Nhiều Test Cases nhất</option>
                </select>
              </div>

              {/* Search Box (Pill shape, matching background theme) */}
              <div style={{ position: "relative", width: "240px" }}>
                <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", display: "flex", pointerEvents: "none" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Tìm kiếm email..."
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
          </div>

          {/* User Table */}
          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "14px 16px", fontWeight: 600 }}>Người dùng</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600 }}>Vai trò</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600 }}>Số dư Credit</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, textAlign: "center" }}>Projects</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, textAlign: "center" }}>Requirements</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, textAlign: "center" }}>Test Cases</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600 }}>Ngày khởi tạo</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, textAlign: "right" }}>Thao tác Admin</th>
                </tr>
              </thead>
              <tbody>
                {processedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)" }}>
                      <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔍</div>
                      Không tìm thấy người dùng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  processedUsers.map((u) => {
                    const isAdmin = u.role === "admin";
                    const isEditing = editingUserId === u.id;
                    const isUpdatingThisUser = updateCreditsMutation.isPending && updateCreditsMutation.variables?.userId === u.id;

                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: "1px solid var(--border-soft)",
                          transition: "background var(--transition)",
                        }}
                        className="table-row-hover"
                      >
                        {/* User Email & Avatar */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: isAdmin
                                  ? "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)"
                                  : "var(--bg-elevated)",
                                color: isAdmin ? "#fff" : "var(--text-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "14px",
                                border: "1px solid var(--border)",
                                boxShadow: isAdmin ? "0 2px 6px rgba(139, 105, 20, 0.25)" : "none",
                              }}
                            >
                              {u.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{u.email}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                {u.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td style={{ padding: "14px 16px" }}>
                          {isAdmin ? (
                            <span className="badge badge-accent" style={{ fontSize: "11px", fontWeight: 700 }}>
                              🛡️ ADMIN
                            </span>
                          ) : (
                            <span className="badge" style={{ fontSize: "11px", background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                              👤 USER
                            </span>
                          )}
                        </td>

                        {/* Credit Balance */}
                        <td style={{ padding: "14px 16px" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <input
                                type="number"
                                className="input"
                                value={editCreditValue}
                                onChange={(e) => setEditCreditValue(parseInt(e.target.value) || 0)}
                                style={{ width: "100px", height: "32px", fontSize: "13px", padding: "0 8px" }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 700 }}>
                                <Zap size={14} style={{ color: "var(--warning)" }} />
                                {isAdmin ? (
                                  <span style={{ color: "var(--accent)", fontStyle: "italic", fontSize: "13px" }}>Vô hạn (∞)</span>
                                ) : (
                                  <span style={{ fontSize: "14px", color: u.credit_balance < 20 ? "var(--danger)" : "var(--text-primary)" }}>
                                    {u.credit_balance}
                                  </span>
                                )}
                              </div>

                              {/* Quick add credit buttons for non-admins */}
                              {!isAdmin && (
                                <div style={{ display: "flex", gap: "4px", marginLeft: "4px" }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ height: "22px", padding: "0 6px", fontSize: "11px", color: "var(--accent)" }}
                                    onClick={() => handleQuickAddCredit(u, 50)}
                                    title="Cộng nhanh +50 Credits"
                                  >
                                    +50
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ height: "22px", padding: "0 6px", fontSize: "11px", color: "var(--accent)" }}
                                    onClick={() => handleQuickAddCredit(u, 100)}
                                    title="Cộng nhanh +100 Credits"
                                  >
                                    +100
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ height: "22px", padding: "0 6px", fontSize: "11px", color: "var(--accent)" }}
                                    onClick={() => handleQuickAddCredit(u, 500)}
                                    title="Cộng nhanh +500 Credits"
                                  >
                                    +500
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Projects */}
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <span style={{ fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "var(--bg-surface)" }}>
                            {u.projects_count}
                          </span>
                        </td>

                        {/* Requirements */}
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <span style={{ fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "var(--bg-surface)" }}>
                            {u.requirements_count}
                          </span>
                        </td>

                        {/* Test Cases */}
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <span style={{ fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "var(--bg-surface)" }}>
                            {u.test_cases_count}
                          </span>
                        </td>

                        {/* Registration Date */}
                        <td style={{ padding: "14px 16px", color: "var(--text-muted)", fontSize: "12px" }}>
                          {u.created_at ? new Date(u.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "N/A"}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                              <button
                                className="btn btn-primary"
                                style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                                onClick={() => handleSaveCredit(u.id, u.email)}
                                disabled={isUpdatingThisUser}
                              >
                                <Save size={12} /> {isUpdatingThisUser ? "Đang lưu..." : "Lưu"}
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ height: "30px", padding: "0 8px", fontSize: "12px" }}
                                onClick={handleCancelEdit}
                                disabled={isUpdatingThisUser}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                              onClick={() => handleStartEdit(u)}
                              title="Sửa số dư Credit"
                            >
                              <Edit3 size={12} /> Sửa Credit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
