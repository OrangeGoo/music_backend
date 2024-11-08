import { serve } from "@hono/node-server";
import { Hono } from "hono";
import dotenv from "dotenv";
import playlistRoutes from "./routes/playlist.js";
import downloadRoutes from "./routes/download.js";
import { cors } from "hono/cors";

dotenv.config();

const app = new Hono();

app.use(
  cors({
    origin: "*",
  })
);

app.route("/playlist", playlistRoutes);
app.route("/download", downloadRoutes);

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
