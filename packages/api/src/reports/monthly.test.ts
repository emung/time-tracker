import { describe, expect, test } from "bun:test";
import { getCurrentMonthRange, getWeeksInRange } from "./monthly";
import { shouldFireMonthlyNow } from "../scheduler/monthlyReportScheduler";

const TZ = "Europe/Bucharest";

describe("getCurrentMonthRange", () => {
  test("returns first and last day of a 30-day month", () => {
    expect(getCurrentMonthRange(TZ, new Date("2026-09-15T12:00:00Z"))).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
      monthStart: "2026-09-01",
    });
  });

  test("handles February in leap and non-leap years", () => {
    expect(getCurrentMonthRange(TZ, new Date("2028-02-10T12:00:00Z")).to).toBe("2028-02-29");
    expect(getCurrentMonthRange(TZ, new Date("2027-02-10T12:00:00Z")).to).toBe("2027-02-28");
  });

  test("uses the local month, not the UTC one", () => {
    // 22:30 UTC on Sep 30 is already Oct 1 in Bucharest (UTC+3).
    expect(getCurrentMonthRange(TZ, new Date("2026-09-30T22:30:00Z")).from).toBe("2026-10-01");
  });
});

describe("getWeeksInRange", () => {
  test("splits a month into Monday–Sunday weeks clipped to the month", () => {
    // September 2026 starts on a Tuesday and ends on a Wednesday.
    expect(getWeeksInRange("2026-09-01", "2026-09-30")).toEqual([
      { weekStart: "2026-08-31", from: "2026-09-01", to: "2026-09-06" },
      { weekStart: "2026-09-07", from: "2026-09-07", to: "2026-09-13" },
      { weekStart: "2026-09-14", from: "2026-09-14", to: "2026-09-20" },
      { weekStart: "2026-09-21", from: "2026-09-21", to: "2026-09-27" },
      { weekStart: "2026-09-28", from: "2026-09-28", to: "2026-09-30" },
    ]);
  });

  test("handles a month starting on Monday and a single-day final week", () => {
    // June 2026 starts on Monday; August 2026 ends on Monday the 31st.
    expect(getWeeksInRange("2026-06-01", "2026-06-30")[0]).toEqual({
      weekStart: "2026-06-01",
      from: "2026-06-01",
      to: "2026-06-07",
    });
    expect(getWeeksInRange("2026-08-01", "2026-08-31").at(-1)).toEqual({
      weekStart: "2026-08-31",
      from: "2026-08-31",
      to: "2026-08-31",
    });
  });
});

describe("shouldFireMonthlyNow", () => {
  test("fires at 18:00 local on the last day of the month", () => {
    // 15:00 UTC = 18:00 Bucharest (EEST, UTC+3).
    expect(shouldFireMonthlyNow(new Date("2026-09-30T15:00:00Z"), TZ)).toBe(true);
    // 16:00 UTC = 18:00 Bucharest (EET, UTC+2) in winter.
    expect(shouldFireMonthlyNow(new Date("2026-12-31T16:00:00Z"), TZ)).toBe(true);
    expect(shouldFireMonthlyNow(new Date("2028-02-29T16:00:00Z"), TZ)).toBe(true);
  });

  test("does not fire on other days or minutes", () => {
    expect(shouldFireMonthlyNow(new Date("2026-09-29T15:00:00Z"), TZ)).toBe(false);
    expect(shouldFireMonthlyNow(new Date("2026-09-30T15:01:00Z"), TZ)).toBe(false);
    expect(shouldFireMonthlyNow(new Date("2026-09-30T14:00:00Z"), TZ)).toBe(false);
    expect(shouldFireMonthlyNow(new Date("2027-02-28T16:00:00Z"), TZ)).toBe(true);
    expect(shouldFireMonthlyNow(new Date("2028-02-28T16:00:00Z"), TZ)).toBe(false);
  });
});
