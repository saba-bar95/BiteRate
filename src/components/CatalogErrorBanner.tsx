import { ErrorBanner } from "./ErrorBanner";

/** Shared page + catalog error strip used across tool pages. */
export function CatalogErrorBanner({
  pageError,
  catalogError,
  onRetryPage,
  onReloadCatalog,
}: {
  pageError?: string | null;
  catalogError?: string | null;
  onRetryPage?: () => void;
  onReloadCatalog?: () => void;
}) {
  if (!pageError && !catalogError) return null;
  return (
    <ErrorBanner
      message={pageError || catalogError || ""}
      onRetry={() =>
        catalogError ? onReloadCatalog?.() : onRetryPage?.()
      }
    />
  );
}
