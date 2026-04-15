// Local crawler — runs on your machine, no Vercel timeout limits
// Usage: node scripts/crawl.mjs [number-of-suburbs]
// Example: node scripts/crawl.mjs 20

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { PDFParse } from "pdf-parse";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TAVILY_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars. Run with:");
  console.error("  TAVILY_API_KEY=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/crawl.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BATCH_SIZE = parseInt(process.argv[2] ?? "10", 10);

const SYDNEY_SUBURBS = [
  "Manly NSW", "Bondi NSW", "Surry Hills NSW", "Chatswood NSW",
  "Newtown NSW", "Glebe NSW", "Pyrmont NSW", "Ultimo NSW",
  "Darlinghurst NSW", "Potts Point NSW", "Elizabeth Bay NSW", "Kings Cross NSW",
  "Paddington NSW", "Woollahra NSW", "Double Bay NSW", "Rose Bay NSW",
  "Vaucluse NSW", "Watsons Bay NSW", "Edgecliff NSW", "Rushcutters Bay NSW",
  "Balmain NSW", "Rozelle NSW", "Leichhardt NSW", "Annandale NSW",
  "Camperdown NSW", "Redfern NSW", "Waterloo NSW", "Zetland NSW",
  "Rosebery NSW", "Alexandria NSW", "Erskineville NSW", "St Peters NSW",
  "Marrickville NSW", "Dulwich Hill NSW", "Petersham NSW", "Ashfield NSW",
  "Burwood NSW", "Strathfield NSW", "Homebush NSW", "Concord NSW",
  "Rhodes NSW", "Meadowbank NSW", "Ryde NSW", "Gladesville NSW",
  "Lane Cove NSW", "Artarmon NSW", "St Leonards NSW", "Crows Nest NSW",
  "North Sydney NSW", "Kirribilli NSW", "Neutral Bay NSW", "Cremorne NSW",
  "Mosman NSW", "Dee Why NSW", "Collaroy NSW", "Narrabeen NSW",
  "Avalon Beach NSW", "Newport NSW", "Mona Vale NSW", "Gordon NSW",
  "Killara NSW", "Lindfield NSW", "Roseville NSW", "Turramurra NSW",
  "Wahroonga NSW", "Pymble NSW", "St Ives NSW", "Hornsby NSW",
  "Epping NSW", "Eastwood NSW", "Parramatta NSW", "Westmead NSW",
  "Granville NSW", "Merrylands NSW", "Liverpool NSW", "Campbelltown NSW",
  "Hurstville NSW", "Kogarah NSW", "Rockdale NSW", "Arncliffe NSW",
  "Wolli Creek NSW", "Mascot NSW", "Botany NSW", "Maroubra NSW",
  "Coogee NSW", "Randwick NSW", "Kensington NSW", "Kingsford NSW",
  "Cronulla NSW", "Miranda NSW", "Caringbah NSW", "Sutherland NSW",
];

const NOISE_DOMAINS = [
  "parliament.nsw.gov.au", "nsw.gov.au", "legislation.nsw.gov.au",
  "austlii.edu.au", "rg-guidelines.nswlrs.com.au", "planning.nsw.gov.au",
];

const STREET_TYPES = "Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct|Crescent|Cres|Boulevard|Blvd|Way|Close|Cl|Parade|Pde|Terrace|Tce";
const ADDRESS_REGEX = new RegExp(`\\d+(?:[–\\-]\\d+)?\\s+[A-Z][A-Za-z]+(?:\\s+[A-Z][A-Za-z]+)*\\s+(?:${STREET_TYPES})\\b`, "i");

function sha256(str) {
  return createHash("sha256").update(str).digest("hex");
}

function extractAddressFromUrl(url) {
  const filename = decodeURIComponent(url.split("/").pop() ?? "")
    .replace(/\.pdf$/i, "").replace(/[_-]/g, " ")
    .replace(/SP\s*\d+/gi, "").replace(/strata\s*plan\s*\d+/gi, "")
    .replace(/by\s*laws?/gi, "").replace(/\s+/g, " ").trim();
  const match = filename.match(ADDRESS_REGEX);
  return match ? match[0] : null;
}

function extractAddressFromText(text) {
  const match = text.slice(0, 2000).match(ADDRESS_REGEX);
  return match ? match[0] : null;
}

async function searchSuburb(suburb) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: `${suburb} strata by-laws report PDF`,
      search_depth: "basic",
      max_results: 10,
    }),
  });
  const data = await res.json();
  return (data.results ?? [])
    .filter(r => r.url.toLowerCase().endsWith(".pdf") && !NOISE_DOMAINS.some(d => r.url.includes(d)))
    .map(r => r.url);
}

