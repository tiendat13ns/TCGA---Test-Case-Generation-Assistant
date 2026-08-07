import type { Dispatch, SetStateAction } from "react";
import SideDrawer from "../SideDrawer";
import type { BugReportFields, StudioTestCaseItem } from "./shared";

type BugReportDrawerProps = {
  testCase: StudioTestCaseItem | null;
  fields: BugReportFields;
  onFieldsChange: Dispatch<SetStateAction<BugReportFields>>;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
};

export default function BugReportDrawer({ testCase, fields, onFieldsChange, onClose, onSave, isSaving }: BugReportDrawerProps) {
  return (
    <SideDrawer
      isOpen={!!testCase}
      onClose={onClose}
      title="Bug Report"
      width="480px"
    >
      {testCase && (
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* TC Info Header */}
          <div style={{ background: "var(--bg-elevated)", borderRadius: "10px", padding: "16px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "6px" }}>Test Case</div>
            <div style={{ fontWeight: 600, fontSize: "14px", lineHeight: 1.5, color: "var(--text-primary)" }}>{testCase.title}</div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "6px" }}>Expected Result</div>
            <div style={{ fontSize: "13px", background: "var(--bg-elevated)", padding: "12px 14px", borderRadius: "8px", lineHeight: 1.6, color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {testCase.expected_result || "N/A"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "6px" }}>Actual Result</div>
            <textarea
              value={fields.actualResult}
              onChange={(e) => onFieldsChange((prev) => ({ ...prev, actualResult: e.target.value }))}
              style={{ width: "100%", padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "13px", minHeight: "100px", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", transition: "border-color 0.2s" }}
              placeholder="Mô tả những gì thực sự xảy ra khi test..."
            />
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "6px" }}>Steps to Reproduce</div>
            <textarea
              value={fields.stepsToReproduce}
              onChange={(e) => onFieldsChange((prev) => ({ ...prev, stepsToReproduce: e.target.value }))}
              style={{ width: "100%", padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "13px", minHeight: "100px", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", transition: "border-color 0.2s" }}
              placeholder="Các bước để tái hiện lỗi (nếu khác với test steps gốc)..."
            />
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "6px" }}>Environment</div>
            <input
              type="text"
              value={fields.environment}
              onChange={(e) => onFieldsChange((prev) => ({ ...prev, environment: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "13px", fontFamily: "inherit" }}
              placeholder="VD: Windows 11, Chrome 128, staging..."
            />
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "6px" }}>Severity</div>
            <select
              value={fields.severity}
              onChange={(e) => onFieldsChange((prev) => ({ ...prev, severity: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "13px", fontFamily: "inherit", cursor: "pointer" }}
            >
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <button
            onClick={onSave}
            disabled={isSaving}
            style={{
              background: "var(--accent)", color: "white", border: "none", padding: "11px 16px", borderRadius: "8px",
              fontWeight: 600, fontSize: "13px", cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1,
              transition: "all 0.2s"
            }}>
            {isSaving ? "Saving..." : "Save Bug Report"}
          </button>
        </div>
      )}
    </SideDrawer>
  );
}
