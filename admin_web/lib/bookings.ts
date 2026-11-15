// Pure booking logic: no Firebase, no React. Unit tested in tests/unit.
import { isSameLocalDay, toDateKey } from "./dates";
import type { Booking, BookingStatus } from "./types";

/** Unknown values count as cancelled, the same choice as the Flutter app. */
export function parseStatus(raw: unknown): BookingStatus {
  return raw === "confirmed" ? "confirmed" : "cancelled";
}

/**
 * Document ID of a booking's entry in the `slots` collection, e.g.
 * "haircut_1763373600000". Must match SlotCalculator.slotId() in the app and
 * slotDoc() in firestore.rules.
 */
export function slotIdFor(serviceId: string, startAt: Date): string {
  return `${serviceId}_${startAt.getTime()}`;
}

/** Same rule as the app: only confirmed bookings that haven't started yet. */
export function canCancel(booking: Booking, now: Date): boolean {
  return booking.status === "confirmed" && booking.startAt > now;
}

export type BookingFilters = {
  date: string; // "YYYY-MM-DD", or "" for any date
  status: BookingStatus | "all";
  serviceId: string; // or "all"
};

export const NO_FILTERS: BookingFilters = {
  date: "",
  status: "all",
  serviceId: "all",
};

/** Keeps the bookings that match every filter that is set. */
export function filterBookings(
  bookings: Booking[],
  filters: BookingFilters,
): Booking[] {
  return bookings.filter(
    (b) =>
      (filters.date === "" || toDateKey(b.startAt) === filters.date) &&
      (filters.status === "all" || b.status === filters.status) &&
      (filters.serviceId === "all" || b.serviceId === filters.serviceId),
  );
}

export type BookingCounts = {
  today: number; // confirmed bookings starting today
  upcoming: number; // confirmed bookings that haven't started yet
  cancelled: number;
};

export function countBookings(bookings: Booking[], now: Date): BookingCounts {
  return {
    today: todaysAppointments(bookings, now).length,
    upcoming: bookings.filter((b) => canCancel(b, now)).length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };
}

/** Today's confirmed bookings, earliest first. */
export function todaysAppointments(bookings: Booking[], now: Date): Booking[] {
  return bookings
    .filter((b) => b.status === "confirmed" && isSameLocalDay(b.startAt, now))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
