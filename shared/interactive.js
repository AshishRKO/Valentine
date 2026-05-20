/* shared/interactive.js — small interactive helpers reused by the
 * birthday and wedding microsites.
 *
 * Each helper looks up its DOM hooks by id/class so pages opt-in by
 * including the right markup. Pure functions are attached to
 * window.__interactive so they're testable in isolation.
 */
(function () {
  "use strict";

  // ---------- Pure helpers ----------

  /** Whole calendar days from `from` to `now` (>= 0). */
  function daysSince(from, now) {
    if (!(from instanceof Date) || !(now instanceof Date)) {
      throw new TypeError("daysSince needs Date instances");
    }
    const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
  }

  /** Years/months/days breakdown from `from` to `now`. Inclusive of partial periods. */
  function elapsed(from, now) {
    if (!(from instanceof Date) || !(now instanceof Date)) {
      throw new TypeError("elapsed needs Date instances");
    }
    let years = now.getFullYear() - from.getFullYear();
    let months = now.getMonth() - from.getMonth();
    let days = now.getDate() - from.getDate();
    if (days < 0) {
      months -= 1;
      // Borrow days from the previous month
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) { years = 0; months = 0; days = 0; }
    return { years, months, days, totalDays: daysSince(from, now) };
  }

  /** Sanitize text for safe insertion into HTML. */
  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---------- DOM bindings ----------

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  /**
   * Live days-since counter. Looks for a [data-counter-since="YYYY-MM-DD"]
   * element with optional child:
   *   [data-counter-days]   → the number
   *   [data-counter-words]  → "1 year, 14 days" etc.
   */
  function bindCounters() {
    $$("[data-counter-since]").forEach((el) => {
      const raw = el.getAttribute("data-counter-since");
      const parts = raw.split("-").map((x) => parseInt(x, 10));
      if (parts.length !== 3 || parts.some(isNaN)) return;
      const from = new Date(parts[0], parts[1] - 1, parts[2]);

      function tick() {
        const now = new Date();
        const days = daysSince(from, now);
        const e = elapsed(from, now);
        const numEl = el.querySelector("[data-counter-days]");
        const wordsEl = el.querySelector("[data-counter-words]");
        if (numEl) numEl.textContent = days;
        if (wordsEl) {
          const bits = [];
          if (e.years) bits.push(e.years + (e.years === 1 ? " year" : " years"));
          if (e.months) bits.push(e.months + (e.months === 1 ? " month" : " months"));
          bits.push(e.days + (e.days === 1 ? " day" : " days"));
          wordsEl.textContent = bits.join(", ");
        }
      }
      tick();
      // Update once per minute so the seconds don't tick visibly but
      // the page stays accurate over long sessions.
      window.setInterval(tick, 60_000);
    });
  }

  /**
   * Horizontal scroll → draggable on touch/desktop.
   * Apply to .w-strip, .bday-gallery, or any element with [data-drag-scroll].
   */
  function bindDragScroll() {
    $$("[data-drag-scroll]").forEach((el) => {
      let down = false;
      let startX = 0;
      let scrollLeft = 0;
      el.addEventListener("pointerdown", (e) => {
        down = true;
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
        el.classList.add("is-dragging");
      });
      el.addEventListener("pointermove", (e) => {
        if (!down) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        el.scrollLeft = scrollLeft - (x - startX);
      });
      const end = () => { down = false; el.classList.remove("is-dragging"); };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointerleave", end);
      el.addEventListener("pointercancel", end);
    });
  }

  /**
   * Chapter progress bar — a thin filling line at the top of the page.
   * Looks for #chapterProgress and reads body data attributes:
   *   data-chapter-index="3"  data-chapter-total="7"
   */
  function bindChapterProgress() {
    const bar = document.getElementById("chapterProgress");
    if (!bar) return;
    const idx = parseInt(document.body.getAttribute("data-chapter-index") || "0", 10);
    const total = parseInt(document.body.getAttribute("data-chapter-total") || "1", 10);
    if (!total) return;
    const pct = Math.min(100, Math.max(0, (idx / total) * 100));
    // Defer one frame so CSS transition plays from 0 → pct
    requestAnimationFrame(() => {
      bar.style.width = pct + "%";
    });
  }

  /**
   * Reveal-on-scroll. Adds .is-visible to elements with [data-reveal] when
   * they enter the viewport. Falls back to immediate-visible if no IO.
   */
  function bindReveal() {
    const items = $$("[data-reveal]");
    items.forEach((el) => el.classList.add("reveal"));
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
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
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );
    items.forEach((el) => io.observe(el));
  }

  /**
   * Guestbook — a tiny localStorage-backed notes board.
   * Markup contract:
   *   <form id="guestbookForm" data-storage-key="...">
   *     <input type="text"  id="guestbookName"></input>      (optional)
   *     <textarea id="guestbookNote"></textarea>
   *     <button type="submit">Save</button>
   *   </form>
   *   <ul id="guestbookList"></ul>
   */
  function bindGuestbook() {
    const form = document.getElementById("guestbookForm");
    if (!form) return;
    const noteEl = form.querySelector("#guestbookNote");
    const nameEl = form.querySelector("#guestbookName");
    const listEl = document.getElementById("guestbookList");
    const errEl = document.getElementById("guestbookError");
    const key = form.getAttribute("data-storage-key") || "guestbook";

    function load() {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      } catch (_) { return []; }
    }

    function save(entries) {
      try { window.localStorage.setItem(key, JSON.stringify(entries)); }
      catch (_) {}
    }

    function render() {
      if (!listEl) return;
      const entries = load();
      if (!entries.length) {
        listEl.innerHTML = '<li class="guestbook__empty">No notes yet — yours can be the first.</li>';
        return;
      }
      listEl.innerHTML = entries
        .slice()
        .reverse()
        .map((e) => {
          const when = new Date(e.t || Date.now());
          const date = when.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
          const who = e.name ? '<span class="guestbook__name">' + escapeHTML(e.name) + "</span>" : "";
          return (
            '<li class="guestbook__item">' +
              '<p class="guestbook__note">' + escapeHTML(e.note) + "</p>" +
              '<p class="guestbook__meta">' + who + '<time>' + date + "</time></p>" +
            "</li>"
          );
        })
        .join("");
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const note = (noteEl?.value || "").trim();
      if (!note) {
        if (errEl) { errEl.textContent = "Type a few words first."; errEl.hidden = false; }
        return;
      }
      const name = (nameEl?.value || "").trim();
      const entries = load();
      entries.push({ note, name, t: Date.now() });
      save(entries);
      if (noteEl) noteEl.value = "";
      if (errEl) { errEl.textContent = ""; errEl.hidden = true; }
      render();
    });

    render();
  }

  /**
   * Videos with [data-autoplay-when-visible]:
   *   - autoplay (muted) when in viewport, pause when out — keeps CPU low
   *   - tap to toggle mute; unmuting pauses the ambient music engine
   *   - shows a soft "tap for sound" hint until tapped once
   */
  function bindVideos() {
    const vids = $$("[data-autoplay-when-visible]");
    if (!vids.length) return;

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            const v = e.target;
            if (e.isIntersecting) {
              v.play().catch(() => { /* autoplay can fail silently */ });
            } else {
              v.pause();
            }
          });
        },
        { threshold: 0.35 }
      );
      vids.forEach((v) => io.observe(v));
    } else {
      vids.forEach((v) => v.play().catch(() => {}));
    }

    vids.forEach((v) => {
      const wrap = v.closest(".sh-video-roll__item, .sh-video-solo") || v;
      wrap.classList.add("sh-video--mutable");

      function toggleMute(e) {
        e.preventDefault();
        v.muted = !v.muted;
        if (!v.muted) {
          // pause the ambient engine if it's playing — don't double up audio
          const ambient = window.__ambient && window.__ambient.music;
          if (ambient && ambient.playing) {
            ambient.stop();
            const btn = document.getElementById("musicToggle");
            if (btn) { btn.setAttribute("aria-pressed", "false"); btn.classList.remove("is-on"); }
          }
          v.play().catch(() => {});
          wrap.classList.add("is-unmuted");
        } else {
          wrap.classList.remove("is-unmuted");
        }
      }

      wrap.addEventListener("click", toggleMute);
    });
  }

  /**
   * Parallax tilt on .w-hero img — subtle 1.02× scale on scroll.
   */
  function bindParallax() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const heroes = $$(".w-hero, [data-parallax]");
    if (!heroes.length) return;
    function update() {
      heroes.forEach((hero) => {
        const r = hero.getBoundingClientRect();
        const vh = window.innerHeight;
        const center = r.top + r.height / 2;
        const offset = (center - vh / 2) / vh; // -1 (above) to 1 (below)
        const img = hero.querySelector("img");
        if (img) {
          img.style.transform = "translateY(" + (offset * -12) + "px) scale(" + (1.04 - Math.abs(offset) * 0.02) + ")";
        }
      });
    }
    let rafId = 0;
    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  function whenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  whenReady(() => {
    bindCounters();
    bindDragScroll();
    bindChapterProgress();
    bindReveal();
    bindGuestbook();
    bindParallax();
    bindVideos();
  });

  // Expose for tests
  window.__interactive = { daysSince, elapsed, escapeHTML };
})();
