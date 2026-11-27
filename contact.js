(() => {
  const form = document.querySelector("[data-contact-form]");
  const fieldset = form.querySelector("fieldset");
  const fields = [...form.querySelectorAll("input, textarea")];
  const draft = form.querySelector("[data-contact-draft]");
  const link = form.querySelector("[data-draft-link]");

  function closeDraft() {
    draft.hidden = true;
    link.removeAttribute("href");
  }

  function fieldError(field) {
    if (field.required && !field.value.trim()) return field.dataset.requiredMessage;
    if (field.validity.typeMismatch) return field.dataset.formatMessage;
    return "";
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    closeDraft();

    let firstInvalid;
    for (const field of fields) {
      const message = fieldError(field);
      const error = field.closest(".contact-field").querySelector("[data-field-error]");
      if (!error) continue;
      error.textContent = message;
      error.hidden = !message;
      if (message) {
        field.setAttribute("aria-invalid", "true");
        field.setAttribute("aria-describedby", error.id);
        firstInvalid ??= field;
      } else {
        field.removeAttribute("aria-invalid");
        field.removeAttribute("aria-describedby");
      }
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const { name, email, phone, message } = Object.fromEntries(fields.map(field => [field.name, field.value.trim()]));
    const body = [
      message,
      "",
      "Name: " + name,
      "E-Mail-Adresse: " + email,
      ...(phone ? ["Telefonnummer: " + phone] : []),
    ].join("\r\n");
    link.href = "mailto:info@mosko.ch?subject=" + encodeURIComponent("Kontakt zu MOSKO.") + "&body=" + encodeURIComponent(body);
    draft.hidden = false;
    link.focus();
  });

  form.addEventListener("input", closeDraft);
  window.addEventListener("pagehide", closeDraft);
  fieldset.disabled = false;
})();
