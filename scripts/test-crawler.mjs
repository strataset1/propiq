// Quick test: can Tavily find strata report PDFs for Sydney suburbs?
// Run with: node scripts/test-crawler.mjs

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

if (!TAVILY_API_KEY) {
  console.error("Missing TAVILY_API_KEY — run with: TAVILY_API_KEY=tvly-xxx node scripts/test-crawler.mjs");
  process.exit(1);
}

const TEST_SUBURBS = ["Manly NSW", "Bondi NSW", "Surry Hills NSW", "Chatswood NSW"];

async function searchSuburb(suburb) {
  const query = `${suburb} strata by-laws report PDF`;
  console.log(`\nSearching: "${query}"`);

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: 5,
      include_domains: [],
      exclude_domains: [],
    }),
  });

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    console.log("  No results found");
    return;
  }

  for (const result of data.results) {
    const isPdf = result.url.toLowerCase().endsWith(".pdf");
    console.log(`  ${isPdf ? "✓ PDF" : "  page"} ${result.url}`);
    console.log(`         ${result.title}`);
  }
}

for (const suburb of TEST_SUBURBS) {
  await searchSuburb(suburb);
}

console.log("\nDone.");
