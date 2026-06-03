export async function normaliseAddress(raw: string, region: "au" | "us" = "au"): Promise<string> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;

  if (!apiKey) {
    return raw.trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
  }

  const countryComponent = region === "us" ? "country:US" : "country:AU";

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(raw)}&components=${countryComponent}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.results.length > 0) {
      return data.results[0].formatted_address.toLowerCase();
    }
  } catch {
    // Fall through
  }

  return raw.trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
}
