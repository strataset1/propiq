import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, Organisation, ApiKey } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { checkQuota } from "@/lib/api/quota";
import { apiError, ApiErrorCode } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";

export type AuthContext = { org: Organisation; apiKey: ApiKey };

type RouteHandler = (
  req: NextRequest,
  ctx: Record<string, unknown>,
  auth: AuthContext
) => Promise<NextResponse | Response>;

export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, ctx: Record<string, unknown>): Promise<NextResponse | Response> => {
    const authResult = await validateApiKey(req);
    if (!authResult.ok) {
      return apiError(authResult.code);
    }

    const { org, apiKey } = authResult;

    const rateLimit = await checkRateLimit(apiKey.id);
    if (!rateLimit.allowed) {
      return apiError(ApiErrorCode.RATE_LIMITED);
    }

    const supabase = createServiceClient();
    const quota = await checkQuota(org.id, org.monthly_quota, supabase);
    if (!quota.allowed) {
      return apiError(ApiErrorCode.QUOTA_EXCEEDED);
    }

    return handler(req, ctx, { org, apiKey });
  };
}
