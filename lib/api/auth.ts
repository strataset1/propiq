import { NextRequest } from "next/server";
import { sha256 } from "@/lib/utils/hash";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiErrorCode } from "@/lib/api/errors";

export type Organisation = {
  id: string;
  license_paid_at: string | null;
  monthly_quota: number;
  plan: string;
};

export type ApiKey = {
  id: string;
  org_id: string;
};

export type AuthSuccess = { ok: true; org: Organisation; apiKey: ApiKey };
export type AuthFailure = { ok: false; code: ApiErrorCode.UNAUTHORIZED | ApiErrorCode.FORBIDDEN };
export type AuthResult = AuthSuccess | AuthFailure;

export function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function validateApiKey(req: NextRequest): Promise<AuthResult> {
  const token = extractBearerToken(req);
  if (!token) return { ok: false, code: ApiErrorCode.UNAUTHORIZED };

  const keyHash = sha256(token);
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, org_id, organisations(id, license_paid_at, monthly_quota, plan)")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (error || !data) return { ok: false, code: ApiErrorCode.UNAUTHORIZED };

  const org = data.organisations as unknown as Organisation;
  if (!org?.license_paid_at) return { ok: false, code: ApiErrorCode.FORBIDDEN };

  // Update last_used_at (fire and forget)
  try {
    supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => {});
  } catch {
    // Non-critical — do not fail the request if this update errors
  }

  return { ok: true, org, apiKey: { id: data.id, org_id: data.org_id } };
}
