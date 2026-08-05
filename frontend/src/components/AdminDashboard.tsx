import { useState, useMemo, useRef, useEffect } from "react";
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
  Grid,
  ChevronDown,
  Check,
} from "lucide-react";

type RoleFilter = "all" | "admin" | "user";
type SortOption = "created_desc" | "credit_desc" | "projects_desc" | "test_cases_desc";

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "created_desc", label: "Mới đăng ký nhất" },
  { id: "credit_desc", label: "Credit (Cao → Thấp)" },
  { id: "projects_desc", label: "Nhiều Projects nhất" },
  { id: "test_cases_desc", label: "Nhiều Test Cases nhất" },
];

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrObj, refetch: refetchStats } = useAdminStats();
  const { data: users = [], isLoading: usersLoading, isError: usersError, error: usersErrObj, refetch: refetchUsers } = useAdminUsers();
  const updateCreditsMutation = useUpdateUserCredits();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created_desc");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editCreditValue, setEditCreditValue] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const headers = ["ID", "Email", "Role", "Plan", "Credit Balance", "Projects", "Requirements", "Test Cases", "Created At"];
    const rows = users.map((u) => {
      const userPlan = u.plan || (u.role === "admin" || u.credit_balance >= 2000 ? "Pro Plan" : u.credit_balance >= 600 ? "Lite Plan" : "Free Plan");
      return [
        u.id,
        u.email,
        u.role,
        userPlan,
        u.credit_balance,
        u.projects_count,
        u.requirements_count,
        u.test_cases_count,
        u.created_at || "",
      ];
    });
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
          <Sparkles className="animate-spin" size={24} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: "14px", fontWeight: 500 }}>Đang kết nối Admin Control Center...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="tcs-view" style={{ padding: "32px" }}>
        <div style={{ padding: "24px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--danger)" }}>
          <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "6px" }}>Không thể tải dữ liệu Admin Dashboard</div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>{errorMessage}</p>
          <div style={{ marginTop: "16px" }}>
            <button className="btn btn-secondary" onClick={handleRefresh}>
              <RefreshCw size={14} strokeWidth={1.75} /> Thử lại
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
          }}
        >
          <CheckCircle2 size={16} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
          {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div
        className="tcs-view-header"
        style={{
          padding: "24px 32px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <div className="tcs-view-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div className="tcs-title" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Unified Line Icon matching Menu Sidebar */}
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "8px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={20} strokeWidth={1.75} />
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                Admin Control Center
                <span className="badge" style={{ fontSize: "11px", letterSpacing: "0.5px", padding: "3px 8px", background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--border-soft)" }}>
                  ADMIN HQ
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button className="btn btn-secondary" onClick={handleExportCSV} title="Xuất báo cáo CSV">
              <Download size={14} strokeWidth={1.75} /> Xuất Báo cáo CSV
            </button>
            <button className="btn btn-primary" onClick={handleRefresh} title="Làm mới dữ liệu">
              <RefreshCw size={14} strokeWidth={2} /> Làm mới
            </button>
          </div>
        </div>
      </div>

      <div className="tcs-view-body" style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* Metric KPI Cards (Unified Line Icons Matching Menu Sidebar) */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
            {/* Card 1: Users */}
            <div
              className="card"
              style={{
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Người dùng Hệ thống
                </span>
                <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={20} strokeWidth={1.75} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-primary)" }}>{stats.total_users}</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  ({adminUsersCount} Admins, {regularUsersCount} Users)
                </span>
              </div>
            </div>

            {/* Card 2: Projects */}
            <div
              className="card"
              style={{
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Tổng Projects
                </span>
                <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Grid size={20} strokeWidth={1.75} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-primary)" }}>{stats.total_projects}</span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "3px" }}>
                  <Activity size={12} strokeWidth={1.75} /> Workspaces
                </span>
              </div>
            </div>

            {/* Card 3: Requirements */}
            <div
              className="card"
              style={{
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Yêu cầu (Requirements)
                </span>
                <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={20} strokeWidth={1.75} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-primary)" }}>{stats.total_requirements}</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  SRS Items Extracted
                </span>
              </div>
            </div>

            {/* Card 4: Test Cases */}
            <div
              className="card"
              style={{
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Test Cases AI
                </span>
                <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckSquare size={20} strokeWidth={1.75} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-primary)" }}>{stats.total_test_cases}</span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "3px" }}>
                  <Sparkles size={12} strokeWidth={1.75} /> AI Generated
                </span>
              </div>
            </div>
          </div>
        )}

        {/* User Management Section */}
        <div className="card" style={{ padding: "24px", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Controls Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}>
                <UserCheck size={18} strokeWidth={1.75} style={{ color: "var(--text-primary)" }} />
                Danh sách Người dùng & Quyền hạn
              </h3>
            </div>

            {/* Filters, Search & Custom Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {/* Role Filter Chips (Segmented Pill) */}
              <div style={{ display: "inline-flex", background: "var(--bg-elevated)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  style={{
                    height: "30px",
                    padding: "0 14px",
                    fontSize: "12px",
                    fontWeight: roleFilter === "all" ? 600 : 500,
                    borderRadius: "6px",
                    border: "none",
                    background: roleFilter === "all" ? "var(--accent)" : "transparent",
                    color: roleFilter === "all" ? "#ffffff" : "var(--text-secondary)",
                    boxShadow: roleFilter === "all" ? "0 2px 6px rgba(139, 105, 20, 0.25)" : "none",
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
                    borderRadius: "6px",
                    border: "none",
                    background: roleFilter === "admin" ? "var(--accent)" : "transparent",
                    color: roleFilter === "admin" ? "#ffffff" : "var(--text-secondary)",
                    boxShadow: roleFilter === "admin" ? "0 2px 6px rgba(139, 105, 20, 0.25)" : "none",
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
                    borderRadius: "6px",
                    border: "none",
                    background: roleFilter === "user" ? "var(--accent)" : "transparent",
                    color: roleFilter === "user" ? "#ffffff" : "var(--text-secondary)",
                    boxShadow: roleFilter === "user" ? "0 2px 6px rgba(139, 105, 20, 0.25)" : "none",
                    cursor: "pointer",
                    transition: "all var(--transition)",
                  }}
                  onClick={() => setRoleFilter("user")}
                >
                  Users ({regularUsersCount})
                </button>
              </div>

              {/* Custom Sort Dropdown (Zero native browser dark gray popup) */}
              <div ref={sortRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  style={{
                    height: "36px",
                    padding: "0 14px",
                    fontSize: "12px",
                    fontWeight: 500,
                    borderRadius: "8px",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    transition: "all var(--transition)",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <Filter size={14} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                  <span>{SORT_OPTIONS.find((s) => s.id === sortBy)?.label}</span>
                  <ChevronDown
                    size={14}
                    strokeWidth={1.75}
                    style={{
                      transform: isSortOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      color: "var(--text-secondary)",
                    }}
                  />
                </button>

                {isSortOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      zIndex: 100,
                      minWidth: "190px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                      padding: "5px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                      animation: "fadeIn 0.15s ease-out",
                    }}
                  >
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = sortBy === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSortBy(opt.id);
                            setIsSortOpen(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "12px",
                            fontWeight: isSelected ? 600 : 400,
                            textAlign: "left",
                            borderRadius: "6px",
                            border: "none",
                            background: isSelected ? "var(--accent-glow)" : "transparent",
                            color: isSelected ? "var(--accent)" : "var(--text-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "var(--bg-elevated)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check size={13} strokeWidth={2} style={{ color: "var(--accent)" }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search Box */}
              <div style={{ position: "relative", width: "220px" }}>
                <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", display: "flex", pointerEvents: "none" }}>
                  <Search size={14} strokeWidth={1.75} />
                </div>
                <input
                  type="text"
                  placeholder="Tìm kiếm email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    height: "34px",
                    padding: "6px 26px 6px 30px",
                    borderRadius: "6px",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "8px",
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
                    <X size={14} strokeWidth={1.75} />
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
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Người dùng</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Vai trò</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Gói Plan</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Số dư Credit</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Projects</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Requirements</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Test Cases</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Ngày khởi tạo</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>Thao tác Admin</th>
                </tr>
              </thead>
              <tbody>
                {processedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)" }}>
                      <div style={{ display: "inline-flex", padding: "10px", borderRadius: "8px", background: "var(--bg-surface)", border: "1px solid var(--border)", marginBottom: "8px", color: "var(--text-muted)" }}>
                        <Search size={24} strokeWidth={1.5} />
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 500 }}>Không tìm thấy người dùng nào phù hợp với bộ lọc.</div>
                    </td>
                  </tr>
                ) : (
                  processedUsers.map((u) => {
                    const isAdmin = u.role === "admin";
                    const userPlan = u.plan || (isAdmin || u.credit_balance >= 2000 ? "Pro Plan" : u.credit_balance >= 600 ? "Lite Plan" : "Free Plan");
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
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                background: isAdmin
                                  ? "var(--accent)"
                                  : "var(--bg-elevated)",
                                color: isAdmin ? "#fff" : "var(--text-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "13px",
                                border: "1px solid var(--border)",
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
                        <td style={{ padding: "12px 16px" }}>
                          {isAdmin ? (
                            <span className="badge" style={{ fontSize: "11px", fontWeight: 600, background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--border-soft)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <ShieldCheck size={12} strokeWidth={1.75} /> ADMIN
                            </span>
                          ) : (
                            <span className="badge" style={{ fontSize: "11px", fontWeight: 500, background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-soft)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Users size={12} strokeWidth={1.75} /> USER
                            </span>
                          )}
                        </td>

                        {/* Plan Badge */}
                        <td style={{ padding: "12px 16px" }}>
                          {userPlan === "Pro Plan" ? (
                            <span className="badge" style={{ fontSize: "11px", fontWeight: 600, background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--border-soft)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Zap size={12} strokeWidth={1.75} /> Pro Plan
                            </span>
                          ) : userPlan === "Lite Plan" ? (
                            <span className="badge" style={{ fontSize: "11px", fontWeight: 600, background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-soft)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Zap size={12} strokeWidth={1.75} /> Lite Plan
                            </span>
                          ) : (
                            <span className="badge" style={{ fontSize: "11px", fontWeight: 500, background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border-soft)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              Free Plan
                            </span>
                          )}
                        </td>

                        {/* Credit Balance */}
                        <td style={{ padding: "12px 16px" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <input
                                type="number"
                                className="input"
                                value={editCreditValue}
                                onChange={(e) => setEditCreditValue(parseInt(e.target.value) || 0)}
                                style={{ width: "100px", height: "30px", fontSize: "13px", padding: "0 8px" }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 700 }}>
                                <Zap size={14} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
                                <span style={{ fontSize: "14px", color: u.credit_balance < 20 ? "var(--danger)" : "var(--text-primary)" }}>
                                  {u.credit_balance.toLocaleString()}
                                </span>
                              </div>

                              {/* Quick add credit buttons */}
                              {!isAdmin && (
                                <div style={{ display: "flex", gap: "4px", marginLeft: "6px" }}>
                                  {[50, 100, 500].map((amt) => (
                                    <button
                                      key={amt}
                                      type="button"
                                      style={{
                                        height: "22px",
                                        padding: "0 7px",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        borderRadius: "4px",
                                        background: "var(--accent-glow)",
                                        color: "var(--accent)",
                                        border: "1px solid var(--border-soft)",
                                        cursor: "pointer",
                                        transition: "all var(--transition)",
                                      }}
                                      onClick={() => handleQuickAddCredit(u, amt)}
                                      title={`Cộng nhanh +${amt} Credits`}
                                    >
                                      +{amt}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Projects */}
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{ fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "var(--bg-surface)", border: "1px solid var(--border-soft)" }}>
                            {u.projects_count}
                          </span>
                        </td>

                        {/* Requirements */}
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{ fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "var(--bg-surface)", border: "1px solid var(--border-soft)" }}>
                            {u.requirements_count}
                          </span>
                        </td>

                        {/* Test Cases */}
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{ fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "var(--bg-surface)", border: "1px solid var(--border-soft)" }}>
                            {u.test_cases_count}
                          </span>
                        </td>

                        {/* Registration Date */}
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "12px" }}>
                          {u.created_at ? new Date(u.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "N/A"}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                              <button
                                className="btn btn-primary"
                                style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                                onClick={() => handleSaveCredit(u.id, u.email)}
                                disabled={isUpdatingThisUser}
                              >
                                <Save size={12} strokeWidth={1.75} /> {isUpdatingThisUser ? "Đang lưu..." : "Lưu"}
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ height: "30px", padding: "0 8px", fontSize: "12px" }}
                                onClick={handleCancelEdit}
                                disabled={isUpdatingThisUser}
                              >
                                <X size={12} strokeWidth={1.75} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                              onClick={() => handleStartEdit(u)}
                              title="Sửa số dư Credit"
                            >
                              <Edit3 size={12} strokeWidth={1.75} /> Sửa Credit
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
