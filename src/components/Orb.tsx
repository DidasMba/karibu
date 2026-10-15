import { useEffect, useRef } from "react";

interface OrbProps {
  active: boolean;
  speaking: boolean;
  /** Read on every animation frame; returns 0..1. */
  getLevel: () => number;
}

/**
 * Audio-reactive orb. Writes a CSS variable on each frame instead of setting
 * React state, so the volume animation never re-renders the tree.
 */
export function Orb({ active, speaking, getLevel }: OrbProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) {
      ref.current?.style.setProperty("--level", "0");
      return;
    }
    let frame = 0;
    let smoothed = 0;
    const tick = () => {
      let level = 0;
      try {
        level = getLevel();
      } catch {
        // Audio graph not ready yet (e.g. text-only mode).
      }
      smoothed = smoothed * 0.8 + Math.min(1, level * 1.6) * 0.2;
      ref.current?.style.setProperty("--level", smoothed.toFixed(3));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, getLevel]);

  return (
    <div
      ref={ref}
      className="orb"
      data-active={active}
      data-speaking={speaking}
      aria-hidden="true"
    >
      <div className="orb-core" />
    </div>
  );
}
