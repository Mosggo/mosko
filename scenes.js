/* Canvas artwork. Geometry uses CSS pixels at a capped resolution. */
(() => {
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const mix = (start, end, fraction) => start + (end - start) * fraction;
  const ease = (value) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const bits = "01:·+";

  function pointerWeight(pointer, x, y, radius) {
    if (!pointer.strength) return 0;
    const dx = (x - pointer.x) / radius;
    const dy = (y - pointer.y) / radius;
    return pointer.strength * Math.exp(-2.3 * (dx * dx + dy * dy));
  }

  function impulseField(impulse) {
    if (!impulse) return () => 0;
    const distance = impulse.age * 235;
    const energy = 1 - ease(impulse.age / 1.32);
    const bandWidth = 46 + impulse.age * 12;
    return (x, y) => {
      const spread = Math.hypot((x - impulse.x) * 0.89, (y - impulse.y) * 1.12);
      const band = (spread - distance) / bandWidth;
      return energy * Math.exp(-2.8 * band * band);
    };
  }

  // Original MOSKO. signet paths in their 1500 × 1032.05 viewBox.
  const signetM = new Path2D("M1086.37,537.74c-21.68-153.55,4.08-359.05,36.11-493.45.61-2.57,10.93-29.57.91-37.08-8.32-6.94-23.58-6.94-33.28-6.94-26.07-.9-173.71.64-307.79,1.22-21.72.1-40.78,14.38-47,35.19l-193.04,641.47L337.01,2.74H0v1026.29h241.31l-8.32-778.03,221.9,778.03h173.35l229.6-780.03c3.73-12.69,12.1-23.5,23.44-30.31,19.41-12.48,53.35-6.91,50.71,32.3-2.88,42.9-51.32,389.78-92.92,515.98-22.19,69.35-40.22,140.08-59.63,209.43-4.16,15.25-9.71,31.9,1.39,47.15,55.48,11.1,359.22,11.09,371.68,1.39,12.48-11.1,9.23-111.5-.48-173.9-15.25-101.24-51.4-212.29-65.66-313.29Z");
  const signetPoint = new Path2D("M1417.49,796.28h-157.41v235.77h239.93v-153.25c0-45.57-36.94-82.51-82.51-82.51Z");

  function canvasSurface(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    let width = 0;
    let height = 0;

    return {
      ctx,
      get width() { return width; },
      get height() { return height; },
      resize() {
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        if (!width || !height) return false;

        const density = Math.min(window.devicePixelRatio || 1, 1.65);
        canvas.width = Math.round(width * density);
        canvas.height = Math.round(height * density);
        ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
        return true;
      },
      clear() {
        ctx.clearRect(0, 0, width, height);
      },
    };
  }

  function seededRandom(seed) {
    return () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function makeSignet() {
    const sampling = document.createElement("canvas").getContext("2d");
    const random = seededRandom(69723);
    const fragments = [];

    for (let row = 0; row < 31; row++) {
      for (let column = 0; column < 45; column++) {
        const x = column * 34 + 14;
        const y = row * 34 + 15;
        const point = sampling.isPointInPath(signetPoint, x, y);
        if (!point && !sampling.isPointInPath(signetM, x, y)) continue;

        fragments.push({
          x, y, point,
          weight: random(),
          orbit: random() * Math.PI * 2,
          shift: 70 + random() * 220,
          delay: 0.15 * ((x + y * 0.35) / 1850) + random() * 0.23,
        });
      }
    }
    return fragments;
  }

  function makeField(width, height, spacing) {
    const random = seededRandom(33045);
    const columns = Math.max(8, Math.round(width / ((width < 768 ? 27 : 43) * spacing)));
    const rows = Math.max(6, Math.round(height / ((width < 768 ? 30 : 44) * spacing)));
    const field = [];

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const x = (column + 0.16 + random() * 0.68) * width / columns;
        const y = (row + 0.16 + random() * 0.68) * height / rows;
        const idle = random() < 0.44;
        field.push({ x, y, idle, tone: random(), phase: random() * Math.PI * 2 });
      }
    }
    return field;
  }

  const helloMotif = [
    "11011 11111 11000 11000 01110",
    "11011 11000 11000 11000 11011",
    "11011 11000 11000 11000 11011",
    "11111 11110 11000 11000 11011",
    "11011 11000 11000 11000 11011",
    "11011 11000 11000 11000 11011",
    "11011 11111 11111 11111 01110",
  ];

  function markHello(cells, width, height) {
    const columns = helloMotif[0].length;
    const unit = Math.min(width / (width < 768 ? 34 : 47), height / 11.2);
    const wordWidth = columns * unit;
    const center = width < 768 ? width * .52 : Math.min(width * .69, width - wordWidth * .54);
    const left = center - wordWidth / 2;
    const top = height * .61 - helloMotif.length * unit / 2;
    for (const cell of cells) {
      const column = Math.floor((cell.x - left) / unit);
      const row = Math.floor((cell.y - top) / unit);
      cell.motif = helloMotif[row]?.[column] === "1";
    }
  }

  function atmosphereScene(canvas) {
    if (!canvas) return null;
    const surface = canvasSurface(canvas);
    if (!surface) return null;
    const { ctx } = surface;
    const foreground = canvas.closest(".atmosphere")?.parentElement?.querySelectorAll("[data-atmosphere-quiet]");
    const hasHello = canvas.dataset.atmosphereMotif === "hello";
    let cells = [];
    let reach;
    let ink;
    let gain = 1;
    let pulseLight = 0;
    let glyphSize;
    let glyphShare;
    let motion;

    function resize() {
      if (!surface.resize()) return;
      const { width, height } = surface;
      const style = getComputedStyle(canvas);
      const number = (key) => parseFloat(style.getPropertyValue(key));
      const spacing = number("--atmosphere-field-spacing") || 1;
      cells = makeField(width, height, spacing);
      if (hasHello) markHello(cells, width, height);
      reach = clamp(Math.min(width, height) * 0.48, 125, 420);
      ink = style.getPropertyValue("--atmosphere-ink").trim();
      gain = number("--atmosphere-field-gain") || 1;
      pulseLight = number("--atmosphere-pulse-light") || 0;
      glyphSize = style.getPropertyValue("--atmosphere-field-size") ? parseFloat(style.fontSize) : clamp(width / 215, 5, 8.2);
      glyphShare = number("--atmosphere-field-glyph-share") || 0.23;
      motion = number("--atmosphere-field-motion") || 0;

      if (foreground?.length) {
        const bounds = canvas.getBoundingClientRect();
        const regions = [...foreground].map((element) => element.getBoundingClientRect());
        for (const cell of cells) {
          const viewportX = cell.x + bounds.left;
          const viewportY = cell.y + bounds.top;
          const distance = Math.min(...regions.map((region) => Math.hypot(
            Math.max(0, region.left - viewportX, viewportX - region.right),
            Math.max(0, region.top - viewportY, viewportY - region.bottom),
          )));
          cell.visibility = 0.29 + 0.71 * ease(distance / 58);
        }
      }
    }

    function draw(seconds, pointer, impulse) {
      if (!cells.length) return;
      const signal = impulseField(impulse);
      surface.clear();
      if (impulse && pulseLight) {
        const { x, y, age } = impulse;
        const radius = reach * 0.84 + age * 95;
        const flash = ctx.createRadialGradient(x, y, 0, x, y, radius);
        flash.addColorStop(0, ink);
        flash.addColorStop(1, "transparent");
        ctx.globalAlpha = pulseLight * (1 - ease(age / 0.82));
        ctx.fillStyle = flash;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `500 ${glyphSize}px Consolas, monospace`;
      ctx.fillStyle = ink;

      for (const cell of cells) {
        const { x, y, idle, tone, phase, visibility = 1, motif } = cell;
        const energy = signal(x, y);
        if (idle && !motif && energy < 0.15) continue;
        const touch = pointerWeight(pointer, x, y, reach);
        const drift = 0.5 + 0.5 * Math.sin(seconds * 0.62 + x * 0.003 - y * 0.005 + phase);
        const opacity = (idle ? 0 : 0.038 + tone * 0.11 + drift * 0.036 + touch * (0.065 + motion * 0.10)) + energy * 0.32;
        const motifAlpha = motif ? 0.142 + tone * 0.105 : 0;
        const ambient = hasHello && !motif ? opacity * .55 : opacity;
        const contrast = motif ? 1.25 : 1;
        ctx.globalAlpha = clamp((ambient + motifAlpha) * gain * contrast) * visibility;
        const nx = x + touch * Math.cos(phase) * (1.6 + motion * 3.4) + energy * Math.sin(phase) * 4
          + motion * Math.sin(seconds * 0.7 + phase) * 1.8;
        const ny = y + touch * Math.sin(phase) * (1.3 + motion * 2.7) - energy * 2
          + motion * Math.cos(seconds * 0.63 + phase) * 1.6;
        if (motif || tone > 1 - glyphShare || energy > 0.21) {
          const change = Math.floor(touch * motion * 4);
          ctx.fillText(bits[(Math.floor(tone * 19) + Math.floor(energy * 6) + change) % bits.length], nx, ny);
        } else {
          const pixel = 0.68 + tone * 0.82;
          ctx.fillRect(nx, ny, pixel, pixel);
        }
      }
      ctx.globalAlpha = 1;
    }

    return { resize, draw };
  }

  function heroScene(canvas) {
    const surface = canvasSurface(canvas);
    if (!surface) return null;
    const { ctx } = surface;
    const fragments = makeSignet();
    const copper = ["#d77858", "#ee8a62", "#f7ad86", "#ffd0ad", "#fff1d3"];
    const cosine = Math.cos(-0.13);
    const sine = Math.sin(-0.13);
    let placement;

    function resize() {
      if (!surface.resize()) return false;
      const { width, height } = surface;
      const style = getComputedStyle(canvas);
      const ratio = (name) => parseFloat(style.getPropertyValue(name)) / 100;
      const scale = Math.min(
        width * ratio("--hero-signet-width") / 1500,
        height * ratio("--hero-signet-max-height") / 1032,
      );
      placement = {
        scale,
        centerX: width * ratio("--hero-signet-x"),
        centerY: height * ratio("--hero-signet-y"),
        glyph: clamp(20 * scale, 3.4, 10.3),
        reach: clamp(Math.min(width, height) * 0.48, 125, 420),
        signetReach: clamp(scale * 320, 52, 126),
        textOverlap: matchMedia("(max-width: 47.99rem)").matches,
      };
      return true;
    }

    function draw(progress, seconds, pointer, impulse) {
      if (!placement) return;
      const { scale, centerX, centerY, glyph, reach, signetReach, textOverlap } = placement;
      const signal = impulseField(impulse);
      const sweep = progress * 2100 - 270;
      surface.clear();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-0.13);
      ctx.scale(scale, scale);
      ctx.translate(-750, -516);
      const print = ctx.createLinearGradient(0, 80, 1460, 960);
      print.addColorStop(0, "#d76042");
      print.addColorStop(0.49, "#8e3c2d");
      print.addColorStop(1, "#fa925b");
      ctx.fillStyle = print;
      ctx.globalAlpha = 0.07 + ease(progress) * 0.13;
      ctx.fill(signetM);
      ctx.globalAlpha *= 1.5;
      ctx.fill(signetPoint);
      ctx.restore();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.font = `500 ${glyph}px Consolas, monospace`;
      for (let index = 0; index < fragments.length; index++) {
        const { x, y, weight, point, orbit, shift, delay } = fragments[index];
        const lock = ease((progress - delay + 0.12) / 0.66);
        const pulse = Math.max(0, 1 - Math.abs(x + y * 0.42 - sweep) / 165) * (1 - progress);
        const angle = orbit + (1 - lock) * 0.52;
        const drift = (1 - lock) * shift * scale;
        const tx = x - 750;
        const ty = y - 516;
        const px = centerX + (tx * cosine - ty * sine) * scale + Math.cos(angle) * drift;
        const py = centerY + (tx * sine + ty * cosine) * scale + Math.sin(angle) * drift * 0.72;
        const touch = pointerWeight(pointer, px, py, reach);
        const hover = pointerWeight(pointer, px, py, signetReach);
        const energy = signal(px, py);
        const phase = Math.sin(orbit + seconds * 0.39);

        // Nearby cells lift together while keeping the signet's contour intact.
        const nx = px + touch * phase * 1.5 + hover * Math.cos(orbit) * 2.2 + energy * Math.cos(orbit) * 6.2;
        const ny = py + touch * Math.sin(orbit) - hover * (2.1 + weight * 1.9) + energy * Math.sin(orbit) * 4.4;
        const brightness = mix(0.32, point ? 0.77 : 0.63, lock) + pulse * 0.24 + touch * 0.045 + hover * 0.17 + energy * 0.23;
        const behindText = textOverlap ? 1 - 0.45 * ease((py / surface.height - 0.42) / 0.15) : 1;
        ctx.globalAlpha = clamp(brightness + weight * 0.19) * behindText;
        ctx.fillStyle = copper[clamp(Math.floor((brightness + weight * 0.38) * 4.4), 0, copper.length - 1)];

        const showGlyph = weight >= 0.46 || energy >= 0.32 || (hover > 0.44 && weight >= 0.33);
        if (!showGlyph) {
          const pixel = glyph * (point ? 0.42 : 0.32);
          ctx.fillRect(nx - pixel / 2, ny - pixel / 2, pixel, pixel);
        } else {
          const encoding = index + Math.floor((1 - lock) * 6) + Math.floor(energy * 7);
          ctx.fillText(bits[encoding % bits.length], nx, ny);
        }
      }
      ctx.globalAlpha = 1;
      canvas.parentElement.dataset.painted = "";
    }

    return { resize, draw };
  }

  function signatureScene(canvas, photograph) {
    const surface = canvasSurface(canvas);
    if (!surface) return null;
    const { ctx } = surface;
    const compactLayout = matchMedia("(max-width: 47.99rem)");
    const walls = [
      { side: -1, start: 0.635, end: 0.430, tilt: 0.020, face: ["#1e1b1a", "#504138", "#241e1b"] },
      { side: 1, start: 0.683, end: 0.980, tilt: 0.029, face: ["#3b322d", "#251e1a", "#120f0e"] },
      { side: -1, start: 0.582, end: 0.347, tilt: 0.043, face: ["#282321", "#44362e", "#211b19"] },
      { side: 1, start: 0.738, end: 1.014, tilt: 0.045, face: ["#342b27", "#3e2e27", "#171311"] },
      { side: -1, start: 0.518, end: 0.275, tilt: 0.067, face: ["#262220", "#362d27", "#171413"] },
      { side: 1, start: 0.806, end: 1.056, tilt: 0.073, face: ["#251e1a", "#4b3a31", "#1b1614"] },
      { side: -1, start: 0.440, end: 0.185, tilt: 0.094, face: ["#24201d", "#342b26", "#191614"] },
      { side: 1, start: 0.899, end: 1.103, tilt: 0.092, face: ["#2e2521", "#403028", "#1c1715"] },
      { side: -1, start: 0.345, end: 0.064, tilt: 0.129, face: ["#211c1a", "#2c2521", "#151212"] },
    ];

    function draw(progress) {
      const { width, height } = surface;
      if (!width || !height || !photograph.complete || !photograph.naturalWidth) return;
      surface.clear();

      const travel = ease((progress + 0.04) / 1.04);
      const compact = compactLayout.matches;
      const cameraScale = mix(0.99, compact ? 1.48 : 1.66, travel);
      const pictureWidth = Math.max(width * (compact ? 0.93 : 0.58), height * 0.59) * cameraScale;
      const pictureHeight = pictureWidth * photograph.naturalHeight / photograph.naturalWidth;
      const focusX = width * mix(compact ? 0.68 : 0.73, compact ? 0.62 : 0.69, travel);
      const focusY = height * mix(0.66, 0.61, travel);
      // Keep the photographed vanishing point in view as the scale changes.
      ctx.drawImage(photograph, focusX - pictureWidth * 0.61, focusY - pictureHeight * 0.67, pictureWidth, pictureHeight);

      // Project each bevel and its soft edge along the same perspective as the stone.
      for (let index = 0; index < walls.length; index++) {
        const { side, start, end, tilt, face } = walls[index];
        const stride = ease((progress + 0.038 - index * 0.032) / (0.62 + index * 0.013));
        const hinge = mix(start, end, stride) * width;
        const top = hinge + side * mix(tilt * 0.59, tilt, stride) * width;
        const foot = hinge - side * mix(tilt * 0.85, tilt * 0.35, stride) * width;
        const outside = width * 1.25;
        const bevel = width * (0.033 + index * 0.002);
        const feather = Math.max(7, bevel * 0.45);
        const span = outside + feather;
        const stop = (offset) => (outside + offset) / span;
        const [stoneColor, lightColor, shadowColor] = face;

        ctx.save();
        ctx.transform(-side, 0, (foot - top) / height, 1, top, 0);
        const stone = ctx.createLinearGradient(-outside, 0, feather, 0);
        stone.addColorStop(0, shadowColor);
        stone.addColorStop(stop(-bevel * 2.65), stoneColor);
        stone.addColorStop(stop(-bevel * 1.14), stoneColor);
        stone.addColorStop(stop(-bevel * 0.43), lightColor);
        stone.addColorStop(stop(0), lightColor + "b8");
        stone.addColorStop(stop(feather * 0.53), stoneColor + "48");
        stone.addColorStop(1, stoneColor + "00");
        ctx.fillStyle = stone;
        ctx.fillRect(-outside, 0, span, height);
        ctx.restore();
      }

      const edge = ctx.createLinearGradient(0, 0, width, 0);
      edge.addColorStop(0, "#1c1716");
      edge.addColorStop(0.24, "#1c1716b8");
      edge.addColorStop(0.64, "#1c171600");
      edge.addColorStop(0.94, "#1c171610");
      edge.addColorStop(1, "#1c171668");
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, width, height);

      const shade = ctx.createLinearGradient(0, 0, 0, height);
      shade.addColorStop(0, "#1c171633");
      shade.addColorStop(0.34, "#1c171600");
      shade.addColorStop(0.71, "#1c171622");
      shade.addColorStop(1, "#1c1716e0");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);
      canvas.parentElement.dataset.painted = "";
    }

    return { resize: () => surface.resize(), draw };
  }

  window.MoskoScenes = { atmosphereScene, heroScene, signatureScene };
})();
