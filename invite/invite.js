/* invite/invite.js — wedding invitation for Ashish & Akanksha, 18 October.
 *
 * Everything the page says comes from window.INVITE (see invite-data.js).
 * Pure helpers are exposed on window.__invite for tests/invite.test.js.
 */
(function () {
  "use strict";

  // ---------- Pure helpers (unit-tested) ----------

  const MONTHS_LONG = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const MONTHS_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const WEEKDAYS = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ];
  const DAY_MS = 86400000;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // A value the couple has not filled in yet. Matches "TODO" as a whole word so
  // a real name like "Todorov Hall" still prints.
  function isPlaceholder(value) {
    if (value == null) return true;
    const s = String(value).trim();
    return s === "" || /^todo\b/i.test(s);
  }

  /* Read the calendar parts straight out of an ISO string, ignoring any offset.
   * The printed date and time are the venue's wall clock, so they must read the
   * same for a guest in Dehradun and a guest in Dubai. */
  function parseWallClock(iso) {
    if (typeof iso !== "string") return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(iso.trim());
    if (!m) return null;
    const parts = {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3]),
      hour: m[4] ? Number(m[4]) : 0,
      minute: m[5] ? Number(m[5]) : 0,
    };
    if (parts.month < 1 || parts.month > 12) return null;
    if (parts.day < 1 || parts.day > 31) return null;
    if (parts.hour > 23 || parts.minute > 59) return null;
    return parts;
  }

  function formatTime(iso) {
    const p = parseWallClock(iso);
    if (!p) return "";
    const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
    return h12 + ":" + pad2(p.minute) + " " + (p.hour < 12 ? "AM" : "PM");
  }

  function formatShortDate(iso) {
    const p = parseWallClock(iso);
    if (!p) return "";
    return MONTHS_SHORT[p.month - 1] + " " + p.day + ", " + p.year;
  }

  function formatEventDate(iso) {
    if (!parseWallClock(iso)) return "";
    return formatShortDate(iso) + ", " + formatTime(iso);
  }

  /* Not every ritual has a clock time. The Panigrahan Sanskar happens
   * शुभ लग्नानुसार — at the auspicious moment — so those entries carry a
   * label that takes the place of the time. */
  function formatEventWhen(iso, timeLabel) {
    if (!parseWallClock(iso)) return "";
    if (!isPlaceholder(timeLabel)) {
      return formatShortDate(iso) + ", " + String(timeLabel).trim();
    }
    return formatEventDate(iso);
  }

  function formatLongDate(iso) {
    const p = parseWallClock(iso);
    if (!p) return "";
    return MONTHS_LONG[p.month - 1] + " " + p.day + ", " + p.year;
  }

  function weekdayName(iso) {
    const p = parseWallClock(iso);
    if (!p) return "";
    return WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
  }

  /* Time left until `target`. "today" covers the 24 hours from the muhurat, so
   * the page reads "Today is the day" for the whole celebration. */
  function countdown(now, target) {
    if (!(now instanceof Date) || !(target instanceof Date)) {
      throw new TypeError("countdown requires Date instances");
    }
    const diff = target.getTime() - now.getTime();
    if (diff > 0) {
      const s = Math.floor(diff / 1000);
      return {
        state: "future",
        days: Math.floor(s / 86400),
        hours: Math.floor((s % 86400) / 3600),
        minutes: Math.floor((s % 3600) / 60),
        seconds: s % 60,
      };
    }
    return {
      state: diff > -DAY_MS ? "today" : "past",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  function isScratchedEnough(cleared, total, threshold) {
    return total > 0 && cleared / total >= threshold;
  }

  function nextSlide(current, total) {
    if (!(total > 1)) return 0;
    return (current + 1) % total;
  }

  function slideFromDrag(dx, threshold, current, total) {
    if (!(total > 1)) return 0;
    if (Math.abs(dx) < threshold) return current;
    return (current + (dx < 0 ? 1 : -1) + total) % total;
  }

  // Music plays unless the guest has turned it off on an earlier visit.
  function musicPreference(stored) {
    return stored !== "0";
  }

  // Eased volume for a fade-in. Quadratic, which reads as a natural swell.
  function fadeVolume(elapsed, duration, target) {
    if (!(duration > 0)) return target;
    const t = Math.min(1, Math.max(0, elapsed / duration));
    return Math.round(t * t * target * 1000) / 1000;
  }

  window.__invite = {
    pad2,
    isPlaceholder,
    parseWallClock,
    formatTime,
    formatShortDate,
    formatEventDate,
    formatEventWhen,
    formatLongDate,
    weekdayName,
    countdown,
    isScratchedEnough,
    nextSlide,
    slideFromDrag,
    musicPreference,
    fadeVolume,
  };

  // ---------- Page wiring ----------

  const CFG = window.INVITE || {};
  const reduceMotion = !!(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  /* Print `value`, or clear the node and report back that there was nothing to
   * print, so the caller can hide the block around it. */
  function setText(el, value) {
    if (!el) return false;
    if (isPlaceholder(value)) {
      el.textContent = "";
      return false;
    }
    el.textContent = String(value).trim();
    return true;
  }

  function hideIfEmpty(el, printed) {
    if (el && !printed) el.hidden = true;
    return printed;
  }

  function renderEnvelope() {
    const env = CFG.envelope || {};
    setText($("#envSeal"), env.seal);
    setText($("#envCaption"), env.caption);
  }

  function renderHero() {
    const hero = CFG.hero || {};
    hideIfEmpty($("#heroInvocation"), setText($("#heroInvocation"), hero.invocation));
    setText($("#heroMessage"), hero.message);
    setText($("#heroScroll"), hero.scrollHint);

    // With no photo the hero draws its own dusk sky instead of sitting bare.
    const backdrop = $("#heroPhoto");
    const hasPhoto = !isPlaceholder(hero.photo);
    if (backdrop && hasPhoto) {
      backdrop.style.backgroundImage = "url('" + hero.photo + "')";
    }
    const heroEl = $("#inviteHero");
    if (heroEl) heroEl.classList.toggle("inv-hero--plain", !hasPhoto);

    // "first" is printed above the ampersand, "second" below it — the card
    // names the bride first, since the invitation comes from her family.
    ["first", "second"].forEach(function (role) {
      const person = CFG[role] || {};
      setText($("#" + role + "Name"), person.name);
      const box = $("#" + role + "Lines");
      if (!box) return;
      box.textContent = "";
      const lines = (person.lines || []).filter(function (line) {
        return !isPlaceholder(line);
      });
      lines.forEach(function (line) {
        const span = document.createElement("span");
        span.className = "inv-couple__line";
        span.textContent = line;
        box.appendChild(span);
      });
      box.hidden = lines.length === 0;
    });
  }

  function renderWelcome() {
    const shloka = setText($("#welcomeShloka"), CFG.welcomeShloka);
    hideIfEmpty($("#welcomeShloka"), shloka);
    const body = setText($("#welcomeText"), CFG.welcome);
    hideIfEmpty($("#welcomeText"), body);
    hideIfEmpty($("#sectionWelcome"), shloka || body);
  }

  function renderScratch() {
    const s = CFG.scratch || {};
    setText($("#scratchHeading"), s.heading);
    setText($("#scratchKicker"), s.kicker);
    setText($("#scratchDate"), formatLongDate(CFG.weddingDate));
    setText($("#scratchDay"), weekdayName(CFG.weddingDate));
    setText($("#scratchTime"), formatTime(CFG.weddingDate));
  }

  function renderPhotos() {
    const strip = $("#carouselTrack");
    const dots = $("#carouselDots");
    const section = $("#sectionPhotos");
    const photos = (CFG.photos || []).filter(function (src) {
      return !isPlaceholder(src);
    });
    if (!strip || !dots) return photos.length;
    strip.textContent = "";
    dots.textContent = "";
    if (photos.length === 0) {
      if (section) section.hidden = true;
      return 0;
    }
    photos.forEach(function (src, i) {
      const img = document.createElement("img");
      img.className = "inv-carousel__img";
      img.src = src;
      img.alt = "";
      img.draggable = false;
      if (i > 0) img.loading = "lazy";
      if (i === 0) img.classList.add("is-active");
      strip.appendChild(img);

      const dot = document.createElement("span");
      dot.className = "inv-carousel__dot" + (i === 0 ? " is-active" : "");
      dots.appendChild(dot);
    });
    return photos.length;
  }

  function renderTimeline() {
    const cfg = CFG.timeline || {};
    setText($("#timelineHeading"), cfg.heading);
    const list = $("#timelineList");
    if (!list) return;
    list.textContent = "";
    const events = (cfg.events || []).filter(function (e) {
      return e && !isPlaceholder(e.title) && !isPlaceholder(formatEventWhen(e.at, e.timeLabel));
    });
    events.forEach(function (e) {
      // No data-reveal here: shared/interactive.js has already bound its
      // observer by the time these rows exist. The section around them fades in.
      const row = document.createElement("div");
      row.className = "inv-timeline__row";

      const rail = document.createElement("div");
      rail.className = "inv-timeline__rail";
      rail.setAttribute("aria-hidden", "true");
      rail.innerHTML = '<span class="inv-timeline__dot"></span><span class="inv-timeline__line"></span>';

      const body = document.createElement("div");
      body.className = "inv-timeline__body";
      const title = document.createElement("p");
      title.className = "inv-timeline__title";
      title.textContent = e.title;
      const when = document.createElement("p");
      when.className = "inv-timeline__when";
      when.textContent = formatEventWhen(e.at, e.timeLabel);
      body.appendChild(title);
      body.appendChild(when);
      if (!isPlaceholder(e.note)) {
        const note = document.createElement("p");
        note.className = "inv-timeline__note";
        note.textContent = e.note;
        body.appendChild(note);
      }

      row.appendChild(rail);
      row.appendChild(body);
      list.appendChild(row);
    });
    hideIfEmpty($("#sectionTimeline"), events.length > 0);
  }

  function renderVenue() {
    const v = CFG.venue || {};
    setText($("#venueHeading"), v.heading);
    const hasName = setText($("#venueName"), v.name);
    const hasAddress = setText($("#venueAddress"), v.address);
    const link = $("#venueMapLink");
    if (link) {
      if (isPlaceholder(v.mapsUrl)) {
        link.hidden = true;
      } else {
        link.href = v.mapsUrl;
        setText($("#venueMapLabel"), v.mapsLabel || "View on Google Maps");
      }
    }
    hideIfEmpty($("#sectionVenue"), hasName || hasAddress);
  }

  function renderDressCode() {
    const d = CFG.dressCode || {};
    setText($("#dressHeading"), d.heading);
    const women = setText($("#dressWomen"), d.women);
    const men = setText($("#dressMen"), d.men);
    if (!women) hideIfEmpty($("#dressWomenBlock"), false);
    if (!men) hideIfEmpty($("#dressMenBlock"), false);
    hideIfEmpty($("#sectionDress"), women || men);
  }

  function renderPreWedding() {
    const cfg = CFG.preWedding || {};
    setText($("#preHeading"), cfg.heading);
    const list = $("#preList");
    if (!list) return;
    list.textContent = "";
    const events = (cfg.events || []).filter(function (e) {
      return e && !isPlaceholder(e.title) && !isPlaceholder(formatEventWhen(e.at, e.timeLabel));
    });
    events.forEach(function (e) {
      const row = document.createElement("div");
      row.className = "inv-pre__row";
      const title = document.createElement("p");
      title.className = "inv-pre__title";
      title.textContent = e.title;
      const when = document.createElement("p");
      when.className = "inv-pre__when";
      when.textContent = formatEventWhen(e.at, e.timeLabel);
      row.appendChild(title);
      row.appendChild(when);
      if (!isPlaceholder(e.place)) {
        const place = document.createElement("p");
        place.className = "inv-pre__place";
        place.textContent = e.place;
        row.appendChild(place);
      }
      // For customs a guest from outside the region may not know.
      if (!isPlaceholder(e.note)) {
        const note = document.createElement("p");
        note.className = "inv-pre__note";
        note.textContent = e.note;
        row.appendChild(note);
      }
      list.appendChild(row);
    });
    hideIfEmpty($("#sectionPre"), events.length > 0);
  }

  function renderNoteSection(sectionId, headingId, bodyId, cfg) {
    const c = cfg || {};
    setText($("#" + headingId), c.heading);
    hideIfEmpty($("#" + sectionId), setText($("#" + bodyId), c.body));
  }

  function renderSignoff() {
    const s = CFG.signoff || {};
    hideIfEmpty($("#sectionSignoff"), setText($("#signoffLine"), s.line));
    setText($("#signoffCouple"), CFG.coupleLabel);
    setText($("#footerCouple"), CFG.coupleLabel);
    setText($("#footerNote"), (CFG.footer || {}).note);
  }

  // ---------- Background music ----------

  const MUSIC_KEY = "invite-music";

  /* An <audio> element rather than shared/music.js, because this page plays a
   * real recording instead of the synthesised ambience the other pages use. */
  function bindMusic() {
    const audio = $("#inviteAudio");
    const btn = $("#musicToggle");
    if (!audio || !btn) return null;

    const TARGET_VOLUME = 0.4;
    const FADE_MS = 2600;
    let fadeTimer = 0;
    let playing = false;

    function storedPreference() {
      try {
        return musicPreference(window.localStorage.getItem(MUSIC_KEY));
      } catch (_) {
        return true;
      }
    }
    function remember(on) {
      try {
        window.localStorage.setItem(MUSIC_KEY, on ? "1" : "0");
      } catch (_) {
        /* private browsing — the preference just won't persist */
      }
    }
    function paint() {
      btn.classList.toggle("is-on", playing);
      btn.setAttribute("aria-pressed", playing ? "true" : "false");
      const label = playing ? "Mute music" : "Play music";
      btn.setAttribute("aria-label", label);
      btn.title = label;
    }
    function stopFade() {
      window.clearInterval(fadeTimer);
      fadeTimer = 0;
    }

    function start() {
      stopFade();
      audio.volume = 0;
      const from = Date.now();
      const attempt = audio.play();
      // Rejects when there has been no user gesture yet. The toggle still works.
      if (attempt && attempt.catch) {
        attempt.catch(function () {
          playing = false;
          paint();
        });
      }
      fadeTimer = window.setInterval(function () {
        const v = fadeVolume(Date.now() - from, FADE_MS, TARGET_VOLUME);
        audio.volume = v;
        if (v >= TARGET_VOLUME) stopFade();
      }, 60);
    }

    function setPlaying(on) {
      playing = on;
      remember(on);
      paint();
      if (on) {
        start();
      } else {
        stopFade();
        audio.pause();
      }
    }

    paint();
    btn.addEventListener("click", function () {
      setPlaying(!playing);
    });

    return {
      // Called from the envelope tap, which is the gesture autoplay needs.
      startIfWanted: function () {
        if (!playing && storedPreference()) setPlaying(true);
      },
    };
  }

  // ---------- The envelope ----------

  function bindEnvelope(music) {
    const hero = $("#inviteHero");
    const envelope = $("#envelope");
    if (!hero || !envelope) return;

    let opened = false;

    function open() {
      if (opened) return;
      opened = true;
      if (music) music.startIfWanted();
      hero.classList.add("is-open");
      // Take the spent envelope out of the tab order and out of the way.
      envelope.setAttribute("aria-hidden", "true");
      envelope.tabIndex = -1;
      window.setTimeout(function () {
        envelope.disabled = true;
      }, reduceMotion ? 0 : 2200);
    }

    if (reduceMotion) {
      hero.classList.add("is-instant");
      open();
      return;
    }

    envelope.addEventListener("click", open);
    // Someone who scrolls past without tapping still gets to see the names.
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              open();
              io.disconnect();
            }
          });
        },
        { threshold: 0.15 }
      );
      io.observe(hero);
    }
  }

  // ---------- Countdown ----------

  function bindCountdown() {
    const section = $("#sectionCountdown");
    if (!section) return;
    const cfg = CFG.countdown || {};
    setText($("#countdownHeading"), cfg.heading);

    const targetIso = CFG.weddingDate;
    const target = targetIso ? new Date(targetIso) : null;
    const grid = $("#countdownGrid");
    const note = $("#countdownNote");
    if (!target || isNaN(target.getTime())) {
      section.hidden = true;
      return;
    }

    const cells = {
      days: $("#cdDays"),
      hours: $("#cdHours"),
      minutes: $("#cdMinutes"),
      seconds: $("#cdSeconds"),
    };
    let celebrated = false;

    function tick() {
      const state = countdown(new Date(), target);
      Object.keys(cells).forEach(function (key) {
        if (cells[key]) cells[key].textContent = pad2(state[key]);
      });
      if (state.state === "future") return;

      if (grid) grid.hidden = true;
      if (note) {
        note.hidden = false;
        note.textContent = state.state === "today"
          ? cfg.todayLabel || "Today is the day ❤"
          : cfg.pastLabel || "Married ❤";
      }
      if (state.state === "today" && !celebrated) {
        celebrated = true;
        confetti();
      }
      window.clearInterval(timer);
    }

    const timer = window.setInterval(tick, 1000);
    tick();
  }

  function confetti() {
    if (reduceMotion) return;
    const layer = $("#confetti");
    if (!layer) return;
    const colours = ["#c9a24a", "#e3b483", "#9b273a", "#e6b7bf", "#f5e5e8"];
    for (let i = 0; i < 70; i++) {
      const bit = document.createElement("span");
      bit.className = "inv-confetti__bit";
      bit.style.left = Math.random() * 100 + "%";
      bit.style.background = colours[i % colours.length];
      bit.style.animationDelay = (Math.random() * 0.6).toFixed(2) + "s";
      bit.style.animationDuration = (2.4 + Math.random() * 1.6).toFixed(2) + "s";
      if (i % 3 === 0) bit.style.borderRadius = "50%";
      layer.appendChild(bit);
    }
    window.setTimeout(function () {
      layer.textContent = "";
    }, 5000);
  }

  // ---------- Scratch to reveal ----------

  function bindScratch() {
    const wrap = $("#scratchCard");
    if (!wrap) return;
    const canvas = $("#scratchCanvas");

    function reveal() {
      wrap.classList.add("is-revealed");
    }

    if (!canvas || !canvas.getContext || reduceMotion) {
      reveal();
      return;
    }

    const ctx = canvas.getContext("2d");
    let painted = false;
    let drawing = false;
    let done = false;
    let moves = 0;

    // Size the surface to the card's real box. Returns false while the card has
    // no layout yet, so the canvas is never left at 1x1 with nothing to scratch.
    function paint() {
      const r = wrap.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      canvas.width = Math.round(r.width);
      canvas.height = Math.round(r.height);
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      g.addColorStop(0, "#e6b7bf");
      g.addColorStop(0.45, "#f3d3d8");
      g.addColorStop(1, "#c98a98");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Glitter.
      for (let i = 0; i < 320; i++) {
        ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.75)" : "rgba(155,39,58,0.18)";
        ctx.fillRect(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          1.4,
          1.4
        );
      }
      ctx.fillStyle = "rgba(96, 26, 40, 0.72)";
      ctx.font = '600 17px "Dancing Script", cursive';
      ctx.textAlign = "center";
      ctx.fillText(
        (CFG.scratch || {}).hint || "Scratch here ✨",
        canvas.width / 2,
        canvas.height * 0.62
      );
      painted = true;
      return true;
    }
    function ensurePainted() {
      if (!painted) paint();
    }

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) ensurePainted();
          });
        },
        { rootMargin: "200px 0px" }
      );
      io.observe(wrap);
    }
    window.addEventListener("resize", function () {
      if (!done && moves === 0) {
        painted = false;
        ensurePainted();
      }
    });

    function at(e) {
      const r = canvas.getBoundingClientRect();
      const p = (e.touches && e.touches[0]) || e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    }
    function scratch(x, y) {
      if (!painted && !paint()) return;
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    function check() {
      if (!painted) return;
      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let cleared = 0;
        const total = canvas.width * canvas.height;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] === 0) cleared++;
        }
        if (isScratchedEnough(cleared, total, 0.45)) {
          done = true;
          reveal();
        }
      } catch (_) {
        /* tainted canvas — leave the card as it is */
      }
    }

    canvas.addEventListener("pointerdown", function (e) {
      if (done) return;
      ensurePainted();
      drawing = true;
      const p = at(e);
      scratch(p.x, p.y);
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drawing || done) return;
      const p = at(e);
      scratch(p.x, p.y);
      if (++moves % 6 === 0) check();
    });
    window.addEventListener("pointerup", function () {
      if (drawing) {
        drawing = false;
        check();
      }
    });
    canvas.addEventListener(
      "touchmove",
      function (e) {
        if (done) return;
        e.preventDefault();
        ensurePainted();
        const p = at(e);
        scratch(p.x, p.y);
        if (++moves % 6 === 0) check();
      },
      { passive: false }
    );
  }

  // ---------- Photo carousel ----------

  function bindCarousel(total) {
    const track = $("#carouselTrack");
    if (!track || total < 1) return;
    const slides = $$(".inv-carousel__img", track);
    const dots = $$(".inv-carousel__dot", $("#carouselDots"));
    let current = 0;
    let timer = 0;

    function show(index) {
      current = index;
      slides.forEach(function (img, i) {
        img.classList.toggle("is-active", i === index);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === index);
      });
    }

    function play() {
      if (reduceMotion || total < 2) return;
      timer = window.setInterval(function () {
        show(nextSlide(current, total));
      }, 4200);
    }
    function pause() {
      window.clearInterval(timer);
    }

    let startX = null;
    track.addEventListener("pointerdown", function (e) {
      startX = e.clientX;
      pause();
    });
    window.addEventListener("pointerup", function (e) {
      if (startX == null) return;
      show(slideFromDrag(e.clientX - startX, 45, current, total));
      startX = null;
      play();
    });
    track.addEventListener(
      "touchstart",
      function (e) {
        startX = e.touches[0].clientX;
        pause();
      },
      { passive: true }
    );
    track.addEventListener(
      "touchend",
      function (e) {
        if (startX == null) return;
        const end = (e.changedTouches && e.changedTouches[0]) || null;
        if (end) show(slideFromDrag(end.clientX - startX, 45, current, total));
        startX = null;
        play();
      },
      { passive: true }
    );
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        pause();
        show(i);
        play();
      });
    });

    play();
  }

  // ---------- Boot ----------

  function start() {
    if (!document.body || !$("#inviteRoot")) return;
    renderEnvelope();
    renderHero();
    renderWelcome();
    renderScratch();
    const photoCount = renderPhotos();
    renderTimeline();
    renderVenue();
    renderDressCode();
    renderPreWedding();
    renderNoteSection("sectionTransport", "transportHeading", "transportBody", CFG.transport);
    renderNoteSection("sectionAccommodation", "accommodationHeading", "accommodationBody", CFG.accommodation);
    renderNoteSection("sectionGifts", "giftsHeading", "giftsBody", CFG.gifts);
    renderSignoff();

    bindEnvelope(bindMusic());
    bindCountdown();
    bindScratch();
    bindCarousel(photoCount);

    // Alternate the cream / blush section backgrounds over whatever survived,
    // so hiding a block never leaves two of the same shade side by side.
    $$("#inviteRoot .inv-section")
      .filter(function (s) {
        return !s.hidden;
      })
      .forEach(function (s, i) {
        s.classList.toggle("inv-section--cream", i % 2 === 0);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
