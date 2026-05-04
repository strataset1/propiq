// Backfills address_normalised for all properties using Google Geocoding API.
// Usage: node scripts/backfill-addresses.mjs

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_GEOCODING_API_KEY is not set");
  process.exit(1);
}

async function normalise(raw) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(raw)}&components=country:AU&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results.length > 0) {
      return data.results[0].formatted_address.toLowerCase();
    }
  } catch {
    // fall through
  }
  return raw.trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
}

const { data: properties, error } = await supabase
  .from("properties")
  .select("id, address_raw, address_normalised")
  .order("created_at", { ascending: true });

if (error) { console.error("Failed to fetch properties:", error); process.exit(1); }
if (!properties.length) { console.log("No properties found."); process.exit(0); }

console.log(`Backfilling ${properties.length} properties...\n`);

let success = 0;
let failed = 0;

for (const prop of properties) {
  process.stdout.write(`${prop.address_raw}... `);

  const normalised = await normalise(prop.address_raw);

  if (normalised === prop.address_normalised) {
    console.log("unchanged");
    success++;
    continue;
  }

  const { error: updateError } = await supabase
    .from("properties")
    .update({ address_normalised: normalised })
    .eq("id", prop.id);

  if (updateError) {
    console.log(`FAILED (${updateError.message})`);
    failed++;
  } else {
    console.log(`→ ${normalised}`);
    success++;
  }

  // Respect Google's rate limit (50 requests/sec max)
  await new Promise((r) => setTimeout(r, 50));
}

console.log(`\nDone. ${success} updated, ${failed} failed.`);
