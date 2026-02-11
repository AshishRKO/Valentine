(function () {
  var container = document.querySelector("[data-quiz-single]");
  if (!container) return;

  var nextUrl = container.getAttribute("data-next") || "quiz-1.html";
  var reaction = container.getAttribute("data-reaction");
  var correctMessage = container.getAttribute("data-correct-message");
  var opts = container.querySelectorAll(".quiz-single__opt");
  var feedbackEl = container.querySelector(".quiz-single__feedback");
  var nextEl = container.querySelector(".quiz-single__next");
  var resultEl = container.querySelector(".quiz-single__result");

  function showResult(correct) {
    if (typeof window.playQuizCorrect === "function" && correct) {
      window.playQuizCorrect();
    }
    if (typeof window.playQuizIncorrect === "function" && !correct) {
      window.playQuizIncorrect();
    }
    if (resultEl) {
      resultEl.classList.remove("quiz-single__result--correct", "quiz-single__result--incorrect", "quiz-single__result--reaction");
      resultEl.hidden = false;
      if (reaction) {
        resultEl.textContent = reaction;
        resultEl.classList.add("quiz-single__result--reaction");
      } else {
        var message = correct && correctMessage ? correctMessage : (correct ? "Correct! 💕" : "Not quite — but that's okay!");
        resultEl.textContent = message;
        resultEl.classList.add(correct ? "quiz-single__result--correct" : "quiz-single__result--incorrect");
        if (correct && correctMessage) resultEl.classList.add("quiz-single__result--reaction");
      }
    }
    if (feedbackEl) {
      feedbackEl.hidden = false;
      feedbackEl.setAttribute("aria-live", "polite");
    }
    if (nextEl) {
      setTimeout(function () {
        nextEl.hidden = false;
      }, 1200);
    }
    if (correct && typeof createConfetti === "function") {
      createConfetti();
    }
  }

  opts.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.disabled) return;
      opts.forEach(function (b) {
        b.disabled = true;
      });
      var isCorrect = btn.hasAttribute("data-correct");
      btn.classList.add(isCorrect || reaction ? "quiz-single__opt--correct" : "quiz-single__opt--wrong");
      if (!reaction && !isCorrect) {
        var correctBtn = container.querySelector(".quiz-single__opt[data-correct]");
        if (correctBtn) correctBtn.classList.add("quiz-single__opt--correct");
      }
      container.classList.add(reaction ? "quiz-single--reaction" : (isCorrect ? "quiz-single--correct" : "quiz-single--incorrect"));
      showResult(!!(isCorrect || reaction));
    });
  });
})();
