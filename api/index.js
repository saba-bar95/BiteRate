import { getRequestListener } from "@hono/node-server";
import app from "./app.mjs";

export const config = {
  maxDuration: 30,
};

/**
 * Single serverless entry for all /api/* traffic (rewritten in vercel.json).
 * Nested catch-all files were 404ing multi-segment paths under the Vite preset.
 */
export default getRequestListener(app.fetch);
