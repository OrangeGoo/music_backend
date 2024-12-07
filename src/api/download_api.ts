import { HTTPException } from "hono/http-exception";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetches the song ID based on the given keywords.
 */
export async function fetchSongId(keywords: string): Promise<string> {
  const response = await fetch(
    `${process.env.API_URL}/cloudsearch?keywords=${encodeURIComponent(
      keywords
    )}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Playlist fetch failed:", errorText);
    throw new HTTPException(500, { message: "Failed to fetch playlist" });
  }

  const data = await response.json();
  const songId = data.result.songs[0]?.id;
  if (!songId) {
    throw new HTTPException(404, { message: "No song found" });
  }

  return songId;
}

/**
 * Downloads the song audio and uploads it to Supabase.
 */
export async function downloadAndUploadSong(
  songId: string,
  cookie: string,
  supabase: SupabaseClient<any, "public", any>
): Promise<void> {
  const response = await fetch(
    `${process.env.API_URL}/song/url?id=${songId}&cookie=${encodeURIComponent(
      cookie
    )}&realIP=116.25.146.176`,
    { method: "GET" }
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

  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  const { error } = await supabase.storage
    .from("raw_music")
    .upload(`songs/${songId}.mp3`, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (error) {
    console.error("Error uploading to Supabase:", error);
    throw new HTTPException(500, {
      message: "Failed to upload song to Supabase",
    });
  }
}

/**
 * Fetches and prepares the multipart/form-data response with the processed CSV files.
 */
export async function fetchAndPrepareFiles(
  songId: string,
  supabase: SupabaseClient<any, "public", any>
): Promise<Buffer> {
  const fileTypes = ["Guitar", "Bass", "Piano", "Vocals", "Drums"];
  const boundary = "boundary12345";
  const parts: string[] = [];

  for (const fileType of fileTypes) {
    const filePath = `${songId}/${songId}-${fileType}.csv`;
    const { data: fileStream, error } = await supabase.storage
      .from("csv_music")
      .download(filePath);

    if (error || !fileStream) {
      console.error(`Failed to download file: ${filePath}`, error);
      throw new HTTPException(500, {
        message: `Failed to download file: ${filePath}`,
      });
    }

    const fileBuffer = Buffer.from(await fileStream.arrayBuffer());
    parts.push(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${songId}-${fileType}.csv"\r\n` +
        `Content-Type: text/csv\r\n\r\n` +
        fileBuffer.toString("utf-8") +
        `\r\n`
    );
  }

  parts.push(`--${boundary}--\r\n`);
  return Buffer.concat(parts.map((part) => Buffer.from(part, "utf-8")));
}

/**
 * Notifies FastAPI to process the song and waits for the callback.
 */
export async function notifyFastAPI(
  songId: string,
  taskStatus: Map<string, (status: string) => void>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      taskStatus.delete(String(songId));
      reject(new HTTPException(500, { message: "Processing timed out" }));
    }, 120000);

    taskStatus.set(String(songId), (status: string) => {
      clearTimeout(timeout);
      if (status === "converted") {
        resolve(songId);
      } else {
        reject(new HTTPException(500, { message: "Processing failed" }));
      }
    });

    setImmediate(async () => {
      const fastApiUrl = process.env.FASTAPI_URL;
      const notifyResponse = await fetch(
        `${fastApiUrl}/process-song?song_id=${songId}`,
        { method: "GET" }
      );

      if (!notifyResponse.ok) {
        console.error("Failed to notify FastAPI:", await notifyResponse.text());
        taskStatus.delete(songId);
        reject(new HTTPException(500, { message: "Failed to notify FastAPI" }));
      }
    });
  });
}
