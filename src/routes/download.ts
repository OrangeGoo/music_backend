import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { getSupabaseClient } from "../utils/supabase.js";

const downloadRoutes = new Hono();

downloadRoutes.get("/", async (c) => {
  const keywords = c.req.query("keywords");
  const cookie = c.req.query("cookie");

  if (!keywords || !cookie) {
    throw new HTTPException(400, {
      message: "Keywords and cookie parameters are required",
    });
  }

  // Fetch playlist to get song ID
  const playlistResponse = await fetch(
    `${process.env.API_URL}/cloudsearch?keywords=${encodeURIComponent(
      keywords
    )}`,
    {
      method: "GET",
    }
  );

  if (!playlistResponse.ok) {
    const errorText = await playlistResponse.text();
    console.error("Playlist fetch failed:", errorText);
    throw new HTTPException(500, { message: "Failed to fetch playlist" });
  }

  const playlistData = await playlistResponse.json();
  const songId = playlistData.result.songs[0]?.id;

  if (!songId) {
    throw new HTTPException(404, { message: "No song found" });
  }

  // Fetch the song download URL using the song ID
  const response = await fetch(
    `${process.env.API_URL}/song/url?id=${songId}&cookie=${encodeURIComponent(
      cookie
    )}&realIP=116.25.146.176`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Song URL fetch failed:", errorText);
    throw new HTTPException(500, { message: "Failed to fetch song URL" });
  }

  const data = await response.json();
  const downloadUrl = data.data[0]?.url;

  if (!downloadUrl) {
    throw new HTTPException(404, { message: "No download URL found" });
  }

  const audioResponse = await fetch(downloadUrl);
  if (!audioResponse.ok || !audioResponse.body) {
    throw new HTTPException(500, { message: "Failed to fetch audio" });
  }

  // Convert audioResponse.body to Buffer
  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

  const supabase = getSupabaseClient();
  // Upload to Supabase storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("raw_music")
    .upload(`songs/${songId}.mp3`, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading to Supabase:", uploadError);
    throw new HTTPException(500, {
      message: "Failed to upload song to Supabase",
    });
  }

  return c.json({ message: "Song uploaded successfully", uploadData });
});

downloadRoutes.onError((error, c) => {
  console.error("Error processing request:", error);
  return c.json({ error: error.message || "Internal Server Error" }, 500);
});

export default downloadRoutes;
