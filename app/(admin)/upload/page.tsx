import { UploadForm } from "@/components/admin/upload-form";

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
        <UploadForm />
      </div>
    </div>
  );
}
