import { useEffect } from "react";

const DEFAULT_DESCRIPTION =
  "BiteRate — Global & Local Purchasing Power Index. Compare cities by FX, wages, weather, and how many local dishes your money buys.";

const OG_IMAGE = "/og.svg";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(
    `link[rel="${rel}"]`,
  ) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (typeof window === "undefined") return pathOrUrl;
  return new URL(pathOrUrl, window.location.origin).href;
}

/** Sets document title + description / Open Graph / Twitter tags for the current page. */
export function useSeo(
  pageTitle: string,
  description?: string,
  opts?: { noIndex?: boolean; image?: string },
) {
  useEffect(() => {
    const previousTitle = document.title;
    const title = pageTitle.includes("BiteRate")
      ? pageTitle
      : `BiteRate — ${pageTitle}`;
    const desc = description?.trim() || DEFAULT_DESCRIPTION;
    const url =
      typeof window !== "undefined" ? window.location.href.split("#")[0]! : "";
    const image = absoluteUrl(opts?.image || OG_IMAGE);

    document.title = title;
    upsertMeta("name", "description", desc);
    upsertMeta(
      "name",
      "robots",
      opts?.noIndex ? "noindex,nofollow" : "index,follow",
    );
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "BiteRate");
    upsertMeta("property", "og:image", image);
    if (url) {
      upsertMeta("property", "og:url", url);
      upsertLink("canonical", url);
    }
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", image);

    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle, description, opts?.noIndex, opts?.image]);
}
