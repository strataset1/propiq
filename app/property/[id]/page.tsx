import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import PropertyView from "./property-view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase.from("properties").select("address_raw").eq("id", id).maybeSingle();
  return { title: data?.address_raw ? `${data.address_raw} — ByLawsIndex.com` : "Property — ByLawsIndex.com" };
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [
    { data: property },
    { data: bylawsCheck },
    { data: docs },
    { data: liabCheck },
  ] = await Promise.all([
    supabase.from("properties").select("id, address_raw").eq("id", id).maybeSingle(),
    supabase.from("strata_bylaws").select("id").eq("property_id", id).limit(1).maybeSingle(),
    supabase.from("documents").select("id, label, type, storage_path").eq("property_id", id).not("processed_at", "is", null).limit(10),
    supabase.from("strata_liability_extractions").select("id").eq("property_id", id).limit(1).maybeSingle(),
  ]);

  if (!property) notFound();

  // Check if any document for this property has been purchased
  const docIds = (docs ?? []).map((d) => d.id);
  const { data: purchase } = docIds.length > 0
    ? await supabase.from("purchases").select("document_id").in("document_id", docIds).limit(1).maybeSingle()
    : { data: null };

  const isPurchased = !!purchase;

  // If purchased, fetch the full extracted data and generate a signed download URL
  let bylawData = null;
  let liabilityData = null;
  let downloadUrl: string | null = null;

  if (isPurchased) {
    const [{ data: bylaws }, { data: liab }] = await Promise.all([
      supabase
        .from("strata_bylaws")
        .select("pets_allowed_value, short_term_rental_value, interior_renovations_value, exterior_renovations_value, confidence")
        .eq("property_id", id)
        .order("processed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("strata_liability_extractions")
        .select("combustible_cladding_summary, combustible_cladding_responsible_party, combustible_cladding_source, building_defect_summary, building_defect_responsible_party, building_defect_source, str_rules_summary, str_rules_responsible_party, str_rules_source, maintenance_responsibility_summary, maintenance_responsibility_responsible_party, maintenance_responsibility_source, insurance_excess_summary, insurance_excess_responsible_party, insurance_excess_source, special_levy_summary, special_levy_responsible_party, special_levy_source, mixed_use_occupancy_summary, mixed_use_occupancy_responsible_party, mixed_use_occupancy_source, pets_summary, pets_responsible_party, pets_source")
        .eq("property_id", id)
        .order("processed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    bylawData = bylaws ?? null;
    liabilityData = liab ?? null;

    // Generate a 1-hour signed URL for the purchased document
    const purchasedDoc = (docs ?? []).find((d) => d.id === purchase.document_id);
    if (purchasedDoc?.storage_path) {
      const { data: signed } = await supabase.storage
        .from("property-documents")
        .createSignedUrl(purchasedDoc.storage_path, 60 * 60);
      downloadUrl = signed?.signedUrl ?? null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-white font-bold tracking-tight text-lg">ByLawsIndex.com</Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">Home</Link>
            <Link href="/about" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">About</Link>
            <Link href="/contact" className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">Contact</Link>
            <Link href="/login" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm px-4 py-1.5 rounded-lg transition-colors font-medium">API Access →</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-10 pb-20 w-full">
        <Link href="/" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to search
        </Link>

        <PropertyView
          address={property.address_raw ?? "Unknown address"}
          hasBylaws={!!bylawsCheck}
          hasLiability={!!liabCheck}
          docs={(docs ?? []).map(({ id, label, type }) => ({ id, label, type }))}
          isPurchased={isPurchased}
          bylawData={bylawData}
          liabilityData={liabilityData as Record<string, string | number | null> | null}
          downloadUrl={downloadUrl}
        />
      </div>
    </div>
  );
}
