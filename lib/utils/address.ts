/**
 * Normalises a raw address string to a canonical lowercase form.
 *
 * STUB: Basic string normalisation only.
 * Replace with Google Maps Geocoding API call once GOOGLE_GEOCODING_API_KEY is available.
 * Return type and signature must not change.
 */
export async function normaliseAddress(raw: string): Promise<string> {
  return raw
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
