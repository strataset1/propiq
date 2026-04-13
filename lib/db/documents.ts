// lib/db/documents.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type DocumentRow = {
  id: string;
  property_id: string;
  type: string;
  label: string;
  source_url: string | null;
  storage_path: string | null;
  file_hash: string | null;
  page_count: number | null;
  ingested_via: string;
  processed_at: string | null;
  created_at: string;
};

export async function findDocumentsByProperty(
  propertyId: string,
  supabase: SupabaseClient
): Promise<DocumentRow[]> {
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function findDocumentById(
  id: string,
  supabase: SupabaseClient
): Promise<DocumentRow | null> {
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
}

export async function findUnprocessedDocuments(
  supabase: SupabaseClient,
  limit = 100
): Promise<DocumentRow[]> {
  const { data } = await supabase
    .from("documents")
    .select("*")
    .is("processed_at", null)
    .limit(limit);
  return data ?? [];
}

export async function markDocumentProcessed(
  id: string,
  supabase: SupabaseClient
): Promise<void> {
  await supabase
    .from("documents")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", id);
}
