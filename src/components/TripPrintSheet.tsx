import { Printer } from "lucide-react";
import type { TripPlanResult } from "@shared/features";
import { formatMoney, formatNumber } from "../lib/format";

export function TripPrintSheet({
  name,
  result,
}: {
  name: string;
  result: TripPlanResult;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="no-print inline-flex items-center gap-2 rounded-md border border-white/12 bg-panel px-3 py-2 text-sm text-ink transition hover:border-emerald/40"
      >
        <Printer className="h-4 w-4" />
        Print / save PDF
      </button>

      <div id="trip-sheet" className="bento hidden print:block p-6 text-ink">
        <h1 className="brand-mark">{name || "BiteRate trip"}</h1>
        <p className="mt-1 text-sm text-muted">
          {result.totalDays} days · home {result.homeCurrency} ·{" "}
          {formatMoney(result.total, result.homeCurrency)} estimated
        </p>
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/15 text-left text-muted">
              <th className="py-2">City</th>
              <th className="py-2">Days</th>
              <th className="py-2">Meals</th>
              <th className="py-2">Transit</th>
              <th className="py-2">Lodging</th>
              <th className="py-2">Dish</th>
              <th className="py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {result.stops.map((s) => (
              <tr key={`${s.city.slug}-${s.days}`} className="border-b border-white/8">
                <td className="py-2">
                  {s.city.name}, {s.city.country}
                </td>
                <td className="py-2 tabular">{s.days}</td>
                <td className="py-2 tabular">
                  {formatMoney(s.meals, result.homeCurrency)}
                </td>
                <td className="py-2 tabular">
                  {formatMoney(s.transit, result.homeCurrency)}
                </td>
                <td className="py-2 tabular">
                  {formatMoney(s.estimatedLodging, result.homeCurrency)}
                </td>
                <td className="py-2 tabular">
                  {formatNumber(s.dishPortions, 1)} ·{" "}
                  {formatMoney(s.dishCost, result.homeCurrency)}
                </td>
                <td className="py-2 tabular font-medium">
                  {formatMoney(s.subtotal, result.homeCurrency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-muted">{result.fxNote}</p>
      </div>
    </div>
  );
}
