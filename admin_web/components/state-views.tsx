// Small building blocks for loading, empty and error states.

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 py-12 text-slate-500"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-700" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyView({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">
      {message}
    </p>
  );
}

export function ErrorView({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
    >
      {message}
    </p>
  );
}
