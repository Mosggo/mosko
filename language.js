(() => {
  const picker = document.querySelector("[data-language-picker]");
  if (!picker) return;

  const status = document.querySelector("[data-language-status]");
  const buttons = picker.querySelectorAll("[data-language]");
  const supportedLanguages = ["de", "en"];
  const storageKey = "mosko-language";

  function browserLanguage() {
    const preferences = navigator.languages?.length ? navigator.languages : [navigator.language];
    return preferences
      .map(locale => locale.toLowerCase().split("-")[0])
      .find(language => supportedLanguages.includes(language)) ?? "en";
  }

  function applyPreference(language) {
    // The current document remains de-CH until WordPress provides translated content.
    document.documentElement.dataset.preferredLanguage = language;
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    }
    status.textContent = language === "en" ? "English version coming soon." : "";
  }

  let savedLanguage;
  try {
    savedLanguage = localStorage.getItem(storageKey);
  } catch {
    // Browser preference remains available when storage is blocked.
  }

  applyPreference(supportedLanguages.includes(savedLanguage) ? savedLanguage : browserLanguage());
  status.hidden = false;
  picker.hidden = false;

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const language = button.dataset.language;
      applyPreference(language);
      try {
        localStorage.setItem(storageKey, language);
      } catch {
        // The selection remains active for this visit.
      }
    });
  }
})();
