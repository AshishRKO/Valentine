import { describe, it, expect, beforeAll, beforeEach } from "vitest";

beforeAll(async () => {
  document.body.innerHTML = "";
  await import("../wedding/wedding.js");
});

describe("wedding — pure helpers", () => {
  const api = () => window.__wedding;

  it("exposes the chapter order", () => {
    const { CHAPTERS } = api();
    expect(CHAPTERS).toEqual([
      "index.html",
      "eve.html",
      "morning.html",
      "rings.html",
      "court.html",
      "evening.html",
      "days.html",
      "letter.html",
      "closing.html",
    ]);
  });

  describe("currentChapterIndex", () => {
    beforeEach(() => {
      // happy-dom lets us reset pathname per test
    });

    it("returns 0 for the cover when the URL ends in /", () => {
      window.history.replaceState(null, "", "/wedding/");
      const { currentChapterIndex } = api();
      expect(currentChapterIndex()).toBe(0);
    });

    it("returns 0 for /wedding/index.html", () => {
      window.history.replaceState(null, "", "/wedding/index.html");
      const { currentChapterIndex } = api();
      expect(currentChapterIndex()).toBe(0);
    });

    it("maps each chapter filename to its position", () => {
      const { currentChapterIndex, CHAPTERS } = api();
      CHAPTERS.forEach((file, idx) => {
        window.history.replaceState(null, "", "/wedding/" + file);
        expect(currentChapterIndex()).toBe(idx);
      });
    });

    it("falls back to 0 for an unknown filename", () => {
      window.history.replaceState(null, "", "/wedding/oops.html");
      const { currentChapterIndex } = api();
      expect(currentChapterIndex()).toBe(0);
    });
  });
});
