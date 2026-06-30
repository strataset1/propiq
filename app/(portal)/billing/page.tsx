export default function BillingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Billing</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <p className="text-slate-300 text-sm">
          Manage your subscription, download invoices, and update payment details via the Stripe Customer Portal.
        </p>
        <a
          href="/api/billing/portal"
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Open Billing Portal →
        </a>
      </div>
    </div>
  );
}

