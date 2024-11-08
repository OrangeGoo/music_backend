import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
const playlistRoutes = new Hono();

playlistRoutes.post("/", async (c) => {
  const { keywords } = await c.req.json();

  const response = await fetch(
    `${process.env.API_URL}/cloudsearch?keywords=${encodeURIComponent(
      keywords
    )}`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new HTTPException(500, { message: "Failed to fetch playlist" });
  }

  const data = await response.json();
  return c.json(data);
});

playlistRoutes.onError((error, c) => {
  console.error("Error processing request:", error);
  return c.json({ error: error.message || "Internal Server Error" }, 500);
});

export default playlistRoutes;
