import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { CinematicText } from "../components/CinematicText";
import { FloatingParticles } from "../components/FloatingParticles";
import { COLORS, EASINGS } from "../theme";

/**
 * Scene 09 — Global Scale (1:10–1:20, frames 0–300 local)
 * Network map: locations connecting via glowing lines across a dark abstract map.
 */
export const Scene09_GlobalScale: React.FC = () => {
  const frame = useCurrentFrame();

  const mapScale = interpolate(frame, [0, 60], [1.1, 1], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const mapOpacity = interpolate(frame, [0, 30], [0, 1], {
    easing: EASINGS.editorial,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Connection lines appearing
  const connectionNodes = [
    { x: 52, y: 35, label: "Tashkent", delay: 40 },
    { x: 48, y: 40, label: "Samarkand", delay: 60 },
    { x: 55, y: 38, label: "Bukhara", delay: 80 },
    { x: 30, y: 30, label: "London", delay: 100 },
    { x: 25, y: 45, label: "Dubai", delay: 120 },
    { x: 75, y: 35, label: "Singapore", delay: 140 },
    { x: 15, y: 35, label: "New York", delay: 160 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Drifting global network particles */}
      <FloatingParticles count={25} color={COLORS.accent} />
      {/* Network map image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${mapScale})`,
          opacity: mapOpacity,
        }}
      >
        <Img
          src={staticFile("network.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.6,
          }}
        />
      </div>

      {/* Overlay connection dots */}
      {connectionNodes.map((node, i) => {
        const nodeOpacity = interpolate(frame, [node.delay, node.delay + 20], [0, 1], {
          easing: EASINGS.cinematicEnter,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const pulse = Math.sin((frame - node.delay) * 0.06 + i) * 0.3 + 0.7;

        return (
          <React.Fragment key={node.label}>
            <div
              style={{
                position: "absolute",
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: "translate(-50%, -50%)",
                opacity: nodeOpacity,
              }}
            >
              {/* Glow ring */}
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: `1px solid ${COLORS.accent}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 ${20 * pulse}px ${COLORS.accent}30`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: COLORS.accent,
                    boxShadow: `0 0 10px ${COLORS.accent}`,
                  }}
                />
              </div>
              {/* Label */}
              <div
                style={{
                  position: "absolute",
                  top: 36,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 11,
                  fontWeight: 500,
                  color: COLORS.textMuted,
                  whiteSpace: "nowrap",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {node.label}
              </div>
            </div>

            {/* Connection line to next node */}
            {i < connectionNodes.length - 1 && (
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              >
                <line
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${connectionNodes[i + 1].x}%`}
                  y2={`${connectionNodes[i + 1].y}%`}
                  stroke={COLORS.accent}
                  strokeWidth={0.5}
                  opacity={interpolate(
                    frame,
                    [node.delay + 10, node.delay + 30],
                    [0, 0.2],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    },
                  )}
                />
              </svg>
            )}
          </React.Fragment>
        );
      })}

      {/* "Enterprise Infrastructure" text */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <CinematicText
          text="Enterprise Infrastructure. Global Scale."
          fontSize={32}
          fontWeight="300"
          fadeOnly
          delay={100}
          color={COLORS.text}
          style={{ justifyContent: "center" }}
        />
      </div>

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
