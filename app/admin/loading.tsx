export default function AdminLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-slate-800 rounded" />
      <div className="h-4 w-72 bg-slate-800/60 rounded" />
      <div className="h-32 bg-slate-900 border border-slate-800 rounded-xl mt-6" />
      <div className="h-32 bg-slate-900 border border-slate-800 rounded-xl" />
    </div>
  );
}
