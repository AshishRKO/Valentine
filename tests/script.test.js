import { describe, it, expect, beforeAll } from "vitest";

const GATE_AND_LIGHTBOX_HTML = `
<div id="confetti"></div>
<div class="valentine-gate" id="valentineGate">
  <button type="button" id="valentineYes">Yes!</button>
  <div class="valentine-gate__no-wrap">
    <button type="button" id="valentineNo">No</button>
  </div>
  <p id="valentineHint" hidden>Hint</p>
</div>
<div id="valentineYesMessage" hidden>
  <span>Akanksha ♥ Ashish</span>
  <a href="start.html" id="valentineContinue">Continue</a>
</div>

<div id="lightbox" aria-hidden="true">
  <button id="lightboxClose" type="button">×</button>
  <div class="lightbox__inner">
    <img id="lightboxImg" src="" alt="" />
  </div>
</div>
<div data-gallery>
  <div class="gallery__item">
    <img src="test.jpg" alt="Test image" />
  </div>
</div>
`;

describe("script", () => {
  beforeAll(async () => {
    document.body.innerHTML = GATE_AND_LIGHTBOX_HTML;
    await import("../script.js");
  });

  describe("gate", () => {
    it("shows message and hides gate when Yes is clicked", () => {
      const gate = document.getElementById("valentineGate");
      const message = document.getElementById("valentineYesMessage");
      const yesBtn = document.getElementById("valentineYes");

      expect(gate.classList.contains("valentine-gate--hidden")).toBe(false);
      expect(message.hidden).toBe(true);

      yesBtn.click();

      expect(gate.classList.contains("valentine-gate--hidden")).toBe(true);
      expect(message.hidden).toBe(false);
    });
  });

  describe("lightbox", () => {
    it("opens lightbox when gallery image is clicked", () => {
      const lightbox = document.getElementById("lightbox");
      const lightboxImg = document.getElementById("lightboxImg");
      const galleryImg = document.querySelector("[data-gallery] .gallery__item img");

      expect(lightbox.getAttribute("aria-hidden")).toBe("true");

      galleryImg.click();

      expect(lightbox.getAttribute("aria-hidden")).toBe("false");
      expect(lightboxImg.src).toContain("test.jpg");
      expect(lightboxImg.alt).toBe("Test image");
    });

    it("closes lightbox when close button is clicked", () => {
      const lightbox = document.getElementById("lightbox");
      const galleryImg = document.querySelector("[data-gallery] .gallery__item img");
      const closeBtn = document.getElementById("lightboxClose");

      galleryImg.click();
      expect(lightbox.getAttribute("aria-hidden")).toBe("false");

      closeBtn.click();
      expect(lightbox.getAttribute("aria-hidden")).toBe("true");
    });

    it("closes lightbox on Escape key", () => {
      const lightbox = document.getElementById("lightbox");
      const galleryImg = document.querySelector("[data-gallery] .gallery__item img");

      galleryImg.click();
      expect(lightbox.getAttribute("aria-hidden")).toBe("false");

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(lightbox.getAttribute("aria-hidden")).toBe("true");
    });
  });
});
