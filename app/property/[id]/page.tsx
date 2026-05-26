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
    { data: bylaws },
    { data: docs },
    { data: liab },
  ] = await Promise.all([
    supabase.from("properties").select("id, address_raw").eq("id", id).maybeSingle(),
    supabase.from("strata_bylaws")
      .select("id")
      .eq("property_id", id)
      .limit(1)
      .maybeSingle(),
    supabase.from("documents")
      .select("id, label, type")
      .eq("property_id", id)
      .not("processed_at", "is", null)
      .limit(10),
    supabase.from("strata_liability_extractions")
      .select("id")
      .eq("property_id", id)
      .limit(1)
      .maybeSingle(),
  ]);

  if (!property) notFound();

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
          hasBylaws={!!bylaws}
          hasLiability={!!liab}
          docs={docs ?? []}
        />
      </div>
    </div>
  );
}
