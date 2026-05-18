import React from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: boolean;
  style?: React.CSSProperties;
}

export function Skeleton({ width, height = 16, rounded, style }: SkeletonProps) {
  return (
    <span
      className="z-skel"
      style={{
        display: "block",
        width: width ?? "100%",
        height,
        borderRadius: rounded ? 999 : 6,
        ...style,
      }}
      aria-hidden
    />
  );
}
