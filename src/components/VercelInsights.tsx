import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useLocation } from "react-router-dom";

/** Map concrete paths to Analytics route templates for grouped reporting. */
function analyticsRoute(pathname: string): string {
  if (pathname.startsWith("/compare/")) return "/compare/:compare";
  if (pathname.startsWith("/city/")) return "/city/:slug";
  if (pathname === "/") return "/";
  return pathname;
}

export function VercelInsights() {
  const location = useLocation();
  const path = `${location.pathname}${location.search}`;
  const route = analyticsRoute(location.pathname);

  return (
    <>
      <Analytics route={route} path={path} />
      <SpeedInsights route={route} />
    </>
  );
}
