import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { getSupabaseClient } from "../utils/supabase.js";
import {
  downloadAndUploadSong,
  fetchAndPrepareFiles,
  fetchSongId,
  notifyFastAPI,
} from "../api/download_api.js";

const downloadRoutes = new Hono();

const taskStatus = new Map<string, (status: string) => void>();

downloadRoutes.get("/", async (c) => {
  const keywords = c.req.query("keywords");
  const cookie = c.req.query("cookie");
  const supabase = getSupabaseClient();

  if (!keywords || !cookie) {
    throw new HTTPException(400, {
      message: "Keywords and cookie parameters are required",
    });
  }

  try {
    const songId = await fetchSongId(keywords);
    await downloadAndUploadSong(songId, cookie, supabase);
    await notifyFastAPI(songId, taskStatus);

    const responseBuffer = await fetchAndPrepareFiles(songId, supabase);
    c.res.headers.set(
      "Content-Type",
      "multipart/form-data; boundary=boundary12345"
    );
    return new Response(responseBuffer, { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    throw new HTTPException(500, { message: "Internal Server Error" });
  }
});

// Receive fastapi callback notification
downloadRoutes.post("/notify", async (c) => {
  const { song_id, status } = await c.req.json();

  if (!song_id || !status) {
    return c.json({ error: "Missing parameters" }, 400);
  }

  const callback = taskStatus.get(song_id);
  if (callback) {
    callback(status);
    taskStatus.delete(song_id);
    console.log(`Processed callback for song_id: ${song_id}`);
  } else {
    console.log(`No callback found for song_id: ${song_id}`);
  }

  return c.json({ message: "Notification received" });
});

downloadRoutes.onError((error, c) => {
  console.error("Error processing request:", error);
  return c.json({ error: error.message || "Internal Server Error" }, 500);
});

export default downloadRoutes;
