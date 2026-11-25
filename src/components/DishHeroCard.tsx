import { Flame, UtensilsCrossed, Users } from "lucide-react";
import type { DishPurchasingPower } from "@shared/types";
import { formatMoney, formatNumber } from "../lib/format";

export function DishHeroCard({
  cityName,
  currencyCode,
  dishCurrencyCode,
  budget,
  budgetMode,
  dish,
  alsoTry,
}: {
  cityName: string;
  currencyCode: string;
  dishCurrencyCode: string;
  budget: number;
  budgetMode: "flat" | "hourly";
  dish: DishPurchasingPower | null;
  alsoTry?: { name: string; wikiSlug: string } | null;
}) {
  if (!dish) {
    return (
      <section className="bento p-6 text-sm text-muted">
        Signature dish data unavailable.
      </section>
    );
  }

  const budgetLabel =
    budgetMode === "hourly"
      ? `${formatMoney(budget, currencyCode)}/hr`
      : formatMoney(budget, currencyCode);

  const meter = Math.min(100, Math.round((dish.visitorPortions / 40) * 100));

  return (
    <section className="bento fade-in-delay p-5 sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Signature local dish</p>
            <h2 className="display mt-1 text-2xl sm:text-[1.75rem]">
              {dish.dishName}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {cityName} · {dish.unitLabel} ·{" "}
              <span className="tabular">
                {formatMoney(dish.localPrice, dishCurrencyCode)}
              </span>
            </p>
            {alsoTry && (
              <a
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(alsoTry.wikiSlug)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex rounded border border-white/10 bg-obsidian/40 px-2 py-1 text-xs text-muted transition hover:border-amber/30 hover:text-amber"
              >
                Also try: {alsoTry.name}
              </a>
            )}
          </div>
          {dish.wiki?.thumbnailUrl ? (
            <img
              src={dish.wiki.thumbnailUrl}
              alt={dish.dishName}
              className="h-36 w-36 shrink-0 rounded-md object-cover ring-1 ring-white/10 sm:h-40 sm:w-40"
              loading="lazy"
            />
          ) : (
            <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-md border border-white/10 bg-obsidian/60 text-muted sm:h-40 sm:w-40">
              <UtensilsCrossed className="h-9 w-9" />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="surface p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald">
              <Flame className="h-3.5 w-3.5" />
              Visitor purchasing power
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink">
              Your {budgetLabel} buys{" "}
              <span className="font-semibold tabular text-emerald">
                ~{formatNumber(dish.visitorUnitsApprox, 2)}
              </span>{" "}
              {dish.unitLabel}
              {dish.visitorUnitsApprox === 1 ? "" : "s"}
              {dish.dishName.toLowerCase().includes("khinkali")
                ? ` (~${formatNumber(dish.visitorUnitsApprox * 10, 2)} pieces)`
                : ""}
              .
            </p>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                <span>Relative dish yield</span>
                <span className="tabular text-emerald">
                  {formatNumber(dish.visitorUnitsApprox, 2)}×
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-white/8">
                <div
                  className="h-full rounded-sm bg-emerald transition-[width] duration-700 ease-out"
                  style={{ width: `${meter}%` }}
                />
              </div>
            </div>
          </div>

          <div className="surface p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-amber">
              <Users className="h-3.5 w-3.5" />
              Local reality check
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink">
              An average local monthly wage here buys{" "}
              <span className="font-semibold tabular text-amber">
                ~{formatNumber(dish.localWagePortions, 2)}
              </span>{" "}
              {dish.dishName.toLowerCase().includes("khinkali")
                ? "Khinkali plates"
                : `${dish.unitLabel}s`}
              .
            </p>
            <p className="mt-3 text-xs text-muted">
              ≈ {formatNumber(dish.caloriesPerBudget, 2)} kcal on your budget —
              cultural index, not a diet plan.
            </p>
          </div>
        </div>

        {dish.wiki?.extract && (
          <p className="border-t border-white/8 pt-4 text-sm leading-relaxed text-muted">
            {dish.wiki.extract}
            {dish.wiki.pageUrl && (
              <>
                {" "}
                <a
                  href={dish.wiki.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald underline-offset-2 hover:underline"
                >
                  Wikipedia
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
