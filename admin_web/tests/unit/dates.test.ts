import { describe, expect, it } from "vitest";

import {
  addMinutes,
  formatDate,
  formatDuration,
  formatPrice,
  formatTime,
  formatTimeRange,
  isSameLocalDay,
  toDateKey,
} from "../../lib/dates";

describe("toDateKey", () => {
  it("formats the local date as YYYY-MM-DD with zero padding", () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("isSameLocalDay", () => {
  it("is true for two times on the same day", () => {
    expect(
      isSameLocalDay(new Date(2026, 10, 17, 0, 0), new Date(2026, 10, 17, 23, 59)),
    ).toBe(true);
  });
  it("is false across midnight", () => {
    expect(
      isSameLocalDay(new Date(2026, 10, 17, 23, 59), new Date(2026, 10, 18, 0, 0)),
    ).toBe(false);
  });
});

describe("addMinutes", () => {
  it("adds minutes and rolls over the hour", () => {
    expect(addMinutes(new Date(2026, 10, 17, 9, 45), 30)).toEqual(
      new Date(2026, 10, 17, 10, 15),
    );
  });
});

// A fixed locale, so the result doesn't depend on the computer's language.
describe("formatting", () => {
  const start = new Date(2026, 10, 17, 9, 30);
  it("formats a date", () => {
    expect(formatDate(start, "en-GB")).toBe("Tue, 17 Nov 2026");
  });
  it("formats a 24-hour time", () => {
    expect(formatTime(new Date(2026, 10, 17, 14, 5), "en-GB")).toBe("14:05");
  });
  it("formats a time range", () => {
    expect(formatTimeRange(start, 90, "en-GB")).toBe("09:30 – 11:00");
  });
});

describe("formatDuration", () => {
  it.each([
    [30, "30 min"],
    [60, "1 h"],
    [90, "1 h 30 min"],
  ])("%i minutes -> %s", (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });
});

describe("formatPrice", () => {
  it("drops .00 for whole prices and keeps 2 decimals otherwise", () => {
    expect(formatPrice(25)).toBe("$25");
    expect(formatPrice(12.5)).toBe("$12.50");
  });
});
