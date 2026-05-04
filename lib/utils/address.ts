export async function normaliseAddress(raw: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;

  if (!apiKey) {
    // Fallback if key not available
    return raw.trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(raw)}&components=country:AU&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.results.length > 0) {
      // Use the formatted address lowercased as the canonical form
      return data.results[0].formatted_address.toLowerCase();
    }
  } catch {
    // Fall through to stub on any error
  }

  return raw.trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
}
