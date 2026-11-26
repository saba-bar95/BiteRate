import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { PriceAlert } from "@shared/features";
import { CatalogErrorBanner } from "../components/CatalogErrorBanner";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { FieldSelect } from "../components/Select";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { useCitiesCatalog } from "../hooks/useCitiesCatalog";
import { useSeo } from "../hooks/useSeo";
import { Toast } from "../components/Toast";
import { checkAlerts } from "../lib/api";
import { formatPct } from "../lib/format";
import {
  fireAlertNotification,
  loadNotifyPrefs,
  requestNotifyPermission,
  saveNotifyPrefs,
  type NotifyPrefs,
} from "../lib/notify";
import {
  loadLocalSync,
  removeAlert,
  replaceAlerts,
  uid,
  upsertAlert,
} from "../lib/storage";

export function AlertsPage() {
  useSeo(
    "FX Alerts",
    "Watch FX pairs and get local threshold alerts for currency moves.",
    { noIndex: true },
  );
  const { cities, error: catalogError, reload } = useCitiesCatalog();
  const currencies = useMemo(
    () => [...new Set(cities.map((c) => c.currencyCode))].sort(),
    [cities],
  );
  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: c, label: c })),
    [currencies],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [alerts, setAlerts] = useState<PriceAlert[]>(
    () => loadLocalSync().alerts,
  );
  const [fromCurrency, setFrom] = useState(searchParams.get("from") || "USD");
  const [toCurrency, setTo] = useState(searchParams.get("to") || "GEL");
  const [threshold, setThreshold] = useState(
    searchParams.get("threshold") || "-2",
  );
  const [label, setLabel] = useState(
    searchParams.get("label") || "GEL getting cheaper",
  );
  const [toast, setToast] = useState<string | null>(null);
  const [notifyPrefs, setNotifyPrefs] = useState<NotifyPrefs>(() =>
    loadNotifyPrefs(),
  );

  const persist = (next: PriceAlert[]) => {
    setAlerts(next);
    replaceAlerts(next);
  };

  const {
    loading,
    error,
    run: runCheck,
  } = useAsyncAction(
    async () => {
      const { alerts: checked } = await checkAlerts(alerts);
      persist(checked);
      const fired = checked.filter((a) => a.triggered);
      for (const a of fired) {
        fireAlertNotification(
          a.label || "BiteRate FX alert",
          `${a.fromCurrency}→${a.toCurrency} hit ${a.thresholdPct}%.`,
        );
      }
      if (fired.length) {
        setToast(
          `${fired.length} alert${fired.length === 1 ? "" : "s"} triggered`,
        );
      }
    },
    "Check failed",
    [alerts],
  );

  useEffect(() => {
    if (alerts.length) void runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <main className="page-shell mx-auto max-w-4xl space-y-4">
      <PageHeader
        eyebrow="FX alerts"
        title="Watch currency moves"
        description="Alerts are stored locally (and syncable). Enable browser notifications to get a desktop ping when thresholds fire."
      />

      <section className="surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-ink">Desktop notifications</p>
          <p className="text-xs text-muted">
            Permission: {notifyPrefs.permission}
            {notifyPrefs.enabled ? " · enabled" : " · off"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-white/12 px-3 py-1.5 text-sm text-ink"
            onClick={() => {
              void requestNotifyPermission().then(setNotifyPrefs);
            }}
          >
            Allow notifications
          </button>
          <button
            type="button"
            className="rounded-md border border-white/12 px-3 py-1.5 text-sm text-muted"
            onClick={() => {
              const next = saveNotifyPrefs({
                ...notifyPrefs,
                enabled: !notifyPrefs.enabled,
              });
              setNotifyPrefs(next);
            }}
          >
            {notifyPrefs.enabled ? "Disable" : "Enable"}
          </button>
        </div>
      </section>

      <CatalogErrorBanner
        pageError={error}
        catalogError={catalogError}
        onReloadCatalog={reload}
        onRetryPage={() => void runCheck()}
      />

      <section className="bento grid gap-3 p-5 sm:grid-cols-2">
        <FieldSelect
          label="From currency"
          value={fromCurrency}
          options={currencyOptions}
          onChange={setFrom}
          searchable
        />
        <FieldSelect
          label="To currency"
          value={toCurrency}
          options={currencyOptions}
          onChange={setTo}
          searchable
        />
        <label className="field">
          Threshold %
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="field-control tabular"
            placeholder="e.g. -2"
          />
        </label>
        <label className="field">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="field-control"
          />
        </label>
        <PrimaryButton
          className="sm:col-span-2"
          onClick={() => {
            const alert: PriceAlert = {
              id: uid("alert"),
              fromCurrency,
              toCurrency,
              thresholdPct: Number(threshold) || 0,
              label,
              createdAt: new Date().toISOString(),
            };
            upsertAlert(alert);
            persist([alert, ...alerts]);
            setSearchParams(
              {
                from: fromCurrency,
                to: toCurrency,
                threshold,
                label,
              },
              { replace: true },
            );
          }}
        >
          Create alert
        </PrimaryButton>
      </section>

      <section className="bento space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="display display-sm">Your alerts</h2>
          <button
            type="button"
            onClick={() => void runCheck()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/12 px-3 py-1.5 text-sm"
          >
            {loading ? <LoadingSpinner size="sm" /> : null}
            Check now
          </button>
        </div>
        {alerts.length === 0 && (
          <p className="text-sm text-muted">No alerts yet.</p>
        )}
        {alerts.map((a) => (
          <div
            key={a.id}
            className="surface flex flex-wrap items-center justify-between gap-2 p-3"
          >
            <div>
              <div className="font-medium">
                {a.label}{" "}
                {a.triggered ? (
                  <span className="text-xs text-emerald">Triggered</span>
                ) : (
                  <span className="text-xs text-muted">Watching</span>
                )}
              </div>
              <div className="text-xs text-muted">
                {a.fromCurrency}/{a.toCurrency} ≤ {formatPct(a.thresholdPct)} ·
                last {formatPct(a.lastChange30dPct)}
              </div>
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-md border border-white/12 px-3 py-1.5 text-xs text-coral"
              onClick={() => {
                removeAlert(a.id);
                persist(alerts.filter((x) => x.id !== a.id));
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </section>

      {toast ? <Toast message={toast} /> : null}
    </main>
  );
}
