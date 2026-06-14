import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration: number = 1200) {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    startTime.current = null;
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    };
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [target, duration]);

  return value;
}
