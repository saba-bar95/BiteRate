import { ArrowUpRight, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { formatMoney, formatNumber } from "../lib/format";

export function AffiliateStrip({
  currency,
  budget,
  bankFee,
  multiFee,
  savings,
  savingsPct,
}: {
  currency: string;
  budget: number;
  bankFee: number;
  multiFee: number;
  savings: number;
  savingsPct: number;
}) {
  const spendTo = `/spend?amount=${encodeURIComponent(String(budget))}&currency=${encodeURIComponent(currency)}`;

  return (
    <section className="bento fade-in flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-obsidian/50 text-muted">
          <CreditCard className="h-4 w-4" />
        </div>
        <div>
          <p className="eyebrow">Smart spend</p>
          <h2 className="display mt-1 text-xl">
            Keep more of your {formatMoney(budget, currency)} abroad
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Banks often take ~3% on FX. A multi-currency card at ~0.5% could
            save about{" "}
            <span className="tabular text-emerald">
              {formatMoney(savings, currency)}
            </span>{" "}
            ({formatNumber(savingsPct, 2)}%) — bank fee{" "}
            {formatMoney(bankFee, currency)} vs card fee{" "}
            {formatMoney(multiFee, currency)}.
          </p>
        </div>
      </div>
      <Link
        to={spendTo}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-white/12 bg-panel px-4 text-sm font-medium text-ink transition hover:border-amber/40 hover:text-amber"
      >
        Multi-currency cards
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
