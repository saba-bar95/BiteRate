import { useEffect, useState } from "react";
import { isAbortError, toErrorMessage } from "../lib/api";

/** Abortable effect fetch with loading/error/reload — same lifecycle as existing pages. */
export function useAbortableQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  fallbackMessage: string,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetcher(ac.signal)
      .then((next) => {
        if (!ac.signal.aborted) setData(next);
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setError(toErrorMessage(err, fallbackMessage));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return {
    data,
    loading,
    error,
    reload: () => setTick((n) => n + 1),
  };
}
