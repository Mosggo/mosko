(() => {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const power = document.querySelector("[data-it-power]");
  const atmosphere = document.getElementById(power.getAttribute("aria-controls"));

  power.hidden = false;
  power.addEventListener("click", () => {
    const paused = atmosphere.toggleAttribute("data-atmosphere-paused");
    power.setAttribute("aria-pressed", String(!paused));
    atmosphere.dispatchEvent(new Event("mosko:atmosphere-change"));
  });

  const pillars = document.querySelector("[data-it-scene]");
  let frame = 0;
  let visible = !("IntersectionObserver" in window);
  function paintPillars() {
    frame = 0;
    if (motion.matches || !visible) return;
    const { top, height } = pillars.getBoundingClientRect();
    const viewport = window.innerHeight;
    const progress = Math.min(1, Math.max(0, (viewport * .88 - top) / (viewport * .59 + height * .15)));
    pillars.style.setProperty("--it-progress", progress.toFixed(4));
  }
  function schedulePillars() {
    if (visible && !motion.matches && !frame) frame = requestAnimationFrame(paintPillars);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedulePillars();
    }).observe(pillars);
  }
  window.addEventListener("scroll", schedulePillars, { passive: true });
  window.addEventListener("resize", schedulePillars, { passive: true });
  motion.addEventListener("change", () => {
    if (motion.matches) pillars.style.removeProperty("--it-progress");
    else schedulePillars();
  });
  schedulePillars();

  // The isolated checker sends layout dimensions only.
  const checker = document.querySelector("[data-password-frame]");
  window.addEventListener("message", event => {
    if (event.source !== checker.contentWindow || event.origin !== "null") return;
    const { type, height } = event.data ?? {};
    if (type === "mosko:check-height" && Number.isInteger(height) && height >= 30 && height <= 1200) checker.height = height;
  });
})();

(() => {
  const generator = document.querySelector("[data-password-generator]");
  if (!window.crypto?.getRandomValues) {
    document.querySelector("[data-generator-unavailable]").hidden = false;
    return;
  }

  const alphabet = {
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lower: "abcdefghijklmnopqrstuvwxyz",
    digits: "0123456789",
    symbols: "!#$%&()*+,-./:;<=>?@[]^_{|}~",
  };
  const display = generator.querySelector(".it-generated");
  const slider = generator.querySelector("input[type=range]");
  const length = generator.querySelector("[data-length-value]");
  const toggles = [...generator.querySelectorAll("[data-charset]")];
  const status = generator.querySelector("[data-generator-status]");
  let version = 0;

  function notice(key) {
    status.textContent = generator.querySelector(`template[data-generator-message="${key}"]`).content.textContent;
  }

  // Rejection sampling keeps every character and every valid full string equally likely.
  function createPassword(size, sets) {
    const pool = sets.join("");
    const limit = 256 - 256 % pool.length;
    const bytes = new Uint8Array(size);
    const spare = new Uint8Array(1);
    let value;
    do {
      crypto.getRandomValues(bytes);
      value = "";
      for (let sample of bytes) {
        while (sample >= limit) sample = crypto.getRandomValues(spare)[0];
        value += pool[sample % pool.length];
      }
    } while (!sets.every(set => [...value].some(character => set.includes(character))));
    bytes.fill(0);
    spare.fill(0);
    return value;
  }

  function generate(announce = false) {
    const sets = toggles.filter(option => option.checked).map(option => alphabet[option.dataset.charset]);
    version++;
    display.textContent = createPassword(Number(slider.value), sets);
    if (announce) notice("created");
  }

  slider.addEventListener("input", () => { length.value = slider.value; });
  for (const toggle of toggles) {
    toggle.addEventListener("change", () => {
      if (!toggles.some(option => option.checked)) {
        toggle.checked = true;
        notice("minimum");
      } else status.textContent = "";
    });
  }

  generator.querySelector("[data-generate]").addEventListener("click", () => generate(true));
  generator.querySelector("[data-copy]").addEventListener("click", async () => {
    const copiedVersion = version;
    try {
      await navigator.clipboard.writeText(display.textContent);
      if (copiedVersion === version) notice("copied");
    } catch {
      if (copiedVersion === version) notice("failed");
    }
  });
  window.addEventListener("pagehide", () => {
    version++;
    display.textContent = "";
    status.textContent = "";
  });
  window.addEventListener("pageshow", () => { if (!display.textContent) generate(); });
  length.value = slider.value;
  generate();
  generator.hidden = false;
})();

(() => {
  const thought = document.querySelector("[data-backup-choice]");
  const feedback = thought.querySelector("[data-backup-feedback]");
  const options = [...thought.querySelectorAll("[data-backup-answer]")];

  for (const option of options) {
    option.addEventListener("click", () => {
      for (const button of options) button.setAttribute("aria-pressed", String(button === option));
      feedback.textContent = thought.querySelector(`template[data-backup-response="${option.dataset.backupAnswer}"]`).content.textContent;
    });
  }
  thought.hidden = false;
})();

