import type { BookingStatus } from "@/lib/types";

const styles: Record<BookingStatus, string> = {
  confirmed: "bg-teal-50 text-teal-800 ring-teal-200",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${styles[status]}`}
    >
      {status}
    </span>
  );
}
