// The tapestry in space (3D): each life a line through it - time along one
// way, its place (layOut, in two) across the others - drawn on a canvas,
// seen from a camera that is turned by dragging, brought near and far by
// pinching (or a wheel), and walked like a first-person game: a joystick on
// the left (or W A S D) to go forwards, back and sideways, one on the right
// (or the arrow keys) to look. Looking up and down may be inverted. A tap on
// a knot opens what it is; in select mode a box drawn over it catches the
// lives through it. The browser's alone: lives.js works out what it draws.

import { caught, placeAt } from "./lives.js?v=f74905f80d78";

const YEAR = 0.6; // a year along the time's way, in the space's units
const PLACE = 1.6; // a place apart (layOut), in them
const FOV = 0.9; // how wide the camera sees, as a share of the canvas's width
const FOUND = "#f2c14e"; // what a search found, picked out: as on the flat tapestry (lives.js)

export class Space {
  /** In this element; open(key) opens a knot pressed, select(caught) is told what a box caught; settings() says { joysticks, invertY }. */
  constructor(element, { open, select, settings, pick }) {
    this.element = element;
    this.open = open;
    this.pick = pick ?? (() => {});
    this.select = select;
    this.settings = settings;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "SpaceCanvas";
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("aria-label", "The lives, in space");
    this.box = document.createElement("div");
    this.box.className = "SelectBox";
    this.box.hidden = true;
    element.replaceChildren(this.canvas, this.box);
    this.sticks = this.joysticks();
    this.selecting = false;
    this.camera = { x: 0, y: 0, z: 30, yaw: 0, pitch: 0, distance: 30 };
    this.moving = { forward: 0, side: 0, yaw: 0, pitch: 0 };
    this.pointers = new Map();
    this.listen();
    this.resize();
    this.frame = 0;
    this.loop = this.loop.bind(this);
  }

  /** What is drawn: the lives (livesOf), where they are (layOut, in two), their colours, and those hidden. */
  set(drawn, laid, colours, hidden = [], focus = null, found = null) {
    const first = !this.drawn;
    this.focus = focus;
    this.found = found; // what a search found: { keys, lives }, picked out - or null
    this.drawn = drawn;
    this.laid = laid;
    this.colours = colours;
    this.hidden = hidden;
    const times = laid.times;
    this.middle = times.length ? (times[0] + times[times.length - 1]) / 2 : 0;
    if (first && times.length) {
      // all of it in sight, time across, as on the flat picture
      const length = (times[times.length - 1] - times[0]) * YEAR;
      this.camera = { x: 0, y: 0, z: length * 0.75 + 8, yaw: 0, pitch: 0, distance: length * 0.75 + 8 };
    }
    this.sticks.hidden = !this.settings().joysticks;
    this.draw();
  }

  setSelecting(on) { this.selecting = on; this.canvas.style.cursor = on ? "crosshair" : "grab"; }

  /** A life's place at a moment, in the space: [x, y, z], or null. */
  point(id, t) {
    const p = placeAt(this.laid, id, t);
    return p ? [(t - this.middle) * YEAR, p[0] * PLACE, (p[1] ?? 0) * PLACE] : null;
  }

  /** Where the camera looks: forwards, right and up. */
  axes() {
    const { yaw, pitch } = this.camera;
    const forward = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
    const right = [Math.cos(yaw), 0, Math.sin(yaw)];
    const up = [right[1] * forward[2] - right[2] * forward[1], right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];
    return { forward, right, up };
  }

  /** A point of the space on the canvas: { x, y, depth }, or null behind the camera. */
  project([px, py, pz], axes) {
    const v = [px - this.camera.x, py - this.camera.y, pz - this.camera.z];
    const depth = v[0] * axes.forward[0] + v[1] * axes.forward[1] + v[2] * axes.forward[2];
    if (depth < 0.2) return null;
    const scale = (this.width * FOV) / depth;
    return { x: this.width / 2 + (v[0] * axes.right[0] + v[1] * axes.right[1] + v[2] * axes.right[2]) * scale,
      y: this.height / 2 - (v[0] * axes.up[0] + v[1] * axes.up[1] + v[2] * axes.up[2]) * scale, depth };
  }

  resize() {
    const box = this.element.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    this.width = Math.max(box.width, 280);
    this.height = Math.max(Math.min(this.width * 0.75, 560), 320);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw();
  }

