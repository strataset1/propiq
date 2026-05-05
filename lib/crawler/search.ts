import OpenAI from "openai";

const NOISE_FILENAME_PATTERNS = [
  "handbook", "guide", "overview", "factsheet", "fact-sheet", "fact_sheet",
  "template", "sample", "example", "community", "communities", "information",
  "newsletter", "annual-report", "annual_report", "policy", "policies",
  "brochure", "presentation", "slideshow", "agenda", "notice", "meeting",
];

function isNoisyFilename(url: string): boolean {
  const filename = url.split("/").pop()?.toLowerCase() ?? "";
  return NOISE_FILENAME_PATTERNS.some((p) => filename.includes(p));
}

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().endsWith(".pdf");
}

export type SearchResult = {
  url: string;
  title: string;
};

export async function searchSuburbForPdfs(suburb: string): Promise<SearchResult[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: "gpt-4o",
    tools: [{ type: "web_search_preview" }],
    input: `Find direct links to PDF documents containing registered strata by-laws for specific residential buildings or strata plans located in ${suburb}, Australia.

Requirements:
- Must be a direct .pdf URL (not a webpage linking to a PDF)
- Must be a registered strata by-law document for a specific property or strata plan number in ${suburb}
- Must NOT be a general handbook, guide, meeting notice, agenda, template, or educational resource
- Must NOT be for properties in other suburbs or states

Return ONLY a JSON array of objects with "url" and "title" fields. Example:
[{"url": "https://example.com/sp12345-bylaws.pdf", "title": "SP 12345 By-Laws"}]

If you cannot find any qualifying documents, return an empty array: []`,
  });

  // Extract the text content from the response
  const text = response.output
    .filter((block) => block.type === "message")
    .flatMap((block) => block.type === "message" ? block.content : [])
    .filter((c) => c.type === "output_text")
    .map((c) => c.type === "output_text" ? c.text : "")
    .join("");

  // Parse JSON from the response
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const results = JSON.parse(match[0]) as { url: string; title: string }[];
    return results
      .filter((r) => isPdfUrl(r.url) && !isNoisyFilename(r.url))
      .map((r) => ({ url: r.url, title: r.title }));
  } catch {
    return [];
  }
}
