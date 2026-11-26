import { useAbortableQuery } from "./useAbortableQuery";
import { fetchCitiesCatalog, type CityCatalogItem } from "../lib/api";

type CatalogState = {
  cities: CityCatalogItem[];
  byCountry: Record<string, Array<{ slug: string; name: string }>>;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useCitiesCatalog(): CatalogState {
  const { data, loading, error, reload } = useAbortableQuery(
    (signal) => fetchCitiesCatalog(signal),
    [],
    "Failed to load cities",
  );

  return {
    cities: data?.cities ?? [],
    byCountry: data?.byCountry ?? {},
    loading,
    error,
    reload,
  };
}
