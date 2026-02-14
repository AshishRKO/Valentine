import { describe, it, expect, beforeAll } from "vitest";

describe("quiz-sounds", () => {
  beforeAll(async () => {
    await import("../quiz-sounds.js");
  });

  it("exposes playQuizCorrect and playQuizIncorrect on window", () => {
    expect(typeof window.playQuizCorrect).toBe("function");
    expect(typeof window.playQuizIncorrect).toBe("function");
  });

  it("playQuizCorrect does not throw (no AudioContext in happy-dom)", () => {
    expect(() => window.playQuizCorrect()).not.toThrow();
  });

  it("playQuizIncorrect does not throw", () => {
    expect(() => window.playQuizIncorrect()).not.toThrow();
  });
});
