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

  // Cake state machine — pure, so the light → blow → relight loop is testable.
  // phases: "unlit" → "lit" (all candles burning, ready to blow) → "blown".
  // A tap while "blown" relights the cake so the wish can be made again.
  function nextCakePhase(phase, litCount, total) {
    if (total <= 0) return phase;
    if (phase === "unlit") return litCount === total ? "lit" : "unlit";
    if (phase === "lit") return litCount === 0 ? "blown" : "lit";
    if (phase === "blown") return "lit";
    return phase;
  }

  // Honour prefers-reduced-motion for JS-spawned particles (CSS can't).
  function effectiveConfetti(count, reduce) {
    return reduce ? 0 : count;
  }

  // Pick `count` photo indices spread evenly across a set of `total` photos,
  // so the balloon-pop reveals a varied selection. Pure + testable.
  function balloonPhotoIndices(total, count) {
    if (total <= 0 || count <= 0) return [];
    const n = Math.min(count, total);
    const out = [];
    for (let i = 0; i < n; i++) out.push(Math.floor((i * total) / n));
    return out;
  }

  // A firework particle's offset vector: particle `i` of `count`, evenly placed
  // around a circle of the given radius. Pure + testable.
  function fireworkVector(i, count, radius) {
    const angle = (i / count) * Math.PI * 2;
    return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
  }

  // Deterministic confetti shape + emoji for piece `i`, so confetti has variety
  // (boxes, circles, streamers, festive emoji) without per-call randomness.
  const CONFETTI_SHAPES = ["rect", "circle", "streamer", "emoji"];
  const CONFETTI_EMOJI = ["🎉", "✨", "🎈", "💖", "⭐", "🎊"];
  function confettiPiece(i) {
    return {
      shape: CONFETTI_SHAPES[i % CONFETTI_SHAPES.length],
      emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
    };
  }

  // True only for a deliberate tap: pointer barely moved and was quick. Used to
  // ignore the synthetic click a flick-scroll fires when the finger lifts.
  function isTapGesture(start, end, opts) {
    if (!start || !end) return false;
    const o = opts || {};
    const maxMove = o.maxMove == null ? 10 : o.maxMove;
    const maxMs = o.maxMs == null ? 500 : o.maxMs;
    const moved = Math.hypot((end.x || 0) - (start.x || 0), (end.y || 0) - (start.y || 0));
    const elapsed = (end.t || 0) - (start.t || 0);
    return moved <= maxMove && elapsed <= maxMs;
  }

  // Index-specific alt text so screen readers don't hear the same words 47 times.
  function photoAlt(index) {
    return "Photo " + (index + 1) + " of Akanksha";
  }

  // Whether a particle layer may still emit: under its cap, or forced (finale).
  function shouldEmit(liveCount, cap, force) {
    return !!force || liveCount <= cap;
  }

  // Turn a list of [frequency, duration] notes into absolute start offsets so
  // the melody can be scheduled on the audio clock. Pure + testable.
  function melodySchedule(notes, gap) {
    const out = [];
    let t = 0;
    for (let i = 0; i < notes.length; i++) {
      const freq = notes[i][0];
      const dur = notes[i][1];
      out.push({ freq: freq, start: t, dur: dur });
      t += dur;
    }
    return { notes: out, total: t + (gap || 0) };
  }

  // Mic blow-out: true if at least `minHold` of the recent loudness samples run
  // consecutively above `threshold` (a sustained blow, not a brief spike).
  function blowDetected(samples, threshold, minHold) {
    if (!samples || !samples.length) return false;
    let run = 0;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] >= threshold) {
        run += 1;
        if (run >= minHold) return true;
      } else {
        run = 0;
      }
    }
    return false;
  }

  // Whole days from a past "YYYY-MM-DD" to `now`, clamped at 0.
  function daysSince(ymd, now) {
    const p = String(ymd).split("-");
    const from = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return Math.max(0, Math.floor((now.getTime() - from.getTime()) / 86400000));
  }

  // Eased (easeOutCubic) integer value of a count-up tween at `elapsed` ms.
  function tweenValue(elapsed, duration, target) {
    if (duration <= 0) return target;
    const t = Math.min(1, Math.max(0, elapsed / duration));
    return Math.round((1 - Math.pow(1 - t, 3)) * target);
  }

  // Scratch reveal: true once the cleared fraction reaches `threshold` (0..1).
  function isScratchedEnough(cleared, total, threshold) {
    return total > 0 && cleared / total >= threshold;
  }

  // Expose pure helpers for tests
  window.__bday = {
    getBirthdayTarget,
    computeCountdown,
    pad2,
    wishReducer,
    initialWishState,
    nextCakePhase,
    effectiveConfetti,
    balloonPhotoIndices,
    fireworkVector,
    confettiPiece,
    isTapGesture,
    photoAlt,
    shouldEmit,
    melodySchedule,
    blowDetected,
    daysSince,
    tweenValue,
    isScratchedEnough,
  };

  // Whether the viewer asked the OS to reduce motion. Read once at load.
  const reduceMotion = !!(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

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

  function burstConfetti(count, opts) {
    const layer = $("#bdayConfetti");
    if (!layer) return;
    // Cap live nodes so rapid taps can't pile up thousands of animating spans;
    // the finale passes { force: true } to guarantee its burst.
    if (!shouldEmit(layer.childElementCount, 220, opts && opts.force)) return;
    const requested = typeof count === "number" ? count : 60;
    const total = effectiveConfetti(requested, reduceMotion);
    if (total <= 0) return;
    const { innerWidth } = window;

    for (let i = 0; i < total; i++) {
      const piece = document.createElement("span");
      const { shape, emoji } = confettiPiece(i);
      const size = 6 + Math.floor(Math.random() * 8);
      piece.style.left = Math.random() * innerWidth + "px";
      piece.className = "is-" + shape;
      if (shape === "emoji") {
        piece.textContent = emoji;
        piece.style.fontSize = (14 + Math.floor(Math.random() * 12)) + "px";
      } else if (shape === "streamer") {
        piece.style.width = Math.max(4, size - 3) + "px";
        piece.style.height = (size + 14) + "px";
        piece.style.background = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length];
      } else {
        piece.style.width = size + "px";
        piece.style.height = (size + 4) + "px";
        piece.style.background = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length];
      }
      const delay = Math.random() * 0.5;
      const duration = 2.4 + Math.random() * 1.8;
      piece.style.animationDelay = delay + "s";
      piece.style.animationDuration = duration + "s";
      layer.appendChild(piece);
      setTimeout(() => piece.remove(), (delay + duration) * 1000 + 400);
    }
  }

  // ---------- Fireworks ----------

  // Deeper jewel tones so sparks read against the bright cream background.
  const FW_COLOURS = [
    "#ef7d6a", "#d14d72", "#e9c46a", "#3fae7a",
    "#7a5cff", "#f0a020", "#e84d8a", "#2aa3e0"
  ];

  // Burst a ring of particles outward from (x, y) in viewport coordinates.
  function launchFirework(x, y, opts) {
    const layer = $("#bdayFireworks");
    if (!layer) return;
    if (reduceMotion) return;                    // honour reduced motion
    const o = opts || {};
    if (!shouldEmit(layer.childElementCount, 400, o.force)) return; // safety cap
    const count = o.count || 32;
    const baseRadius = o.radius || (110 + Math.random() * 60);
    const colour = o.color || FW_COLOURS[Math.floor(Math.random() * FW_COLOURS.length)];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "bday-fw";
      const v = fireworkVector(i, count, baseRadius * (0.75 + Math.random() * 0.45));
      const c = Math.random() < 0.6
        ? colour
        : FW_COLOURS[Math.floor(Math.random() * FW_COLOURS.length)];
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.setProperty("--dx", v.dx.toFixed(1) + "px");
      p.style.setProperty("--dy", v.dy.toFixed(1) + "px");
      p.style.setProperty("--fw-dur", (0.9 + Math.random() * 0.5).toFixed(2) + "s");
      p.style.background = c;
      p.style.color = c; // drives the in-hue halo (box-shadow currentColor)
      layer.appendChild(p);
      setTimeout(() => p.remove(), 1700);
    }
  }

  // A short show of several bursts at random points across the screen.
  function launchFireworksShow(n, opts) {
    if (reduceMotion) return;
    const total = n || 4;
    const force = !!(opts && opts.force);
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = 0; i < total; i++) {
      setTimeout(() => {
        launchFirework(
          W * (0.18 + Math.random() * 0.64),
          H * (0.18 + Math.random() * 0.4),
          { force }
        );
      }, i * 280);
    }
  }

  // ---------- Photos (of Akanksha) ----------

  const PHOTO_COUNT = 47;
  const PHOTOS_FULL = [];
  const PHOTOS_THUMB = [];
  for (let p = 1; p <= PHOTO_COUNT; p++) {
    PHOTOS_FULL.push("photos/aku-" + pad2(p) + ".jpg");
    PHOTOS_THUMB.push("photos/thumb/aku-" + pad2(p) + ".jpg");
  }

  // Assigned by bindLightbox so the photo wall + balloon pop can open the viewer.
  let openLightbox = null;

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
      launchFireworksShow(4);
      setTimeout(() => {
        gate.classList.add("bday-gate--hidden");
        main.hidden = false;
        // Scroll to top of main for the hero entry.
        window.scrollTo({ top: 0, behavior: "auto" });
        // Move focus into the revealed page so keyboard/screen-reader users
        // land on the payoff instead of being stranded on <body>.
        const hero = $("#bdayHeroTitle");
        if (hero) {
          hero.setAttribute("tabindex", "-1");
          hero.focus({ preventScroll: true });
        }
        // Spell her name out, letter by letter.
        const heroName = $(".bday-hero__name");
        if (heroName) heroName.classList.add("is-spelling");
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
        slowDown();
        return;
      }
      if (r.state === "past") {
        if (labelEl) labelEl.textContent = "Another year of you 💖";
        if (footEl) {
          footEl.textContent = "Already counting down to the next one.";
        }
        slowDown();
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

    let timerId = null;
    let period = 1000;

    function run(ms) {
      period = ms;
      if (timerId !== null) clearInterval(timerId);
      timerId = setInterval(tick, ms);
    }

    // Once the day arrives or passes, per-second updates are pointless —
    // ease off to once a minute so a tab left open doesn't drain the battery.
    function slowDown() {
      if (period !== 60000 && timerId !== null) run(60000);
    }

    // Don't tick while the tab is hidden; catch up the moment it's shown.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (timerId !== null) {
          clearInterval(timerId);
          timerId = null;
        }
      } else {
        run(period);
        tick();
      }
    });

    tick();
    run(1000);
  }

  // ---------- Cake ----------

  function bindCake() {
    const cake = $("#bdayCake");
    const status = $("#cakeStatus");
    const hint = $("#cakeHint");
    const wish = $("#bdayWish");
    if (!cake) return;

    const candles = $$(".candle", cake);
    const micBtn = $("#bdayCakeMic");
    let phase = "unlit"; // unlit → lit → blown → (relight) lit …

    function litCount() {
      return candles.filter((x) => x.classList.contains("candle--lit")).length;
    }

    function refreshHint() {
      if (!hint) return;
      if (phase === "unlit") hint.textContent = "Tap a candle to light it.";
      else if (phase === "lit") hint.textContent = "Now blow them out — tap each flame, or use the mic.";
      else hint.textContent = "All blown. Make a wish ✨";
    }

    function setStatus(text) {
      if (status) status.textContent = text;
    }
    function showMic(show) {
      if (micBtn) micBtn.hidden = !show;
    }

    // Side effects when the cake goes dark — shared by tap and mic.
    function onBlownOut() {
      refreshHint();
      showMic(false);
      stopMic();
      burstConfetti(50);
      launchFireworksShow(3);
      setStatus("Beautiful. Now — make a wish.");
      if (wish) wish.hidden = false;
      setTimeout(() => {
        wish && wish.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }

    // Blow every candle out at once (microphone path).
    function blowAllOut() {
      if (phase !== "lit") return;
      candles.forEach((c) => c.classList.remove("candle--lit"));
      phase = nextCakePhase("lit", 0, candles.length); // → "blown"
      onBlownOut();
    }

    candles.forEach((c) => {
      c.addEventListener("click", () => {
        // Apply the tap to the candle(s); the pure machine decides the phase.
        if (phase === "blown") {
          // A tap after blowing relights the whole cake for another round.
          candles.forEach((x) => x.classList.add("candle--lit"));
        } else if (phase === "unlit") {
          c.classList.add("candle--lit");
        } else if (phase === "lit") {
          c.classList.remove("candle--lit");
        }

        const prev = phase;
        phase = nextCakePhase(prev, litCount(), candles.length);

        if (prev !== "lit" && phase === "lit") {
          // Finished lighting (from unlit) or relit the cake (from blown).
          refreshHint();
          showMic(true);
          setStatus(
            prev === "blown"
              ? "Lit again — blow them out and make another wish."
              : "All lit ✨ Now blow them out."
          );
        } else if (prev === "lit" && phase === "blown") {
          onBlownOut();
        } else if (phase === "unlit") {
          setStatus("Light them all…");
        } else if (phase === "lit") {
          setStatus("Phew — one more breath…");
        }
      });
    });

    // ---- Microphone blow-out (optional; tapping always works) ----
    let micStream = null;
    let micCtx = null;
    let micRAF = null;

    function stopMic() {
      if (micRAF) { cancelAnimationFrame(micRAF); micRAF = null; }
      if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
      if (micCtx) { micCtx.close().catch(() => {}); micCtx = null; }
      if (micBtn) micBtn.classList.remove("is-listening");
    }

    async function startMicListen() {
      if (phase !== "lit") return;
      if (micStream) { stopMic(); setStatus("Mic off — tap the flames, or try the mic again."); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus("No mic here — just tap the flames."); return;
      }
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (_) {
        setStatus("No mic access — tap the flames instead."); return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        micCtx = new AC();
        const srcNode = micCtx.createMediaStreamSource(micStream);
        const analyser = micCtx.createAnalyser();
        analyser.fftSize = 1024;
        srcNode.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        const recent = [];
        if (micBtn) micBtn.classList.add("is-listening");
        setStatus("Listening… take a breath and blow 🎤");
        const sample = () => {
          if (!micCtx) return;
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          recent.push(rms);
          if (recent.length > 10) recent.shift();
          if (blowDetected(recent, 0.18, 5)) { blowAllOut(); return; }
          micRAF = requestAnimationFrame(sample);
        };
        micRAF = requestAnimationFrame(sample);
      } catch (_) {
        stopMic();
        setStatus("Mic trouble — tap the flames instead.");
      }
    }

    if (micBtn) micBtn.addEventListener("click", startMicListen);

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

    let lastTrigger = null;

    function isOpen() {
      return box.getAttribute("aria-hidden") === "false";
    }

    function open(trigger, src, alt) {
      lastTrigger = trigger || document.activeElement;
      // Make the trigger programmatically focusable so focus can return to it
      // on close (gallery images aren't keyboard-focusable by default).
      if (lastTrigger && lastTrigger.setAttribute) {
        lastTrigger.setAttribute("tabindex", "-1");
      }
      img.src = src;
      img.alt = alt || "";
      box.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      // Force a style flush so the now-visible dialog is focusable this tick,
      // then move focus into it for keyboard/screen-reader users.
      if (close) {
        void box.offsetWidth;
        close.focus();
      }
    }
    function shut() {
      if (!isOpen()) return;
      // Never aria-hide a focused element: drop focus out of the dialog first.
      const active = document.activeElement;
      if (active && box.contains(active) && typeof active.blur === "function") {
        active.blur();
      }
      box.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      // Best-effort: return focus to the photo that opened the box (works in
      // browsers where the image is focusable; otherwise focus rests on body).
      if (lastTrigger && typeof lastTrigger.focus === "function") {
        lastTrigger.focus();
      }
      lastTrigger = null;
    }

    // Expose the opener so the photo wall + balloon pop can use the lightbox.
    openLightbox = open;

    close?.addEventListener("click", shut);
    box.addEventListener("click", (e) => { if (e.target === box) shut(); });
    document.addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      if (e.key === "Escape") {
        shut();
      } else if (e.key === "Tab") {
        // The close button is the only focusable control — keep focus on it.
        e.preventDefault();
        if (close) close.focus();
      }
    });
  }

  // ---------- Reveal on scroll ----------

  function bindReveal() {
    const targets = $$(
      ".bday-section, .bday-story__item, .bday-wishes li, .bday-letter, .bday-count"
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
    let lastBurst = 0;

    // Debounce the explicit button so mashing it can't flood the layer.
    moreBtn?.addEventListener("click", () => {
      const t = Date.now();
      if (t - lastBurst < 600) return;
      lastBurst = t;
      burstConfetti(80);
      launchFireworksShow(3);
    });

    if (!closing) return;

    // Record where a press started so a flick-scroll's synthetic click (finger
    // lifts over empty space) doesn't count as a tap.
    let start = null;
    const record = (e) => {
      const pt = (e.touches && e.touches[0]) || e;
      start = { x: pt.clientX, y: pt.clientY, t: e.timeStamp };
    };
    closing.addEventListener("pointerdown", record);
    closing.addEventListener("touchstart", record, { passive: true });

    closing.addEventListener("click", (e) => {
      // ignore the explicit button clicks for confetti
      if (e.target.closest("#bdayMoreConfetti")) return;
      // ignore scroll/drag-end synthetic clicks
      if (!isTapGesture(start, { x: e.clientX, y: e.clientY, t: e.timeStamp })) return;

      // Count the tap regardless — the hidden message is content, not motion.
      tapCount += 1;
      if (tapCount === 17 && hidden) {
        hidden.hidden = false;
        burstConfetti(100, { force: true });
        launchFireworksShow(6, { force: true });
      }

      // A firework wherever you tap in the celebration zone (no-ops if reduced).
      launchFirework(e.clientX, e.clientY, { count: 18, radius: 70 });

      // Skip the floating-heart animation entirely under reduced motion.
      if (reduceMotion) return;

      if (!layer) {
        layer = document.createElement("div");
        layer.className = "bday-hearts";
        document.body.appendChild(layer);
      }
      // Cap simultaneously-floating hearts so rapid tapping stays smooth.
      if (layer.childElementCount >= 60) return;

      const heart = document.createElement("span");
      heart.textContent = ["💖", "❤️", "💕", "💗", "💝"][Math.floor(Math.random() * 5)];
      heart.style.left = (e.clientX + (Math.random() - 0.5) * 40) + "px";
      heart.style.top = e.clientY + "px";
      heart.style.position = "fixed";
      heart.style.fontSize = (1.4 + Math.random() * 1) + "rem";
      layer.appendChild(heart);
      setTimeout(() => heart.remove(), 1900);
    });
  }

  // ---------- Balloon-pop photo reveal ----------

  const BALLOON_COLOURS = [
    "#ef7d6a", "#d14d72", "#e9c46a", "#f6a37d",
    "#7ec8a0", "#9b8cff", "#ffb3c1", "#ffd166", "#5ec8ff"
  ];

  function buildBalloonPop() {
    const wrap = $("#bdayBalloonPop");
    if (!wrap) return;
    const idxs = balloonPhotoIndices(PHOTOS_FULL.length, 9);
    const total = idxs.length;
    const countEl = $("#bdayPopCount");
    let popped = 0;

    function updateCount() {
      if (!countEl) return;
      if (popped === 0) countEl.textContent = "0 of " + total + " popped — tap one!";
      else if (popped >= total) countEl.textContent = "All popped! 🎉 Happy birthday, my love.";
      else countEl.textContent = popped + " of " + total + " popped — tap a photo to make it big";
    }

    wrap.innerHTML = "";
    idxs.forEach((photoIdx, n) => {
      const cell = document.createElement("div");
      cell.className = "bday-pop__cell";

      const img = document.createElement("img");
      img.className = "bday-pop__photo";
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 330;
      img.height = 440;
      img.src = PHOTOS_THUMB[photoIdx];
      img.alt = photoAlt(photoIdx);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bday-pop__balloon";
      btn.style.setProperty("--balloon-color", BALLOON_COLOURS[n % BALLOON_COLOURS.length]);
      btn.setAttribute("aria-label", "Pop balloon " + (n + 1) + " to reveal a photo");
      const q = document.createElement("span");
      q.className = "bday-pop__q";
      q.textContent = "?";
      q.setAttribute("aria-hidden", "true");
      btn.appendChild(q);

      cell.appendChild(img);
      cell.appendChild(btn);
      wrap.appendChild(cell);

      function viewFull() {
        if (openLightbox) openLightbox(img, PHOTOS_FULL[photoIdx], photoAlt(photoIdx));
      }

      btn.addEventListener("click", () => {
        cell.classList.add("is-popped");
        popped += 1;
        updateCount();
        // Hand the cell's single focusable control from the balloon to the
        // photo: move focus FIRST, then hide the spent balloon from AT.
        img.tabIndex = 0;
        img.setAttribute("role", "button");
        img.setAttribute("aria-label", "View " + photoAlt(photoIdx).toLowerCase());
        img.focus();
        btn.setAttribute("aria-hidden", "true");
        btn.tabIndex = -1;
        const r = btn.getBoundingClientRect();
        launchFirework(r.left + r.width / 2, r.top + r.height / 2, { count: 24, radius: 70 });
        burstConfetti(20);
        if (navigator.vibrate && !reduceMotion) navigator.vibrate(12);
        if (popped >= total) {
          launchFireworksShow(5, { force: true });
          burstConfetti(80, { force: true });
        }
      });
      img.addEventListener("click", viewFull);
      img.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); viewFull(); }
      });
    });

    updateCount();
  }

  // ---------- Festive photo wall ----------

  function buildPhotoWall() {
    const wall = $("#bdayPhotoWall");
    if (!wall) return;

    let built = false;
    function build() {
      if (built) return;
      built = true;
      wall.innerHTML = "";
      // Split photos across two rows that scroll in opposite directions.
      const rows = [[], []];
      PHOTOS_THUMB.forEach((_, i) => rows[i % 2].push(i));

      rows.forEach((indices, ri) => {
        const row = document.createElement("div");
        row.className = "bday-wall__row " + (ri === 0 ? "bday-wall__row--a" : "bday-wall__row--b");
        // Duplicate the list so the marquee loops seamlessly (eager-loaded so
        // the moving strip always has its images, which lazy-loading misses).
        indices.concat(indices).forEach((photoIdx, k) => {
          const isDup = k >= indices.length;
          // Real tiles are buttons (keyboard + screen-reader operable);
          // loop duplicates are inert decoration.
          const tile = document.createElement(isDup ? "div" : "button");
          tile.className = "bday-wall__item";
          if (!isDup) tile.type = "button";
          // Tilt keyed to position in the ORIGINAL list so a tile and its
          // loop-duplicate match across the seam.
          const baseI = k % indices.length;
          tile.style.setProperty("--tilt", ((baseI % 5) - 2) + "deg");

          const img = document.createElement("img");
          img.src = PHOTOS_THUMB[photoIdx];
          img.alt = isDup ? "" : photoAlt(photoIdx);
          img.decoding = "async";
          img.width = 330;
          img.height = 440;
          tile.appendChild(img);

          if (isDup) {
            tile.setAttribute("aria-hidden", "true");
            tile.tabIndex = -1;
          } else {
            tile.setAttribute("aria-label", photoAlt(photoIdx));
            tile.addEventListener("click", () => {
              if (openLightbox) openLightbox(tile, PHOTOS_FULL[photoIdx], photoAlt(photoIdx));
            });
          }
          row.appendChild(tile);
        });
        wall.appendChild(row);
      });
    }

    function setPaused(p) { wall.classList.toggle("is-paused", p); }

    if (!("IntersectionObserver" in window)) { build(); return; }

    // Build the 94 thumbnails only as the wall nears the viewport, so the
    // decode wave doesn't collide with the gift-open celebration.
    new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { build(); obs.disconnect(); }
      });
    }, { rootMargin: "600px 0px" }).observe(wall);

    // Pause the always-on marquee whenever it's off-screen (battery/compositor).
    new IntersectionObserver((entries) => {
      entries.forEach((e) => setPaused(!e.isIntersecting));
    }, { threshold: 0 }).observe(wall);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) setPaused(true);
    });
  }

  // ---------- Celebration taps: fireworks where you tap ----------

  function bindCelebrationTaps() {
    // The closing section fires its own tap-fireworks (with hearts) in
    // bindClosing; this covers the balloon-pop zone's empty space.
    const zone = $("#bdayPopSection");
    if (!zone) return;
    let start = null;
    const record = (e) => {
      const pt = (e.touches && e.touches[0]) || e;
      start = { x: pt.clientX, y: pt.clientY, t: e.timeStamp };
    };
    zone.addEventListener("pointerdown", record);
    zone.addEventListener("touchstart", record, { passive: true });
    zone.addEventListener("click", (e) => {
      // Don't double-fire on controls/photos that already react to a tap.
      if (e.target.closest("button, a, img, textarea, input, .bday-pop__cell")) return;
      // Ignore scroll/drag-end synthetic clicks.
      if (!isTapGesture(start, { x: e.clientX, y: e.clientY, t: e.timeStamp })) return;
      launchFirework(e.clientX, e.clientY, { count: 18, radius: 70 });
    });
  }

  // ---------- Music: "Happy Birthday to You" ----------
  // Synthesised in the browser (no audio file, no licensing). The melody is the
  // traditional tune; each entry is [frequencyHz, durationSeconds].
  const HAPPY_BIRTHDAY = [
    [392.00, 0.3], [392.00, 0.2], [440.00, 0.45], [392.00, 0.45], [523.25, 0.45], [493.88, 0.9],
    [392.00, 0.3], [392.00, 0.2], [440.00, 0.45], [392.00, 0.45], [587.33, 0.45], [523.25, 0.9],
    [392.00, 0.3], [392.00, 0.2], [783.99, 0.45], [659.25, 0.45], [523.25, 0.45], [493.88, 0.45], [440.00, 0.9],
    [698.46, 0.3], [698.46, 0.2], [659.25, 0.45], [523.25, 0.45], [587.33, 0.45], [523.25, 1.0],
  ];

  function bindMusic() {
    const btn = $("#musicToggle");
    if (!btn) return;
    const STORAGE_KEY = "bday-music-2026";
    let ctx = null;
    let master = null;
    let playing = false;
    let loopId = null;

    function ensureCtx() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
    }

    function playNote(freq, when, dur) {
      if (!freq) return; // rest
      const o1 = ctx.createOscillator();
      o1.type = "triangle";
      o1.frequency.value = freq;
      const o2 = ctx.createOscillator();
      o2.type = "sine";
      o2.frequency.value = freq * 2; // soft octave shimmer
      const o2g = ctx.createGain();
      o2g.gain.value = 0.18;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, when);
      env.gain.exponentialRampToValueAtTime(0.3, when + 0.04);
      env.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.92);
      o1.connect(env);
      o2.connect(o2g).connect(env);
      env.connect(master);
      o1.start(when); o2.start(when);
      o1.stop(when + dur); o2.stop(when + dur);
    }

    function playOnce() {
      const sched = melodySchedule(HAPPY_BIRTHDAY, 2.4);
      const t0 = ctx.currentTime + 0.12;
      sched.notes.forEach((n) => playNote(n.freq, t0 + n.start, n.dur));
      return sched.total;
    }

    function loop() {
      const total = playOnce();
      loopId = window.setTimeout(loop, total * 1000);
    }

    async function start() {
      ensureCtx();
      if (!ctx) return false;
      try { if (ctx.state === "suspended") await ctx.resume(); } catch (_) {}
      playing = true;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.25, now + 0.4);
      loop();
      try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch (_) {}
      return true;
    }

    function stop() {
      playing = false;
      if (loopId) { window.clearTimeout(loopId); loopId = null; }
      // Mute the bus; any notes already scheduled play into silence and self-stop.
      if (ctx && master) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      }
      try { window.localStorage.setItem(STORAGE_KEY, "0"); } catch (_) {}
    }

    function sync() {
      btn.setAttribute("aria-pressed", playing ? "true" : "false");
      btn.classList.toggle("is-on", playing);
      const label = playing ? "Pause music" : "Play music";
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    }

    sync();
    btn.addEventListener("click", async () => {
      if (playing) stop(); else await start();
      sync();
    });

    // If music was on last time, resume on the first user gesture (browsers
    // block audio until then).
    let wasOn = false;
    try { wasOn = window.localStorage.getItem(STORAGE_KEY) === "1"; } catch (_) {}
    if (wasOn) {
      const onFirst = async () => {
        document.removeEventListener("click", onFirst);
        document.removeEventListener("touchstart", onFirst);
        document.removeEventListener("keydown", onFirst);
        if (!playing) { await start(); sync(); }
      };
      document.addEventListener("click", onFirst, { once: true });
      document.addEventListener("touchstart", onFirst, { once: true, passive: true });
      document.addEventListener("keydown", onFirst, { once: true });
    }
  }

  // ---------- Hero name: letter-by-letter reveal ----------

  function buildHeroName() {
    const el = $(".bday-hero__name");
    if (!el) return;
    const text = el.textContent;
    el.setAttribute("aria-label", text);
    el.textContent = "";
    Array.prototype.forEach.call(text, (ch, i) => {
      const s = document.createElement("span");
      s.className = "bday-hero__letter";
      s.textContent = ch;
      s.style.setProperty("--i", String(i));
      s.setAttribute("aria-hidden", "true");
      el.appendChild(s);
    });
  }

  // ---------- Signature: draw the letter's name on as it scrolls in ----------

  function bindSignature() {
    const name = $(".bday-letter__name");
    if (!name) return;
    if (reduceMotion) return; // leave the name fully visible
    // Arm the hidden start state. The existing scroll-reveal adds .is-visible to
    // the parent .bday-letter; the CSS keys the ink-on animation off that, so we
    // don't observe the clipped name directly (its clip collapses the IO ratio).
    name.classList.add("is-armed");
  }

  // ---------- "Days since you said yes" count-up ----------

  function bindDaysTogether() {
    const el = $(".bday-daystogether");
    if (!el) return;
    const numEl = $(".bday-daystogether__num", el);
    const target = daysSince(el.getAttribute("data-since") || "2026-05-07", new Date());
    function set(v) { if (numEl) numEl.textContent = String(v); }
    if (reduceMotion || !("IntersectionObserver" in window)) { set(target); return; }
    let done = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || done) return;
        done = true; io.unobserve(e.target);
        const dur = 1200;
        let t0 = null;
        const step = (ts) => {
          if (t0 === null) t0 = ts;
          const elapsed = ts - t0;
          set(tweenValue(elapsed, dur, target));
          if (elapsed < dur) requestAnimationFrame(step); else set(target);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    io.observe(el);
  }

  // ---------- Scratch-to-reveal ----------

  function bindScratch() {
    const wrap = $("#bdayScratch");
    if (!wrap) return;
    const canvas = $("#bdayScratchCanvas");
    const revealBtn = $("#bdayScratchReveal");

    function reveal() { wrap.classList.add("is-revealed"); }

    if (!canvas || !canvas.getContext || reduceMotion) {
      reveal();
      if (revealBtn) revealBtn.hidden = true; // already shown; no need
      return;
    }

    const ctx = canvas.getContext("2d");
    let done = false;
    let drawing = false;
    let moves = 0;

    function paint() {
      const r = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width));
      canvas.height = Math.max(1, Math.round(r.height));
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      g.addColorStop(0, "#e9c46a"); g.addColorStop(0.5, "#f6d97a"); g.addColorStop(1, "#d39a36");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(120, 80, 20, 0.7)";
      ctx.font = '600 22px "Caveat", cursive';
      ctx.textAlign = "center";
      ctx.fillText("Scratch here ✨", canvas.width / 2, canvas.height / 2);
    }
    paint();

    function at(e) {
      const r = canvas.getBoundingClientRect();
      const p = (e.touches && e.touches[0]) || e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    }
    function scratch(x, y) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    function check() {
      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let cleared = 0;
        const total = canvas.width * canvas.height;
        for (let i = 3; i < data.length; i += 4) { if (data[i] === 0) cleared++; }
        if (isScratchedEnough(cleared, total, 0.5)) { done = true; reveal(); }
      } catch (_) { /* ignore */ }
    }

    canvas.addEventListener("pointerdown", (e) => { if (done) return; drawing = true; const p = at(e); scratch(p.x, p.y); });
    canvas.addEventListener("pointermove", (e) => { if (!drawing || done) return; const p = at(e); scratch(p.x, p.y); if (++moves % 6 === 0) check(); });
    window.addEventListener("pointerup", () => { if (drawing) { drawing = false; check(); } });
    canvas.addEventListener("touchmove", (e) => { if (done) return; e.preventDefault(); const p = at(e); scratch(p.x, p.y); if (++moves % 6 === 0) check(); }, { passive: false });
    revealBtn?.addEventListener("click", () => { done = true; reveal(); });
  }

  // ---------- Keepsake card (save / share) ----------

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  async function buildKeepsakeBlob() {
    const W = 1080, H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#fff6ec"); g.addColorStop(1, "#ffd9e0");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    try {
      await document.fonts.load('700 120px "Dancing Script"');
      await document.fonts.load('400 40px "Lora"');
    } catch (_) { /* fall back to system fonts */ }
    try {
      const img = await loadImage(PHOTOS_FULL[0]);
      const pad = 90, pw = W - pad * 2, ph = 620, px = pad, py = 320;
      roundRect(ctx, px, py, pw, ph, 28); ctx.save(); ctx.clip();
      const far = pw / ph, ar = img.width / img.height;
      let sw, sh, sx, sy;
      if (ar > far) { sh = img.height; sw = sh * far; sx = (img.width - sw) / 2; sy = 0; }
      else { sw = img.width; sh = sw / far; sx = 0; sy = (img.height - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, px, py, pw, ph);
      ctx.restore();
    } catch (_) { /* card still works without the photo */ }
    ctx.textAlign = "center";
    ctx.fillStyle = "#be4734";
    ctx.font = '700 72px "Dancing Script", cursive';
    ctx.fillText("Happy Birthday,", W / 2, 175);
    ctx.fillStyle = "#d14d72";
    ctx.font = '700 130px "Dancing Script", cursive';
    ctx.fillText("Akanksha", W / 2, 290);
    ctx.fillStyle = "#6b5a63";
    ctx.font = '400 40px "Lora", serif';
    ctx.fillText("17 June 2026", W / 2, 1030);
    ctx.fillStyle = "#3a2e36";
    ctx.font = 'italic 400 42px "Lora", serif';
    ctx.fillText("— from Ashish, with all my love", W / 2, 1230);
    const dots = ["#ef7d6a", "#e9c46a", "#7a5cff", "#d14d72", "#3fae7a"];
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = dots[i % dots.length];
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(50 + Math.random() * (W - 100), 40 + Math.random() * 120, 5 + Math.random() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }
  function bindKeepsake() {
    const btn = $("#bdayKeepsake");
    if (!btn) return;
    const status = $("#bdayKeepsakeStatus");
    function say(t) { if (status) status.textContent = t; }
    function download(blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "happy-birthday-akanksha.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      say("Saved to your downloads 💛");
    }
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      say("Making your card…");
      let blob;
      try {
        blob = await buildKeepsakeBlob();
      } catch (_) {
        say("Couldn't make the card — try again?");
        btn.disabled = false;
        return;
      }
      const file = new File([blob], "happy-birthday-akanksha.png", { type: "image/png" });
      // Prefer the native share sheet on mobile; fall back to a download.
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Happy Birthday, Akanksha" });
          say("Shared 💛");
          btn.disabled = false;
          return;
        } catch (err) {
          if (err && err.name === "AbortError") { say(""); btn.disabled = false; return; }
          // otherwise fall through to download
        }
      }
      try { download(blob); } catch (_) { say("Couldn't save — try again?"); }
      btn.disabled = false;
    });
  }

  // ---------- Boot ----------

  whenReady(() => {
    buildHeroName();
    bindGate();
    bindCountdown();
    bindDaysTogether();
    bindCake();
    bindWish();
    bindLightbox();
    buildBalloonPop();
    buildPhotoWall();
    bindSignature();
    bindScratch();
    bindKeepsake();
    bindReveal();
    bindClosing();
    bindCelebrationTaps();
    bindMusic();
  });
})();
