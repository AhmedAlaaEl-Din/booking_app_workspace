"use client";

// "/" Overview: three counts and today's appointments.
import { Spinner, EmptyView, ErrorView } from "@/components/state-views";
import { countBookings, todaysAppointments } from "@/lib/bookings";
import { useData, useNow } from "@/lib/data-context";
import { formatDate, formatTimeRange } from "@/lib/dates";
import { BOOKINGS_LIMIT } from "@/lib/firestore";

export default function OverviewPage() {
  const { bookings, users } = useData();
  const now = useNow();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-slate-500">{formatDate(now)}</p>
      </div>

      {bookings.state === "loading" && <Spinner />}
      {bookings.state === "error" && <ErrorView message={bookings.message} />}
      {bookings.state === "ready" && (
        <>
          <Counts counts={countBookings(bookings.data, now)} />
          <p className="-mt-6 text-xs text-slate-500">
            Counted from the latest {BOOKINGS_LIMIT} bookings.
          </p>

          <section>
            <h2 className="mb-3 text-lg font-semibold">
              Today&apos;s appointments
            </h2>
            <TodayList
              bookings={todaysAppointments(bookings.data, now)}
              userName={(uid) =>
                users.state === "ready"
                  ? (users.data.get(uid)?.name ?? "Unknown customer")
                  : "…"
              }
            />
          </section>
        </>
      )}
    </div>
  );
}

function Counts({
  counts,
}: {
  counts: ReturnType<typeof countBookings>;
}) {
  const tiles = [
    { label: "Today's bookings", value: counts.today },
    { label: "Upcoming confirmed", value: counts.upcoming },
    { label: "Cancelled", value: counts.cancelled },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="card p-5">
          <p className="text-sm text-slate-500">{tile.label}</p>
          <p className="mt-1 text-3xl font-semibold">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}

function TodayList({
  bookings,
  userName,
}: {
  bookings: ReturnType<typeof todaysAppointments>;
  userName: (uid: string) => string;
}) {
  if (bookings.length === 0) {
    return <EmptyView message="No confirmed appointments today." />;
  }
  return (
    <ul className="card divide-y divide-slate-200">
      {bookings.map((b) => (
        <li
          key={b.id}
          className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
        >
          <span className="font-medium tabular-nums">
            {formatTimeRange(b.startAt, b.durationMinutes)}
          </span>
          <span className="text-slate-700">{b.serviceName}</span>
          <span className="text-slate-500">{userName(b.userId)}</span>
        </li>
      ))}
    </ul>
  );
}
