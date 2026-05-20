/* shared/music.js — ambient music engine for the birthday and wedding pages.
 *
 * Generates a slow, breathing pentatonic loop using Web Audio API + a
 * tiny convolution reverb. Nothing is pre-recorded — every note is
 * synthesised in the browser, so there are no licensing concerns and
 * nothing extra to ship.
 *
 * Hooks: bind to a button with id="musicToggle". State is persisted in
 * localStorage; if the user had music on previously, music auto-resumes
 * on the next user gesture (browser policy requires a gesture before
 * audio can play).
 *
 * Pure helpers are exposed on `window.__ambient` for unit tests.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "valentine-ambient-music";

  // Pentatonic, multiple octaves. Selected to feel reverent + open.
  const NOTES_WEDDING = [
    // C major pentatonic (C D E G A)
    130.81, 146.83, 164.81, 196.00, 220.00,
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
  ];

  // Slightly brighter — F major pentatonic, plus a high A6 for sparkle.
  const NOTES_BIRTHDAY = [
    174.61, 196.00, 220.00, 261.63, 293.66,
    349.23, 392.00, 440.00, 523.25, 587.33,
    698.46, 783.99, 880.00, 1046.50, 1318.51,
  ];

  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  /**
   * Pure helper: pick a note frequency from the scale, biased to the
   * middle octave. Exposed for tests.
   */
  function pickNote(scale, rng) {
    const r = rng();
    // Bias to the middle third
    const t = r < 0.6
      ? Math.floor(scale.length * 0.33 + r * scale.length * 0.33)
      : Math.floor(r * scale.length);
    return scale[clamp(t, 0, scale.length - 1)];
  }

  class AmbientMusic {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.bus = null;
      this.reverb = null;
      this.playing = false;
      this.timers = [];
      this.scale = NOTES_WEDDING;
      this.mood = "wedding";
      this.targetVolume = 0.22;
    }

    isOnPersisted() {
      try { return window.localStorage.getItem(STORAGE_KEY) === "1"; }
      catch (_) { return false; }
    }

    setOnPersisted(on) {
      try { window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0"); }
      catch (_) {}
    }

    setMood(name) {
      this.mood = name;
      this.scale = name === "birthday" ? NOTES_BIRTHDAY : NOTES_WEDDING;
      this.targetVolume = name === "birthday" ? 0.18 : 0.22;
    }

    _buildReverb(duration, decay) {
      const ctx = this.ctx;
      const rate = ctx.sampleRate;
      const len = Math.max(1, Math.floor(rate * duration));
      const buf = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          // Slightly biased noise for a softer tail
          const r = Math.random() * 2 - 1;
          data[i] = r * Math.pow(1 - i / len, decay) * 0.7;
        }
      }
      return buf;
    }

    async _ensureCtx() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error("Web Audio API not supported");
      this.ctx = new AC();

      // Master volume — starts silent, fades in on start().
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);

      // Dry/wet bus with a small convolution reverb.
      const dry = this.ctx.createGain();
      dry.gain.value = 0.55;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.55;

      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this._buildReverb(2.6, 2.4);

      this.bus = this.ctx.createGain();
      this.bus.gain.value = 1.0;

      this.bus.connect(dry);
      this.bus.connect(this.reverb);
      this.reverb.connect(wet);
      dry.connect(this.master);
      wet.connect(this.master);

      // A very gentle low-frequency drone for warmth
      this._drone = this.ctx.createOscillator();
      this._drone.type = "sine";
      this._drone.frequency.value = this.mood === "birthday" ? 116.54 : 87.31; // A2 / F2
      this._droneGain = this.ctx.createGain();
      this._droneGain.gain.value = 0;
      this._drone.connect(this._droneGain).connect(this.bus);
      this._drone.start();
    }

    _playNote(freq, when, duration) {
      const ctx = this.ctx;
      const t0 = when || ctx.currentTime;
      const dur = duration || 2.4 + Math.random() * 1.6;

      // Two oscillators: sine fundamental + soft triangle octave-ish partial
      const o1 = ctx.createOscillator();
      o1.type = "sine";
      o1.frequency.value = freq;

      const o2 = ctx.createOscillator();
      o2.type = "triangle";
      o2.frequency.value = freq * 2;
      o2.detune.value = -3 + Math.random() * 6;

      const o2gain = ctx.createGain();
      o2gain.gain.value = 0.10;

      const env = ctx.createGain();
      env.gain.value = 0;

      // Soft attack/decay envelope (no hard transient)
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(0.20, t0 + 0.10);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      o1.connect(env);
      o2.connect(o2gain).connect(env);
      env.connect(this.bus);

      o1.start(t0);
      o2.start(t0);
      o1.stop(t0 + dur + 0.05);
      o2.stop(t0 + dur + 0.05);
    }

    _scheduleLoop() {
      if (!this.playing || !this.ctx) return;
      const ctx = this.ctx;
      let t = ctx.currentTime + 0.05;
      // 1–3 overlapping notes per "phrase"
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const freq = pickNote(this.scale, Math.random);
        const dur = 2.0 + Math.random() * 2.0;
        this._playNote(freq, t, dur);
        t += 0.6 + Math.random() * 0.6;
      }
      // Schedule the next phrase
      const wait = 1800 + Math.random() * 1500;
      const id = window.setTimeout(() => this._scheduleLoop(), wait);
      this.timers.push(id);
    }

    async start() {
      try {
        await this._ensureCtx();
        if (this.ctx.state === "suspended") await this.ctx.resume();
        this.playing = true;
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(this.master.gain.value, now);
        this.master.gain.linearRampToValueAtTime(this.targetVolume, now + 1.4);
        if (this._droneGain) {
          this._droneGain.gain.cancelScheduledValues(now);
          this._droneGain.gain.setValueAtTime(this._droneGain.gain.value, now);
          this._droneGain.gain.linearRampToValueAtTime(0.04, now + 2.5);
        }
        this._scheduleLoop();
        this.setOnPersisted(true);
        return true;
      } catch (e) {
        console.warn("ambient music start failed:", e);
        return false;
      }
    }

    stop() {
      this.playing = false;
      this.timers.forEach((id) => window.clearTimeout(id));
      this.timers = [];
      if (this.ctx && this.master) {
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(this.master.gain.value, now);
        this.master.gain.linearRampToValueAtTime(0, now + 0.6);
        if (this._droneGain) {
          this._droneGain.gain.cancelScheduledValues(now);
          this._droneGain.gain.setValueAtTime(this._droneGain.gain.value, now);
          this._droneGain.gain.linearRampToValueAtTime(0, now + 0.6);
        }
      }
      this.setOnPersisted(false);
    }

    async toggle() {
      if (this.playing) {
        this.stop();
        return false;
      }
      return await this.start();
    }
  }

  const music = new AmbientMusic();

  // Bind to #musicToggle if present
  function bind() {
    const btn = document.getElementById("musicToggle");
    if (!btn) return;

    // Set mood based on body's data attribute or page id
    const moodFromBody = document.body && document.body.getAttribute("data-music-mood");
    if (moodFromBody) music.setMood(moodFromBody);

    function syncUI() {
      btn.setAttribute("aria-pressed", music.playing ? "true" : "false");
      btn.classList.toggle("is-on", music.playing);
      const label = music.playing ? "Pause music" : "Play music";
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    }

    syncUI();

    btn.addEventListener("click", async () => {
      await music.toggle();
      syncUI();
    });

    // If user previously enabled music, auto-resume on first interaction.
    if (music.isOnPersisted()) {
      const onFirst = async () => {
        document.removeEventListener("click", onFirst);
        document.removeEventListener("touchstart", onFirst);
        document.removeEventListener("keydown", onFirst);
        document.removeEventListener("scroll", onFirst);
        if (!music.playing) {
          await music.start();
          syncUI();
        }
      };
      document.addEventListener("click", onFirst, { once: true });
      document.addEventListener("touchstart", onFirst, { once: true, passive: true });
      document.addEventListener("keydown", onFirst, { once: true });
      document.addEventListener("scroll", onFirst, { once: true, passive: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }

  // Expose for tests
  window.__ambient = { music, pickNote, NOTES_WEDDING, NOTES_BIRTHDAY };
})();
