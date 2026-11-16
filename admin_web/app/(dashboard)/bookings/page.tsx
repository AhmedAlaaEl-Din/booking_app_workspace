"use client";

// "/bookings": every booking (latest 200), filters, and cancel.
import { useState } from "react";

import { ConfirmDialog } from "@/components/modal";
import { EmptyView, ErrorView, Spinner } from "@/components/state-views";
import { StatusBadge } from "@/components/status-badge";
import {
  canCancel,
  filterBookings,
  NO_FILTERS,
  type BookingFilters,
} from "@/lib/bookings";
import { useData, useNow } from "@/lib/data-context";
import { formatDate, formatTimeRange } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { BOOKINGS_LIMIT, cancelBooking } from "@/lib/firestore";
import type { Booking } from "@/lib/types";

export default function BookingsPage() {
  const { bookings, services, users } = useData();
  const now = useNow();
  const [filters, setFilters] = useState<BookingFilters>(NO_FILTERS);

  // The booking waiting for "are you sure?", and the dialog's state.
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function openCancel(booking: Booking) {
    setCancelError(null);
    setToCancel(booking);
  }

  async function confirmCancel() {
    if (!toCancel) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelBooking(toCancel);
      setToCancel(null); // The table updates by itself through onSnapshot.
    } catch (err) {
      setCancelError(friendlyError(err));
    } finally {
      setCancelling(false);
    }
  }

  // Filtering happens here in the browser, so Firestore needs no extra index.
  const shown =
    bookings.state === "ready" ? filterBookings(bookings.data, filters) : [];

  const customer = (uid: string) =>
    users.state === "ready" ? users.data.get(uid) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <p className="text-sm text-slate-500">
          The latest {BOOKINGS_LIMIT} bookings by appointment time, updated
          live. Times are in your local time.
        </p>
      </div>

      <Filters
        filters={filters}
        onChange={setFilters}
        services={services.state === "ready" ? services.data : []}
      />

      {users.state === "error" && (
        <ErrorView message={`Customer details: ${users.message}`} />
      )}

      {bookings.state === "loading" && <Spinner />}
      {bookings.state === "error" && <ErrorView message={bookings.message} />}
      {bookings.state === "ready" && bookings.data.length === 0 && (
        <EmptyView message="No bookings yet." />
      )}
      {bookings.state === "ready" &&
        bookings.data.length > 0 &&
        shown.length === 0 && (
          <EmptyView message="No bookings match these filters." />
        )}
      {shown.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date and time</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {shown.map((b) => {
                const person = customer(b.userId);
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3">
                      <div>{formatDate(b.startAt)}</div>
                      <div className="text-slate-500 tabular-nums">
                        {formatTimeRange(b.startAt, b.durationMinutes)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{person?.name || "Unknown customer"}</div>
                      <div className="text-slate-500">
                        {person?.email ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">{b.serviceName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canCancel(b, now) && (
                        <button
                          type="button"
                          onClick={() => openCancel(b)}
                          className="btn-secondary text-red-700"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {toCancel && (
        <ConfirmDialog
          title="Cancel this booking?"
          message={
            <p>
              {toCancel.serviceName} for{" "}
              <strong>
                {customer(toCancel.userId)?.name || "Unknown customer"}
              </strong>{" "}
              on {formatDate(toCancel.startAt)},{" "}
              {formatTimeRange(toCancel.startAt, toCancel.durationMinutes)}.
              The time becomes free for other customers.
            </p>
          }
          confirmLabel="Cancel booking"
          busyLabel="Cancelling…"
          dismissLabel="Keep booking"
          busy={cancelling}
          error={cancelError}
          onConfirm={confirmCancel}
          onClose={() => setToCancel(null)}
        />
      )}
    </div>
  );
}

function Filters({
  filters,
  onChange,
  services,
}: {
  filters: BookingFilters;
  onChange: (filters: BookingFilters) => void;
  services: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="filter-date" className="label">
          Date
        </label>
        <input
          id="filter-date"
          type="date"
          value={filters.date}
          onChange={(e) => onChange({ ...filters, date: e.target.value })}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="filter-status" className="label">
          Status
        </label>
        <select
          id="filter-status"
          value={filters.status}
          onChange={(e) =>
            onChange({
              ...filters,
              status: e.target.value as BookingFilters["status"],
            })
          }
          className="input"
        >
          <option value="all">All</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div>
        <label htmlFor="filter-service" className="label">
          Service
        </label>
        <select
          id="filter-service"
          value={filters.serviceId}
          onChange={(e) => onChange({ ...filters, serviceId: e.target.value })}
          className="input"
        >
          <option value="all">All</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => onChange(NO_FILTERS)}
        className="btn-secondary mb-0.5"
      >
        Clear filters
      </button>
    </div>
  );
}
