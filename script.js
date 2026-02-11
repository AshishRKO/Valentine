const confettiButton = document.getElementById("confettiButton");
const confettiContainer = document.getElementById("confetti");

const colors = ["#f857a6", "#ff5858", "#fbd2d7", "#ffd6a5", "#ffe5ec"];

const createConfetti = () => {
  if (!confettiContainer) return;
  confettiContainer.innerHTML = "";

  const pieces = 40;
  const { innerWidth } = window;

  for (let i = 0; i < pieces; i += 1) {
    const piece = document.createElement("span");
    const size = Math.floor(Math.random() * 8) + 8;
    const left = Math.random() * innerWidth;
    const delay = Math.random() * 0.4;
    const duration = Math.random() * 1.5 + 2.5;

    piece.style.left = `${left}px`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.4}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${delay}s`;
    piece.style.animationDuration = `${duration}s`;

    confettiContainer.appendChild(piece);
  }

  window.setTimeout(() => {
    confettiContainer.innerHTML = "";
  }, 3500);
};

if (confettiButton) {
  confettiButton.addEventListener("click", createConfetti);
}

// Valentine gate: "Will you be my Valentine?" — No button runs away
(function () {
  const gate = document.getElementById("valentineGate");
  const yesBtn = document.getElementById("valentineYes");
  const noBtn = document.getElementById("valentineNo");
  const hint = document.getElementById("valentineHint");
  const noWrap = noBtn?.closest(".valentine-gate__no-wrap");
  let escapeCount = 0;

  function moveNoButton() {
    if (!noBtn || !noWrap) return;
    noBtn.classList.add("on-the-run");
    const wrap = noWrap.getBoundingClientRect();
    const btn = noBtn.getBoundingClientRect();
    const maxLeft = Math.max(0, wrap.width - btn.width - 10);
    const maxTop = Math.max(0, wrap.height - btn.height - 10);
    const left = Math.random() * maxLeft;
    const top = Math.random() * maxTop;
    noBtn.style.left = left + "px";
    noBtn.style.top = top + "px";
    noBtn.style.transform = "none";
    escapeCount++;
    if (escapeCount >= 2 && hint) hint.hidden = false;
  }

  yesBtn?.addEventListener("click", () => {
    createConfetti();
    gate?.classList.add("valentine-gate--hidden");
    const messageEl = document.getElementById("valentineYesMessage");
    if (messageEl) {
      messageEl.hidden = false;
    }
  });

  noBtn?.addEventListener("mouseenter", moveNoButton);
  noBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    moveNoButton();
  });
  noBtn?.addEventListener("touchstart", (e) => {
    e.preventDefault();
    moveNoButton();
  }, { passive: false });
})();

// Journey: step-by-step (single-page only); no-op on multi-page
function completeStep() {}
(function () {
  if (!document.querySelector(".journey-step")) return;
  let lastUnlockedStep = 1;
  const TOTAL_STEPS = 11;

  function getSection(step) {
    return document.querySelector(`.journey-step[data-step="${step}"]`);
  }

  window.completeStep = function (step) {
    if (step !== lastUnlockedStep + 1) return;
    lastUnlockedStep = step;
    const section = getSection(step);
    if (section) {
      section.classList.remove("journey-step--locked");
      section.querySelector(".journey-step__lock")?.setAttribute("aria-hidden", "true");
    }
    updateProgressBar();
    showCelebration();
    updateScrollLock();
    setTimeout(() => scrollToSection(step), 300);
  };

  function updateProgressBar() {
    const numEl = document.getElementById("journeyStepNum");
    const fillEl = document.getElementById("journeyProgressFill");
    if (numEl) numEl.textContent = lastUnlockedStep;
    if (fillEl) fillEl.style.width = (lastUnlockedStep / TOTAL_STEPS) * 100 + "%";
  }

  function showCelebration() {
    createConfetti();
    const toast = document.createElement("div");
    toast.className = "journey-celebration";
    toast.setAttribute("aria-live", "polite");
    toast.textContent = "Step complete! 💕";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }

  function scrollToSection(step) {
    const section = getSection(step);
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  let maxScrollY = Infinity;
  function updateScrollLock() {
    const last = getSection(lastUnlockedStep);
    if (last) {
      const rect = last.getBoundingClientRect();
      maxScrollY = last.offsetTop + last.offsetHeight - window.innerHeight;
      if (maxScrollY < 0) maxScrollY = 0;
    }
  }
  window.addEventListener("scroll", () => {
    if (window.scrollY > maxScrollY) window.scrollTo(0, maxScrollY);
  }, { passive: false });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      updateScrollLock();
      updateProgressBar();
    });
  } else {
    updateScrollLock();
    updateProgressBar();
  }

  document.querySelectorAll("[data-journey-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".journey-step");
      if (!section) return;
      const step = parseInt(section.getAttribute("data-step"), 10);
      window.completeStep(step + 1);
    });
  });
})();

// Scratch card
(function () {
  const canvas = document.getElementById("scratchCanvas");
  const message = document.getElementById("scratchMessage");
  if (!canvas || !message) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const radius = 24;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let totalPixels = width * height;
  let clearedPixels = 0;
  let revealed = false;

  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = 200;
    imageData.data[i + 1] = 200;
    imageData.data[i + 2] = 205;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  function clearCircle(x, y) {
    const data = ctx.getImageData(0, 0, width, height);
    for (let py = -radius; py <= radius; py++) {
      for (let px = -radius; px <= radius; px++) {
        if (px * px + py * py <= radius * radius) {
          const nx = Math.floor(x + px);
          const ny = Math.floor(y + py);
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const i = (ny * width + nx) * 4;
            if (data.data[i + 3] > 0) {
              data.data[i + 3] = 0;
              clearedPixels++;
            }
          }
        }
      }
    }
    ctx.putImageData(data, 0, 0);
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function draw(from, to) {
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const x = from.x + (to.x - from.x) * (i / steps);
      const y = from.y + (to.y - from.y) * (i / steps);
      clearCircle(x, y);
    }
    if (!revealed && clearedPixels > totalPixels * 0.45) {
      revealed = true;
      canvas.style.pointerEvents = "none";
      canvas.style.opacity = "0";
      setTimeout(() => {
        if (typeof completeStep === "function") completeStep(2);
      }, 200);
    }
  }

  function start(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
    clearCircle(pos.x, pos.y);
  }
  function move(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);
    draw({ x: lastX, y: lastY }, pos);
    lastX = pos.x;
    lastY = pos.y;
  }
  function end() {
    isDrawing = false;
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", end);
  canvas.addEventListener("mouseleave", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);
})();

// Quiz (runs for each quiz block)
function initQuiz(containerSelector, resultId, onAllAnswered) {
  const container = document.querySelector(containerSelector);
  const resultEl = document.getElementById(resultId);
  if (!container || !resultEl) return;
  const items = container.querySelectorAll(".quiz__item");
  if (!items.length) return;

  let correctCount = 0;
  const totalOpts = container.querySelectorAll(".quiz__opt").length;

  items.forEach((item) => {
    const opts = item.querySelectorAll(".quiz__opt");
    const feedback = item.querySelector(".quiz__feedback");
    opts.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        opts.forEach((b) => (b.disabled = true));
        const reaction = item.getAttribute("data-reaction");
        if (reaction) {
          correctCount++;
          btn.classList.add("correct");
          if (feedback) {
            feedback.textContent = reaction;
            feedback.classList.add("right");
          }
        } else {
          const right = btn.hasAttribute("data-correct");
          if (right) {
            correctCount++;
            btn.classList.add("correct");
            if (feedback) {
              feedback.textContent = "Correct! 💕";
              feedback.classList.add("right");
            }
          } else {
            btn.classList.add("wrong");
            const correctBtn = item.querySelector(".quiz__opt[data-correct]");
            if (correctBtn) correctBtn.classList.add("correct");
            if (feedback) {
              feedback.textContent = "Not quite — but that's okay!";
              feedback.classList.add("wrong");
            }
          }
        }
        const answeredInBlock = container.querySelectorAll(".quiz__opt:disabled").length;
        if (answeredInBlock >= totalOpts) {
          resultEl.textContent = correctCount === items.length ? "You know us so well! 💕" : "Thanks for playing! 💕";
          if (typeof onAllAnswered === "function") onAllAnswered();
        }
      });
    });
  });
}
initQuiz("#quiz", "quizResult", () => {
  const next = document.getElementById("quizNext");
  if (next) next.hidden = false;
  completeStep(8);
});
// Proposal: choose a button
const proposalAnswer = document.getElementById("proposalAnswer");
const proposalDone = document.getElementById("proposalDone");

function acceptProposal() {
  if (!proposalAnswer || !proposalDone) return;
  proposalAnswer.hidden = true;
  proposalDone.hidden = false;
  createConfetti();
  completeStep(11);
}

document.getElementById("yesChoose")?.addEventListener("click", acceptProposal);
document.getElementById("yesDo")?.addEventListener("click", acceptProposal);

// Easter egg: height
const heightEgg = document.getElementById("heightEgg");
if (heightEgg) {
  heightEgg.addEventListener("click", () => {
    const msg = document.createElement("span");
    msg.className = "easter-egg-msg";
    msg.textContent = "Still 5'8\" — and you're 5'5\". Perfect. 😄";
    msg.style.cssText = "position:absolute;background:#b83b5e;color:#fff;padding:0.5rem 0.75rem;border-radius:8px;font-size:0.9rem;white-space:nowrap;z-index:5;box-shadow:0 4px 12px rgba(0,0,0,0.2);animation:fadeIn 0.2s ease;";
    document.body.appendChild(msg);
    const rect = heightEgg.getBoundingClientRect();
    msg.style.left = rect.left + "px";
    msg.style.top = (rect.top - msg.offsetHeight - 8) + "px";
    setTimeout(() => msg.remove(), 2500);
  });
}

// Lightbox for gallery photos
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

function openLightbox(src, alt) {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function bindLightbox(selector) {
  document.querySelectorAll(selector).forEach((img) => {
    img.addEventListener("click", () => openLightbox(img.src, img.alt));
  });
}
bindLightbox("[data-gallery] .gallery__item img");
bindLightbox("[data-gallery] .collage__item img");

if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
if (lightbox) {
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

// P.S. notes
const psPopover = document.getElementById("psPopover");
const psMessages = {
  psIntro: "I was a little nervous writing this. Still am. 💕",
  psSmile: "That height question still makes me smile."
};
function showPs(id) {
  if (!psPopover || !psMessages[id]) return;
  psPopover.textContent = psMessages[id];
  psPopover.hidden = false;
  setTimeout(() => { psPopover.hidden = true; }, 3500);
}
document.getElementById("psIntro")?.addEventListener("click", () => showPs("psIntro"));
document.getElementById("psSmile")?.addEventListener("click", () => showPs("psSmile"));

// Story timeline dots
document.querySelectorAll(".story-timeline__dot").forEach((dot) => {
  dot.addEventListener("click", () => {
    const date = dot.getAttribute("data-date");
    const moment = dot.getAttribute("data-moment");
    const reveal = document.getElementById("storyReveal");
    if (reveal) {
      reveal.textContent = date ? `${date} — ${moment}` : moment;
    }
    dot.classList.add("revealed");
  });
});

// Secret unlock
const secretModal = document.getElementById("secretModal");
const secretInput = document.getElementById("secretInput");
const secretSubmit = document.getElementById("secretSubmit");
const secretMessage = document.getElementById("secretMessage");
const secretClose = document.getElementById("secretClose");
const secretTrigger = document.getElementById("secretTrigger");
const secretWords = ["aku", "ardhangini", "akanksha"];
function openSecretModal() {
  if (!secretModal) return;
  secretModal.setAttribute("aria-hidden", "false");
  secretMessage.hidden = true;
  secretInput.value = "";
  secretInput.focus();
}
function closeSecretModal() {
  if (!secretModal) return;
  secretModal.setAttribute("aria-hidden", "true");
}
function checkSecret() {
  const v = (secretInput?.value || "").trim().toLowerCase();
  if (!secretMessage) return;
  secretMessage.hidden = false;
  if (secretWords.some((w) => v === w)) {
    secretMessage.textContent = "You've always been my Ardhangini. Even before you said yes. 💕";
    secretMessage.style.color = "var(--rose-dark)";
    createConfetti();
    setTimeout(closeSecretModal, 2500);
  } else {
    secretMessage.textContent = "Not quite — try again!";
    secretMessage.style.color = "#c62828";
  }
}
secretTrigger?.addEventListener("click", openSecretModal);
secretSubmit?.addEventListener("click", checkSecret);
secretInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") checkSecret(); });
secretClose?.addEventListener("click", closeSecretModal);
secretModal?.addEventListener("click", (e) => { if (e.target === secretModal) closeSecretModal(); });

// Double-tap hearts on proposal section
const proposalSection = document.querySelector("[data-step=\"10\"]");
if (proposalSection) {
  let lastTap = 0;
  proposalSection.addEventListener("click", (e) => {
    const now = Date.now();
    if (now - lastTap < 400 && now - lastTap > 0) {
      const container = document.createElement("div");
      container.className = "hearts-float";
      for (let i = 0; i < 10; i++) {
        const heart = document.createElement("span");
        heart.textContent = "❤️";
        heart.style.cssText = `position:absolute;left:${e.clientX + (Math.random() - 0.5) * 80}px;top:${e.clientY}px;font-size:${24 + Math.random() * 20}px;animation:heartFloat 2s ease-out forwards;pointer-events:none;`;
        container.appendChild(heart);
      }
      document.body.appendChild(container);
      setTimeout(() => container.remove(), 2200);
      lastTap = 0;
    } else {
      lastTap = now;
    }
  });
}
