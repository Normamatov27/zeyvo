import { interpolate } from "remotion";
import { EASINGS } from "../theme";

/**
 * Creates a clamped interpolation with cinematic easing.
 */
export function cinematicInterpolate(
  frame: number,
  inputRange: [number, number],
  outputRange: [number, number],
  easing: (t: number) => number = EASINGS.cinematicEnter,
): number {
  return interpolate(frame, inputRange, outputRange, {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/**
 * Fade in from 0 to 1 over a duration.
 */
export function fadeIn(frame: number, start: number, duration: number): number {
  return cinematicInterpolate(
    frame,
    [start, start + duration],
    [0, 1],
    EASINGS.editorial,
  );
}

/**
 * Fade out from 1 to 0 over a duration.
 */
export function fadeOut(
  frame: number,
  start: number,
  duration: number,
): number {
  return cinematicInterpolate(
    frame,
    [start, start + duration],
    [1, 0],
    EASINGS.exit,
  );
}

/**
 * Fade in then fade out.
 */
export function fadeInOut(
  frame: number,
  start: number,
  holdDuration: number,
  fadeDuration: number,
): number {
  const inVal = fadeIn(frame, start, fadeDuration);
  const outVal = fadeOut(
    frame,
    start + fadeDuration + holdDuration,
    fadeDuration,
  );
  return Math.min(inVal, outVal);
}

/**
 * Slide up with fade effect.
 */
export function slideUp(
  frame: number,
  start: number,
  duration: number,
  distance: number = 40,
): { opacity: number; translateY: number } {
  const progress = cinematicInterpolate(
    frame,
    [start, start + duration],
    [0, 1],
    EASINGS.cinematicEnter,
  );
  return {
    opacity: progress,
    translateY: interpolate(progress, [0, 1], [distance, 0]),
  };
}

/**
 * Scale up from center.
 */
export function scaleIn(
  frame: number,
  start: number,
  duration: number,
  from: number = 0.8,
): { opacity: number; scale: number } {
  const progress = cinematicInterpolate(
    frame,
    [start, start + duration],
    [0, 1],
    EASINGS.dramatic,
  );
  return {
    opacity: progress,
    scale: interpolate(progress, [0, 1], [from, 1]),
  };
}
