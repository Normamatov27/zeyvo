import React from "react";

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
type BtnSize = "sm" | "md" | "lg";

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<BtnVariant, React.CSSProperties> = {
  primary: {
    background: "var(--color-primary)",
    color: "var(--color-primary-fg)",
    border: "none",
  },
  secondary: {
    background: "var(--color-surface)",
    color: "var(--color-fg)",
    border: "1px solid var(--color-border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-fg-2)",
    border: "none",
  },
  danger: {
    background: "var(--color-danger-soft)",
    color: "var(--color-danger)",
    border: "1px solid transparent",
  },
};

const sizeStyles: Record<BtnSize, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: 12, borderRadius: 6, height: 30 },
  md: { padding: "8px 16px", fontSize: 13.5, borderRadius: 8, height: 36 },
  lg: { padding: "12px 24px", fontSize: 15, borderRadius: 10, height: 44 },
};

export function Btn({
  variant = "primary",
  size = "md",
  loading,
  fullWidth,
  children,
  style,
  disabled,
  ...rest
}: BtnProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontWeight: 500,
        fontFamily: "inherit",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s, background 0.15s",
        width: fullWidth ? "100%" : undefined,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...rest}
    >
      {loading ? "…" : children}
    </button>
  );
}