(() => {
  const start = document.querySelector("[data-challenge-start]");
  const game = document.querySelector("[data-challenge]");
  const questions = [...game.querySelectorAll("[data-question]")];
  const score = game.querySelector("[data-score]");
  const levelNumber = game.querySelector("[data-level-number]");
  const progress = game.querySelector("progress");
  const mail = game.querySelector("[data-phishing]");
  const clueButtons = [...mail.querySelectorAll("[data-clue]")];
  const neutralButtons = [...mail.querySelectorAll("[data-neutral]")];
  const clueNotes = mail.querySelector("[data-clue-notes]");
  const clueFeedback = mail.querySelector("[data-clue-feedback]");
  const reveal = mail.querySelector("[data-reveal-clues]");
  const finish = mail.querySelector("[data-show-result]");
  const result = game.querySelector("[data-challenge-result]");
  const found = new Set();
  let points = 0;
  let index = 0;

  function addPoint() {
    score.textContent = String(++points);
  }

  function showLevel() {
    questions.forEach((question, number) => { question.hidden = number !== index; });
    mail.hidden = index !== questions.length;
    levelNumber.textContent = String(index + 1);
    (questions[index] ?? mail).querySelector("h3").focus();
  }

  function showEndOfMail(message, detail) {
    for (const button of [...clueButtons, ...neutralButtons]) button.disabled = true;
    reveal.hidden = true;
    finish.hidden = false;
    progress.value = progress.max;
    const summary = mail.querySelector(message).content.textContent;
    clueFeedback.textContent = detail ? `${detail} ${summary}` : summary;
    finish.focus();
  }

  function restart() {
    points = 0;
    index = 0;
    found.clear();
    score.textContent = String(points);
    progress.value = 0;
    result.hidden = true;
    result.querySelectorAll("[data-tier]").forEach(tier => { tier.hidden = true; });
    reveal.hidden = false;
    finish.hidden = true;
    clueFeedback.textContent = "";
    clueNotes.hidden = true;
    clueNotes.querySelectorAll("li").forEach(note => { note.hidden = true; });
    for (const button of [...clueButtons, ...neutralButtons]) {
      button.disabled = false;
      button.removeAttribute("data-found");
    }
    for (const question of questions) {
      question.removeAttribute("data-answered");
      question.querySelector("[data-level-feedback]").hidden = true;
      for (const button of question.querySelectorAll("[data-answer]")) {
        button.disabled = false;
        button.removeAttribute("data-selected");
      }
    }
    game.hidden = false;
    start.hidden = true;
    showLevel();
  }

  for (const question of questions) {
    const feedback = question.querySelector("[data-level-feedback]");
    const buttons = [...question.querySelectorAll("[data-answer]")];
    for (const button of buttons) {
      button.addEventListener("click", () => {
        if (question.hasAttribute("data-answered")) return;
        question.setAttribute("data-answered", "");
        button.setAttribute("data-selected", "");
        for (const option of buttons) option.disabled = true;
        const correct = button.hasAttribute("data-correct");
        if (correct) addPoint();
        feedback.querySelector("[data-right]").hidden = !correct;
        feedback.querySelector("[data-other]").hidden = correct;
        feedback.hidden = false;
        progress.value = index + 1;
        feedback.focus();
      });
    }
    question.querySelector("[data-next]").addEventListener("click", () => {
      index++;
      showLevel();
    });
  }

  for (const button of clueButtons) {
    button.addEventListener("click", () => {
      const clue = button.dataset.clue;
      if (found.has(clue)) return;
      found.add(clue);
      button.setAttribute("data-found", "");
      addPoint();
      const note = clueNotes.querySelector(`[data-clue-note="${clue}"]`);
      clueFeedback.textContent = note.textContent;
      if (found.size === clueButtons.length) showEndOfMail("[data-mail-complete]", note.textContent);
    });
  }
  for (const button of neutralButtons) {
    button.addEventListener("click", () => {
      clueFeedback.textContent = mail.querySelector(`template[data-neutral-note="${button.dataset.neutral}"]`).content.textContent;
    });
  }

  reveal.addEventListener("click", () => {
    clueNotes.hidden = false;
    clueNotes.querySelectorAll("li").forEach(note => { note.hidden = false; });
    showEndOfMail("[data-mail-revealed]");
  });
  finish.addEventListener("click", () => {
    mail.hidden = true;
    result.hidden = false;
    const tier = points === 8 ? "perfect" : points >= 5 ? "good" : "learn";
    result.dataset.result = tier;
    const summary = result.querySelector(`[data-tier="${tier}"]`);
    summary.hidden = false;
    summary.querySelector("h3").focus();
  });

  start.addEventListener("click", restart);
  result.querySelector("[data-challenge-restart]").addEventListener("click", restart);
  start.hidden = false;
})();
