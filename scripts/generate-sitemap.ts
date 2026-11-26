/**
 * Build-time sitemap from curated cities + shareable routes.
 * SITE_URL env overrides the origin (default: https://biterate.vercel.app).
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listCities } from "../shared/cities.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = (process.env.SITE_URL || "https://biterate.vercel.app").replace(
  /\/$/,
  "",
);

const PRESET_COMPARES = [
  "new-york-vs-tbilisi",
  "london-vs-lisbon",
  "tokyo-vs-bangkok",
  "berlin-vs-prague",
  "san-francisco-vs-mexico-city",
  "paris-vs-barcelona",
  "singapore-vs-bali",
  "dubai-vs-istanbul",
];

type Entry = { path: string; changefreq: string; priority: string };

const entries: Entry[] = [
  { path: "/compare/new-york-vs-tbilisi", changefreq: "daily", priority: "1.0" },
  { path: "/decide", changefreq: "weekly", priority: "0.9" },
  { path: "/map", changefreq: "weekly", priority: "0.8" },
  { path: "/shortlist", changefreq: "weekly", priority: "0.7" },
  { path: "/trip", changefreq: "weekly", priority: "0.7" },
  { path: "/equivalent", changefreq: "weekly", priority: "0.6" },
  { path: "/story", changefreq: "weekly", priority: "0.6" },
  { path: "/spend", changefreq: "monthly", priority: "0.5" },
  { path: "/data", changefreq: "monthly", priority: "0.5" },
  ...PRESET_COMPARES.map((pair) => ({
    path: `/compare/${pair}`,
    changefreq: "daily",
    priority: "0.85",
  })),
  ...listCities().map((c) => ({
    path: `/city/${c.slug}`,
    changefreq: "weekly",
    priority: "0.65",
  })),
];

const seen = new Set<string>();
const urls = entries.filter((e) => {
  if (seen.has(e.path)) return false;
  seen.add(e.path);
  return true;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (e) => `  <url>
    <loc>${site}${e.path}</loc>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

writeFileSync(join(root, "public", "sitemap.xml"), xml);
writeFileSync(
  join(root, "public", "robots.txt"),
  `User-agent: *
Allow: /
Disallow: /saved
Disallow: /alerts

Sitemap: ${site}/sitemap.xml
`,
);

console.log(`sitemap: ${urls.length} urls → ${site}`);
