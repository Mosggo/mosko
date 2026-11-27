(() => {
  const stage = document.querySelector("[data-brand-stage]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (!stage || !("IntersectionObserver" in window)) return;

  let visible = false;
  let frame = 0;
  const ease = (start, end, value) => {
    const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
    return t * t * (3 - 2 * t);
  };

  function paint() {
    frame = 0;
    if (reduced.matches) return;
    const { top, height } = stage.getBoundingClientRect();
    const view = window.innerHeight;
    const progress = (view * .78 - top) / Math.max(1, view * .58 - height * .16);
    const merge = ease(.14, .63, progress);
    const settle = ease(.63, .94, progress);
    stage.style.setProperty("--brand-g-in", `${59 * merge}%`);
    stage.style.setProperty("--brand-g-opacity", 1 - ease(.36, .64, progress));
    stage.style.setProperty("--brand-o-in", `${-67 * merge}%`);
    stage.style.setProperty("--brand-k-opacity", ease(.45, .67, progress));
    stage.style.setProperty("--brand-letter-opacity", 1 - settle);
    stage.style.setProperty("--brand-logo-opacity", settle);
    stage.style.setProperty("--brand-logo-rise", `${(1 - settle) * 14}px`);
    stage.style.setProperty("--brand-glow", .12 + .88 * ease(.12, .93, progress));
    stage.setAttribute("data-brand-moving", "");
  }

  function schedule() {
    if (!frame && visible && !reduced.matches) frame = requestAnimationFrame(paint);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }, { rootMargin: "8% 0px" }).observe(stage);

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  reduced.addEventListener("change", () => {
    if (reduced.matches) stage.removeAttribute("data-brand-moving");
    else schedule();
  });
})();
