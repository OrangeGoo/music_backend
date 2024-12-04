import dotenv from "dotenv";
dotenv.config();

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import downloadRoutes from "./routes/download.js";
import { cors } from "hono/cors";

const app = new Hono();

app.use(
  cors({
    origin: "*",
  })
);

app.route("/download", downloadRoutes);

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
