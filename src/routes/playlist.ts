import { Hono } from "hono";

const playlistRoutes = new Hono();

playlistRoutes.post("/", async (c) => {
  try {
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
      console.error("Fetch error:", response.statusText);
      return c.json({ error: "Failed to fetch playlist" }, 500);
    }

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error("Error processing request:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default playlistRoutes;
