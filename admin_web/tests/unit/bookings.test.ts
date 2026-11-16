import { describe, expect, it } from "vitest";

import {
  canCancel,
  countBookings,
  filterBookings,
  NO_FILTERS,
  parseStatus,
  slotIdFor,
  todaysAppointments,
} from "../../lib/bookings";
import type { Booking } from "../../lib/types";

// All dates use the local-time constructor, so the tests pass in any time zone.
const now = new Date(2026, 10, 17, 12, 0); // 17 Nov 2026, 12:00

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: "b1",
    userId: "u1",
    serviceId: "haircut",
    serviceName: "Haircut",
    startAt: new Date(2026, 10, 17, 15, 0),
    durationMinutes: 30,
    status: "confirmed",
    ...overrides,
  };
}

const morningToday = booking({ id: "a", startAt: new Date(2026, 10, 17, 9, 0) });
const afternoonToday = booking({
  id: "b",
  startAt: new Date(2026, 10, 17, 15, 0),
});
const cancelledToday = booking({
  id: "c",
  startAt: new Date(2026, 10, 17, 10, 0),
  status: "cancelled",
});
const tomorrowBeard = booking({
  id: "d",
  serviceId: "beard-trim",
  serviceName: "Beard trim",
  startAt: new Date(2026, 10, 18, 9, 30),
});
const yesterday = booking({ id: "e", startAt: new Date(2026, 10, 16, 11, 0) });
const all = [
  morningToday,
  afternoonToday,
  cancelledToday,
  tomorrowBeard,
  yesterday,
];

const ids = (bookings: Booking[]) => bookings.map((b) => b.id);

describe("parseStatus", () => {
  it("keeps confirmed and cancelled", () => {
    expect(parseStatus("confirmed")).toBe("confirmed");
    expect(parseStatus("cancelled")).toBe("cancelled");
  });
  it("treats unknown values as cancelled, like the Flutter app", () => {
    expect(parseStatus("pending")).toBe("cancelled");
    expect(parseStatus(undefined)).toBe("cancelled");
  });
});

describe("slotIdFor", () => {
  it("builds serviceId_millis, like SlotCalculator.slotId()", () => {
    const start = new Date(Date.UTC(2025, 10, 17, 8, 0));
    expect(slotIdFor("haircut", start)).toBe("haircut_1763366400000");
  });
});

describe("canCancel", () => {
  it("allows a confirmed booking that hasn't started", () => {
    expect(canCancel(afternoonToday, now)).toBe(true);
  });
  it("refuses one that already started", () => {
    expect(canCancel(morningToday, now)).toBe(false);
  });
  it("refuses a cancelled one", () => {
    expect(canCancel({ ...afternoonToday, status: "cancelled" }, now)).toBe(
      false,
    );
  });
});

describe("filterBookings", () => {
  it("returns everything without filters", () => {
    expect(filterBookings(all, NO_FILTERS)).toHaveLength(5);
  });
  it("filters by local date", () => {
    expect(ids(filterBookings(all, { ...NO_FILTERS, date: "2026-11-17" }))).toEqual(
      ["a", "b", "c"],
    );
  });
  it("filters by status", () => {
    expect(
      ids(filterBookings(all, { ...NO_FILTERS, status: "cancelled" })),
    ).toEqual(["c"]);
  });
  it("filters by service", () => {
    expect(
      ids(filterBookings(all, { ...NO_FILTERS, serviceId: "beard-trim" })),
    ).toEqual(["d"]);
  });
  it("combines filters", () => {
    const result = filterBookings(all, {
      date: "2026-11-17",
      status: "confirmed",
      serviceId: "haircut",
    });
    expect(ids(result)).toEqual(["a", "b"]);
  });
});

describe("countBookings", () => {
  it("counts today's confirmed, upcoming confirmed and cancelled", () => {
    expect(countBookings(all, now)).toEqual({
      today: 2,
      upcoming: 2,
      cancelled: 1,
    });
  });
  it("is all zeros for no bookings", () => {
    expect(countBookings([], now)).toEqual({
      today: 0,
      upcoming: 0,
      cancelled: 0,
    });
  });
});

describe("todaysAppointments", () => {
  it("lists today's confirmed bookings, earliest first", () => {
    const result = todaysAppointments(
      [afternoonToday, cancelledToday, morningToday, tomorrowBeard],
      now,
    );
    expect(ids(result)).toEqual(["a", "b"]);
  });
});
