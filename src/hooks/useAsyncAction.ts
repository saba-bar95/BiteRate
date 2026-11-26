import { useCallback, useState } from "react";
import { toErrorMessage } from "../lib/api";

/** Shared loading/error wrapper for button-triggered async actions. */
export function useAsyncAction(
  action: () => Promise<void>,
  fallbackMessage: string,
  deps: unknown[],
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(toErrorMessage(err, fallbackMessage));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { loading, error, run };
}
