import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  goldColor?: string;
}

export const TCGAMark: React.FC<LogoProps> = ({
  size = 24,
  className = "",
  style = {},
  color = "currentColor",
  goldColor = "#C59434",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <defs>
        <linearGradient id="tcgaGoldGradReact" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2B155" />
          <stop offset="50%" stopColor={goldColor} />
          <stop offset="100%" stopColor="#996E1B" />
        </linearGradient>
      </defs>
      {/* Outer Letter A */}
      <path
        d="M 50 12 L 86 88 L 68 88 L 50 48 L 32 88 L 14 88 Z"
        fill={color}
      />
      {/* Gold Checkmark */}
      <path
        d="M 33 58 L 47 73 L 75 42"
        fill="none"
        stroke="url(#tcgaGoldGradReact)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const TCGAAppIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = "",
}) => {
  return (
    <div
      className={`tcga-app-icon ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: "var(--bg-elevated, #EAE5D9)",
        border: "1px solid var(--border-soft, #DDD6C7)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        flexShrink: 0,
      }}
    >
      <TCGAMark size={Math.round(size * 0.62)} color="#1F1F21" />
    </div>
  );
};

export const TCGAFullLogo: React.FC<{
  showSubtext?: boolean;
  size?: number;
  className?: string;
}> = ({ showSubtext = true, size = 28, className = "" }) => {
  return (
    <div
      className={`tcga-full-logo ${className}`}
      style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}
    >
      <TCGAAppIcon size={size * 1.3} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: `${size * 0.75}px`,
            letterSpacing: "0.04em",
            color: "var(--text-primary)",
            lineHeight: 1.1,
          }}
        >
          TCGA
        </span>
        {showSubtext && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: `${Math.max(10, size * 0.38)}px`,
              fontWeight: 400,
              color: "var(--text-muted)",
              letterSpacing: "0.02em",
              marginTop: "2px",
            }}
          >
            Test Case Generation Assistant
          </span>
        )}
      </div>
    </div>
  );
};

export default TCGAMark;
