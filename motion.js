/* Coordinate the scenes with real document scrolling. The page keeps native links and focus. */
(() => {
  const root = document.documentElement;
  const main = document.querySelector("main");
  const hero = document.querySelector(".hero");
  const signature = document.querySelector(".signature");
  const stage = document.querySelector(".signature-stage");
  const curtain = document.querySelector(".curtain");
  const curtainAnchor = document.querySelector(".footer-anchor");
  const passage = document.querySelector(".signature-still");
  const heroCanvas = document.querySelector(".hero-field");
  const signatureCanvas = document.querySelector(".signature-field");
  const heroArt = heroCanvas && window.MoskoScenes?.heroScene(heroCanvas);
  const signatureArt = window.MoskoScenes?.signatureScene(signatureCanvas, passage);

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(pointer: fine) and (hover: hover)");
  const stickyStage = matchMedia("(min-height: 34rem)");
  const stickyCurtain = matchMedia("(min-width: 48rem) and (min-height: 41rem)");
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = (value) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };

  let frame = 0;
  let lastTime = 0;
  let signatureVisible = false;
  let heroProgress = 0.06;
  let lastSceneProgress = NaN;
  let curtainOverlap = 0;
  let lastCurtainClip = "";
  let previousScroll = NaN;
  let wheel = null;
  const wheelSpring = 0.022;
  const atmospheres = new Map([...document.querySelectorAll(".atmosphere")].map((element) => {
    const section = element.parentElement;
    return [section, {
      element,
      field: window.MoskoScenes?.atmosphereScene(element.querySelector(".atmosphere-field")),
      film: element.querySelector(".atmosphere-film"),
      light: element.querySelector(".atmosphere-light"),
      visible: section === hero,
      time: 0,
      lastPaint: -Infinity,
      pulse: null,
      pointer: { x: 0, y: 0, strength: 0 },
      target: { x: 0, y: 0, strength: 0 },
    }];
  }));
  const heroAtmosphere = atmospheres.get(hero);
  let signetWasInteractive = false;

  function frameRequest() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function cancelWheel() {
    wheel = null;
  }

  function advanceWheel(dt) {
    if (!wheel) return;
    if (Math.abs(window.scrollY - wheel.lastWritten) > 2) {
      cancelWheel();
      return;
    }

    // Critically damped motion preserves velocity when another detent changes the destination.
    const offset = wheel.position - wheel.target;
    const carry = (wheel.velocity + wheelSpring * offset) * dt;
    const decay = Math.exp(-wheelSpring * dt);
    wheel.position = wheel.target + (offset + carry) * decay;
    wheel.velocity = (wheel.velocity - wheelSpring * carry) * decay;
    const settled = Math.abs(wheel.position - wheel.target) < 0.65 && Math.abs(wheel.velocity) < 0.025;
    window.scrollTo({ top: settled ? wheel.target : wheel.position, behavior: "instant" });
    wheel.lastWritten = window.scrollY;
    if (settled) cancelWheel();
  }

  function paintAtmosphere(scene, pulse) {
    const { film, light, pointer, time, width, height } = scene;
    scene.field?.draw(time, pointer, pulse);
    if (!width || !height) return;

    const driftX = Math.sin(time * 0.36);
    const driftY = Math.cos(time * 0.29);
    const pointerX = pointer.x / width - 0.5;
    const pointerY = pointer.y / height - 0.5;
    const strength = pointer.strength;
    const restingX = film ? 0.22 : 0.06;
    const x = width * (restingX * (1 - strength) + pointerX * 0.52 * strength) + driftX * 9;
    const y = height * (-0.04 * (1 - strength) + pointerY * 0.43 * strength) + driftY * 7;
    if (light) {
      light.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      light.style.opacity = (0.36 + strength * 0.31 + driftY * 0.045).toFixed(3);
    }
    if (film) {
      const filmX = driftX * 7 + pointerX * strength * 11;
      const filmY = driftY * 4 + pointerY * strength * 8;
      film.style.transform = `translate3d(${filmX.toFixed(1)}px, ${filmY.toFixed(1)}px, 0)`;
    }
  }

  function updateAtmospheres(dt) {
    if (reduced.matches || document.hidden) return false;

    let visible = false;
    for (const [section, scene] of atmospheres) {
      if (!scene.visible || (section === curtain && lastCurtainClip === "100%"
        && !curtain.querySelector(".preview-note:target"))) continue;

      visible = true;
      scene.time += dt / 1000;
      const { pointer, target } = scene;
      const follow = 1 - Math.exp(-dt / 138);
      pointer.x += (target.x - pointer.x) * follow;
      pointer.y += (target.y - pointer.y) * follow;
      pointer.strength += (target.strength - pointer.strength) * follow;
      if (Math.abs(target.strength - pointer.strength) < 0.006) pointer.strength = target.strength;

      const isHero = scene === heroAtmosphere;
      const forming = isHero && heroProgress < 1;
      if (isHero) heroProgress = clamp(heroProgress + dt / 3050);
      if (scene.pulse) {
        scene.pulse.age += dt / 1000;
        if (scene.pulse.age >= 1.32) scene.pulse = null;
      }

      const { pulse } = scene;
      const interacting = pointer.strength > 0.02 || target.strength > 0.02 || pulse || forming;
      if (scene.time - scene.lastPaint < (interacting ? 0.027 : 0.067)) continue;

      paintAtmosphere(scene, pulse);
      if (isHero && (interacting || signetWasInteractive)) {
        heroArt?.draw(heroProgress, scene.time, pointer, pulse);
        signetWasInteractive = Boolean(interacting);
      }
      scene.lastPaint = scene.time;
    }
    return visible;
  }

  function updateSignature() {
    if (!signatureVisible || !signatureArt) return;
    const moving = root.classList.contains("motion-ready");
    const bounds = signature.getBoundingClientRect();
    const track = Math.max(1, bounds.height - stage.offsetHeight);
    const progress = moving ? clamp((track * 0.025 - bounds.top) / track) : 0.69;
    if (progress === lastSceneProgress) return;
    lastSceneProgress = progress;
    signatureArt.draw(progress);
  }

  function updateCurtain() {
    if (!root.classList.contains("curtain-ready")) {
      lastCurtainClip = "";
      return;
    }
    const panelBottom = main.getBoundingClientRect().bottom;
    const rise = window.innerHeight - panelBottom;
    let clip = "100%";

    if (rise > 0) {
      const footerBounds = curtain.getBoundingClientRect();
      // Expose the area below the panel first, then reveal the rounded corner overlap.
      const corners = curtainOverlap * smooth((rise - curtainOverlap) / Math.max(1, curtainOverlap));
      const revealTop = panelBottom - corners;
      clip = `${clamp(revealTop - footerBounds.top, 0, footerBounds.height).toFixed(2)}px`;
    }

    if (clip === lastCurtainClip) return;
    lastCurtainClip = clip;
    curtain.style.setProperty("--curtain-clip", clip);
  }

  function update(now) {
    frame = 0;
    const dt = lastTime ? Math.max(1, now - lastTime) : 16.7;
    advanceWheel(dt);
    updateSignature();
    if (previousScroll !== window.scrollY) {
      previousScroll = window.scrollY;
      updateCurtain();
    }

    const running = updateAtmospheres(dt) || wheel !== null;
    lastTime = running ? now : 0;
    if (running) frameRequest();
  }

  function fitArtwork() {
    for (const scene of atmospheres.values()) {
      scene.width = scene.element.clientWidth;
      scene.height = scene.element.clientHeight;
      scene.field?.resize();
      scene.field?.draw(scene.time, scene.pointer, scene.pulse);
    }
    if (heroArt?.resize()) {
      const { time, pointer, pulse } = heroAtmosphere;
      heroArt.draw(reduced.matches ? 1 : heroProgress, time, pointer, pulse);
    }
    lastSceneProgress = NaN;
    signatureArt?.resize();
    if (signatureVisible) updateSignature();
    else signatureArt?.draw(0.69);
    curtainOverlap = parseFloat(getComputedStyle(main).borderBottomLeftRadius) || 0;
    previousScroll = NaN;
    lastCurtainClip = "";
    frameRequest();
  }

  function syncPreferences() {
    cancelWheel();
    if (reduced.matches || !finePointer.matches) {
      for (const scene of atmospheres.values()) {
        scene.target.strength = 0;
        scene.pointer.strength = 0;
        if (reduced.matches) {
          scene.pulse = null;
          scene.film?.style.removeProperty("transform");
          if (scene.light) {
            scene.light.style.removeProperty("transform");
            scene.light.style.removeProperty("opacity");
          }
        }
      }
    }
    root.classList.toggle("motion-ready", Boolean(signatureArt) && stickyStage.matches && !reduced.matches);
    root.classList.toggle("curtain-ready", stickyCurtain.matches && !reduced.matches);
    fitArtwork();
  }

  function scrollsIndependently(target, direction) {
    for (let node = target; node && node !== document.body; node = node.parentElement) {
      if (node.scrollHeight <= node.clientHeight + 1) continue;
      if (!/^(auto|scroll)$/.test(getComputedStyle(node).overflowY)) continue;
      const atEdge = direction > 0 ? node.scrollTop >= node.scrollHeight - node.clientHeight - 1 : node.scrollTop <= 0;
      if (!atEdge) return true;
    }
    return false;
  }

  function onWheel(event) {
    if (reduced.matches || !finePointer.matches || !event.cancelable || event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("textarea, select, input, [contenteditable], [data-native-scroll]")) return;
    if (scrollsIndependently(target, event.deltaY)) return;

    const factor = event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? window.innerHeight : 1;
    const delta = event.deltaY * factor;
    const maxScroll = document.scrollingElement.scrollHeight - window.innerHeight;
    const position = window.scrollY;
    if (wheel && Math.abs(position - wheel.lastWritten) > 2) cancelWheel();
    const reversed = wheel && Math.sign(delta) !== Math.sign(wheel.target - wheel.position);
    const destination = clamp((reversed ? position : wheel?.target ?? position) + delta, 0, maxScroll);
    if (destination === position && !wheel) return;

    event.preventDefault();
    if (!wheel) wheel = { position, lastWritten: position, velocity: 0, target: position };
    else if (reversed) wheel.velocity *= 0.18;
    wheel.target = destination;
    frameRequest();
  }

  function enableInteraction() {
    for (const [section, scene] of atmospheres) {
      section.addEventListener("pointermove", (event) => {
        if (reduced.matches || !finePointer.matches || event.pointerType === "touch") return;
        const bounds = scene.element.getBoundingClientRect();
        scene.target.x = event.clientX - bounds.left;
        scene.target.y = event.clientY - bounds.top;
        scene.target.strength = 1;
        if (!scene.pointer.strength) {
          scene.pointer.x = scene.target.x;
          scene.pointer.y = scene.target.y;
        }
        frameRequest();
      }, { passive: true });
      section.addEventListener("pointerleave", () => {
        scene.target.strength = 0;
        frameRequest();
      });
      section.addEventListener("click", (event) => {
        if (!scene.field || reduced.matches || event.button !== 0) return;
        if (event.target.closest("a, button, input") || !window.getSelection()?.isCollapsed) return;
        const bounds = scene.element.getBoundingClientRect();
        scene.pulse = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, age: 0 };
        scene.lastPaint = -Infinity;
        frameRequest();
      });
    }

    passage.addEventListener("load", () => {
      lastSceneProgress = NaN;
      if (signatureVisible) frameRequest();
      else signatureArt?.draw(0.69);
    });
    document.addEventListener("visibilitychange", () => {
      lastTime = 0;
      frameRequest();
    });
    window.addEventListener("hashchange", () => {
      previousScroll = NaN;
      frameRequest();
    });

    window.addEventListener("wheel", onWheel, { passive: false });
    for (const event of ["pointerdown", "touchstart", "keydown"]) {
      window.addEventListener(event, cancelWheel, { passive: true });
    }
    window.addEventListener("scroll", frameRequest, { passive: true });
    window.addEventListener("resize", fitArtwork, { passive: true });

    curtain.addEventListener("focusin", (event) => {
      if (!event.target.matches(":focus-visible") || !root.classList.contains("curtain-ready")) return;
      const focusTop = event.target.getBoundingClientRect().top;
      if (focusTop < main.getBoundingClientRect().bottom || focusTop > window.innerHeight) {
        curtainAnchor.scrollIntoView({ behavior: "instant", block: "start" });
        updateCurtain();
      }
    });

    if ("IntersectionObserver" in window) {
      const visibility = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const scene = atmospheres.get(entry.target);
          if (scene) {
            scene.visible = entry.isIntersecting;
            if (!scene.visible) scene.target.strength = 0;
          } else signatureVisible = entry.isIntersecting;
        }
        frameRequest();
      });
      for (const section of atmospheres.keys()) visibility.observe(section);
      visibility.observe(signature);
    } else {
      for (const scene of atmospheres.values()) scene.visible = true;
      signatureVisible = true;
    }

    for (const media of [reduced, finePointer, stickyStage, stickyCurtain]) media.addEventListener("change", syncPreferences);
  }

  function applySignatureVariant() {
    if (new URLSearchParams(window.location.search).get("signature") !== "a") return;
    const alternate = document.querySelector("#signature-variant-a").content;
    for (const part of ["eyebrow", "title", "line"]) {
      const selector = `[data-signature-${part}]`;
      signature.querySelector(selector).textContent = alternate.querySelector(selector).textContent;
    }
  }

  applySignatureVariant();
  enableInteraction();
  syncPreferences();
})();
