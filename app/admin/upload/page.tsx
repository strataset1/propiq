import { UploadForm } from "@/components/admin/upload-form";

async function uploadDocument(formData: FormData): Promise<{ ok: true; documentId: string } | { ok: false; error: string }> {
  "use server";

  const file = formData.get("file") as File | null;
  const address = formData.get("address") as string | null;
  const type = formData.get("type") as string | null;
  const label = formData.get("label") as string | null;

  if (!file || !address || !type || !label) {
    return { ok: false, error: "Missing required fields" };
  }

  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("address", address);
  uploadFormData.append("type", type);
  uploadFormData.append("label", label);

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/upload`, {
    method: "POST",
    headers: { "x-admin-secret": process.env.ADMIN_SECRET! },
    body: uploadFormData,
  });

  const data = await res.json();
  if (res.ok) {
    return { ok: true, documentId: data.document_id };
  }
  return { ok: false, error: data.error ?? "Upload failed" };
}

export default function AdminUploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Upload Documents</h1>
        <p className="text-slate-400 text-sm mt-1">
          Tag each PDF to a property address and document type. Duplicates are detected automatically via SHA-256.
        </p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <UploadForm uploadAction={uploadDocument} />
      </div>
    </div>
  );
}