async function ingestPdf(url, suburb) {
  // Download
  let buffer;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return `HTTP ${res.status}`;
    buffer = Buffer.from(await res.arrayBuffer());
  } catch {
    return "Download failed/timed out";
  }

  // Dedup
  const fileHash = sha256(buffer.toString("base64"));
  const { data: existing } = await supabase.from("documents").select("id").eq("file_hash", fileHash).single();
  if (existing) return "Duplicate";

  // Extract text
  let text = "", pageCount = 1;
  try {
    const parsed = await new PDFParse({ data: buffer }).getText();
    text = parsed.text.trim();
    pageCount = parsed.totalPages;
  } catch {
    return "Text extraction failed";
  }
  if (text.length < 200) return "Too little text";

  // Address
  const addressRaw = extractAddressFromUrl(url) ?? extractAddressFromText(text) ?? suburb;

  // Upsert property
  const { data: property, error: propError } = await supabase
    .from("properties")
    .upsert({ address_raw: addressRaw, address_normalised: addressRaw.toLowerCase(), status: "processing" }, { onConflict: "address_normalised" })
    .select().single();
  if (propError || !property) return "Failed to upsert property";

  // Upload to storage
  const filename = url.split("/").pop() ?? `${Date.now()}.pdf`;
  const storagePath = `${property.id}/${Date.now()}-${filename}`;
  const { error: uploadError } = await supabase.storage.from("property-documents").upload(storagePath, buffer, { contentType: "application/pdf" });
  if (uploadError) return "Storage upload failed";

  // Insert document
  const { error: docError } = await supabase.from("documents").insert({
    property_id: property.id,
    type: "strata",
    label: `Strata By-Laws — ${suburb}`,
    source_url: url,
    storage_path: storagePath,
    file_hash: fileHash,
    page_count: pageCount,
    extracted_text: text,
    ingested_via: "crawler",
  });
  if (docError) return "Failed to insert document";

  return null; // success
}

// Get already-crawled suburbs
const { data: crawled } = await supabase.from("suburb_crawls").select("suburb");
const crawledSet = new Set(crawled?.map(r => r.suburb) ?? []);

const toProcess = SYDNEY_SUBURBS.filter(s => !crawledSet.has(s)).slice(0, BATCH_SIZE);

if (toProcess.length === 0) {
  console.log("All suburbs already crawled.");
  process.exit(0);
}

console.log(`Crawling ${toProcess.length} suburbs...\n`);
let totalDocs = 0;

for (const suburb of toProcess) {
  process.stdout.write(`${suburb}... `);
  const urls = await searchSuburb(suburb);
  let docsFound = 0;

  console.log(`  found ${urls.length} PDF URLs`);
  for (const url of urls) {
    const err = await ingestPdf(url, suburb);
    if (!err) {
      docsFound++;
      console.log(`  ✓ ${url}`);
    } else {
      console.log(`  ✗ ${url} — ${err}`);
    }
  }

  await supabase.from("suburb_crawls").insert({ suburb, docs_found: docsFound });
  totalDocs += docsFound;
  console.log(`  → ${docsFound} docs saved\n`);
}

console.log(`\nDone. ${totalDocs} documents added across ${toProcess.length} suburbs.`);
