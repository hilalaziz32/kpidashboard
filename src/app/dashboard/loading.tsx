export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="h-9 w-64 rounded bg-slate-200" />
        <div className="h-3 w-48 rounded bg-slate-200" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="h-8 w-24 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="card p-6 space-y-3">
        <div className="h-3 w-20 rounded bg-slate-200" />
        <div className="h-12 w-40 rounded bg-slate-200" />
        <div className="h-2 w-full rounded bg-slate-200" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="h-4 w-32 rounded bg-slate-200" />
        </div>
        <div className="divide-y">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="h-6 w-24 rounded-full bg-slate-200" />
              <div className="h-3 w-32 rounded bg-slate-200" />
              <div className="h-3 w-40 rounded bg-slate-200 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
