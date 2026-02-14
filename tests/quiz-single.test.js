import { describe, it, expect, beforeEach, vi } from "vitest";

const QUIZ_HTML = `
<div data-quiz-single data-next="quiz-12.html" data-correct-message="Right answer!">
  <p class="quiz-single__context">Test question</p>
  <h2 class="quiz-single__question">What is the correct answer?</h2>
  <div class="quiz-single__options">
    <button type="button" class="quiz-single__opt">A) Wrong</button>
    <button type="button" class="quiz-single__opt" data-correct>B) Correct</button>
    <button type="button" class="quiz-single__opt">C) Wrong</button>
  </div>
  <div class="quiz-single__feedback" hidden>
    <p class="quiz-single__result" hidden></p>
  </div>
  <nav class="journey-next quiz-single__next" hidden>
    <a href="quiz-12.html">Next question</a>
  </nav>
</div>
`;

describe("quiz-single", () => {
  beforeEach(() => {
    document.body.innerHTML = QUIZ_HTML;
    vi.resetModules();
  });

  it("marks correct option and shows correct message when correct option is clicked", async () => {
    vi.useFakeTimers();
    await import("../quiz-single.js");

    const container = document.querySelector("[data-quiz-single]");
    const correctBtn = container.querySelector(".quiz-single__opt[data-correct]");
    const resultEl = container.querySelector(".quiz-single__result");
    const nextEl = container.querySelector(".quiz-single__next");

    correctBtn.click();

    expect(correctBtn.classList.contains("quiz-single__opt--correct")).toBe(true);
    expect(resultEl.textContent).toBe("Right answer!");
    expect(resultEl.classList.contains("quiz-single__result--correct")).toBe(true);
    expect(container.querySelector(".quiz-single__feedback").hidden).toBe(false);

    vi.advanceTimersByTime(1300);
    expect(nextEl.hidden).toBe(false);
    vi.useRealTimers();
  });

  it("marks wrong option red and reveals correct option when wrong option is clicked", async () => {
    await import("../quiz-single.js");

    const container = document.querySelector("[data-quiz-single]");
    const wrongBtn = container.querySelector(".quiz-single__opt:not([data-correct])");
    const correctBtn = container.querySelector(".quiz-single__opt[data-correct]");
    const resultEl = container.querySelector(".quiz-single__result");

    wrongBtn.click();

    expect(wrongBtn.classList.contains("quiz-single__opt--wrong")).toBe(true);
    expect(correctBtn.classList.contains("quiz-single__opt--correct")).toBe(true);
    expect(resultEl.textContent).toContain("Not quite");
    expect(resultEl.classList.contains("quiz-single__result--incorrect")).toBe(true);
  });

  it("disables all options after one is clicked", async () => {
    await import("../quiz-single.js");

    const opts = document.querySelectorAll(".quiz-single__opt");
    opts[0].click();

    opts.forEach((btn) => {
      expect(btn.disabled).toBe(true);
    });
  });
});
