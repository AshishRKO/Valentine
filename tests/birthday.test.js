import { describe, it, expect, beforeAll } from "vitest";

beforeAll(async () => {
  document.body.innerHTML = "";
  // Stub elements the script binds to so the module loads without errors.
  document.body.innerHTML = `
    <div id="bdayGate"></div>
    <button id="bdayGift"></button>
    <main id="bdayMain" hidden></main>

    <div id="bdayCount" data-state="future">
      <p id="bdayCountLabel"></p>
      <span id="bdayCountDays"></span>
      <span id="bdayCountHours"></span>
      <span id="bdayCountMinutes"></span>
      <span id="bdayCountSeconds"></span>
      <p id="bdayCountFoot"></p>
    </div>

    <div id="bdayCake">
      <button class="candle" data-candle="1"><span class="candle__flame"></span></button>
      <button class="candle" data-candle="2"><span class="candle__flame"></span></button>
      <button class="candle" data-candle="3"><span class="candle__flame"></span></button>
    </div>
    <p id="cakeHint"></p>
    <p id="cakeStatus"></p>

    <div id="bdayWish" hidden>
      <textarea id="bdayWishInput"></textarea>
      <button id="bdayWishSeal"></button>
      <p id="bdayWishError" hidden></p>
      <div id="bdayWishSealed" hidden>
        <button id="bdayWishReset"></button>
      </div>
    </div>

    <div id="bdayConfetti"></div>

    <div id="bdayLightbox" aria-hidden="true">
      <button id="bdayLightboxClose"></button>
      <img id="bdayLightboxImg" />
    </div>

    <section id="bdayClose">
      <button id="bdayMoreConfetti"></button>
      <p id="bdayHiddenMsg" hidden></p>
    </section>
  `;
  await import("../birthday/birthday.js");
});

