import { TrendingDown, TrendingUp } from "lucide-react";
import type { BasketItem, FxQuote } from "@shared/types";
import { basketDeltaClass, formatMoney, formatPct } from "../lib/format";
import { Sparkline } from "./Sparkline";

export function BasketCard({
  fromName,
  toName,
  homeCurrency,
  basket,
  fx,
}: {
  fromName: string;
  toName: string;
  homeCurrency: string;
  basket: BasketItem[];
  fx: FxQuote | null;
}) {
  const change = fx?.change30dPct ?? 0;
  const cheaper = change <= 0;

  return (
    <section className="bento fade-in flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Global basket</p>
          <h2 className="display mt-1">
            {fromName} <span className="text-muted">vs</span> {toName}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Standardized costs in your home currency
          </p>
        </div>
        <div className="surface px-3 py-2 text-right">
          <div className="text-xs text-muted">30-day FX shift</div>
          <div
            className={`mt-0.5 flex items-center justify-end gap-1 text-sm font-medium tabular ${
              cheaper ? "text-emerald" : "text-coral"
            }`}
          >
            {cheaper ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5" />
            )}
            {formatPct(fx?.change30dPct)}
          </div>
        </div>
      </div>

      <div className="surface p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span className="tabular">
            {fx
              ? `1 ${fx.from} = ${fx.rate.toFixed(2)} ${fx.to}`
              : "FX unavailable"}
          </span>
          <span>
            {fx?.provider === "fawaz" ? "Fallback FX" : "Frankfurter"}
          </span>
        </div>
        <Sparkline data={fx?.history30d ?? []} positive={cheaper} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/8 text-xs text-muted">
              <th scope="col" className="pb-2 font-medium">
                Item
              </th>
              <th scope="col" className="pb-2 font-medium">
                {fromName}
              </th>
              <th scope="col" className="pb-2 font-medium">
                {toName}
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Home Δ ({homeCurrency})
              </th>
            </tr>
          </thead>
          <tbody>
            {basket.map((item) => {
              return (
                <tr
                  key={item.key}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="py-3 pr-3 text-ink">{item.label}</td>
                  <td className="py-3 pr-3 tabular text-muted">
                    {formatMoney(item.fromInHomeCurrency, homeCurrency)}
                  </td>
                  <td className="py-3 pr-3 tabular text-muted">
                    {formatMoney(item.toInHomeCurrency, homeCurrency)}
                  </td>
                  <td
                    className={`py-3 text-right tabular font-medium ${basketDeltaClass(
                      item.deltaPct,
                      item.key,
                    )}`}
                  >
                    <span className="sr-only">
                      {item.deltaPct < 0
                        ? "Lower in home city"
                        : item.deltaPct > 0
                          ? "Higher in home city"
                          : "Same"}
                      :{" "}
                    </span>
                    {formatPct(item.deltaPct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
