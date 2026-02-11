(function () {
  function playTone(frequency, duration, type) {
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      var ctx = new C();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      osc.type = type || "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  window.playQuizCorrect = function () {
    playTone(523.25, 0.12, "sine");
    setTimeout(function () {
      playTone(659.25, 0.12, "sine");
    }, 100);
    setTimeout(function () {
      playTone(783.99, 0.2, "sine");
    }, 220);
  };

  window.playQuizIncorrect = function () {
    playTone(200, 0.15, "sine");
    setTimeout(function () {
      playTone(180, 0.2, "sine");
    }, 120);
  };
})();
