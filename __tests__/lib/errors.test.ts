import { apiError, ApiErrorCode } from "@/lib/api/errors";

describe("apiError", () => {
  it("returns 401 for UNAUTHORIZED", () => {
    const res = apiError(ApiErrorCode.UNAUTHORIZED);
    expect(res.status).toBe(401);
  });

  it("returns 429 for QUOTA_EXCEEDED", () => {
    const res = apiError(ApiErrorCode.QUOTA_EXCEEDED);
    expect(res.status).toBe(429);
  });

  it("returns JSON body with code and message", async () => {
    const res = apiError(ApiErrorCode.NOT_FOUND, "Property not found");
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "NOT_FOUND", message: "Property not found" },
    });
  });

  it("uses default message when none provided", async () => {
    const res = apiError(ApiErrorCode.UNAUTHORIZED);
    const body = await res.json();
    expect(body.error.message).toBe("Invalid or missing API key");
  });
});
