import { useState, useEffect } from "react";

export function usePageLoad(delay = 600) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return isLoading;
}
