import { describe, it, expect, beforeAll } from "vitest";

beforeAll(async () => {
  document.body.innerHTML = "";
  await import("../shared/interactive.js");
});

describe("shared/interactive — pure helpers", () => {
  const api = () => window.__interactive;

  describe("daysSince", () => {
    it("counts whole calendar days between two dates", () => {
      const { daysSince } = api();
      expect(daysSince(new Date(2026, 4, 7), new Date(2026, 4, 7))).toBe(0);
      expect(daysSince(new Date(2026, 4, 7), new Date(2026, 4, 8))).toBe(1);
      expect(daysSince(new Date(2026, 4, 7), new Date(2026, 4, 14))).toBe(7);
      expect(daysSince(new Date(2026, 4, 7), new Date(2027, 4, 7))).toBe(365);
    });

    it("clamps negatives to zero", () => {
      const { daysSince } = api();
      expect(daysSince(new Date(2026, 4, 14), new Date(2026, 4, 7))).toBe(0);
    });

    it("ignores time-of-day, only counts dates", () => {
      const { daysSince } = api();
      const from = new Date(2026, 4, 7, 23, 59, 59);
      const to = new Date(2026, 4, 8, 0, 0, 1);
      expect(daysSince(from, to)).toBe(1);
    });

    it("throws on non-Date input", () => {
      const { daysSince } = api();
      expect(() => daysSince("2026-05-07", new Date())).toThrow(TypeError);
    });
  });

  describe("elapsed", () => {
    it("returns 0 years/months/days for same date", () => {
      const { elapsed } = api();
      const d = new Date(2026, 4, 7);
      expect(elapsed(d, d)).toEqual({ years: 0, months: 0, days: 0, totalDays: 0 });
    });

    it("handles same-month differences", () => {
      const { elapsed } = api();
      const r = elapsed(new Date(2026, 4, 7), new Date(2026, 4, 20));
      expect(r.years).toBe(0);
      expect(r.months).toBe(0);
      expect(r.days).toBe(13);
      expect(r.totalDays).toBe(13);
    });

    it("borrows days from the previous month when needed", () => {
      const { elapsed } = api();
      // Mar 30, 2026 → Apr 5, 2026  (6 days; April was reached on the 1st)
      const r = elapsed(new Date(2026, 2, 30), new Date(2026, 3, 5));
      expect(r.years).toBe(0);
      expect(r.months).toBe(0);
      expect(r.days).toBe(6);
    });

    it("rolls months into years", () => {
      const { elapsed } = api();
      const r = elapsed(new Date(2026, 4, 7), new Date(2027, 6, 9));
      expect(r.years).toBe(1);
      expect(r.months).toBe(2);
      expect(r.days).toBe(2);
    });
  });

  describe("escapeHTML", () => {
    it("escapes the standard 5 entities", () => {
      const { escapeHTML } = api();
      expect(escapeHTML("Tom & Jerry <3 'a' \"b\"")).toBe(
        "Tom &amp; Jerry &lt;3 &#39;a&#39; &quot;b&quot;"
      );
    });

    it("returns a string for non-string input", () => {
      const { escapeHTML } = api();
      expect(escapeHTML(42)).toBe("42");
      expect(escapeHTML(null)).toBe("null");
    });
  });
});
