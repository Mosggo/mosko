/* The timeline follows the page's actual scroll position. Every step stays in the document flow. */
(() => {
  const timeline = document.querySelector("[data-process]");
  if (!timeline) return;

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const marker = timeline.querySelector(".process-marker");
  const steps = [...timeline.querySelectorAll(".process-step")];
  let centres = [];
  let current = -1;
  let frame = 0;
  let visible = true;

  function draw() {
    frame = 0;
    if (motion.matches || !visible || centres.length < 2) return;

    const first = centres[0];
    const last = centres[centres.length - 1];
    const readingLine = window.innerHeight * 0.46 - timeline.getBoundingClientRect().top;
    const position = Math.max(first, Math.min(last, readingLine));
    timeline.style.setProperty("--process-offset", `${position - first}px`);

    // A phase becomes active when its heading is the nearest to the reading line.
    const next = centres.reduce((nearest, centre, index) =>
      Math.abs(centre - position) < Math.abs(centres[nearest] - position) ? index : nearest, 0);
    if (next === current) return;
    steps[current]?.classList.remove("is-current");
    steps[next].classList.add("is-current");
    marker.textContent = steps[next].querySelector(".process-step-number").textContent;
    current = next;
  }

  function requestDraw() {
    if (!frame && visible && !motion.matches) frame = requestAnimationFrame(draw);
  }

  function measure() {
    if (motion.matches) {
      timeline.removeAttribute("data-tracking");
      steps[current]?.classList.remove("is-current");
      current = -1;
      return;
    }

    timeline.dataset.tracking = "";
    const top = timeline.getBoundingClientRect().top;
    centres = steps.map(step => {
      const heading = step.querySelector("h3").getBoundingClientRect();
      return heading.top - top + heading.height / 2;
    });
    timeline.style.setProperty("--process-top", `${centres[0]}px`);
    timeline.style.setProperty("--process-length", `${centres[centres.length - 1] - centres[0]}px`);
    timeline.style.setProperty("--process-offset", "0px");
    requestDraw();
  }

  window.addEventListener("scroll", requestDraw, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  motion.addEventListener("change", measure);
  document.fonts?.ready.then(measure);

  if ("ResizeObserver" in window) {
    const size = new ResizeObserver(measure);
    size.observe(timeline);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) requestDraw();
    }).observe(timeline);
  }
  measure();
})();
