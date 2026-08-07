import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Filter, Search, X } from "lucide-react";

export type RoleFilter = "all" | "admin" | "user";
export type SortOption = "created_desc" | "credit_desc" | "projects_desc" | "test_cases_desc";

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "created_desc", label: "Mới đăng ký nhất" },
  { id: "credit_desc", label: "Credit (Cao → Thấp)" },
  { id: "projects_desc", label: "Nhiều Projects nhất" },
  { id: "test_cases_desc", label: "Nhiều Test Cases nhất" },
];

type UserTableToolbarProps = {
  totalUsers: number;
  adminUsersCount: number;
  regularUsersCount: number;
  roleFilter: RoleFilter;
  onRoleFilterChange: (filter: RoleFilter) => void;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
};

export default function UserTableToolbar({
  totalUsers,
  adminUsersCount,
  regularUsersCount,
  roleFilter,
  onRoleFilterChange,
  sortBy,
  onSortByChange,
  searchQuery,
  onSearchQueryChange,
}: UserTableToolbarProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
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

  const roleChip = (filter: RoleFilter, label: string) => (
    <button
      type="button"
      style={{
        height: "30px",
        padding: "0 14px",
        fontSize: "12px",
        fontWeight: roleFilter === filter ? 600 : 500,
        borderRadius: "6px",
        border: "none",
        background: roleFilter === filter ? "var(--accent)" : "transparent",
        color: roleFilter === filter ? "#ffffff" : "var(--text-secondary)",
        boxShadow: roleFilter === filter ? "0 2px 6px rgba(139, 105, 20, 0.25)" : "none",
        cursor: "pointer",
        transition: "all var(--transition)",
      }}
      onClick={() => onRoleFilterChange(filter)}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      {/* Role Filter Chips (Segmented Pill) */}
      <div style={{ display: "inline-flex", background: "var(--bg-elevated)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border)" }}>
        {roleChip("all", `Tất cả (${totalUsers})`)}
        {roleChip("admin", `Admin (${adminUsersCount})`)}
        {roleChip("user", `Users (${regularUsersCount})`)}
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
                    onSortByChange(opt.id);
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
          onChange={(e) => onSearchQueryChange(e.target.value)}
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
            onClick={() => onSearchQueryChange("")}
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
  );
}
