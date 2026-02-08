import { useEffect } from "react";

export function usePreventScroll() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();

    document.addEventListener("touchmove", prevent, { passive: false });
    document.addEventListener("wheel", prevent, { passive: false });
    document.addEventListener("scroll", prevent, { passive: false });

    return () => {
      document.removeEventListener("touchmove", prevent);
      document.removeEventListener("wheel", prevent);
      document.removeEventListener("scroll", prevent);
    };
  }, []);
}
