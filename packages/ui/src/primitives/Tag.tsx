import React from "react";

type TagTone = "default" | "success" | "warning" | "danger" | "info";

interface TagProps {
  tone?: TagTone;
  dot?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const toneStyles: Record<TagTone, React.CSSProperties> = {
  default: { background: "var(--color-surface-2)", color: "var(--color-fg-2)" },
  success: { background: "var(--color-success-soft)", color: "var(--color-success)" },
  warning: { background: "var(--color-warning-soft)", color: "var(--color-warning)" },
  danger:  { background: "var(--color-danger-soft)",  color: "var(--color-danger)" },
  info:    { background: "var(--color-accent-soft)",   color: "var(--color-accent)" },
};

export function Tag({ tone = "default", dot, children, style }: TagProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: 0.1,
        ...toneStyles[tone],
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
