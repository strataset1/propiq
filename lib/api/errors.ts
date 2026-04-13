import { NextResponse } from "next/server";

export enum ApiErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL = "INTERNAL",
}

const STATUS: Record<ApiErrorCode, number> = {
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.QUOTA_EXCEEDED]: 429,
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.INTERNAL]: 500,
};

const DEFAULT_MESSAGE: Record<ApiErrorCode, string> = {
  [ApiErrorCode.UNAUTHORIZED]: "Invalid or missing API key",
  [ApiErrorCode.FORBIDDEN]: "API access not activated — licensing fee required",
  [ApiErrorCode.NOT_FOUND]: "Not found",
  [ApiErrorCode.QUOTA_EXCEEDED]: "Monthly lookup quota exceeded",
  [ApiErrorCode.RATE_LIMITED]: "Rate limit exceeded — 100 requests/minute",
  [ApiErrorCode.INTERNAL]: "Internal server error",
};

export function apiError(code: ApiErrorCode, message?: string): NextResponse {
  return NextResponse.json(
    { error: { code, message: message ?? DEFAULT_MESSAGE[code] } },
    { status: STATUS[code] }
  );
}
