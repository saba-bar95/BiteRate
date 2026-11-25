import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export function PrimaryButton({
  loading,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-emerald/30 bg-emerald/10 px-3 text-sm text-emerald transition hover:border-emerald/50 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {loading ? <LoadingSpinner size="sm" /> : null}
      {children}
    </button>
  );
}