describe("birthday — pure helpers", () => {
  const api = () => window.__bday;

  describe("getBirthdayTarget", () => {
    it("targets midnight on 17 June of the given year", () => {
      const { getBirthdayTarget } = api();
      const t = getBirthdayTarget(2026);
      expect(t.getFullYear()).toBe(2026);
      expect(t.getMonth()).toBe(5); // June
      expect(t.getDate()).toBe(17);
      expect(t.getHours()).toBe(0);
      expect(t.getMinutes()).toBe(0);
      expect(t.getSeconds()).toBe(0);
    });
  });

  describe("computeCountdown", () => {
    it("returns 'future' state with day/hour/minute/second breakdown", () => {
      const { computeCountdown } = api();
      // 5 days, 3 hours, 2 minutes, 1 second before target
      const target = new Date(2026, 5, 17, 0, 0, 0);
      const now = new Date(
        target.getTime() - (5 * 86400 + 3 * 3600 + 2 * 60 + 1) * 1000
      );
      const r = computeCountdown(now, target);
      expect(r.state).toBe("future");
      expect(r.days).toBe(5);
      expect(r.hours).toBe(3);
      expect(r.minutes).toBe(2);
      expect(r.seconds).toBe(1);
    });

    it("returns 'today' if now is on the same calendar day as target", () => {
      const { computeCountdown } = api();
      const target = new Date(2026, 5, 17, 0, 0, 0);
      const noon = new Date(2026, 5, 17, 12, 30, 0);
      const r = computeCountdown(noon, target);
      expect(r.state).toBe("today");
      expect(r.days).toBe(0);
    });

    it("returns 'past' if target has already gone by", () => {
      const { computeCountdown } = api();
      const target = new Date(2026, 5, 17, 0, 0, 0);
      const later = new Date(2026, 5, 18, 1, 0, 0);
      const r = computeCountdown(later, target);
      expect(r.state).toBe("past");
    });

    it("throws when called without Date instances", () => {
      const { computeCountdown } = api();
      expect(() => computeCountdown("now", new Date())).toThrow(TypeError);
      expect(() => computeCountdown(new Date(), 123)).toThrow(TypeError);
    });
  });

  describe("pad2", () => {
    it("pads single digits with a leading zero", () => {
      const { pad2 } = api();
      expect(pad2(0)).toBe("00");
      expect(pad2(5)).toBe("05");
      expect(pad2(12)).toBe("12");
      expect(pad2(123)).toBe("123");
    });

    it("clamps negative numbers to zero", () => {
      const { pad2 } = api();
      expect(pad2(-3)).toBe("00");
    });
  });

  describe("wishReducer", () => {
    it("starts with a clean slate", () => {
      const { initialWishState } = api();
      expect(initialWishState).toEqual({
        sealed: false, draft: "", saved: null, error: null
      });
    });

    it("records the draft on TYPE", () => {
      const { wishReducer, initialWishState } = api();
      const next = wishReducer(initialWishState, { type: "TYPE", value: "Be happy" });
      expect(next.draft).toBe("Be happy");
      expect(next.sealed).toBe(false);
    });

    it("seals the wish when there is non-empty content", () => {
      const { wishReducer, initialWishState } = api();
      const draftState = wishReducer(initialWishState, { type: "TYPE", value: "  Be loved.  " });
      const sealed = wishReducer(draftState, { type: "SEAL" });
      expect(sealed.sealed).toBe(true);
      expect(sealed.saved).toBe("Be loved.");
      expect(sealed.error).toBeNull();
    });

    it("rejects sealing an empty wish with an error", () => {
      const { wishReducer, initialWishState } = api();
      const draftState = wishReducer(initialWishState, { type: "TYPE", value: "    " });
      const sealed = wishReducer(draftState, { type: "SEAL" });
      expect(sealed.sealed).toBe(false);
      expect(sealed.error).toMatch(/wish/i);
    });

    it("clears the wish on RESET", () => {
      const { wishReducer, initialWishState } = api();
      const sealed = wishReducer(
        wishReducer(initialWishState, { type: "TYPE", value: "Hi" }),
        { type: "SEAL" }
      );
      const reset = wishReducer(sealed, { type: "RESET" });
      expect(reset.sealed).toBe(false);
      expect(reset.draft).toBe("");
      expect(reset.saved).toBeNull();
    });

    it("ignores unknown actions", () => {
      const { wishReducer, initialWishState } = api();
      const next = wishReducer(initialWishState, { type: "UNKNOWN" });
      expect(next).toBe(initialWishState);
    });
  });

  describe("nextCakePhase", () => {
    it("stays unlit until every candle is lit", () => {
      const { nextCakePhase } = api();
      expect(nextCakePhase("unlit", 2, 3)).toBe("unlit");
    });

    it("moves into the blow phase once all candles are lit", () => {
      const { nextCakePhase } = api();
      expect(nextCakePhase("unlit", 3, 3)).toBe("lit");
    });

    it("stays in the blow phase while any candle is still lit", () => {
      const { nextCakePhase } = api();
      expect(nextCakePhase("lit", 1, 3)).toBe("lit");
    });

    it("becomes blown when the last candle goes out", () => {
      const { nextCakePhase } = api();
      expect(nextCakePhase("lit", 0, 3)).toBe("blown");
    });

    it("relights from blown so the cake is replayable", () => {
      const { nextCakePhase } = api();
      expect(nextCakePhase("blown", 3, 3)).toBe("lit");
    });

    it("is a no-op when there are no candles", () => {
      const { nextCakePhase } = api();
      expect(nextCakePhase("unlit", 0, 0)).toBe("unlit");
    });
  });

  describe("effectiveConfetti", () => {
    it("suppresses every particle when reduced motion is requested", () => {
      const { effectiveConfetti } = api();
      expect(effectiveConfetti(80, true)).toBe(0);
    });

    it("passes the requested count through when motion is allowed", () => {
      const { effectiveConfetti } = api();
      expect(effectiveConfetti(80, false)).toBe(80);
    });
  });

  describe("balloonPhotoIndices", () => {
    it("returns an empty array when there are no photos or no balloons", () => {
      const { balloonPhotoIndices } = api();
      expect(balloonPhotoIndices(0, 9)).toEqual([]);
      expect(balloonPhotoIndices(47, 0)).toEqual([]);
    });

    it("spreads the requested number of indices across the set", () => {
      const { balloonPhotoIndices } = api();
      const idx = balloonPhotoIndices(47, 9);
      expect(idx).toHaveLength(9);
      expect(idx[0]).toBe(0);
      for (let i = 1; i < idx.length; i++) {
        expect(idx[i]).toBeGreaterThan(idx[i - 1]);
        expect(idx[i]).toBeLessThan(47);
      }
    });

    it("never asks for more indices than there are photos, and keeps them unique", () => {
      const { balloonPhotoIndices } = api();
      const idx = balloonPhotoIndices(5, 9);
      expect(idx).toHaveLength(5);
      expect(new Set(idx).size).toBe(5);
    });
  });

  describe("fireworkVector", () => {
    it("places particles evenly around a circle", () => {
      const { fireworkVector } = api();
      const v0 = fireworkVector(0, 4, 100);
      expect(v0.dx).toBeCloseTo(100, 5);
      expect(v0.dy).toBeCloseTo(0, 5);
      const v1 = fireworkVector(1, 4, 100);
      expect(v1.dx).toBeCloseTo(0, 5);
      expect(v1.dy).toBeCloseTo(100, 5);
    });

    it("scales the spread with the radius", () => {
      const { fireworkVector } = api();
      const v = fireworkVector(0, 8, 50);
      expect(Math.hypot(v.dx, v.dy)).toBeCloseTo(50, 5);
    });
  });

  describe("isTapGesture", () => {
    it("treats a still, quick pointer as a tap", () => {
      const { isTapGesture } = api();
      expect(isTapGesture({ x: 100, y: 200, t: 0 }, { x: 103, y: 202, t: 120 })).toBe(true);
    });

    it("rejects a drag (moved too far) — a flick-scroll, not a tap", () => {
      const { isTapGesture } = api();
      expect(isTapGesture({ x: 100, y: 200, t: 0 }, { x: 100, y: 360, t: 200 })).toBe(false);
    });

    it("rejects a long press", () => {
      const { isTapGesture } = api();
      expect(isTapGesture({ x: 100, y: 200, t: 0 }, { x: 101, y: 201, t: 900 })).toBe(false);
    });

    it("returns false when no start point was recorded", () => {
      const { isTapGesture } = api();
      expect(isTapGesture(null, { x: 1, y: 1, t: 1 })).toBe(false);
    });
  });

  describe("photoAlt", () => {
    it("produces a 1-based, index-specific description", () => {
      const { photoAlt } = api();
      expect(photoAlt(0)).toBe("Photo 1 of Akanksha");
      expect(photoAlt(46)).toBe("Photo 47 of Akanksha");
    });
  });

  describe("shouldEmit", () => {
    it("emits while under the cap and stops once over it", () => {
      const { shouldEmit } = api();
      expect(shouldEmit(100, 220, false)).toBe(true);
      expect(shouldEmit(221, 220, false)).toBe(false);
    });

    it("forces emission past the cap for guaranteed finale bursts", () => {
      const { shouldEmit } = api();
      expect(shouldEmit(900, 220, true)).toBe(true);
    });
  });

  describe("melodySchedule", () => {
    it("lays notes end to end with cumulative start offsets", () => {
      const { melodySchedule } = api();
      const r = melodySchedule([[440, 0.5], [494, 0.3]], 1);
      expect(r.notes[0]).toEqual({ freq: 440, start: 0, dur: 0.5 });
      expect(r.notes[1]).toEqual({ freq: 494, start: 0.5, dur: 0.3 });
      expect(r.total).toBeCloseTo(1.8, 5); // 0.5 + 0.3 + 1s gap
    });

    it("handles an empty melody", () => {
      const { melodySchedule } = api();
      expect(melodySchedule([], 0)).toEqual({ notes: [], total: 0 });
    });
  });

  describe("confettiPiece", () => {
    it("is deterministic for a given index", () => {
      const { confettiPiece } = api();
      expect(confettiPiece(3)).toEqual(confettiPiece(3));
    });

    it("varies shapes and always reports a shape and an emoji", () => {
      const { confettiPiece } = api();
      const shapes = new Set();
      for (let i = 0; i < 8; i++) {
        const p = confettiPiece(i);
        shapes.add(p.shape);
        expect(typeof p.shape).toBe("string");
        expect(typeof p.emoji).toBe("string");
        expect(p.emoji.length).toBeGreaterThan(0);
      }
      expect(shapes.size).toBeGreaterThan(1);
    });
  });

  describe("blowDetected", () => {
    it("fires on a sustained run above the threshold", () => {
      const { blowDetected } = api();
      expect(blowDetected([0.1, 0.5, 0.6, 0.7], 0.4, 3)).toBe(true);
    });

    it("ignores a brief spike", () => {
      const { blowDetected } = api();
      expect(blowDetected([0.5, 0.1, 0.5], 0.4, 2)).toBe(false);
    });

    it("is false for no samples", () => {
      const { blowDetected } = api();
      expect(blowDetected([], 0.4, 2)).toBe(false);
    });
  });

  describe("daysSince", () => {
    it("counts whole days from a past date", () => {
      const { daysSince } = api();
      expect(daysSince("2026-05-07", new Date(2026, 5, 17))).toBe(41); // May 7 -> Jun 17
    });

    it("clamps to zero for future dates", () => {
      const { daysSince } = api();
      expect(daysSince("2026-05-07", new Date(2026, 4, 1))).toBe(0);
    });
  });

  describe("tweenValue", () => {
    it("starts at zero and lands exactly on target", () => {
      const { tweenValue } = api();
      expect(tweenValue(0, 1000, 100)).toBe(0);
      expect(tweenValue(1000, 1000, 100)).toBe(100);
    });

    it("eases (further than linear) partway through", () => {
      const { tweenValue } = api();
      expect(tweenValue(500, 1000, 100)).toBe(88); // easeOutCubic(0.5) = 0.875
    });

    it("returns the target immediately for zero duration", () => {
      const { tweenValue } = api();
      expect(tweenValue(0, 0, 42)).toBe(42);
    });
  });

  describe("isScratchedEnough", () => {
    it("is true once the cleared fraction meets the threshold", () => {
      const { isScratchedEnough } = api();
      expect(isScratchedEnough(50, 100, 0.5)).toBe(true);
      expect(isScratchedEnough(40, 100, 0.5)).toBe(false);
    });

    it("is false when nothing can be scratched", () => {
      const { isScratchedEnough } = api();
      expect(isScratchedEnough(1, 0, 0.5)).toBe(false);
    });
  });

  describe("pickRandomIndices", () => {
    it("returns the requested count of distinct, in-range indices", () => {
      const { pickRandomIndices } = api();
      let s = 0;
      const rng = () => { s += 0.37; return s % 1; };
      const idx = pickRandomIndices(47, 9, rng);
      expect(idx).toHaveLength(9);
      expect(new Set(idx).size).toBe(9);
      idx.forEach((i) => {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(47);
      });
    });

    it("caps at the number available and keeps them unique", () => {
      const { pickRandomIndices } = api();
      const idx = pickRandomIndices(5, 9, () => 0.5);
      expect(idx).toHaveLength(5);
      expect(new Set(idx).size).toBe(5);
    });

    it("is empty when there are no photos", () => {
      const { pickRandomIndices } = api();
      expect(pickRandomIndices(0, 9, () => 0)).toEqual([]);
    });
  });
});
