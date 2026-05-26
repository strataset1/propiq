import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { findDocumentById } from "@/lib/db/documents";

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json() as { documentId?: string };
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const doc = await findDocumentById(documentId, supabase);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (!doc.storage_path) {
      return NextResponse.json({ error: "Document file not available" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: 995,
            product_data: {
              name: doc.label ?? "Strata By-Laws Document",
              description: "Single PDF download — ByLawsIndex.com",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "doc_purchase",
        document_id: documentId,
      },
      success_url: `${appUrl}/download?session={CHECKOUT_SESSION_ID}`,
      cancel_url: appUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[checkout/document]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
