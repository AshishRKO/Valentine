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
});
