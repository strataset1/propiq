import { buildBatchRequests, parseBatchResult } from "@/lib/processing/batch";

describe("buildBatchRequests", () => {
  it("creates one request per document", () => {
    const docs = [
      { id: "doc-1", type: "strata", extracted_text: "By-law 1: No pets" },
      { id: "doc-2", type: "building_inspection", extracted_text: "No structural issues" },
    ];
    const requests = buildBatchRequests(docs);
    expect(requests).toHaveLength(2);
    expect(requests[0].custom_id).toBe("doc-1");
    expect(requests[1].custom_id).toBe("doc-2");
  });

  it("sets custom_id to document id", () => {
    const docs = [{ id: "abc-123", type: "strata", extracted_text: "some text" }];
    const [req] = buildBatchRequests(docs);
    expect(req.custom_id).toBe("abc-123");
  });

  it("includes document text in the prompt", () => {
    const docs = [{ id: "doc-1", type: "strata", extracted_text: "Pets are not allowed" }];
    const [req] = buildBatchRequests(docs);
    const content = req.params.messages[0].content as string;
    expect(content).toContain("Pets are not allowed");
  });
});

describe("parseBatchResult", () => {
  it("parses valid JSON extraction from Claude response", () => {
    const responseText = `Here is the extracted data:
\`\`\`json
{
  "short_term_rental": { "value": "no", "detail": "Not permitted", "legal_summary": "By-law 12 prohibits STR" },
  "pets_allowed": { "value": "yes", "detail": "Cats and dogs under 5kg", "legal_summary": "By-law 7 permits pets" },
  "interior_renovations": { "value": "maybe", "detail": "Requires BC approval", "legal_summary": null },
  "exterior_renovations": { "value": "no", "detail": "Not permitted", "legal_summary": "By-law 15" },
  "confidence": 0.88
}
\`\`\``;

    const result = parseBatchResult(responseText);
    expect(result).not.toBeNull();
    expect(result!.short_term_rental.value).toBe("no");
    expect(result!.pets_allowed.value).toBe("yes");
    expect(result!.confidence).toBe(0.88);
  });

  it("returns null for unparseable response", () => {
    expect(parseBatchResult("I could not extract data from this document")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseBatchResult("```json\n{ broken json }\n```")).toBeNull();
  });
});