  draw() {
    if (!this.drawn || !this.laid) return;
    const g = this.canvas.getContext("2d");
    const { ink = "#eef2fa", soft = "#8e9ab8", ground = "#121829" } = this.colours ?? {};
    g.clearRect(0, 0, this.width, this.height);
    const axes = this.axes();
    this.points = [];
    this.knots = [];
    const lives = this.drawn.lives.filter((l) => !this.hidden.includes(l.id));
    // each life: its line, nearer thicker; faded in where its start isn't known
    for (const life of lives) {
      const at = this.laid.at.get(life.id) ?? [];
      let last = null;
      this.laid.times.forEach((t, s) => {
        if (!at[s]) { last = null; return; }
        const p = this.project(this.point(life.id, t), axes);
        if (p) this.points.push({ id: life.id, t, x: p.x, y: p.y });
        if (p && last) {
          const fade = life.faded ? Math.max(0, Math.min(1, (t - life.from) / 2)) : 1;
          const picked = this.focus === life.id;
          g.strokeStyle = life.colour;
          const faint = (this.focus && !picked) || (this.found && !this.found.lives.has(life.id));
          g.globalAlpha = (faint ? 0.18 : life.grey ? 0.7 : 1) * fade;
          g.lineWidth = Math.max(1, Math.min(5, 40 / p.depth)) * (life.grey ? 0.7 : 1) * (picked ? 2 : 1);
          g.beginPath();
          g.moveTo(last.x, last.y);
          g.lineTo(p.x, p.y);
          g.stroke();
        }
        last = p;
      });
      // its name at its start
      const start = this.points.find((p) => p.id === life.id);
      if (start) {
        g.globalAlpha = 1;
        g.fillStyle = life.grey ? soft : ink;
        g.font = "600 12px Manrope, system-ui, sans-serif";
        g.fillText(`${life.name}${life.died ? " †" : ""}`, start.x + 4, start.y - 8);
      }
    }
    // each thing shared: a dot on each life in it, a line through them
    g.globalAlpha = 1;
    for (const thing of this.drawn.shared) {
      const on = thing.lives.filter((id) => !this.hidden.includes(id))
        .map((id) => ({ id, p: this.point(id, thing.from) })).filter((o) => o.p).map((o) => ({ ...o, s: this.project(o.p, axes) })).filter((o) => o.s);
      if (on.length < 2) continue;
      const hit = !!this.found?.keys.has(thing.key);
      const faint = this.found && !hit;
      g.strokeStyle = hit ? FOUND : ink;
      g.globalAlpha = faint ? 0.15 : hit ? 0.9 : 0.45;
      g.lineWidth = hit ? 3 : 1;
      g.beginPath();
      on.forEach((o, i) => (i ? g.lineTo(o.s.x, o.s.y) : g.moveTo(o.s.x, o.s.y)));
      g.stroke();
      g.globalAlpha = faint ? 0.25 : 1;
      for (const o of on) {
        const r = Math.max(2.5, Math.min(7, 60 / o.s.depth)) + (hit ? 2 : 0);
        g.fillStyle = this.drawn.lives.find((l) => l.id === o.id)?.colour ?? soft;
        g.strokeStyle = hit ? FOUND : ground;
        g.lineWidth = hit ? 3 : 1;
        g.beginPath();
        g.arc(o.s.x, o.s.y, r, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        this.knots.push({ key: thing.key, x: o.s.x, y: o.s.y, r: r + 6 });
      }
    }
  }

  /** While a joystick or a key is held, the camera moves, a frame at a time. */
  loop() {
    const m = this.moving;
    if (!(m.forward || m.side || m.yaw || m.pitch)) { this.frame = 0; return; }
    const { forward, right } = this.axes();
    const speed = 0.6;
    this.camera.x += (forward[0] * m.forward + right[0] * m.side) * speed;
    this.camera.y += (forward[1] * m.forward) * speed;
    this.camera.z += (forward[2] * m.forward + right[2] * m.side) * speed;
    this.turn(m.yaw * 0.04, m.pitch * 0.03);
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  }

  go() { if (!this.frame) this.frame = requestAnimationFrame(this.loop); }

  /** Looked round where the camera stands. */
  turn(yaw, pitch) {
    this.camera.yaw += yaw;
    this.camera.pitch = Math.max(-1.4, Math.min(1.4, this.camera.pitch + pitch * (this.settings().invertY ? -1 : 1)));
  }

  /** Turned about the point it looks at, as a drag turns it. */
  orbit(yaw, pitch) {
    const { forward } = this.axes();
    const d = this.camera.distance;
    const target = [this.camera.x + forward[0] * d, this.camera.y + forward[1] * d, this.camera.z + forward[2] * d];
    this.turn(yaw, pitch);
    const after = this.axes().forward;
    this.camera.x = target[0] - after[0] * d;
    this.camera.y = target[1] - after[1] * d;
    this.camera.z = target[2] - after[2] * d;
  }

  /** Brought nearer what it looks at (over 1), or further (under 1). */
  zoom(factor) {
    const { forward } = this.axes();
    const d = this.camera.distance;
    const nearer = Math.max(2, Math.min(400, d / factor));
    const step = d - nearer;
    this.camera.x += forward[0] * step;
    this.camera.y += forward[1] * step;
    this.camera.z += forward[2] * step;
    this.camera.distance = nearer;
    this.draw();
  }

  listen() {
    const c = this.canvas;
    c.style.touchAction = "none";
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY, startX: e.offsetX, startY: e.offsetY });
      if (this.pointers.size === 2) this.pinch = this.spread();
    });
    c.addEventListener("pointermove", (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.offsetX - p.x;
      const dy = e.offsetY - p.y;
      p.x = e.offsetX;
      p.y = e.offsetY;
      if (this.pointers.size === 2) {
        const now = this.spread();
        if (this.pinch) this.zoom(now / this.pinch);
        this.pinch = now;
        return;
      }
      if (this.selecting) { this.showBox(p); return; }
      this.orbit(-dx * 0.006, dy * 0.006);
      this.draw();
    });
    const up = (e) => {
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (!p) return;
      const moved = Math.hypot(p.x - p.startX, p.y - p.startY);
      if (this.selecting && moved > 6) {
        this.box.hidden = true;
        const box = { left: Math.min(p.x, p.startX), right: Math.max(p.x, p.startX), top: Math.min(p.y, p.startY), bottom: Math.max(p.y, p.startY) };
        this.select(caught(this.points ?? [], box));
        return;
      }
      if (moved < 6) {
        // a tap: the knot under it opens
        const knot = (this.knots ?? []).find((k) => Math.hypot(k.x - p.x, k.y - p.y) <= k.r);
        if (knot) { this.open(knot.key); return; }
        // else the line under it is picked out - or, on none, none is
        let nearest = null;
        for (const q of this.points ?? []) {
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d <= 14 && (!nearest || d < nearest.d)) nearest = { id: q.id, d };
        }
        this.pick(nearest?.id ?? null);
      }
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("wheel", (e) => { e.preventDefault(); this.zoom(Math.exp(-e.deltaY * 0.002)); }, { passive: false });
    // W A S D to walk, the arrows to look, while the space has the keyboard
    c.tabIndex = 0;
    const keys = { KeyW: ["forward", 1], KeyS: ["forward", -1], KeyA: ["side", -1], KeyD: ["side", 1],
      ArrowLeft: ["yaw", -1], ArrowRight: ["yaw", 1], ArrowUp: ["pitch", 1], ArrowDown: ["pitch", -1] };
    c.addEventListener("keydown", (e) => { const k = keys[e.code]; if (!k) return; e.preventDefault(); this.moving[k[0]] = k[1]; this.go(); });
    c.addEventListener("keyup", (e) => { const k = keys[e.code]; if (k) this.moving[k[0]] = 0; });
    addEventListener("resize", () => this.resize());
  }

  spread() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  showBox(p) {
    Object.assign(this.box.style, { left: `${Math.min(p.x, p.startX)}px`, top: `${Math.min(p.y, p.startY)}px`,
      width: `${Math.abs(p.x - p.startX)}px`, height: `${Math.abs(p.y - p.startY)}px` });
    this.box.hidden = false;
  }

  /** The two joysticks, over the canvas: the left walks, the right looks. */
  joysticks() {
    const sticks = document.createElement("div");
    sticks.className = "Sticks";
    const stick = (side, move) => {
      const base = document.createElement("div");
      base.className = `Stick Stick${side}`;
      base.setAttribute("aria-label", side === "Left" ? "Walk" : "Look");
      const knob = document.createElement("div");
      knob.className = "StickKnob";
      base.append(knob);
      let held = null;
      const set = (e) => {
        const box = base.getBoundingClientRect();
        const r = box.width / 2;
        let dx = (e.clientX - box.left - r) / r;
        let dy = (e.clientY - box.top - r) / r;
        const len = Math.hypot(dx, dy);
        if (len > 1) { dx /= len; dy /= len; }
        knob.style.transform = `translate(${dx * r * 0.6}px, ${dy * r * 0.6}px)`;
        move(dx, dy);
        this.go();
      };
      base.addEventListener("pointerdown", (e) => { held = e.pointerId; base.setPointerCapture(e.pointerId); set(e); });
      base.addEventListener("pointermove", (e) => { if (e.pointerId === held) set(e); });
      const let_go = (e) => { if (e.pointerId !== held) return; held = null; knob.style.transform = ""; move(0, 0); };
      base.addEventListener("pointerup", let_go);
      base.addEventListener("pointercancel", let_go);
      return base;
    };
    sticks.append(
      stick("Left", (dx, dy) => { this.moving.side = dx; this.moving.forward = -dy; }),
      stick("Right", (dx, dy) => { this.moving.yaw = dx; this.moving.pitch = -dy; }),
    );
    this.element.append(sticks);
    return sticks;
  }
}
