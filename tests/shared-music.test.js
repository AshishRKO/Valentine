import { describe, it, expect, beforeAll } from "vitest";

// happy-dom doesn't ship a full AudioContext implementation. The music
// engine only touches Web Audio inside start(), so we test the bits
// that don't need the audio graph.
beforeAll(async () => {
  document.body.innerHTML = "";
  await import("../shared/music.js");
});

describe("shared/music — pure helpers", () => {
  const api = () => window.__ambient;

  it("exposes the music singleton and pickNote helper", () => {
    const { music, pickNote, NOTES_WEDDING, NOTES_BIRTHDAY } = api();
    expect(typeof music).toBe("object");
    expect(typeof music.start).toBe("function");
    expect(typeof music.stop).toBe("function");
    expect(typeof pickNote).toBe("function");
    expect(NOTES_WEDDING.length).toBeGreaterThan(0);
    expect(NOTES_BIRTHDAY.length).toBeGreaterThan(0);
  });

  describe("pickNote", () => {
    it("always returns a value from the scale", () => {
      const { pickNote, NOTES_WEDDING } = api();
      for (let i = 0; i < 200; i++) {
        const r = pickNote(NOTES_WEDDING, Math.random);
        expect(NOTES_WEDDING).toContain(r);
      }
    });

    it("uses the provided RNG (deterministic with a stub)", () => {
      const { pickNote, NOTES_BIRTHDAY } = api();
      const rng = () => 0;       // always biased to the middle third
      const v = pickNote(NOTES_BIRTHDAY, rng);
      // With r=0, the formula picks index floor(scale.len * 0.33) = floor(15*0.33)=4
      expect(v).toBe(NOTES_BIRTHDAY[4]);
    });
  });

  describe("setMood", () => {
    it("switches the active scale", () => {
      const { music, NOTES_WEDDING, NOTES_BIRTHDAY } = api();
      music.setMood("birthday");
      expect(music.scale).toBe(NOTES_BIRTHDAY);
      music.setMood("wedding");
      expect(music.scale).toBe(NOTES_WEDDING);
    });
  });

  describe("setOnPersisted / isOnPersisted", () => {
    it("round-trips via localStorage", () => {
      const { music } = api();
      music.setOnPersisted(true);
      expect(music.isOnPersisted()).toBe(true);
      music.setOnPersisted(false);
      expect(music.isOnPersisted()).toBe(false);
    });
  });
});
