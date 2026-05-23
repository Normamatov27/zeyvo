import { useVideoConfig } from "remotion";

/**
 * Returns true if the current composition is portrait (mobile).
 */
export function useIsMobile(): boolean {
  const { width, height } = useVideoConfig();
  return height > width;
}

/**
 * Returns responsive values based on orientation.
 */
export function useResponsive<T>(desktop: T, mobile: T): T {
  return useIsMobile() ? mobile : desktop;
}
