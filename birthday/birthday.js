/* Birthday microsite — self-contained behaviour.
   Pure helpers are attached to window for unit tests. */

(function () {
  "use strict";

  // ---------- Pure helpers (exported on window for tests) ----------

  // Akanksha's birthday — local time, midnight on 17 June 2026.
  // Use local time so countdown matches the device timezone of whoever views it.
  function getBirthdayTarget(year) {
    return new Date(year, 5, 17, 0, 0, 0, 0); // month 5 = June
  }

  function computeCountdown(now, target) {
    if (!(now instanceof Date) || !(target instanceof Date)) {
      throw new TypeError("computeCountdown requires Date instances");
    }
    const diff = target.getTime() - now.getTime();
    // Same calendar day as the birthday → "today"
    const sameDay =
      now.getFullYear() === target.getFullYear() &&
      now.getMonth() === target.getMonth() &&
      now.getDate() === target.getDate();

    if (sameDay) {
      return { state: "today", days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    if (diff <= 0) {
      return { state: "past", days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const totalSeconds = Math.floor(diff / 1000);
    return {
      state: "future",
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }

  function pad2(n) {
    const s = String(Math.max(0, Math.floor(n)));
    return s.length >= 2 ? s : "0" + s;
  }

  // Wish capsule state machine — kept pure for testing.
  function wishReducer(state, action) {
    switch (action.type) {
      case "TYPE":
        return { ...state, draft: action.value, error: null };
      case "SEAL": {
        const text = (state.draft || "").trim();
        if (!text) return { ...state, error: "Type a wish first, my love." };
        return { sealed: true, draft: "", saved: text, error: null };
      }
      case "RESET":
        return { sealed: false, draft: "", saved: null, error: null };
      default:
        return state;
    }
  }

  const initialWishState = { sealed: false, draft: "", saved: null, error: null };

  // Expose pure helpers for tests
  window.__bday = {
    getBirthdayTarget,
    computeCountdown,
    pad2,
    wishReducer,
    initialWishState,
  };

  // ---------- DOM helpers ----------

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function whenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  // ---------- Confetti ----------

  const CONFETTI_COLOURS = [
    "#ef7d6a", "#d14d72", "#f6a37d", "#e9c46a",
    "#cdebd2", "#e6dcff", "#ffd9b8", "#ffb3c1"
  ];

  function burstConfetti(count) {
    const layer = $("#bdayConfetti");
    if (!layer) return;
    const total = typeof count === "number" ? count : 60;
    const { innerWidth } = window;

    for (let i = 0; i < total; i++) {
      const piece = document.createElement("span");
      const size = 6 + Math.floor(Math.random() * 8);
      piece.style.left = Math.random() * innerWidth + "px";
      piece.style.width = size + "px";
      piece.style.height = (size + 4) + "px";
      piece.style.background = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length];
      const delay = Math.random() * 0.5;
      const duration = 2.4 + Math.random() * 1.8;
      piece.style.animationDelay = delay + "s";
      piece.style.animationDuration = duration + "s";
      layer.appendChild(piece);
      setTimeout(() => piece.remove(), (delay + duration) * 1000 + 400);
    }
  }

  // ---------- Gift gate ----------

  function bindGate() {
    const gate = $("#bdayGate");
    const gift = $("#bdayGift");
    const main = $("#bdayMain");
    if (!gate || !gift || !main) return;

    let opened = false;
    function openGift() {
      if (opened) return;
      opened = true;
      gift.classList.add("bday-gift--opening");
      burstConfetti(70);
      setTimeout(() => {
        gate.classList.add("bday-gate--hidden");
        main.hidden = false;
        // Scroll to top of main for the hero entry
        window.scrollTo({ top: 0, behavior: "instant" in document.documentElement ? "instant" : "auto" });
      }, 650);
      setTimeout(() => {
        gate.remove();
      }, 1500);
    }

    gift.addEventListener("click", openGift);
    gift.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openGift();
      }
    });
  }

  // ---------- Countdown ----------

  function bindCountdown() {
    const wrap = $("#bdayCount");
    if (!wrap) return;
    const daysEl = $("#bdayCountDays");
    const hoursEl = $("#bdayCountHours");
    const minutesEl = $("#bdayCountMinutes");
    const secondsEl = $("#bdayCountSeconds");
    const labelEl = $("#bdayCountLabel");
    const footEl = $("#bdayCountFoot");

    function tick() {
      const now = new Date();
      // Pick a sensible target year — current year if upcoming, otherwise next year.
      const thisYearTarget = getBirthdayTarget(now.getFullYear());
      const target =
        now.getTime() < thisYearTarget.getTime() + 24 * 3600 * 1000
          ? thisYearTarget
          : getBirthdayTarget(now.getFullYear() + 1);

      const r = computeCountdown(now, target);
      wrap.setAttribute("data-state", r.state);

      if (r.state === "today") {
        if (labelEl) labelEl.textContent = "It's TODAY 🎂";
        if (footEl) {
          footEl.textContent = "Happy birthday, my love. The whole world is brighter today.";
        }
        if (daysEl) daysEl.textContent = "0";
        if (hoursEl) hoursEl.textContent = "00";
        if (minutesEl) minutesEl.textContent = "00";
        if (secondsEl) secondsEl.textContent = "00";
        return;
      }
      if (r.state === "past") {
        if (labelEl) labelEl.textContent = "Birthday celebrated 💖";
        if (footEl) {
          footEl.textContent = "On to the next 365 days of you.";
        }
        return;
      }

      if (labelEl) labelEl.textContent = "Counting down to your day";
      if (footEl) {
        footEl.textContent = "…until the world celebrates the day you arrived in it.";
      }
      if (daysEl) daysEl.textContent = String(r.days);
      if (hoursEl) hoursEl.textContent = pad2(r.hours);
      if (minutesEl) minutesEl.textContent = pad2(r.minutes);
      if (secondsEl) secondsEl.textContent = pad2(r.seconds);
    }

    tick();
    setInterval(tick, 1000);
  }

  // ---------- Cake ----------

  function bindCake() {
    const cake = $("#bdayCake");
    const status = $("#cakeStatus");
    const hint = $("#cakeHint");
    const wish = $("#bdayWish");
    if (!cake) return;

    const candles = $$(".candle", cake);
    let phase = "unlit"; // unlit → lit → blown

    function refreshHint() {
      if (!hint) return;
      if (phase === "unlit") hint.textContent = "Tap a candle to light it.";
      else if (phase === "lit") hint.textContent = "Now tap each flame to blow it out.";
      else hint.textContent = "All blown. Make a wish ✨";
    }

    candles.forEach((c) => {
      c.addEventListener("click", () => {
        if (phase === "unlit") {
          c.classList.add("candle--lit");
          if (candles.every((x) => x.classList.contains("candle--lit"))) {
            phase = "lit";
            refreshHint();
          } else if (status) {
            status.textContent = "Light them all…";
          }
        } else if (phase === "lit") {
          c.classList.remove("candle--lit");
          if (candles.every((x) => !x.classList.contains("candle--lit"))) {
            phase = "blown";
            refreshHint();
            burstConfetti(50);
            if (status) status.textContent = "Beautiful. Now — make a wish.";
            if (wish) wish.hidden = false;
            // Scroll the wish capsule into view gently
            setTimeout(() => {
              wish?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 200);
          } else if (status) {
            status.textContent = "Phew — one more breath…";
          }
        }
      });
    });

    refreshHint();
  }

  // ---------- Wish capsule ----------

  const WISH_STORAGE_KEY = "bday-wish-2026";

  function bindWish() {
    const wrap = $("#bdayWish");
    if (!wrap) return;
    const input = $("#bdayWishInput");
    const seal = $("#bdayWishSeal");
    const err = $("#bdayWishError");
    const sealed = $("#bdayWishSealed");
    const reset = $("#bdayWishReset");

    let state = { ...initialWishState };

    // Restore any previously sealed wish from this device
    try {
      const saved = window.localStorage.getItem(WISH_STORAGE_KEY);
      if (saved) {
        state = wishReducer(state, { type: "TYPE", value: saved });
        state = wishReducer(state, { type: "SEAL" });
      }
    } catch (_) { /* localStorage may be unavailable in privacy modes */ }

    function render() {
      if (state.sealed) {
        if (input) input.hidden = true;
        if (seal) seal.hidden = true;
        if (sealed) sealed.hidden = false;
        if (err) { err.textContent = ""; err.hidden = true; }
      } else {
        if (input) input.hidden = false;
        if (seal) seal.hidden = false;
        if (sealed) sealed.hidden = true;
        if (state.error) {
          if (err) { err.textContent = state.error; err.hidden = false; }
        } else if (err) {
          err.textContent = ""; err.hidden = true;
        }
      }
    }

    input?.addEventListener("input", () => {
      state = wishReducer(state, { type: "TYPE", value: input.value });
      render();
    });

    seal?.addEventListener("click", () => {
      const next = wishReducer(state, { type: "SEAL" });
      state = next;
      if (state.sealed && state.saved) {
        try { window.localStorage.setItem(WISH_STORAGE_KEY, state.saved); } catch (_) {}
        burstConfetti(40);
      }
      render();
    });

    reset?.addEventListener("click", () => {
      state = wishReducer(state, { type: "RESET" });
      try { window.localStorage.removeItem(WISH_STORAGE_KEY); } catch (_) {}
      if (input) input.value = "";
      render();
      input?.focus();
    });

    render();
  }

  // ---------- Lightbox ----------

  function bindLightbox() {
    const box = $("#bdayLightbox");
    const img = $("#bdayLightboxImg");
    const close = $("#bdayLightboxClose");
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

    $$("[data-gallery] .bday-gallery__item img").forEach((g) => {
      g.addEventListener("click", () => open(g.currentSrc || g.src, g.alt));
    });

    close?.addEventListener("click", shut);
    box.addEventListener("click", (e) => { if (e.target === box) shut(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") shut();
    });
  }

  // ---------- Reveal on scroll ----------

  function bindReveal() {
    const targets = $$(
      ".bday-section, .bday-story__item, .bday-wishes li, .bday-gallery__item, .bday-letter, .bday-count"
    );
    targets.forEach((el) => el.classList.add("reveal"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach((el) => io.observe(el));
  }

  // ---------- Closing: floating hearts + easter egg ----------

  function bindClosing() {
    const closing = $("#bdayClose");
    const moreBtn = $("#bdayMoreConfetti");
    const hidden = $("#bdayHiddenMsg");
    let layer = null;
    let tapCount = 0;

    moreBtn?.addEventListener("click", () => burstConfetti(80));

    if (!closing) return;
    closing.addEventListener("click", (e) => {
      // ignore the explicit button clicks for confetti
      if (e.target.closest("#bdayMoreConfetti")) return;

      if (!layer) {
        layer = document.createElement("div");
        layer.className = "bday-hearts";
        document.body.appendChild(layer);
      }

      const heart = document.createElement("span");
      heart.textContent = ["💖", "❤️", "💕", "💗", "💝"][Math.floor(Math.random() * 5)];
      heart.style.left = (e.clientX + (Math.random() - 0.5) * 40) + "px";
      heart.style.top = e.clientY + "px";
      heart.style.position = "fixed";
      heart.style.fontSize = (1.4 + Math.random() * 1) + "rem";
      layer.appendChild(heart);
      setTimeout(() => heart.remove(), 1900);

      tapCount += 1;
      if (tapCount === 17 && hidden) {
        hidden.hidden = false;
        burstConfetti(100);
      }
    });
  }

  // ---------- Boot ----------

  whenReady(() => {
    bindGate();
    bindCountdown();
    bindCake();
    bindWish();
    bindLightbox();
    bindReveal();
    bindClosing();
  });
})();
