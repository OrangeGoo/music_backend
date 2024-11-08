import { Hono } from "hono";

const downloadRoutes = new Hono();

downloadRoutes.get("/:id/:cookie", async (c) => {
  try {
    const { id, cookie } = c.req.param();

    const response = await fetch(
      `${process.env.API_URL}/song/download/url?id=${id}&cookie=${cookie}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      console.error("Fetch error:", response.statusText);
      return c.json({ error: "Failed to download song" }, 500);
    }

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error("Error processing request:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default downloadRoutes;
