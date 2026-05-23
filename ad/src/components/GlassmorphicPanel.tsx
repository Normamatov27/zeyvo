import React from "react";
import { COLORS } from "../theme";

type Props = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  glowColor?: string;
  borderOpacity?: number;
};

export const GlassmorphicPanel: React.FC<Props> = ({
  children,
  style,
  glowColor = COLORS.accent,
  borderOpacity = 0.08,
}) => {
  const { padding, borderRadius, background, ...restStyle } = style || {};

  return (
    <div
      style={{
        background: `linear-gradient(135deg, rgba(255, 255, 255, ${borderOpacity * 1.8}) 0%, rgba(255, 255, 255, 0.01) 40%, rgba(255, 255, 255, ${borderOpacity * 0.8}) 100%)`,
        borderRadius: (borderRadius as number) || 16,
        padding: 1, // Acts as border
        boxShadow: `0 30px 60px rgba(0, 0, 0, 0.4), 0 0 80px ${glowColor}0b, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
        display: "flex",
        flexDirection: "column",
        ...restStyle,
      }}
    >
      <div
        style={{
          background: "rgba(10, 10, 15, 0.75)",
          backdropFilter: "blur(50px)",
          WebkitBackdropFilter: "blur(50px)",
          borderRadius: ((borderRadius as number) || 16) - 1,
          padding: (padding as number) || 28,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
};
