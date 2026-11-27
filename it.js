(() => {
  const power = document.querySelector("[data-it-power]");
  const atmosphere = document.getElementById(power.getAttribute("aria-controls"));

  power.hidden = false;
  power.addEventListener("click", () => {
    const paused = atmosphere.toggleAttribute("data-atmosphere-paused");
    power.setAttribute("aria-pressed", String(!paused));
    atmosphere.dispatchEvent(new Event("mosko:atmosphere-change"));
  });

  const switches = [...document.querySelectorAll("[data-password-switch] a")];
  function showPasswordTool() {
    const generator = location.hash === "#passwortgenerator";
    for (const [index, link] of switches.entries()) {
      const selected = generator === Boolean(index);
      document.getElementById(link.getAttribute("aria-controls")).hidden = !selected;
      if (selected) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }
  for (const link of switches) {
    link.addEventListener("click", event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(null, "", link.hash);
      showPasswordTool();
    });
  }
  window.addEventListener("hashchange", showPasswordTool);
  showPasswordTool();

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
  const question = game.querySelector("[data-question]");
  const options = question.querySelector("[data-question-options]");
  const questionTitle = question.querySelector("[data-question-title]");
  const feedback = question.querySelector("[data-level-feedback]");
  const score = game.querySelector("[data-score]");
  const levelNumber = game.querySelector("[data-level-number]");
  const progress = game.querySelector("progress");
  const mail = game.querySelector("[data-phishing]");
  const clueNotes = mail.querySelector("[data-clue-notes]");
  const clueFeedback = mail.querySelector("[data-clue-feedback]");
  const reveal = mail.querySelector("[data-reveal-clues]");
  const finish = mail.querySelector("[data-show-result]");
  const result = game.querySelector("[data-challenge-result]");
  const { difficultyLabels, questions, scenarios } = moskoChallenge;
  const roundLength = Number(progress.max) - 1;
  const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let deck = [];
  let mailDeck = [];
  let round = [];
  let previousMail;
  let points = 0;
  let index = 0;
  let found = 0;

  function shuffle(items) {
    const mixed = [...items];
    for (let position = mixed.length - 1; position > 0; position--) {
      const picked = Math.floor(Math.random() * (position + 1));
      [mixed[position], mixed[picked]] = [mixed[picked], mixed[position]];
    }
    return mixed;
  }

  function drawRound() {
    const lastRound = new Set(round);
    const chosen = [];
    const categories = new Set();
    const difficulties = new Set();
    while (chosen.length < roundLength) {
      if (!deck.length) deck = shuffle(questions).filter(item => !chosen.includes(item));
      let best = -Infinity;
      let position = 0;
      deck.forEach((item, candidate) => {
        const priority = (lastRound.has(item) ? -16 : 0)
          + (categories.has(item.category) ? 0 : 4)
          + (difficulties.has(item.difficulty) ? 0 : 2)
          + (item.difficulty === "hard" && !difficulties.has(item.difficulty) ? 1 : 0);
        if (priority > best) {
          best = priority;
          position = candidate;
        }
      });
      const [item] = deck.splice(position, 1);
      chosen.push(item);
      categories.add(item.category);
      difficulties.add(item.difficulty);
    }
    return shuffle(chosen);
  }

  function addPoint() {
    score.textContent = String(++points);
  }

  function answer(item, selected) {
    if (!feedback.hidden) return;
    const correct = selected.dataset.answer === item.correct;
    for (const option of options.children) {
      const isCorrect = option.dataset.answer === item.correct;
      option.disabled = true;
      if (isCorrect || option === selected) {
        const status = isCorrect ? "correct" : "incorrect";
        option.dataset.outcome = status;
        option.querySelector(".it-answer-mark").textContent = isCorrect ? "✓" : "×";
        option.querySelector("[data-answer-status]").textContent =
          question.querySelector(isCorrect ? "[data-answer-correct]" : "[data-answer-incorrect]").content.textContent;
      }
    }
    selected.setAttribute("data-selected", "");
    if (correct) addPoint();
    feedback.querySelector("[data-right]").hidden = !correct;
    feedback.querySelector("[data-other]").hidden = correct;
    feedback.querySelector("[data-plus-one]").hidden = !correct;
    feedback.querySelector("[data-plus-zero]").hidden = correct;
    feedback.querySelector("[data-question-explanation]").textContent = item.explanation;
    progress.value = index + 1;
    feedback.hidden = false;
    feedback.focus();
  }

  function showQuestion() {
    const item = round[index];
    question.querySelector("[data-question-meta]").textContent = item.category + " · " + difficultyLabels[item.difficulty];
    questionTitle.textContent = item.title;
    question.querySelector("[data-question-prompt]").textContent = item.question;
    feedback.hidden = true;
    const template = question.querySelector("[data-answer-template]");
    const buttons = shuffle(Object.entries(item.answers)).map(([id, text], position) => {
      const button = template.content.firstElementChild.cloneNode(true);
      button.dataset.answer = id;
      button.querySelector(".it-option-key").textContent = labels[position];
      button.querySelector("[data-answer-text]").textContent = text;
      button.addEventListener("click", () => answer(item, button));
      return button;
    });
    options.replaceChildren(...buttons);
    levelNumber.textContent = String(index + 1);
    question.hidden = false;
    questionTitle.focus();
  }

  function showEndOfMail(message, detail = "") {
    for (const button of mail.querySelectorAll(".it-mail-spot")) button.disabled = true;
    reveal.hidden = true;
    finish.hidden = false;
    progress.value = progress.max;
    const summary = mail.querySelector(message).content.textContent;
    clueFeedback.textContent = [detail, summary].filter(Boolean).join(" ");
    finish.focus();
  }

  function renderMailContent(item) {
    if (!item.clue && !item.neutral) return document.createTextNode(item.text ?? item);

    const spot = document.createElement("button");
    spot.type = "button";
    spot.className = item.url ? "it-mail-spot it-mail-spot--url" : "it-mail-spot";
    spot.textContent = item.text;
    if (item.neutral) {
      spot.addEventListener("click", () => { clueFeedback.textContent = item.neutral; });
      return spot;
    }

    spot.setAttribute("data-clue", "");
    const note = document.createElement("li");
    note.textContent = item.clue;
    clueNotes.append(note);
    spot.addEventListener("click", () => {
      if (spot.hasAttribute("data-found")) return;
      spot.setAttribute("data-found", "");
      addPoint();
      clueFeedback.textContent = item.clue;
      if (++found === clueNotes.children.length) showEndOfMail("[data-mail-complete]", item.clue);
    });
    return spot;
  }

  function showMail() {
    if (!mailDeck.length) mailDeck = shuffle(scenarios);
    const next = Math.max(0, mailDeck.findIndex(item => item !== previousMail));
    const [scenario] = mailDeck.splice(next, 1);
    previousMail = scenario;
    found = 0;
    clueFeedback.textContent = "";
    clueNotes.hidden = true;
    clueNotes.replaceChildren();
    reveal.hidden = false;
    finish.hidden = true;
    mail.querySelector("[data-mail-subject]").textContent = scenario.subject;
    mail.querySelector("[data-mail-meta]").replaceChildren(...scenario.meta.map(item => {
      const row = document.createElement("div");
      const label = document.createElement("dt");
      const value = document.createElement("dd");
      label.textContent = item.label;
      value.append(renderMailContent(item));
      row.append(label, value);
      return row;
    }));
    mail.querySelector("[data-mail-body]").replaceChildren(...scenario.body.map(item => {
      const line = document.createElement("p");
      line.append(renderMailContent(item));
      return line;
    }));
    levelNumber.textContent = String(roundLength + 1);
    question.hidden = true;
    mail.hidden = false;
    mail.querySelector("h3").focus();
  }

  function restart() {
    points = 0;
    index = 0;
    round = drawRound();
    score.textContent = String(points);
    progress.value = 0;
    result.hidden = true;
    result.querySelectorAll("[data-tier]").forEach(tier => { tier.hidden = true; });
    mail.hidden = true;
    game.hidden = false;
    start.hidden = true;
    showQuestion();
  }

  question.querySelector("[data-next]").addEventListener("click", () => {
    if (++index < roundLength) showQuestion();
    else showMail();
  });
  reveal.addEventListener("click", () => {
    clueNotes.hidden = false;
    showEndOfMail("[data-mail-revealed]");
  });
  finish.addEventListener("click", () => {
    mail.hidden = true;
    result.hidden = false;
    const tier = points === 8 ? "perfect" : points >= 5 ? "good" : "learn";
    result.dataset.result = tier;
    const summary = result.querySelector('[data-tier="' + tier + '"]');
    summary.hidden = false;
    summary.querySelector("h3").focus();
  });

  start.addEventListener("click", restart);
  result.querySelector("[data-challenge-restart]").addEventListener("click", restart);
  start.hidden = false;
})();
