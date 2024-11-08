import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

const downloadRoutes = new Hono();

downloadRoutes.get("/:id/:cookie", async (c) => {
  const { id, cookie } = c.req.param();

  const response = await fetch(
    `${process.env.API_URL}/song/download/url?id=${id}&cookie=${cookie}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new HTTPException(500, { message: "Failed to download song" });
  }

  const data = await response.json();
  return c.json(data);
});

downloadRoutes.onError((error, c) => {
  console.error("Error processing request:", error);
  return c.json({ error: error.message || "Internal Server Error" }, 500);
});

export default downloadRoutes;
