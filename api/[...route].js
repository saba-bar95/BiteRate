import { getRequestListener } from "@hono/node-server";
import app from "./app.mjs";

export const config = {
  maxDuration: 30,
};

/** Classic Node (req, res) listener — reliable on Vercel Node serverless. */
export default getRequestListener(app.fetch);
