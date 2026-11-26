(() => {
  const power = document.querySelector("[data-it-power]");
  const atmosphere = document.getElementById(power.getAttribute("aria-controls"));
  const sort = document.querySelector("[data-it-sort]");
  const desktop = document.querySelector("[data-it-desktop]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const scenes = [...document.querySelectorAll("[data-it-scene]")];
  const visible = new Set();
  let frame = 0;

  power.hidden = false;
  power.addEventListener("click", () => {
    const paused = atmosphere.toggleAttribute("data-atmosphere-paused");
    power.setAttribute("aria-pressed", String(!paused));
    atmosphere.dispatchEvent(new Event("mosko:atmosphere-change"));
  });

  sort.hidden = false;
  sort.addEventListener("click", () => {
    const sorted = desktop.toggleAttribute("data-sorted");
    sort.setAttribute("aria-pressed", String(sorted));
  });

  function paint() {
    frame = 0;
    if (reduced.matches) return;

    const viewportHeight = window.innerHeight;
    for (const scene of visible) {
      const { top, height } = scene.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (viewportHeight * .88 - top) / (viewportHeight * .59 + height * .15)));
      scene.style.setProperty("--it-progress", progress.toFixed(4));
    }
  }

  function requestPaint() {
    if (!frame && !reduced.matches && visible.size) frame = requestAnimationFrame(paint);
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      requestPaint();
    });
    scenes.forEach(scene => observer.observe(scene));
  } else {
    scenes.forEach(scene => visible.add(scene));
  }

  window.addEventListener("scroll", requestPaint, { passive: true });
  window.addEventListener("resize", requestPaint, { passive: true });
  reduced.addEventListener("change", () => {
    if (reduced.matches) scenes.forEach(scene => scene.style.removeProperty("--it-progress"));
    else requestPaint();
  });
  requestPaint();
})();
