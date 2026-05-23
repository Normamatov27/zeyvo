import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, EASINGS } from "../theme";

type NodeData = {
  x: number;
  y: number;
  size: number;
  delay: number;
};

type Props = {
  nodes?: NodeData[];
  delay?: number;
  style?: React.CSSProperties;
};

const DEFAULT_NODES: NodeData[] = [
  { x: 20, y: 30, size: 8, delay: 0 },
  { x: 35, y: 55, size: 12, delay: 5 },
  { x: 50, y: 40, size: 10, delay: 10 },
  { x: 65, y: 60, size: 14, delay: 15 },
  { x: 80, y: 35, size: 9, delay: 20 },
  { x: 45, y: 75, size: 11, delay: 25 },
  { x: 70, y: 20, size: 8, delay: 30 },
  { x: 25, y: 65, size: 10, delay: 8 },
  { x: 55, y: 25, size: 7, delay: 12 },
  { x: 85, y: 55, size: 13, delay: 18 },
];

/**
 * Network visualization — glowing nodes with connecting lines.
 */
export const NetworkNode: React.FC<Props> = ({
  nodes = DEFAULT_NODES,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {/* Connection lines */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        {nodes.map((node, i) => {
          const nextNode = nodes[(i + 1) % nodes.length];
          const lineOpacity = interpolate(
            frame,
            [delay + node.delay + 10, delay + node.delay + 30],
            [0, 0.15],
            {
              easing: EASINGS.editorial,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          );
          return (
            <line
              key={`line-${i}`}
              x1={`${node.x}%`}
              y1={`${node.y}%`}
              x2={`${nextNode.x}%`}
              y2={`${nextNode.y}%`}
              stroke={COLORS.accent}
              strokeWidth={1}
              opacity={lineOpacity}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node, i) => {
        const nodeOpacity = interpolate(
          frame,
          [delay + node.delay, delay + node.delay + 20],
          [0, 1],
          {
            easing: EASINGS.cinematicEnter,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        const pulse = Math.sin((frame - delay + i * 13) * 0.06) * 0.3 + 0.7;

        return (
          <div
            key={`node-${i}`}
            style={{
              position: "absolute",
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: node.size,
              height: node.size,
              borderRadius: "50%",
              background: COLORS.accent,
              opacity: nodeOpacity,
              transform: "translate(-50%, -50%)",
              boxShadow: `0 0 ${20 * pulse}px ${COLORS.accent}60, 0 0 ${40 * pulse}px ${COLORS.accent}30`,
            }}
          />
        );
      })}
    </div>
  );
};
