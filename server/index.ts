import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "./app.ts";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distDir = path.join(rootDir, "dist");

const isProd = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3848);
const host = process.env.HOST ?? "127.0.0.1";

if (isProd && !process.env.VERCEL && existsSync(distDir)) {
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  app.use("/favicon.svg", serveStatic({ root: "./dist" }));
  app.use("/favicon.ico", serveStatic({ root: "./dist" }));
  app.get("*", async (c) => {
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: "Not found" }, 404);
    }
    const index = path.join(distDir, "index.html");
    const { readFile } = await import("node:fs/promises");
    return c.html(await readFile(index, "utf8"));
  });
}

const skipListen =
  Boolean(process.env.VERCEL) || process.env.BITE_SKIP_LISTEN === "1";

if (!skipListen) {
  try {
    serve({ fetch: app.fetch, port, hostname: host }, (info) => {
      console.log(`BiteRate API listening on http://${host}:${info.port}`);
    });
  } catch (err) {
    console.error("BiteRate API failed to start:", err);
    process.exit(1);
  }
}

export default app;
