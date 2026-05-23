import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

type Particle = {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
};

type Props = {
  count?: number;
  color?: string;
  style?: React.CSSProperties;
};

export const FloatingParticles: React.FC<Props> = ({
  count = 20,
  color = COLORS.accent,
  style,
}) => {
  const frame = useCurrentFrame();

  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Deterministic pseudo-random generation using trigonometry
      const seed1 = Math.sin(i * 982.3) * 43758.5453;
      const seed2 = Math.cos(i * 274.9) * 85324.1287;
      
      const x = (seed1 - Math.floor(seed1)) * 100; // 0 to 100 %
      const y = (seed2 - Math.floor(seed2)) * 100; // 0 to 100 %
      const size = 1 + (seed1 * 123.4 % 3); // 1 to 4 px
      const speed = 0.05 + (seed2 * 56.7 % 0.15); // drifting speed
      const opacity = 0.08 + (seed1 * 89.1 % 0.15);

      return { x, y, size, speed, opacity } as Particle;
    });
  }, [count]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        ...style,
      }}
    >
      {particles.map((p, i) => {
        // Drift upwards/downwards depending on frame
        const currentY = (p.y - frame * p.speed) % 100;
        const finalY = currentY < 0 ? currentY + 100 : currentY;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${finalY}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: p.opacity,
              boxShadow: p.size > 2 ? `0 0 10px ${color}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
