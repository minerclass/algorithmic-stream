/* The Algorithmic Stream v2: game engine.
   Static, dependency-free. Nothing here stores or transmits anything except a
   single browser-local motion preference. Sources come from sources.js. */

(function () {
  "use strict";

  /* ---- Tunables ---------------------------------------------------------- */
  const RUN_SECONDS = 300;      // timed run length
  const MOVE_COST = 12;         // seconds per lateral-reading move in a timed run
  const DOCK_MAX = 4;
  const BIB_MAX = 5;
  const DAM_DRAIN = 26;         // charge per second while held
  const DAM_REFILL = 12;        // charge per second while released
  const DAM_SLOW = 0.3;         // river speed factor while the dam is up
  const BASE_SPEED = 42;        // px per second at reach speed 1 on a 900px-wide river
  const MAX_FLOATERS = 5;
  const DECISIONS_PER_REACH = 2; // untimed runs advance by decisions instead of time

  const MOVES = [
    { key: "who", label: "Who is behind it?", kbd: "1", short: "Who" },
    { key: "evidence", label: "What is the evidence?", kbd: "2", short: "Evidence" },
    { key: "others", label: "What do others say?", kbd: "3", short: "Others" }
  ];

  const PALETTES = {
    voice:   { skyTop: "#160d08", skyBot: "#4a2412", waterTop: "#2e3b1f", waterBot: "#0f1a10", glow: "#f0a24a", bank: "#0c0704", accent: "#dc895e", glyph: "◉" },
    ink:     { skyTop: "#0d1218", skyBot: "#36414d", waterTop: "#22393a", waterBot: "#0a1716", glow: "#d9d2bf", bank: "#07090c", accent: "#a8adb7", glyph: "▤" },
    signal:  { skyTop: "#061218", skyBot: "#0f3b42", waterTop: "#0f4f47", waterBot: "#06211f", glow: "#67e8f9", bank: "#03090b", accent: "#67b9aa", glyph: "◆" },
    feed:    { skyTop: "#0a0b16", skyBot: "#2a1f3d", waterTop: "#163a44", waterBot: "#0a1a22", glow: "#fb923c", bank: "#06060d", accent: "#f0bd45", glyph: "⬢" },
    phantom: { skyTop: "#0b0614", skyBot: "#3a1d55", waterTop: "#2a2650", waterBot: "#0d0b22", glow: "#e879f9", bank: "#07040c", accent: "#aaa1dc", glyph: "◈" }
  };

  const REACHES = STREAM_REACHES;
  const SOURCES = STREAM_SOURCES;
  const byId = Object.fromEntries(SOURCES.map(s => [s.id, s]));

  /* ---- Helpers ----------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(h1, h2, t) { const a = hexToRgb(h1), b = hexToRgb(h2); return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`; }
  function rgba(h, a) { const c = hexToRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
  function fmtClock(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
  function esc(str) { return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  function reducedMotion() {
    const pref = document.documentElement.getAttribute("data-motion");
    if (pref === "reduce") return true;
    if (pref === "full") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function announce(text) {
    const el = $("live");
    el.textContent = "";
    setTimeout(() => { el.textContent = text; }, 30);
  }

  /* ---- Sound (synthesized, off by default) -------------------------------- */
  const sound = {
    on: false, ctx: null, noise: null, gain: null,
    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      this.noise = this.ctx.createBufferSource(); this.noise.buffer = buf; this.noise.loop = true;
      const filt = this.ctx.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 600;
      this.gain = this.ctx.createGain(); this.gain.gain.value = 0;
      this.noise.connect(filt).connect(this.gain).connect(this.ctx.destination);
      this.noise.start();
    },
    toggle() {
      this.on = !this.on;
      if (this.on) { this.ensure(); if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }
      if (this.gain) this.gain.gain.setTargetAtTime(this.on ? 0.05 : 0, this.ctx.currentTime, 0.3);
      const b = $("btnSound");
      b.setAttribute("aria-pressed", String(this.on));
      b.innerHTML = this.on ? '🔊<span class="sr-only">Sound on</span>' : '🔇<span class="sr-only">Sound off</span>';
      return this.on;
    },
    river(speed) { if (this.on && this.gain) this.gain.gain.setTargetAtTime(0.03 + 0.03 * speed, this.ctx.currentTime, 0.5); },
    tone(freq, dur, type, vol) {
      if (!this.on || !this.ctx) return;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, this.ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      o.connect(g).connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + dur + 0.05);
    },
    catchSrc() { this.tone(660, 0.25, "triangle"); setTimeout(() => this.tone(880, 0.3, "triangle"), 70); },
    move() { this.tone(520, 0.12, "sine", 0.08); },
    cite() { this.tone(440, 0.18, "triangle"); setTimeout(() => this.tone(660, 0.25, "triangle"), 90); },
    letgo() { this.tone(220, 0.25, "sine", 0.08); },
    held() { this.tone(784, 0.3, "triangle", 0.1); },
    failed() { this.tone(160, 0.45, "sawtooth", 0.08); },
    reach() { [392, 523, 659].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.07), i * 120)); },
    autopilot() { [880, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.15, "square", 0.04), i * 60)); }
  };

  /* ---- River renderer ----------------------------------------------------- */
  class River {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.ambient = !!(opts && opts.ambient);
      this.w = 0; this.h = 0; this.dpr = 1;
      this.t = 0;
      this.reachIndex = 0;
      this.palFrom = PALETTES.voice; this.palTo = PALETTES.voice; this.palT = 1;
      this.speed = REACHES[0].speed;
      this.damLevel = 0;      // 0..1 visual gate position
      this.damActive = false;
      this.floaters = [];
      this.particles = [];
      this.bank = [];
      this.hover = null;
      this.pointer = { x: -9999, y: -9999 };
      this.spawnTimer = 0;
      this.running = false;
      this.onNet = null;
      this.onFloatersChanged = null;
      this.lastFrame = 0;
      this.resize();
      this.seedBank();
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(canvas.parentElement);
      if (!this.ambient) this.bindPointer();
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = Math.max(1, rect.width); this.h = Math.max(1, rect.height);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.horizon = this.h * 0.36;
      this.lanes = [this.h * 0.5, this.h * 0.66, this.h * 0.83];
      this.cardW = clamp(this.w * 0.24, 150, 212);
      this.cardH = clamp(this.cardW * 0.36, 46, 62);
    }

    setReach(i, instant) {
      const pal = PALETTES[REACHES[i].id];
      if (instant) { this.palFrom = pal; this.palTo = pal; this.palT = 1; }
      else { this.palFrom = this.currentPalette(); this.palTo = pal; this.palT = 0; }
      this.reachIndex = i;
      this.speed = REACHES[i].speed;
    }

    currentPalette() {
      const a = this.palFrom, b = this.palTo, t = this.palT;
      const out = {};
      for (const k of Object.keys(b)) out[k] = (k === "glyph") ? b[k] : (typeof b[k] === "string" && b[k][0] === "#" ? mix(a[k], b[k], t) : b[k]);
      return out;
    }

    seedBank() {
      this.bank = [];
      let x = -40;
      while (x < this.w + 200) { this.bank.push(this.makeBankItem(x, REACHES[this.reachIndex].id)); x += rand(40, 90); }
    }

    makeBankItem(x, reach) {
      return { x, reach, h: rand(0.25, 1), w: rand(14, 48), seed: Math.random(), blink: rand(0, 6.28) };
    }

    bindPointer() {
      const c = this.canvas;
      const pos = (e) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      c.addEventListener("pointermove", (e) => { this.pointer = pos(e); });
      c.addEventListener("pointerleave", () => { this.pointer = { x: -9999, y: -9999 }; this.hover = null; });
      c.addEventListener("pointerdown", (e) => {
        const p = pos(e);
        const f = this.hitTest(p.x, p.y);
        if (f && this.onNet) this.onNet(f);
      });
    }

    hitTest(x, y) {
      let best = null, bestD = Infinity;
      for (const f of this.floaters) {
        const cx = f.x + this.cardW / 2, cy = f.y + this.cardH / 2;
        const inside = x >= f.x - 10 && x <= f.x + this.cardW + 10 && y >= f.y - 12 && y <= f.y + this.cardH + 12;
        if (!inside) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d < bestD) { bestD = d; best = f; }
      }
      return best;
    }

    spawn(src, xOverride) {
      const lane = pick(this.lanes.filter(l => !this.floaters.some(f => Math.abs(f.y - l) < 4 && f.x > this.w - this.cardW * 1.6)));
      if (lane === undefined) return false;
      this.floaters.push({ src, x: xOverride !== undefined ? xOverride : this.w + 20, y: lane, phase: rand(0, 6.28), bob: rand(2, 5), vx: rand(0.9, 1.15), lift: 0 });
      if (this.onFloatersChanged) this.onFloatersChanged();
      return true;
    }

    remove(f) {
      const i = this.floaters.indexOf(f);
      if (i >= 0) this.floaters.splice(i, 1);
      if (this.onFloatersChanged) this.onFloatersChanged();
    }

    splash(x, y, color) {
      if (reducedMotion()) return;
      for (let i = 0; i < 22; i++) {
        this.particles.push({ x, y, vx: rand(-90, 90), vy: rand(-160, -30), life: rand(0.4, 0.9), age: 0, r: rand(1.5, 3.5), color });
      }
    }

    step(dt) {
      this.t += dt;
      if (this.palT < 1) this.palT = Math.min(1, this.palT + dt / 2.2);
      const targetDam = this.damActive ? 1 : 0;
      this.damLevel += (targetDam - this.damLevel) * Math.min(1, dt * 6);
      const factor = lerp(1, DAM_SLOW, this.damLevel);
      const px = (BASE_SPEED * this.speed * factor) * (this.w / 900 + 0.4);

      // Bank scroll (parallax, slow)
      const bankV = px * 0.22;
      for (const b of this.bank) b.x -= bankV * dt;
      this.bank = this.bank.filter(b => b.x > -80);
      const lastX = this.bank.length ? Math.max(...this.bank.map(b => b.x)) : 0;
      if (lastX < this.w + 60) this.bank.push(this.makeBankItem(lastX + rand(40, 90), REACHES[this.reachIndex].id));

      // Floaters
      for (const f of this.floaters) {
        f.x -= px * f.vx * dt;
        const isHover = this.hover === f;
        f.lift += ((isHover ? 1 : 0) - f.lift) * Math.min(1, dt * 10);
      }
      const gone = this.floaters.filter(f => f.x < -this.cardW - 20);
      for (const g of gone) this.remove(g);

      // Hover
      this.hover = this.hitTest(this.pointer.x, this.pointer.y);
      this.canvas.style.cursor = this.hover ? "pointer" : (this.damActive ? "grabbing" : "crosshair");

      // Particles
      for (const p of this.particles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; }
      this.particles = this.particles.filter(p => p.age < p.life);

      // Dam spray
      if (this.damLevel > 0.5 && !reducedMotion() && Math.random() < 0.5) {
        const gx = this.w * 0.74;
        this.particles.push({ x: gx + rand(-6, 6), y: this.horizon + rand(0, 10), vx: rand(-40, -10), vy: rand(-60, -10), life: rand(0.3, 0.7), age: 0, r: rand(1, 2.5), color: "#d9fff4" });
      }
    }

    draw() {
      const ctx = this.ctx, w = this.w, h = this.h, pal = this.currentPalette(), t = this.t;
      const rm = reducedMotion();
      const motionT = rm ? 0 : t;

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, this.horizon);
      sky.addColorStop(0, pal.skyTop); sky.addColorStop(1, pal.skyBot);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, this.horizon + 2);

      // Glow on the horizon
      const glow = ctx.createRadialGradient(w * 0.5, this.horizon, 10, w * 0.5, this.horizon, w * 0.7);
      glow.addColorStop(0, rgba(pal.glow, 0.22)); glow.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, this.horizon);

      // Bank silhouettes
      this.drawBank(ctx, pal, motionT);

      // Water
      const water = ctx.createLinearGradient(0, this.horizon, 0, h);
      water.addColorStop(0, pal.waterTop); water.addColorStop(1, pal.waterBot);
      ctx.fillStyle = water; ctx.fillRect(0, this.horizon, w, h - this.horizon);

      // Reflection of the glow
      const refl = ctx.createRadialGradient(w * 0.5, this.horizon, 4, w * 0.5, this.horizon, w * 0.45);
      refl.addColorStop(0, rgba(pal.glow, 0.2)); refl.addColorStop(0.5, rgba(pal.glow, 0.06)); refl.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = refl; ctx.fillRect(0, this.horizon, w, h * 0.4);

      // Reflections of the bank lights, wobbling on the water
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const b of this.bank) {
        const lit = b.reach === "voice" ? b.seed > 0.72 : b.reach === "signal" ? true : b.reach === "ink" ? b.seed > 0.4 : true;
        if (!lit) continue;
        const col = b.reach === "signal" ? "#ff5a5a" : PALETTES[b.reach].glow;
        const cx = b.x + b.w / 2;
        const len = (h - this.horizon) * (0.35 + b.seed * 0.4);
        const wob = rm ? 0 : Math.sin(t * 1.3 + b.blink) * 6;
        const rg = ctx.createLinearGradient(0, this.horizon, 0, this.horizon + len);
        rg.addColorStop(0, rgba(col, b.reach === "feed" ? 0.05 : 0.16)); rg.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(cx - 2, this.horizon);
        ctx.quadraticCurveTo(cx + wob, this.horizon + len * 0.5, cx - 3 + wob * 0.4, this.horizon + len);
        ctx.lineTo(cx + 3 + wob * 0.4, this.horizon + len);
        ctx.quadraticCurveTo(cx + wob + 4, this.horizon + len * 0.5, cx + 2, this.horizon);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();

      // Wave bands
      const flow = motionT * BASE_SPEED * this.speed * lerp(1, DAM_SLOW, this.damLevel) * 0.9;
      const bands = 7;
      for (let i = 0; i < bands; i++) {
        const y0 = this.horizon + ((i + 0.5) / bands) * (h - this.horizon);
        const amp = 2 + i * 0.9 + this.damLevel * 3 * (i < 3 ? 1 : 0.3);
        const wl = 90 + i * 22;
        ctx.beginPath();
        for (let x = -10; x <= w + 10; x += 8) {
          const upstream = x > w * 0.74 ? 1 + this.damLevel * 1.6 : 1;
          const y = y0 + Math.sin((x + flow * (1 + i * 0.12)) / wl * Math.PI * 2 + i) * amp * upstream
                     + Math.sin((x - flow * 0.5) / (wl * 0.53) + i * 2) * amp * 0.4;
          if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rgba(pal.glow, 0.07 + i * 0.02);
        ctx.lineWidth = 1.2 + i * 0.35;
        ctx.stroke();
        // a brighter crest riding each band
        const crestX = ((flow * (1.6 + i * 0.1) * -1) % (w + 160) + (w + 160)) % (w + 160) - 80 + i * (w / bands);
        const cg = ctx.createLinearGradient(crestX - 70, 0, crestX + 70, 0);
        cg.addColorStop(0, rgba("#ffffff", 0)); cg.addColorStop(0.5, rgba("#ffffff", 0.16)); cg.addColorStop(1, rgba("#ffffff", 0));
        ctx.strokeStyle = cg; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Foam flecks
      if (!rm) {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        for (let i = 0; i < 26; i++) {
          const sx = ((i * 137.5 + (t * 60 * this.speed * lerp(1, DAM_SLOW, this.damLevel))) % (w + 40)) ;
          const fx = w - sx;
          const fy = this.horizon + ((i * 71) % (h - this.horizon)) + Math.sin(t * 2 + i) * 2;
          ctx.fillRect(fx, fy, 6 + (i % 3) * 3, 1.2);
        }
      }

      // Dam
      this.drawDam(ctx, pal);

      // Floaters (back lanes first)
      const sorted = [...this.floaters].sort((a, b) => a.y - b.y);
      for (const f of sorted) this.drawFloater(ctx, f, pal, motionT);

      // Particles
      for (const p of this.particles) {
        ctx.globalAlpha = 1 - p.age / p.life;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Vignette
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    }

    drawBank(ctx, pal, t) {
      const base = this.horizon;
      ctx.fillStyle = pal.bank;
      ctx.fillRect(0, base - 6, this.w, 8);
      for (const b of this.bank) {
        const H = b.h * this.horizon * 0.55;
        const x = b.x, w = b.w;
        ctx.fillStyle = pal.bank;
        switch (b.reach) {
          case "voice": {
            // trees and a fire
            ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + w / 2, base - H); ctx.lineTo(x + w, base); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.arc(x + w / 2, base - H * 0.75, w * 0.32, 0, 6.28); ctx.fill();
            if (b.seed > 0.72) {
              const fl = 0.6 + 0.4 * Math.sin(t * 9 + b.blink);
              ctx.fillStyle = rgba(PALETTES.voice.glow, 0.85 * fl);
              ctx.beginPath(); ctx.arc(x + w * 0.5, base - 5, 3 + fl * 1.5, 0, 6.28); ctx.fill();
              const g = ctx.createRadialGradient(x + w * 0.5, base - 5, 2, x + w * 0.5, base - 5, 40);
              g.addColorStop(0, rgba(PALETTES.voice.glow, 0.25 * fl)); g.addColorStop(1, rgba(PALETTES.voice.glow, 0));
              ctx.fillStyle = g; ctx.fillRect(x + w * 0.5 - 40, base - 45, 80, 48);
            }
            break;
          }
          case "ink": {
            ctx.fillRect(x, base - H, w, H);
            if (b.seed > 0.8) { ctx.beginPath(); ctx.moveTo(x + w * 0.3, base - H); ctx.lineTo(x + w * 0.5, base - H * 1.5); ctx.lineTo(x + w * 0.7, base - H); ctx.fill(); }
            ctx.fillStyle = rgba(PALETTES.ink.glow, 0.5 + 0.2 * Math.sin(t * 0.8 + b.blink));
            const rows = Math.max(1, Math.floor(H / 12)), cols = Math.max(1, Math.floor(w / 10));
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (((r * 7 + c * 3 + Math.floor(b.seed * 10)) % 3) === 0) ctx.fillRect(x + 3 + c * 10, base - H + 4 + r * 12, 3, 4);
            break;
          }
          case "signal": {
            const tx = x + w / 2;
            ctx.strokeStyle = pal.bank; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(tx - w * 0.3, base); ctx.lineTo(tx, base - H * 1.4); ctx.lineTo(tx + w * 0.3, base); ctx.stroke();
            for (let i = 1; i <= 3; i++) { const yy = base - (H * 1.4) * (i / 4); const ww = w * 0.3 * (1 - i / 4); ctx.beginPath(); ctx.moveTo(tx - ww, yy); ctx.lineTo(tx + ww, yy); ctx.stroke(); }
            const bl = (Math.sin(t * 2.2 + b.blink) > 0.6) ? 1 : 0.25;
            ctx.fillStyle = rgba("#ff5a5a", bl); ctx.beginPath(); ctx.arc(tx, base - H * 1.4 - 2, 2.5, 0, 6.28); ctx.fill();
            if (b.seed > 0.6) {
              ctx.strokeStyle = rgba(PALETTES.signal.glow, 0.18 + 0.1 * Math.sin(t * 3 + b.blink)); ctx.lineWidth = 1;
              for (let r = 1; r <= 3; r++) { ctx.beginPath(); ctx.arc(tx, base - H * 1.4, r * 9 + ((t * 10) % 9), Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
            }
            break;
          }
          case "feed": {
            const HH = Math.max(H, this.horizon * 0.2);
            ctx.fillRect(x, base - HH, w, HH);
            const rows = Math.max(1, Math.floor(HH / 7)), cols = Math.max(1, Math.floor(w / 7));
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
              const on = Math.sin(t * 4 + r * 0.9 + c * 1.7 + b.seed * 10) > 0.3;
              ctx.fillStyle = on ? rgba(PALETTES.feed.glow, 0.7) : rgba(PALETTES.signal.glow, 0.25);
              ctx.fillRect(x + 2 + c * 7, base - HH + 2 + r * 7, 3, 3);
            }
            break;
          }
          case "phantom": {
            const j = reducedMotion() ? 0 : Math.sin(t * 7 + b.blink) * 2;
            ctx.fillStyle = pal.bank;
            ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + w * 0.2 + j, base - H * 1.3); ctx.lineTo(x + w * 0.8, base - H * 0.9); ctx.lineTo(x + w, base); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = rgba(PALETTES.phantom.glow, 0.35 + 0.2 * Math.sin(t * 5 + b.seed * 9)); ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x + 4 - j, base - 2); ctx.lineTo(x + w * 0.2 - j, base - H * 1.3 - 6); ctx.lineTo(x + w * 0.8 + j, base - H * 0.9 - 6); ctx.stroke();
            if (b.seed > 0.5) { ctx.fillStyle = rgba(PALETTES.phantom.glow, 0.5); ctx.fillRect(x + w * 0.5 + j * 3, base - H * 1.6, w * 0.3, 2); }
            break;
          }
        }
      }
      // Water line highlight
      ctx.fillStyle = rgba(pal.glow, 0.35);
      ctx.fillRect(0, base + 1, this.w, 1);
    }

    drawDam(ctx, pal) {
      if (this.damLevel < 0.02) return;
      const gx = this.w * 0.74, top = this.horizon - 24, bottom = this.h;
      const drop = (bottom - top) * this.damLevel;
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.damLevel * 1.4);
      ctx.fillStyle = "#1b2a27"; ctx.strokeStyle = rgba(pal.glow, 0.6); ctx.lineWidth = 2;
      // posts
      ctx.fillRect(gx - 14, top, 8, bottom - top); ctx.fillRect(gx + 6, top, 8, bottom - top);
      ctx.strokeRect(gx - 14, top, 8, bottom - top); ctx.strokeRect(gx + 6, top, 8, bottom - top);
      // gate
      ctx.fillStyle = "#28403b"; ctx.fillRect(gx - 6, top, 12, drop);
      ctx.strokeStyle = rgba("#ffffff", 0.25);
      for (let y = top + 10; y < top + drop; y += 12) { ctx.beginPath(); ctx.moveTo(gx - 6, y); ctx.lineTo(gx + 6, y); ctx.stroke(); }
      // slowed water glow downstream
      const g = ctx.createLinearGradient(gx, 0, gx - this.w * 0.5, 0);
      g.addColorStop(0, rgba(pal.glow, 0.12 * this.damLevel)); g.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = g; ctx.fillRect(gx - this.w * 0.5, this.horizon, this.w * 0.5, this.h - this.horizon);
      ctx.restore();
    }

    drawFloater(ctx, f, pal, t) {
      const W = this.cardW, H = this.cardH;
      const bob = reducedMotion() ? 0 : Math.sin(t * 1.6 + f.phase) * f.bob;
      const x = f.x, y = f.y + bob - f.lift * 6;
      const rp = PALETTES[f.src.reach];
      const isPhantom = f.src.reach === "phantom";
      const jit = (isPhantom && !reducedMotion()) ? (Math.sin(t * 23 + f.phase) > 0.92 ? rand(-3, 3) : 0) : 0;

      ctx.save();
      // shadow on water
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.ellipse(x + W / 2, f.y + H + 6, W * 0.46, 5, 0, 0, 6.28); ctx.fill();

      // glow when hovered
      if (f.lift > 0.05) {
        ctx.shadowColor = rp.accent; ctx.shadowBlur = 22 * f.lift;
      }
      // card body
      ctx.fillStyle = isPhantom ? rgba("#2a1f45", 0.92) : "rgba(14, 22, 20, 0.94)";
      roundRect(ctx, x + jit, y, W, H, 8); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(rp.accent, 0.55 + f.lift * 0.45); ctx.lineWidth = 1.5 + f.lift;
      roundRect(ctx, x + jit, y, W, H, 8); ctx.stroke();
      // reach stripe
      ctx.fillStyle = rp.accent; ctx.fillRect(x + jit, y + 6, 3, H - 12);

      // glyph
      this.drawGlyph(ctx, f.src.reach, x + jit + 20, y + H / 2, t, f.phase);

      // text
      ctx.fillStyle = rgba(rp.accent, 0.95);
      ctx.font = `600 ${Math.max(8, W * 0.055)}px ${cssVar("--mono")}`;
      ctx.textBaseline = "alphabetic";
      const labelMax = W - 44 - (f.src.reach === "feed" ? 34 : 0);
      let label = REACHES.find(r => r.id === f.src.reach).name.toUpperCase() + "  " + f.src.year.toUpperCase();
      while (ctx.measureText(label).width > labelMax && label.includes("  ")) label = label.replace(/\s\S+$/, "");
      ctx.fillText(label, x + jit + 36, y + 15);
      ctx.fillStyle = "#f0eee8";
      ctx.font = `${Math.max(10, W * 0.075)}px ${cssVar("--serif")}`;
      const lines = wrapText(ctx, f.src.title, W - 44, 2);
      lines.forEach((ln, i) => ctx.fillText(ln, x + jit + 36, y + 30 + i * (H * 0.26)));

      // phantom shimmer
      if (isPhantom && !reducedMotion()) {
        const sx = x + ((t * 120 + f.phase * 50) % (W + 60)) - 30;
        const sg = ctx.createLinearGradient(sx, 0, sx + 30, 0);
        sg.addColorStop(0, "rgba(232,121,249,0)"); sg.addColorStop(0.5, "rgba(232,121,249,0.22)"); sg.addColorStop(1, "rgba(232,121,249,0)");
        ctx.fillStyle = sg; roundRect(ctx, x + jit, y, W, H, 8); ctx.fill();
      }
      // feed share badge
      if (f.src.reach === "feed") {
        ctx.fillStyle = rgba(PALETTES.feed.glow, 0.9); ctx.font = `700 9px ${cssVar("--mono")}`;
        ctx.textAlign = "right";
        ctx.fillText("↑ " + (f.src.id === "feed-viral" ? "40K" : f.src.id === "feed-digest" ? "TOP" : "312"), x + jit + W - 8, y + 15);
        ctx.textAlign = "left";
      }
      ctx.restore();
    }

    drawGlyph(ctx, reach, cx, cy, t, phase) {
      const rp = PALETTES[reach];
      ctx.strokeStyle = rp.accent; ctx.fillStyle = rp.accent; ctx.lineWidth = 1.5;
      switch (reach) {
        case "voice":
          ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 6.28); ctx.fill();
          for (let r = 1; r <= 2; r++) { ctx.globalAlpha = 0.7 - r * 0.25 + 0.15 * Math.sin(t * 3 + phase); ctx.beginPath(); ctx.arc(cx, cy, 3 + r * 4, -1.1, 1.1); ctx.stroke(); }
          ctx.globalAlpha = 1; break;
        case "ink":
          ctx.strokeRect(cx - 6, cy - 8, 12, 16); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 3, cy - 5 + i * 3.5); ctx.lineTo(cx + 3, cy - 5 + i * 3.5); ctx.stroke(); } break;
        case "signal":
          ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy - 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - 6, cy + 8); ctx.lineTo(cx + 6, cy + 8); ctx.stroke();
          for (let r = 1; r <= 2; r++) { ctx.beginPath(); ctx.arc(cx, cy - 2, r * 4, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
          ctx.beginPath(); ctx.arc(cx, cy - 2, 2, 0, 6.28); ctx.fill(); break;
        case "feed":
          ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + t * 0.6; const px = cx + Math.cos(a) * 8, py = cy + Math.sin(a) * 8; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 6.28); ctx.fill(); break;
        case "phantom":
          ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 8, cy); ctx.lineTo(cx, cy + 9); ctx.lineTo(cx - 8, cy); ctx.closePath(); ctx.stroke();
          ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(cx + 2, cy - 7); ctx.lineTo(cx + 10, cy + 2); ctx.lineTo(cx + 2, cy + 11); ctx.lineTo(cx - 6, cy + 2); ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1; break;
      }
    }

    frame(ts) {
      if (!this.running) return;
      const dt = Math.min(0.05, (ts - (this.lastFrame || ts)) / 1000);
      this.lastFrame = ts;
      this.step(dt);
      this.draw();
      if (this.onTick) this.onTick(dt);
      requestAnimationFrame((t2) => this.frame(t2));
    }

    start() { if (this.running) return; this.running = true; this.lastFrame = 0; requestAnimationFrame((t) => this.frame(t)); }
    stop() { this.running = false; }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function wrapText(ctx, text, maxW, maxLines) {
    const words = text.split(" "), lines = [];
    let cur = "", i = 0;
    for (; i < words.length; i++) {
      const test = cur ? cur + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur); cur = words[i];
        if (lines.length === maxLines) break;
      } else cur = test;
    }
    if (lines.length < maxLines && cur) { lines.push(cur); cur = ""; }
    const overflow = lines.length === maxLines && (cur !== "" || i < words.length);
    if (overflow) {
      let last = lines[maxLines - 1];
      while (last.length > 3 && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last.replace(/[\s,.;:]+$/, "") + "…";
    }
    return lines;
  }
  const cssCache = {};
  function cssVar(name) {
    if (!cssCache[name]) cssCache[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "sans-serif";
    return cssCache[name];
  }

  /* ---- Game state -------------------------------------------------------- */
  const G = {
    mode: "timed", clock: RUN_SECONDS, elapsed: 0, running: false, paused: false,
    reachIndex: 0, decisions: 0,
    dock: [],           // { src, clues: Set, selected }
    bib: [],            // { src, moves: number, autopilot: boolean }
    letGo: [],          // { src, moves }
    seen: new Set(),    // ids that have floated
    decided: new Set(), // ids cited or let go
    dam: 100, damHeld: false,
    moves: 0, autopilotUsed: false, prediction: null,
    river: null, titleRiver: null, started: false
  };

  /* ---- Screens ----------------------------------------------------------- */
  function show(id) {
    for (const s of document.querySelectorAll(".screen")) { s.classList.toggle("is-active", s.id === id); s.hidden = s.id !== id; }
    window.scrollTo(0, 0);
  }

  /* ---- Modal ------------------------------------------------------------- */
  let modalTrap = null;
  function openModal({ glyph, title, body, buttons, onKey }) {
    const m = $("modal");
    $("modalGlyph").textContent = glyph || "";
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = body;
    const foot = $("modalFoot"); foot.innerHTML = "";
    for (const b of buttons || []) {
      const el = document.createElement("button");
      el.type = "button"; el.className = "btn " + (b.cls || "btn-primary"); el.innerHTML = b.label;
      el.addEventListener("click", () => { closeModal(); if (b.onClick) b.onClick(); });
      foot.appendChild(el);
    }
    m.hidden = false;
    const focusables = () => Array.from(m.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")).filter(e => !e.disabled);
    const first = focusables()[0]; if (first) first.focus();
    modalTrap = (e) => {
      if (e.key === "Tab") {
        const f = focusables(); if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
      if (onKey) onKey(e);
    };
    document.addEventListener("keydown", modalTrap);
  }
  function closeModal() {
    $("modal").hidden = true;
    if (modalTrap) document.removeEventListener("keydown", modalTrap);
    modalTrap = null;
  }
  const modalOpen = () => !$("modal").hidden;

  /* ---- Run flow ---------------------------------------------------------- */
  function startRun(mode) {
    G.mode = mode;
    G.clock = RUN_SECONDS; G.elapsed = 0; G.reachIndex = 0; G.decisions = 0;
    G.dock = []; G.bib = []; G.letGo = []; G.seen = new Set(); G.decided = new Set();
    G.dam = 100; G.damHeld = false; G.moves = 0; G.autopilotUsed = false; G.prediction = null;
    G.running = false; G.paused = false;

    if (G.titleRiver) G.titleRiver.stop();
    show("screenRun");
    $("statClock").classList.toggle("is-untimed", mode === "untimed");
    $("statClock").classList.remove("is-low");
    $("hudClock").textContent = mode === "untimed" ? "untimed" : fmtClock(RUN_SECONDS);
    $("hudCited").textContent = "0"; $("hudMoves").textContent = "0";
    renderDock(); renderBib(); updateAudit();

    if (!G.river) {
      G.river = new River($("riverCanvas"));
      G.river.onNet = (f) => netSource(f);
      G.river.onFloatersChanged = renderRiverList;
      G.river.onTick = tick;
    } else {
      G.river.floaters = []; G.river.particles = [];
    }
    G.river.setReach(0, true);
    G.river.seedBank();
    G.river.damActive = false;
    // Two sources are already in view when the run opens, so the river reads as a river.
    for (const frac of [0.55, 0.85]) { const src = pickSpawn(); if (src && G.river.spawn(src, G.river.w * frac)) G.seen.add(src.id); }
    renderRiverList();
    showTutorial(() => {
      G.running = true;
      G.river.start();
      showReachCard(0);
      sound.river(REACHES[0].speed);
      announce("The run has begun. Reach one, Voice. Sources are entering the current.");
    });
  }

  function showTutorial(done) {
    openModal({
      glyph: "〜",
      title: "Before you wade in",
      body: `
        <ol class="tutorial-steps">
          <li><strong>Net what drifts past.</strong> Click a card in the river, or choose it from the list below the water. Your dock holds four at a time.</li>
          <li><strong>Read laterally before you cite.</strong> Each docked source offers three moves. ${G.mode === "timed" ? `Each move costs <strong>${MOVE_COST} seconds</strong> of your deadline.` : "Moves are free in an untimed run."} Clues marked in gold are the ones that point somewhere.</li>
          <li><strong>Cite five.</strong> Then submit for the audit. Fabrications, rumors, and dramatizations will fail. Oral memory, scans, and machine-assisted transcripts may hold, if the path back to the original exists.</li>
        </ol>
        <p>The current speeds up as the river moves from Voice to Phantom. Hold the dam button or the space bar to slow it. The autopilot is always there if you would rather the stream decided for you.</p>`,
      buttons: [{ label: "Wade in", onClick: done }],
      onKey: (e) => { if (e.key === "Escape") { closeModal(); done(); } }
    });
  }

  function tick(dt) {
    if (!G.running || G.paused) return;
    G.elapsed += dt;

    // Dam charge
    if (G.damHeld && G.dam > 0) { G.dam = Math.max(0, G.dam - DAM_DRAIN * dt); if (G.dam === 0) setDam(false, true); }
    else if (!G.damHeld) G.dam = Math.min(100, G.dam + DAM_REFILL * dt);
    const mf = $("damMeter"); mf.style.width = G.dam + "%"; mf.classList.toggle("is-low", G.dam < 25);
    $("btnDam").classList.toggle("is-empty", G.dam < 8 && !G.damHeld);

    // Clock
    if (G.mode === "timed") {
      G.clock -= dt;
      $("hudClock").textContent = fmtClock(G.clock);
      $("statClock").classList.toggle("is-low", G.clock <= 30);
      if (G.clock <= 0) { deadline(); return; }
      const spent = (RUN_SECONDS - G.clock) / RUN_SECONDS;
      const idx = clamp(Math.floor(spent * REACHES.length), 0, REACHES.length - 1);
      if (idx !== G.reachIndex) advanceReach(idx);
      $("reachProgress").style.setProperty("--p", `${spent * 100}%`);
    } else {
      $("reachProgress").style.setProperty("--p", `${Math.min(100, (G.decisions / (DECISIONS_PER_REACH * REACHES.length)) * 100)}%`);
    }

    // Spawning
    G.river.spawnTimer -= dt;
    if (G.river.spawnTimer <= 0 && G.river.floaters.length < MAX_FLOATERS) {
      const src = pickSpawn();
      if (src && G.river.spawn(src)) { G.seen.add(src.id); }
      G.river.spawnTimer = rand(1.4, 2.6) / Math.max(0.6, G.river.speed);
    }
  }

  function pickSpawn() {
    const onRiver = new Set(G.river.floaters.map(f => f.src.id));
    const inDock = new Set(G.dock.map(d => d.src.id));
    let pool = SOURCES.filter(s => !onRiver.has(s.id) && !inDock.has(s.id) && !G.decided.has(s.id));
    if (!pool.length) {
      // Everything has been decided or is in play: let released sources drift back round.
      pool = SOURCES.filter(s => !onRiver.has(s.id) && !inDock.has(s.id) && G.letGo.some(l => l.src.id === s.id));
      if (!pool.length) return null;
    }
    const ri = G.reachIndex;
    const weighted = [];
    for (const s of pool) {
      const d = Math.abs(REACHES.findIndex(r => r.id === s.reach) - ri);
      const w = d === 0 ? 6 : d === 1 ? 3 : d === 2 ? 1 : 0.4;
      for (let i = 0; i < Math.round(w * 2); i++) weighted.push(s);
    }
    return pick(weighted);
  }

  function advanceReach(idx) {
    G.reachIndex = idx;
    G.river.setReach(idx, false);
    showReachCard(idx);
    sound.reach(); sound.river(REACHES[idx].speed);
    announce(`Reach ${REACHES[idx].numeral}, ${REACHES[idx].name}. ${REACHES[idx].tagline} The current is faster.`);
  }

  function showReachCard(idx) {
    const r = REACHES[idx];
    $("hudReach").innerHTML = `${r.numeral} &middot; ${r.name}`;
    $("reachCardNumeral").textContent = `Reach ${r.numeral}`;
    $("reachCardName").textContent = r.name;
    $("reachCardTag").textContent = r.tagline;
    const card = $("reachCard");
    card.classList.add("is-showing");
    setTimeout(() => card.classList.remove("is-showing"), 3200);
    document.querySelectorAll(".reach-dot").forEach((d, i) => { d.classList.toggle("is-current", i === idx); d.classList.toggle("is-done", i < idx); });
  }

  let toastTimer = null;
  function toast(text, warn) {
    const t = $("riverToast"); t.textContent = text; t.classList.toggle("is-warn", !!warn); t.classList.add("is-showing");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("is-showing"), 2200);
  }

  /* ---- Dam ---------------------------------------------------------------- */
  function setDam(on, exhausted) {
    if (!G.running || G.paused) on = false;
    if (on && G.dam < 8) { toast("The dam needs to refill.", true); on = false; }
    G.damHeld = on;
    G.river.damActive = on;
    $("btnDam").setAttribute("aria-pressed", String(on));
    $("riverFrame").classList.toggle("is-dam", on);
    if (exhausted) { toast("Dam exhausted. The current returns.", true); announce("Dam exhausted."); }
    else if (on) announce("Dam raised. The current slows.");
    sound.river(on ? REACHES[G.reachIndex].speed * DAM_SLOW : REACHES[G.reachIndex].speed);
  }

  /* ---- Netting ------------------------------------------------------------ */
  function netSource(f) {
    if (!G.running || G.paused) return;
    if (G.dock.length >= DOCK_MAX) { toast("Dock is full. Decide on something first.", true); announce("Dock is full."); return; }
    const src = f.src;
    G.river.splash(f.x + G.river.cardW / 2, f.y + G.river.cardH / 2, PALETTES[src.reach].accent);
    flyToDock(f);
    G.river.remove(f);
    G.dock.push({ src, clues: new Set() });
    sound.catchSrc();
    renderDock();
    selectDock(G.dock.length - 1);
    announce(`Netted: ${src.title}. It is in your dock.`);
  }

  function flyToDock(f) {
    if (reducedMotion()) return;
    const r = G.river.canvas.getBoundingClientRect();
    const d = $("dockList").getBoundingClientRect();
    const el = document.createElement("div");
    el.textContent = f.src.title;
    Object.assign(el.style, {
      position: "fixed", left: (r.left + f.x) + "px", top: (r.top + f.y) + "px", width: G.river.cardW + "px",
      padding: "8px 10px", background: "#0e1614", border: `1.5px solid ${PALETTES[f.src.reach].accent}`, borderRadius: "8px",
      color: "#f0eee8", fontFamily: cssVar("--serif"), fontSize: "0.85rem", zIndex: 60, pointerEvents: "none"
    });
    document.body.appendChild(el);
    const anim = el.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${d.left - (r.left + f.x)}px, ${d.top - (r.top + f.y)}px) scale(0.9)`, opacity: 0.2 }
    ], { duration: 520, easing: "cubic-bezier(.2,.8,.3,1)" });
    anim.onfinish = () => el.remove();
  }

  function renderRiverList() {
    const ul = $("riverList"); ul.innerHTML = "";
    if (!G.river) return;
    const sorted = [...G.river.floaters].sort((a, b) => a.x - b.x);
    for (const f of sorted) {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip";
      b.innerHTML = `<span class="glyph" aria-hidden="true">${PALETTES[f.src.reach].glyph}</span>${esc(f.src.title)}`;
      b.setAttribute("aria-label", `Net ${f.src.title}, ${REACHES.find(r => r.id === f.src.reach).name} reach`);
      b.addEventListener("click", () => netSource(f));
      li.appendChild(b); ul.appendChild(li);
    }
  }

  /* ---- Dock -------------------------------------------------------------- */
  let selectedIdx = -1;
  function selectDock(i) {
    selectedIdx = i;
    document.querySelectorAll(".src-card").forEach((c, j) => c.classList.toggle("is-selected", j === i));
  }

  function renderDock() {
    const list = $("dockList");
    list.innerHTML = "";
    $("dockCount").textContent = G.dock.length;
    if (!G.dock.length) {
      const p = document.createElement("p"); p.className = "dock-empty"; p.id = "dockEmpty";
      p.textContent = "Nothing netted yet. Catch a source from the river and it will land here for reading.";
      list.appendChild(p); selectedIdx = -1; return;
    }
    G.dock.forEach((d, i) => {
      const reach = REACHES.find(r => r.id === d.src.reach);
      const card = document.createElement("article");
      card.className = "src-card" + (i === selectedIdx ? " is-selected" : "");
      card.style.setProperty("--reach-color", PALETTES[d.src.reach].accent);
      card.tabIndex = 0;
      card.setAttribute("aria-label", `${d.src.title}, ${reach.name} reach, ${d.src.year}`);
      card.addEventListener("focusin", () => selectDock(i));
      card.addEventListener("click", () => selectDock(i));
      card.innerHTML = `
        <div class="src-top">
          <div>
            <span class="src-kind">${PALETTES[d.src.reach].glyph} ${esc(reach.name)} &middot; ${esc(d.src.year)}</span>
            <h4 class="src-title">${esc(d.src.title)}</h4>
          </div>
        </div>
        <p class="src-claim">${esc(d.src.claim)}</p>
        <div class="src-moves" role="group" aria-label="Lateral reading moves">
          ${MOVES.map(m => `<button type="button" class="move-btn${d.clues.has(m.key) ? " is-done" : ""}" data-move="${m.key}" ${d.clues.has(m.key) ? "disabled" : ""}>
             <kbd>${m.kbd}</kbd><span>${m.label}</span>${G.mode === "timed" && !d.clues.has(m.key) ? `<span class="cost">−${MOVE_COST}s</span>` : ""}</button>`).join("")}
        </div>
        <ul class="clues">
          ${MOVES.filter(m => d.clues.has(m.key)).map(m => `<li class="clue${d.src.checks[m.key].tell ? " is-tell" : ""}"><b>${esc(m.short)}</b>${esc(d.src.checks[m.key].text)}</li>`).join("")}
        </ul>
        <div class="src-decide">
          <button type="button" class="btn btn-cite" data-cite><kbd>C</kbd> Cite it</button>
          <button type="button" class="btn btn-letgo" data-letgo><kbd>X</kbd> Let it go</button>
        </div>`;
      card.querySelectorAll(".move-btn").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); selectDock(i); runMove(i, b.dataset.move); }));
      card.querySelector("[data-cite]").addEventListener("click", (e) => { e.stopPropagation(); cite(i); });
      card.querySelector("[data-letgo]").addEventListener("click", (e) => { e.stopPropagation(); letGo(i); });
      list.appendChild(card);
    });
  }

  function runMove(i, key) {
    const d = G.dock[i]; if (!d || d.clues.has(key)) return;
    if (G.mode === "timed") {
      G.clock -= MOVE_COST;
      floatCost(`−${MOVE_COST}s`);
      if (G.clock <= 0) { d.clues.add(key); G.moves++; renderDock(); deadline(); return; }
    }
    d.clues.add(key); G.moves++;
    $("hudMoves").textContent = G.moves;
    sound.move();
    renderDock(); selectDock(i);
    const card = $("dockList").children[i];
    if (card) { const btn = card.querySelector(`[data-move="${key}"]`); if (btn) btn.focus({ preventScroll: true }); }
    const m = MOVES.find(x => x.key === key);
    announce(`${m.label} ${d.src.checks[key].text}`);
  }

  function floatCost(text) {
    if (reducedMotion()) return;
    const clock = $("hudClock"); const r = clock.getBoundingClientRect();
    const el = document.createElement("span");
    el.textContent = text;
    Object.assign(el.style, { position: "fixed", left: r.left + "px", top: r.bottom + "px", color: "var(--rust)", fontFamily: cssVar("--mono"), fontWeight: "700", zIndex: 70, pointerEvents: "none" });
    document.body.appendChild(el);
    el.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(26px)", opacity: 0 }], { duration: 900, easing: "ease-out" }).onfinish = () => el.remove();
  }

  function decided(i) {
    const d = G.dock[i];
    G.dock.splice(i, 1);
    G.decided.add(d.src.id);
    G.decisions++;
    if (G.mode === "untimed") {
      const idx = clamp(Math.floor(G.decisions / DECISIONS_PER_REACH), 0, REACHES.length - 1);
      if (idx !== G.reachIndex) advanceReach(idx);
    }
    renderDock();
    if (G.dock.length) selectDock(Math.min(i, G.dock.length - 1));
    return d;
  }

  function cite(i) {
    if (G.bib.length >= BIB_MAX) { toast("The bibliography is full. Submit it for audit.", true); return; }
    const d = decided(i);
    G.bib.push({ src: d.src, moves: d.clues.size, autopilot: false });
    sound.cite();
    renderBib(); updateAudit();
    toast(`Cited: ${d.src.title}`);
    announce(`Cited ${d.src.title}. ${G.bib.length} of five.`);
    if (G.bib.length === BIB_MAX) { $("btnAudit").focus(); announce("Five citations. Submit for audit when ready."); }
  }

  function letGo(i) {
    const d = decided(i);
    G.letGo.push({ src: d.src, moves: d.clues.size });
    sound.letgo();
    toast(`Let go: ${d.src.title}`);
    announce(`Let go of ${d.src.title}.`);
  }

  function renderBib() {
    $("bibCount").textContent = G.bib.length;
    $("hudCited").textContent = G.bib.length;
    document.querySelectorAll(".bib-slot").forEach((slot, i) => {
      const b = G.bib[i];
      slot.classList.remove("is-filled", "is-held", "is-failed", "is-flipping");
      slot.querySelector(".slot-text").textContent = "empty";
      const old = slot.querySelector(".slot-mark"); if (old) old.remove();
      if (b) {
        slot.classList.add("is-filled");
        slot.querySelector(".slot-text").textContent = `${b.src.title} (${b.src.year})${b.autopilot ? " · chosen by the stream" : ""}`;
      }
    });
  }

  function updateAudit() {
    $("btnAudit").disabled = G.bib.length < BIB_MAX;
    $("btnAutopilot").disabled = G.bib.length >= BIB_MAX;
  }

  /* ---- Autopilot ---------------------------------------------------------- */
  function offerAutopilot() {
    if (!G.running || G.paused) return;
    const remaining = BIB_MAX - G.bib.length;
    openModal({
      glyph: "✦",
      title: "Let the stream fill it",
      body: `<p class="autopilot-warn"><strong>The stream can complete your bibliography now.</strong> It will choose the ${remaining} most prominent ${remaining === 1 ? "source" : "sources"} in the current and cite ${remaining === 1 ? "it" : "them"} for you. No moves, no seconds, no reading.</p>
             <p>Prominence is what the stream ranks. Whether a source holds is not something it checks.</p>`,
      buttons: [
        { label: "Fill it for me", cls: "btn-autopilot", onClick: runAutopilot },
        { label: "I will keep reading", cls: "btn-ghost" }
      ]
    });
  }

  function runAutopilot() {
    G.autopilotUsed = true;
    sound.autopilot();
    // The stream prefers what is loud and late: feed and phantom first, then whatever is floating.
    const taken = new Set([...G.bib.map(b => b.src.id), ...G.dock.map(d => d.src.id)]);
    const rank = (s) => (s.reach === "feed" ? 5 : s.reach === "phantom" ? 4 : s.reach === "signal" ? 2 : 1) + (s.holds ? 0 : 1.5) + Math.random();
    const candidates = SOURCES.filter(s => !taken.has(s.id)).sort((a, b) => rank(b) - rank(a));
    const need = BIB_MAX - G.bib.length;
    const chosen = candidates.slice(0, need);
    let k = 0;
    const addNext = () => {
      if (k >= chosen.length) { updateAudit(); announce(`The stream filled your bibliography. ${G.bib.length} of five.`); toast("The stream chose for you."); $("btnAudit").focus(); return; }
      const s = chosen[k++];
      G.decided.add(s.id);
      const f = G.river.floaters.find(x => x.src.id === s.id);
      if (f) { G.river.splash(f.x + G.river.cardW / 2, f.y + G.river.cardH / 2, PALETTES[s.reach].accent); G.river.remove(f); }
      G.bib.push({ src: s, moves: 0, autopilot: true });
      renderBib();
      setTimeout(addNext, reducedMotion() ? 0 : 260);
    };
    addNext();
  }

  /* ---- Deadline and audit -------------------------------------------------- */
  function deadline() {
    G.running = false; G.clock = 0; $("hudClock").textContent = "0:00";
    setDam(false);
    openModal({
      glyph: "⏳",
      title: "The draft is due",
      body: `<p>The deadline arrived with <strong>${G.bib.length} of five</strong> citations in place. The audit runs on what you have.</p>
             ${G.dock.length ? `<p>${G.dock.length} ${G.dock.length === 1 ? "source" : "sources"} in the dock never got a decision. They go back to the river.</p>` : ""}`,
      buttons: [{ label: "Run the audit", onClick: () => beginAudit(true) }]
    });
  }

  function beginAudit(fromDeadline) {
    G.running = false;
    setDam(false);
    if (!G.bib.length) { showDebrief(); return; }
    openModal({
      glyph: "◎",
      title: "Forecast before the audit",
      body: `<p>You cited <strong>${G.bib.length}</strong>. Before the audit runs, call it: <strong>how many will hold?</strong></p>
             <div class="forecast-row">${Array.from({ length: G.bib.length + 1 }, (_, i) => `<button type="button" class="btn btn-ghost" data-forecast="${i}">${i}</button>`).join("")}</div>
             <p style="text-align:center;font-size:0.82rem">Keys 0 to ${G.bib.length} also work.</p>`,
      buttons: [],
      onKey: (e) => { const n = parseInt(e.key, 10); if (!isNaN(n) && n >= 0 && n <= G.bib.length) { closeModal(); G.prediction = n; revealAudit(); } }
    });
    $("modalBody").querySelectorAll("[data-forecast]").forEach(b => b.addEventListener("click", () => { closeModal(); G.prediction = parseInt(b.dataset.forecast, 10); revealAudit(); }));
  }

  function revealAudit() {
    const slots = Array.from(document.querySelectorAll(".bib-slot"));
    $("bibSlots").scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
    let i = 0;
    const next = () => {
      if (i >= G.bib.length) { setTimeout(showDebrief, reducedMotion() ? 0 : 900); return; }
      const b = G.bib[i], slot = slots[i];
      slot.classList.add("is-flipping");
      setTimeout(() => {
        slot.classList.add(b.src.holds ? "is-held" : "is-failed");
        const mark = document.createElement("span"); mark.className = "slot-mark"; mark.textContent = b.src.holds ? "HELD" : "FAILED";
        slot.appendChild(mark);
        if (b.src.holds) sound.held(); else sound.failed();
        announce(`${b.src.title}: ${b.src.holds ? "held" : "failed"}.`);
      }, reducedMotion() ? 0 : 250);
      i++;
      setTimeout(next, reducedMotion() ? 60 : 650);
    };
    next();
  }

  /* ---- Scoring and debrief ------------------------------------------------- */
  function score() {
    const held = G.bib.filter(b => b.src.holds).length;
    const failed = G.bib.length - held;
    const weakLetGo = G.letGo.filter(l => !l.src.holds).length;
    const strongLetGo = G.letGo.filter(l => l.src.holds).length;
    const movesOnCited = G.bib.reduce((a, b) => a + b.moves, 0);
    const movesPer = G.bib.length ? movesOnCited / G.bib.length : 0;
    const pts = Math.max(0, held * 100 - failed * 120 + weakLetGo * 40 + Math.min(movesOnCited, 15) * 10);
    let rank, line, tier;
    if (held === BIB_MAX && failed === 0 && movesPer >= 2) { rank = "Archivist"; tier = "high"; line = "Every citation held and you checked before you trusted. The path back to the original existed for all five, and you walked it."; }
    else if (held >= 4 && failed <= 1 && movesPer >= 1.5) { rank = "Corroborator"; tier = "high"; line = "You read laterally and most of it held. One more move on the weak one would have caught it."; }
    else if (held >= 3 && movesPer >= 1) { rank = "Reader"; tier = "mid"; line = "You slowed down some of the time. The citations you checked held; the ones you did not are where the failures sit."; }
    else if (held >= 3) { rank = "Skimmer"; tier = "mid"; line = "The outcome was fair but the process was fast. You cited more than you checked, and the river was kind this time."; }
    else if (!G.bib.length) { rank = "Drifter"; tier = "low"; line = "The deadline passed with nothing cited. Reading everything and committing to nothing is its own way of letting the stream decide."; }
    else { rank = "Drifter"; tier = "low"; line = G.autopilotUsed ? "The stream chose for you, and the stream prefers what is loud. Prominence is not provenance." : "Most of what you cited failed. The fabrications in this river are fluent, specific, and popular. That is the point."; }
    return { held, failed, weakLetGo, strongLetGo, movesPer, pts, rank, line, tier };
  }

  function patterns(s) {
    const cited = (id) => G.bib.some(b => b.src.id === id);
    const let_ = (id) => G.letGo.some(l => l.src.id === id);
    const out = [];
    if (G.autopilotUsed) { const n = G.bib.filter(b => b.autopilot).length; out.push(`The stream chose ${n} of your citations. ${G.bib.filter(b => b.autopilot && !b.src.holds).length} of those failed.`); }
    if (cited("feed-viral") || cited("feed-digest")) out.push("Reach is not evidence. A share count or a digest tells you what was popular, not what was recorded.");
    if (cited("phantom-gazette")) out.push("Precision is not provenance. The fabricated Gazette citation had a page number and a date, and no newspaper.");
    if (cited("signal-drama")) out.push("Drama is not record. The docudrama's best scene came from the one rumor the engineering report contradicts.");
    if (cited("voice-tavern")) out.push("A rumor told as common knowledge is evidence of the rumor, not of the cause.");
    if (let_("phantom-transcript")) out.push("Machine-touched is not fabricated. The AI-assisted transcript had an archivist, timestamps, and the audio. You let it go.");
    if (let_("voice-hale") || let_("voice-rhyme")) out.push("Oral memory can hold when a written record corroborates it. At least one remembered source you let go would have.");
    if (cited("ink-pamphlet") && G.bib.find(b => b.src.id === "ink-pamphlet").moves > 0) out.push("You cited the sermon for what it is, a document of how people explained the flood. That is the right way to carry a biased source.");
    if (!out.length && s.held === BIB_MAX) out.push("No pattern to report. Every citation had a path back to something that stayed put.");
    return out.slice(0, 3);
  }

  function showDebrief() {
    const s = score();
    show("screenDebrief");
    $("rankName").textContent = s.rank;
    $("rankLine").textContent = s.line;
    $("rankBadge").textContent = s.tier === "high" ? "✶" : s.tier === "mid" ? "◐" : "〰";
    $("rankCard").className = "rank-card rank-" + s.tier;
    $("finalScore").textContent = s.pts;
    $("roHeld").textContent = s.held; $("roFailed").textContent = s.failed;
    $("roMoves").textContent = s.movesPer.toFixed(1); $("roCaught").textContent = s.weakLetGo;
    const fl = $("forecastLine");
    if (G.prediction === null) fl.textContent = "";
    else if (G.prediction === s.held) fl.innerHTML = `<strong>Forecast:</strong> you called ${s.held}, and ${s.held} held. Your read of the river matched the audit.`;
    else fl.innerHTML = `<strong>Forecast:</strong> you called ${G.prediction}; ${s.held} held. ${G.prediction > s.held ? "The stream looked more trustworthy than it was." : "You trusted your own citations less than they deserved."}`;
    $("patternLine").innerHTML = patterns(s).map(p => `<span>${esc(p)}</span>`).join("<br>");

    const vl = $("verdictList"); vl.innerHTML = "";
    G.bib.forEach(b => {
      const li = document.createElement("li");
      li.className = "verdict " + (b.src.holds ? "is-held" : "is-failed");
      const reach = REACHES.find(r => r.id === b.src.reach);
      li.innerHTML = `<div class="verdict-top"><span class="verdict-title">${esc(b.src.title)} <span class="src-year">(${esc(reach.name)}, ${esc(b.src.year)})</span></span><span class="verdict-mark">${b.src.holds ? "Held" : "Failed"}</span></div>
        <p class="verdict-why">${esc(b.src.verdict)}</p>
        <p class="verdict-moves">${b.autopilot ? "Chosen by the stream, no moves." : `${b.moves} of 3 moves before citing.`}</p>`;
      vl.appendChild(li);
    });
    if (!G.bib.length) vl.innerHTML = `<li class="verdict">Nothing was cited before the deadline.</li>`;

    const lg = $("letGoList"); lg.innerHTML = "";
    $("letGoWrap").hidden = !G.letGo.length;
    G.letGo.forEach(l => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="${l.src.holds ? "miss" : "good"}">${l.src.holds ? "Would have held" : "Right call"}</span> ${esc(l.src.title)}. ${esc(l.src.verdict)}`;
      lg.appendChild(li);
    });
    announce(`Audit complete. Rank: ${s.rank}. ${s.held} of ${G.bib.length} citations held.`);
    if (sound.gain) sound.gain.gain.setTargetAtTime(0, sound.ctx.currentTime, 0.5);
  }

  /* ---- Pause --------------------------------------------------------------- */
  function pause() {
    if (!G.running || G.paused || modalOpen()) return;
    G.paused = true; setDam(false); G.river.stop();
    openModal({ glyph: "⏸", title: "Paused", body: `<p>The river is holding still. Reach ${REACHES[G.reachIndex].numeral}, ${G.bib.length} of five cited.</p>`,
      buttons: [{ label: "Resume", onClick: resume }, { label: "Quit to title", cls: "btn-ghost", onClick: () => { G.paused = false; G.running = false; G.river.stop(); titleScreen(); } }],
      onKey: (e) => { if (e.key === "Escape") { closeModal(); resume(); } } });
  }
  function resume() { G.paused = false; G.river.start(); }

  /* ---- Title ---------------------------------------------------------------- */
  function titleScreen() {
    show("screenTitle");
    if (!G.titleRiver) {
      G.titleRiver = new River($("titleCanvas"), { ambient: true });
      G.titleRiver.setReach(2, true);
      let acc = 0;
      G.titleRiver.onTick = (dt) => {
        acc += dt;
        const idx = Math.floor(acc / 9) % REACHES.length;
        if (idx !== G.titleRiver.reachIndex) G.titleRiver.setReach(idx, false);
        G.titleRiver.spawnTimer -= dt;
        if (G.titleRiver.spawnTimer <= 0 && G.titleRiver.floaters.length < 3) { G.titleRiver.spawn(pick(SOURCES)); G.titleRiver.spawnTimer = rand(2, 4); }
      };
    }
    G.titleRiver.start();
  }

  /* ---- Motion preference ------------------------------------------------------ */
  function applyMotion(pref) {
    if (pref === "system") document.documentElement.removeAttribute("data-motion"); else document.documentElement.setAttribute("data-motion", pref);
    $("motionLabelTitle").textContent = pref;
    try { localStorage.setItem("stream-motion", pref); } catch (e) { /* storage unavailable */ }
  }
  function cycleMotion() {
    const cur = document.documentElement.getAttribute("data-motion") || "system";
    applyMotion(cur === "system" ? "reduce" : cur === "reduce" ? "full" : "system");
  }

  /* ---- Print ------------------------------------------------------------------- */
  function printReport() { $("letGoWrap").open = true; window.print(); }

  /* ---- Wiring ------------------------------------------------------------------- */
  function wire() {
    $("btnStartTimed").addEventListener("click", () => startRun("timed"));
    $("btnStartUntimed").addEventListener("click", () => startRun("untimed"));
    $("btnMotionTitle").addEventListener("click", cycleMotion);
    $("btnSound").addEventListener("click", () => sound.toggle());
    $("btnPause").addEventListener("click", pause);
    $("btnAudit").addEventListener("click", () => beginAudit(false));
    $("btnAutopilot").addEventListener("click", offerAutopilot);
    $("btnReplay").addEventListener("click", () => startRun(G.mode));
    $("btnPrint").addEventListener("click", printReport);

    const dam = $("btnDam");
    dam.addEventListener("pointerdown", (e) => { e.preventDefault(); dam.setPointerCapture(e.pointerId); setDam(true); });
    const release = () => { if (G.damHeld) setDam(false); };
    dam.addEventListener("pointerup", release); dam.addEventListener("pointercancel", release); dam.addEventListener("lostpointercapture", release);
    dam.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); setDam(!G.damHeld); } });

    document.addEventListener("keydown", (e) => {
      if (modalOpen()) return;
      if (!$("screenRun").classList.contains("is-active")) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === " " && !e.repeat) { e.preventDefault(); setDam(true); return; }
      if (e.key === "Escape") { pause(); return; }
      if (e.key === "m" || e.key === "M") { sound.toggle(); return; }
      if (selectedIdx < 0 || !G.dock[selectedIdx]) return;
      if (e.key === "1" || e.key === "2" || e.key === "3") { e.preventDefault(); runMove(selectedIdx, MOVES[parseInt(e.key, 10) - 1].key); }
      else if (e.key === "c" || e.key === "C") { e.preventDefault(); cite(selectedIdx); }
      else if (e.key === "x" || e.key === "X") { e.preventDefault(); letGo(selectedIdx); }
    });
    document.addEventListener("keyup", (e) => { if (e.key === " " && G.damHeld) setDam(false); });
    window.addEventListener("blur", () => { if (G.damHeld) setDam(false); });

    const params = new URLSearchParams(location.search);
    let pref = "system";
    try { pref = localStorage.getItem("stream-motion") || "system"; } catch (e) { /* ignore */ }
    if (params.get("motion") === "reduce") pref = "reduce";
    applyMotion(pref);
    titleScreen();
    if (params.get("start") === "timed") startRun("timed");
    if (params.get("start") === "untimed") startRun("untimed");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
