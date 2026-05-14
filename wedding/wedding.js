/* Wedding journey — shared script across all /wedding/ pages.
   Handles: hero "is-loaded" fade-in, lightbox for strip galleries,
   keyboard navigation between chapters. */

(function () {
  "use strict";

  // Chapter order — drives ← / → keyboard navigation
  const CHAPTERS = [
    "index.html",
    "eve.html",
    "morning.html",
    "rings.html",
    "court.html",
    "evening.html",
    "days.html",
    "letter.html",
    "closing.html",
  ];

  function currentChapterIndex() {
    const path = window.location.pathname;
    const file = path.endsWith("/") ? "index.html" : path.split("/").pop();
    const idx = CHAPTERS.indexOf(file);
    return idx === -1 ? 0 : idx;
  }

  function bindKeyboardNav() {
    document.addEventListener("keydown", (e) => {
      // ignore when typing into an input or while lightbox is open
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const lb = document.getElementById("wLightbox");
      if (lb && lb.getAttribute("aria-hidden") === "false") return;

      const idx = currentChapterIndex();
      if (e.key === "ArrowRight" && idx < CHAPTERS.length - 1) {
        window.location.href = CHAPTERS[idx + 1];
      } else if (e.key === "ArrowLeft" && idx > 0) {
        window.location.href = CHAPTERS[idx - 1];
      }
    });
  }

  function bindHeroFade() {
    document.querySelectorAll(".w-hero").forEach((hero) => {
      const img = hero.querySelector("img");
      if (!img) {
        hero.classList.add("is-loaded");
        return;
      }
      if (img.complete && img.naturalWidth > 0) {
        // Defer one tick so the CSS transition still plays
        setTimeout(() => hero.classList.add("is-loaded"), 30);
      } else {
        img.addEventListener("load", () => hero.classList.add("is-loaded"), { once: true });
        img.addEventListener("error", () => hero.classList.add("is-loaded"), { once: true });
      }
    });
  }

  function bindLightbox() {
    const box = document.getElementById("wLightbox");
    const img = document.getElementById("wLightboxImg");
    const close = document.getElementById("wLightboxClose");
    if (!box || !img) return;

    function open(src, alt) {
      img.src = src;
      img.alt = alt || "";
      box.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function shut() {
      box.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    document.querySelectorAll("[data-lightbox-src]").forEach((item) => {
      item.addEventListener("click", () => {
        const src = item.getAttribute("data-lightbox-src");
        const alt = item.getAttribute("data-lightbox-alt") || "";
        if (src) open(src, alt);
      });
    });

    close?.addEventListener("click", shut);
    box.addEventListener("click", (e) => { if (e.target === box) shut(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") shut();
    });
  }

  // Pure helpers exposed for tests
  window.__wedding = { CHAPTERS, currentChapterIndex };

  function whenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  whenReady(() => {
    bindHeroFade();
    bindLightbox();
    bindKeyboardNav();
  });
})();
