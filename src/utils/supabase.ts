// utils/supabase.ts
import { createClient } from "@supabase/supabase-js";

// Function for encapsulating dynamic initialization
export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "The Supabase URL or Key did not load correctly; please check the environment variable configuration."
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}
