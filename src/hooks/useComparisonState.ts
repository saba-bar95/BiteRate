import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { setLastCompare } from "../lib/lastCompare";

const DEFAULT_FROM = "new-york";
const DEFAULT_TO = "tbilisi";
const DEFAULT_BUDGET = 100;

export function useComparisonState() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const compareParam = params.compare;

  const parsedCompare = useMemo(() => {
    if (compareParam?.includes("-vs-")) {
      const [from, to] = compareParam.split("-vs-");
      if (from && to) return { from, to };
    }
    return null;
  }, [compareParam]);

  const fromSlug = parsedCompare?.from ?? DEFAULT_FROM;
  const toSlug = parsedCompare?.to ?? DEFAULT_TO;

  const mode: "flat" | "hourly" =
    searchParams.get("mode") === "hourly" ? "hourly" : "flat";
  const budget =
    Number(searchParams.get("budget") ?? DEFAULT_BUDGET) || DEFAULT_BUDGET;

  const syncUrl = useCallback(
    (next: {
      from?: string;
      to?: string;
      budget?: number;
      mode?: "flat" | "hourly";
      replace?: boolean;
    }) => {
      const from = next.from ?? fromSlug;
      const to = next.to ?? toSlug;
      const nextBudget = next.budget ?? budget;
      const nextMode = next.mode ?? mode;
      const qs = new URLSearchParams();
      qs.set("budget", String(nextBudget));
      if (nextMode === "hourly") qs.set("mode", "hourly");
      setLastCompare({
        fromSlug: from,
        toSlug: to,
        budget: nextBudget,
        mode: nextMode,
      });
      navigate(`/compare/${from}-vs-${to}?${qs.toString()}`, {
        replace: next.replace ?? false,
      });
    },
    [budget, fromSlug, mode, navigate, toSlug],
  );

  useEffect(() => {
    if (parsedCompare) {
      setLastCompare({ fromSlug, toSlug, budget, mode });
    }
  }, [budget, fromSlug, mode, parsedCompare, toSlug]);

  const setFrom = (slug: string) => syncUrl({ from: slug });
  const setTo = (slug: string) => syncUrl({ to: slug });
  const setBudget = (value: number) =>
    syncUrl({ budget: value, replace: true });
  const setMode = (value: "flat" | "hourly") =>
    syncUrl({ mode: value, replace: true });
  const swap = () => syncUrl({ from: toSlug, to: fromSlug });

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const qs = new URLSearchParams({ budget: String(budget) });
    if (mode === "hourly") qs.set("mode", "hourly");
    return `${window.location.origin}/compare/${fromSlug}-vs-${toSlug}?${qs}`;
  }, [budget, fromSlug, mode, toSlug]);

  return {
    fromSlug,
    toSlug,
    budget,
    mode,
    setFrom,
    setTo,
    setBudget,
    setMode,
    swap,
    syncUrl,
    shareUrl,
  };
}
