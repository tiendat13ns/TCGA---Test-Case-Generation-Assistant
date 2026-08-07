import type { ReactNode } from "react";
import { Activity, CheckSquare, FileText, Grid, Sparkles, Users } from "lucide-react";
import { AdminStats } from "../../hooks/useAdmin";

type KpiCardsProps = {
  stats: AdminStats;
  adminUsersCount: number;
  regularUsersCount: number;
};

function KpiCard({ label, icon, value, footer }: { label: string; icon: ReactNode; value: number; footer: ReactNode }) {
  return (
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
          {label}
        </span>
        <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
        <span style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-primary)" }}>{value}</span>
        {footer}
      </div>
    </div>
  );
}

export default function KpiCards({ stats, adminUsersCount, regularUsersCount }: KpiCardsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
      <KpiCard
        label="Người dùng Hệ thống"
        icon={<Users size={20} strokeWidth={1.75} />}
        value={stats.total_users}
        footer={
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            ({adminUsersCount} Admins, {regularUsersCount} Users)
          </span>
        }
      />
      <KpiCard
        label="Tổng Projects"
        icon={<Grid size={20} strokeWidth={1.75} />}
        value={stats.total_projects}
        footer={
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "3px" }}>
            <Activity size={12} strokeWidth={1.75} /> Workspaces
          </span>
        }
      />
      <KpiCard
        label="Yêu cầu (Requirements)"
        icon={<FileText size={20} strokeWidth={1.75} />}
        value={stats.total_requirements}
        footer={<span style={{ fontSize: "12px", color: "var(--text-muted)" }}>SRS Items Extracted</span>}
      />
      <KpiCard
        label="Test Cases AI"
        icon={<CheckSquare size={20} strokeWidth={1.75} />}
        value={stats.total_test_cases}
        footer={
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "3px" }}>
            <Sparkles size={12} strokeWidth={1.75} /> AI Generated
          </span>
        }
      />
    </div>
  );
}
