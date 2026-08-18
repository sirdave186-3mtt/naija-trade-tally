import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://rfypktbyrtjlqtmbqyul.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeXBrdGJ5cnRqbHF0bWJxeXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjI1OTIsImV4cCI6MjEwMjYzODU5Mn0.xe2AVDVzKItTDXHu_9i9Y29UiOr0wj4_oNFOAqxN6iQ";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
