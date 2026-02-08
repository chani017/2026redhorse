import { useEffect } from "react";
import type { Group } from "three";

interface ZoomOptions {
  minScale: number;
  maxScale: number;
  speed: number;
}

export function useZoom(
  groupRef: React.RefObject<Group | null>,
  scaleRef: React.MutableRefObject<number>,
  { minScale, maxScale, speed }: ZoomOptions
) {
  useEffect(() => {
    let initialDistance = 0;
    let initialScale = 1.0;

    const clampScale = (v: number) => Math.max(minScale, Math.min(maxScale, v));

    const applyScale = () => {
      if (groupRef.current) {
        const s = scaleRef.current;
        groupRef.current.scale.set(s, s, s);
      }
    };

    const getDistance = (a: Touch, b: Touch) => {
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      scaleRef.current = clampScale(scaleRef.current + (e.deltaY > 0 ? -speed : speed));
      applyScale();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches[0], e.touches[1]);
        initialScale = scaleRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && initialDistance > 0) {
        const ratio = getDistance(e.touches[0], e.touches[1]) / initialDistance;
        scaleRef.current = clampScale(initialScale * ratio);
        applyScale();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistance = 0;
        initialScale = scaleRef.current;
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [minScale, maxScale, speed]);
}
