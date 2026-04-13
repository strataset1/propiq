import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ApiKeyCard } from "@/components/portal/api-key-card";
import { sha256 } from "@/lib/utils/hash";
import { randomBytes } from "crypto";

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();
  const { data: org } = await service
    .from("organisations")
    .select("id")
    .eq("owner_email", user.email)
    .single();

  if (!org) redirect("/dashboard");

  const { data: keys } = await service
    .from("api_keys")
    .select("id, label, last_used_at, created_at")
    .eq("org_id", org.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  async function createKey(formData: FormData) {
    "use server";
    const label = formData.get("label") as string;
    if (!label?.trim()) return;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const service = createServiceClient();
    const { data: org } = await service
      .from("organisations")
      .select("id")
      .eq("owner_email", user.email)
      .single();
    if (!org) return;

    const rawKey = `sk_live_${randomBytes(24).toString("hex")}`;
    const keyHash = sha256(rawKey);

    await service.from("api_keys").insert({
      org_id: org.id,
      key_hash: keyHash,
      label,
      is_active: true,
    });

    redirect("/api-keys?created=true");
  }

  async function revokeKey(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const service = createServiceClient();
    await service
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", id);

    redirect("/api-keys");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">API Keys</h1>
          <p className="text-slate-400 text-sm mt-1">Keys are shown once on creation and cannot be retrieved again.</p>
        </div>
        <form action={createKey} className="flex gap-2">
          <input
            name="label"
            placeholder="Key label"
            required
            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="submit"
            className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New key
          </button>
        </form>
      </div>

      {keys?.length === 0 && (
        <p className="text-slate-500 text-sm py-8 text-center">No API keys yet. Create one above.</p>
      )}

      <div className="space-y-3">
        {keys?.map((key) => (
          <form key={key.id} action={revokeKey}>
            <input type="hidden" name="id" value={key.id} />
            <ApiKeyCard
              id={key.id}
              label={key.label}
              lastUsedAt={key.last_used_at}
              createdAt={key.created_at}
              onRevoke={() => {}}
            />
          </form>
        ))}
      </div>
    </div>
  );
}
