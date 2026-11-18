import React, { useEffect, useRef } from 'react';
import { StreamState } from '../../types';
import { api } from '../../services/api';

interface ViceCityRunArcadeProps {
  streamState: StreamState;
  onExit: () => void;
  onScoreSubmitted?: (score: number) => void;
}

export const ViceCityRunArcade: React.FC<ViceCityRunArcadeProps> = ({
  streamState,
  onExit,
  onScoreSubmitted
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<{ destroy: () => void } | null>(null);
  const adapterRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const hostContainer = containerRef.current;
    hostContainer.innerHTML = '';
    const innerHost = document.createElement('div');
    innerHost.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;';
    hostContainer.appendChild(innerHost);

    /* =====================================================================
       VICE CITY RUN — v1.2 Single-File Integrated Engine
       Layers: utils → core sim → renderer → audio → GameScope adapter
               → app (UI, state machine, shutdown guard)
       ===================================================================== */

    /* ---------- utils ---------- */
    const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const sstep = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
    const wrapA = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    function mulberry32(a: number) {
      return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function hash(n: number) {
      n = Math.imul(n ^ 61, 0x45d9f3b); n ^= n >>> 16;
      n = Math.imul(n, 0x45d9f3b); n ^= n >>> 16;
      return (n >>> 0) / 4294967296;
    }
    const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const mixC = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const rgb = (c: number[], a?: number) => a == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

    /* ---------- constants ---------- */
    const STEP = 1 / 120, G = 22, DX = 0.5, RMAX = 0.94, KS = 60, CS = 9, INERTIA = 2.0;
    const VMAX = 64, START_X = 12;
    const JET_T = 7, JET_ALT = 8;
    const NITRO_PICK = 55;
    const STAGES = ['Coastal Highway', 'Downtown Vice', 'Industrial District', 'Final Escape'];
    const stageOf = (x: number) => x >= 6000 ? 3 : x >= 3500 ? 2 : x >= 1500 ? 1 : 0;
    const diff = (x: number) => sstep(x / 5200);
    const cruiseV = (D: number) => lerp(33, 42, D), nitroV = (D: number) => lerp(50, 58, D), jetV = (D: number) => lerp(54, 60, D);
    const stageF = (x: number) => sstep((x - 1350) / 300) + sstep((x - 3350) / 300) + sstep((x - 5850) / 300);

    /* ---------- terrain ---------- */
    const OBS_DEF: Record<string, { w: number; h: number; hard: boolean }> = {
      cone: { w: .7, h: .8, hard: false },
      barrel: { w: .9, h: 1.0, hard: false },
      barrier: { w: 2.6, h: .9, hard: true },
      car: { w: 4.2, h: 1.4, hard: true },
      police: { w: 4.4, h: 1.5, hard: true }
    };

    class Terrain {
      h: number[];
      fl: number[];
      rng: () => number;
      gh: number;
      obs: any[];
      deco: any[];
      pick: any[];
      stageSeen: number;
      lastBreather: number;
      prevSpike: boolean;
      spikes: number;
      nextNitro: number;
      nextJet: number;

      constructor(seed: number) {
        this.h = [0]; this.fl = [0]; this.rng = mulberry32(seed >>> 0 || 1); this.gh = 0;
        this.obs = []; this.deco = []; this.pick = []; this.stageSeen = -1; this.lastBreather = 0;
        this.prevSpike = false; this.spikes = 0; this.nextNitro = 240; this.nextJet = 700;
      }
      get gx() { return (this.h.length - 1) * DX; }
      push(h: number, f: boolean) { this.h.push(h); this.fl.push(f ? 1 : 0); }
      seg(len: number, dh: number, mode?: string) {
        const n = Math.max(1, Math.round(len / DX)), h0 = this.gh;
        for (let k = 1; k <= n; k++) {
          const t = k / n;
          let f: number;
          if (mode === 'in') f = t * t;
          else if (mode === 'out') f = 1 - (1 - t) * (1 - t);
          else if (mode === 'lin') f = t;
          else f = t * t * (3 - 2 * t);
          this.push(h0 + dh * f, false);
        }
        this.gh = h0 + dh;
      }
      gap(len: number) { const n = Math.max(1, Math.round(len / DX)); for (let k = 0; k < n; k++) this.push(this.gh, true); }
      heightAt(x: number) {
        const u = x / DX; if (u <= 0) return this.h[0];
        const i = Math.floor(u), L = this.h.length;
        if (i >= L - 1) return this.h[L - 1];
        if (this.fl[i] || this.fl[i + 1]) return this.h[i] - 40;
        const f = u - i; return this.h[i] + (this.h[i + 1] - this.h[i]) * f;
      }
      heightSolid(x: number) {
        const u = x / DX; if (u <= 0) return this.h[0];
        const i = Math.floor(u), L = this.h.length;
        if (i >= L - 1) return this.h[L - 1];
        const f = u - i; return this.h[i] + (this.h[i + 1] - this.h[i]) * f;
      }
      slopeAt(x: number) {
        const L = this.h.length; let i = clamp(Math.floor(x / DX), 1, L - 3);
        return (this.h[i + 2] - this.h[i - 1]) / (3 * DX);
      }
      inPit(x: number) {
        const i = Math.floor(x / DX);
        return i >= 0 && i < this.h.length - 1 && (this.fl[i] || this.fl[i + 1]) === 1;
      }
      level(x: number) { return this.h[clamp(Math.floor(x / DX), 0, this.h.length - 1)]; }
      addObs(t: string, x: number, vx?: number) {
        const d = OBS_DEF[t];
        const y = Math.min(this.heightSolid(x - d.w / 2), this.heightSolid(x + d.w / 2), this.heightSolid(x));
        const o = { t, x, y, w: d.w, h: d.h, hard: d.hard, vx: vx || 0, dead: false, passed: false, hit: false, minD: 99 };
        this.obs.push(o); return o;
      }
      addPick(t: string, x: number, y: number) { this.pick.push({ t, x, y, got: false }); }
      coinLine(x0: number, x1: number, dy?: number) {
        for (let x = x0; x <= x1; x += 2.6) this.addPick('coin', x, this.heightSolid(x) + (dy || 1.25));
      }
      coinArc(xa: number, xb: number, y0: number, pk: number) {
        const n = Math.max(2, Math.floor((xb - xa) / 2.4));
        for (let k = 0; k <= n; k++) {
          const tt = k / n;
          this.addPick('coin', xa + (xb - xa) * tt, y0 + pk * 4 * tt * (1 - tt));
        }
      }
      placePicks(x0: number, x1: number) {
        const r = this.rng, mid = (x0 + x1) / 2;
        if (this.gx >= this.nextNitro) { this.addPick('nitro', mid, this.heightSolid(mid) + 1.15); this.nextNitro = this.gx + 230 + r() * 200; }
        else if (this.gx >= this.nextJet) { this.addPick('jet', mid, this.heightSolid(mid) + 1.25); this.nextJet = this.gx + 950 + r() * 500; }
        else if (r() < .6) this.coinLine(x0 + 8, x1 - 6);
      }
      scatter(x0: number, x1: number, count: number) {
        const r = this.rng, types = ['cone', 'barrel', 'cone'];
        for (let k = 0; k < count; k++) {
          const x = lerp(x0, x1, r());
          if (x > x1 || x < x0) continue;
          if (Math.abs(this.slopeAt(x)) > 0.08 || this.inPit(x)) continue;
          let ok = true;
          for (const o of this.obs) if (Math.abs(o.x - x) < 9) { ok = false; break; }
          if (ok) this.addObs(types[(r() * 3) | 0], x);
        }
      }
      ensure(x: number) { let g = 0; while (this.gx < x && g++ < 200) this.genFeature(); }
      genFeature() {
        const r = this.rng, gx = this.gx, D = diff(gx), st = stageOf(gx);
        const maxS = Math.tan(lerp(14, 40, D) * Math.PI / 180), amp = lerp(3, 12, D);
        if (this.stageSeen !== st) {
          this.stageSeen = st; this.seg(st === 0 ? 60 : 50, 0);
          this.deco.push({ t: 'arch', x: gx + 14, st });
          this.lastBreather = this.gx; this.prevSpike = false; return;
        }
        if (this.prevSpike || gx - this.lastBreather > lerp(110, 190, D)) {
          const x0 = this.gx; this.seg(34 + r() * 14, 0);
          this.scatter(x0 + 8, this.gx - 6, Math.round(lerp(1, 4, D) * r() + r()));
          this.placePicks(x0, this.gx); this.lastBreather = this.gx; this.prevSpike = false; return;
        }
        const hi = this.gh > 35, lo = this.gh < -25;
        const opts: [string, number, number][] = [
          ['flat', 2, 0], ['rolling', 4, 0], ['climb', lo ? 6 : 2, 0],
          ['descent', hi ? 6 : 2, 0], ['whoops', 2, 0], ['barrierjump', 2.2, .02],
          ['kicker', 1.8, 0], ['rampgap', 2, .04], ['barrierrow', st >= 1 ? 1.8 : 0, .18],
          ['deck', st >= 2 ? 2.4 : 0, .25], ['bridge', st <= 1 ? .8 : 0, 0]
        ];
        let tot = 0; for (const o of opts) { if (o[0] === 'climb' && hi) o[1] = 0; if (o[0] === 'descent' && lo) o[1] = 0; if (D >= o[2]) tot += o[1]; }
        let pick = r() * tot, kind = 'flat';
        for (const o of opts) { if (D < o[2] || o[1] <= 0) continue; pick -= o[1]; if (pick <= 0) { kind = o[0]; break; } }
        const th = (a: number) => a * Math.PI / 180;
        switch (kind) {
          case 'flat': { const x0 = this.gx, L = 24 + r() * 24; this.seg(L, 0); this.scatter(x0 + 5, this.gx - 4, Math.round(lerp(2, 7, D) * L / 60)); if (r() < .4) this.coinLine(x0 + 4, this.gx - 4); break; }
          case 'rolling': {
            const n = 2 + ((r() * 2) | 0);
            for (let k = 0; k < n; k++) {
              let dh = (r() - .5) * 2 * amp;
              if (this.gh > 30) dh = -Math.abs(dh);
              if (this.gh < -20) dh = Math.abs(dh);
              const L = Math.max(25 + r() * 25, Math.abs(dh) * 1.5 / maxS);
              this.seg(L, dh, 's');
            }
            break;
          }
          case 'climb': { const dh = amp * (.6 + .8 * r()); this.seg(Math.max(40 + r() * 40, dh * 1.5 / maxS), dh, 's'); this.seg(10, 0); break; }
          case 'descent': { const dh = -amp * (.6 + .8 * r()); this.seg(Math.max(40 + r() * 40, -dh * 1.5 / maxS), dh, 's'); this.seg(10, 0); break; }
          case 'whoops': { const b = lerp(.5, 1.1, D); this.seg(12, 0); for (let k = 0; k < 5; k++) { this.seg(7, b, 's'); this.seg(7, -b, 's'); } this.seg(8, 0); break; }
          case 'kicker': {
            this.seg(16, 0); const t = th(lerp(11, 16, D)), len = 8, dh = Math.tan(t) * len / 2;
            this.seg(len, dh, 'in'); const lipX = this.gx, y0 = this.gh + 1.6; const dd = dh + .3;
            this.seg(Math.max(14, 2 * dd / Math.tan(t) + 4), -dd, 'out'); this.seg(8, 0);
            this.coinArc(lipX + 3, lipX + 26, y0, 3.2); this.prevSpike = true; break;
          }
          case 'barrierjump': {
            this.seg(18, 0); const t = th(lerp(16, 20, D)), len = 8, dh = Math.tan(t) * len / 2;
            this.seg(len, dh, 'in'); const lip = this.gx, ly = this.gh; const dd = dh + .3;
            this.seg(Math.max(16, 2 * dd / Math.tan(t) + 4), -dd, 'out');
            const useCar = D >= .35 && r() < .5; this.addObs(useCar ? 'car' : 'barrier', lip + (useCar ? 7.5 : 7));
            this.coinArc(lip - 1, lip + 20, ly + 1.8, 2.6); this.seg(10, 0); this.prevSpike = true; break;
          }
          case 'rampgap': {
            const n = D > .5 && r() < .5 ? 2 : 1;
            for (let q = 0; q < n; q++) {
              this.seg(18, 0); const t = th(lerp(14, 22, D)), len = 8, dh = Math.tan(t) * len / 2;
              this.seg(len, dh, 'in');
              const v = 34, vs = v * Math.sin(t), dd = 1.0, tf = (vs + Math.sqrt(vs * vs + 4 * (G / 2) * dd)) / G, R = v * Math.cos(t) * tf;
              const gl = clamp(.6 * R, 4, lerp(10, 32, D)), lipX = this.gx, y0 = this.gh + 1.6;
              this.gap(gl); this.seg(Math.max(18, 2 * dd / Math.tan(t) + 8), -dd, 'out'); this.seg(10, 0);
              this.coinArc(lipX + 1, lipX + gl + 4, y0, 3.4);
            }
            this.prevSpike = true; break;
          }
          case 'barrierrow': {
            this.seg(22, 0); const n = 2 + (D > .55 ? 1 : 0), x0 = this.gx; this.seg(14 + n * 30, 0); let bx = x0 + 16;
            for (let q = 0; q < n; q++) {
              const car = D > .45 && r() < .4;
              this.addObs(car ? 'car' : 'barrier', bx); this.coinArc(bx - 9, bx + 9, this.gh + 1.5, car ? 3.2 : 2.4);
              bx += 26 + r() * 8;
            }
            this.seg(10, 0); this.prevSpike = true; break;
          }
          case 'deck': {
            this.seg(20, 0); const hgt = D < .6 ? 2.0 : 2.8, run = 11, base = this.gh;
            this.seg(run, hgt, 's'); const x0 = this.gx; this.seg(14 + r() * 8, 0); const x1 = this.gx;
            this.deco.push({ t: 'deck', x0, x1, top: this.gh, base }); this.seg(run, -hgt, 's'); this.seg(10, 0); this.prevSpike = true; break;
          }
          case 'bridge': {
            const x0 = this.gx; this.seg(70 + r() * 20, 0); this.deco.push({ t: 'bridge', x0, x1: this.gx }); break;
          }
        }
      }
    }

    /* ---------- world / simulation ---------- */
    function newWorld(seed: number) {
      const T = new Terrain(seed); T.ensure(300);
      const gy = T.heightAt(START_X);
      const car = {
        x: START_X, y: gy + .95, vx: 0, vy: 0, a: 0, w: 0, air: 0, nitro: 100, nitroOn: false,
        alive: true, wr: 0, drop: [.4, .4], contact: [true, true], roofT: 0, lastVy: 0, jumpX: START_X,
        heldAir: false, pred: 0 as any, predT: 0, jumpCd: 0, jumpHeld: false, jumps: 0, sinceJ: 9,
        jetT: 0, jetExt: 0, jetOff: 0, jetFlag: false, onTop: false
      };
      return {
        T, car, seed, t: 0, ready: 1.4, maxX: START_X, heat: .15, mercy: 0, icd: 5, pend: null as any,
        warn: 0, shake: 0, flash: 0, ev: [] as any[], over: null as any, overT: 0, tier: 0, jetCx: 0,
        pol: { x: START_X - 45, gap: 45, units: [{ off: 0, on: true }, { off: 45, on: false }, { off: 60, on: false }], v: 0 },
        st: { longest: 0, clean: 0, near: 0, nitroUsed: 0, nitroDist: 0, hits: 0, coins: 0, jets: 0, dj: 0 },
        cps: [] as any[], cpT: 0, stage: 0, pruneT: 0, lastTilt: 0, demo: false
      };
    }
    const dist = (W: any) => Math.max(0, Math.floor(W.maxX - START_X));

    function crash(W: any, reason: string) {
      const c = W.car; if (!c.alive) return;
      c.alive = false; c.jetT = 0; W.over = { reason }; W.overT = 0; W.shake = 1; W.flash = 1;
      W.ev.push({ k: 'crash', reason });
      if (reason === 'caught') { c.w = 0; } else { c.w = (c.vx > 0 ? 1 : -1) * (2 + Math.random() * 2); c.vy = Math.max(c.vy, 3); }
    }

    function step(W: any, dt: number, inp: any) {
      const T = W.T, c = W.car, D = diff(c.x);
      W.t += dt; W.shake = Math.max(0, W.shake - dt * 2.2); W.flash = Math.max(0, W.flash - dt * 2.5);
      T.ensure(c.x + 180);
      if (!c.alive) {
        c.vy -= G * dt; if (W.over && W.over.reason === 'caught') c.vx *= 1 - 3.5 * dt;
        c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.w * dt;
        const gh = T.heightAt(c.x) + .55;
        if (c.y < gh && c.y > -30) { c.y = gh; c.vy = c.vy < -3 ? -c.vy * .25 : 0; c.vx *= .985; c.w *= .9; }
        W.overT += dt; stepPolice(W, dt, true); return;
      }

      /* jetpack timer */
      if (c.jetT > 0) {
        c.jetT -= dt;
        if (c.jetT <= 0) {
          let pit = false; const lk = Math.max(1, c.vx / 30);
          for (let k = 0; k <= 30; k += 3) if (T.inPit(c.x + k * lk)) pit = true;
          if (pit && c.jetExt < 4) { c.jetT = .2; c.jetExt += .2; } else { c.jetT = 0; W.ev.push({ k: 'jetend' }); }
        }
      }
      const jet = c.jetT > 0; c.sinceJ += dt;

      if (jet && c.jetT > 2.2) {
        const v = Math.max(c.vx, 30); if (W.jetCx < c.x + 14) W.jetCx = c.x + 14;
        while (W.jetCx < c.x + 120) {
          const x = W.jetCx, hi = Math.max(T.heightSolid(x), T.heightSolid(x + v * .5), T.heightSolid(x + v * .9));
          T.addPick('coin', x, hi + JET_ALT + .4 + Math.sin(x * .09) * 1.2); W.jetCx += 3.4;
        }
      }

      /* wheels */
      const ca = Math.cos(c.a), sa = Math.sin(c.a);
      let ax = 0, ay = jet ? 0 : -G, aw = 0, nC = 0, tx = 0, ty = 0;
      const prevContact = c.contact[0] || c.contact[1];
      for (let i = 0; i < 2; i++) {
        if (jet) { c.contact[i] = false; c.drop[i] = RMAX - .36; continue; }
        const lx = i ? 1.3 : -1.3, ly = -.1;
        const rx = lx * ca - ly * sa, ry = lx * sa + ly * ca, px = c.x + rx, py = c.y + ry;
        const gh = T.heightAt(px), s = T.slopeAt(px), nl = Math.sqrt(1 + s * s), nx = -s / nl, ny = 1 / nl;
        const d = (py - gh) * ny;
        if (d < RMAX) {
          const comp = clamp(RMAX - d, 0, .8);
          const vax = c.vx - c.w * ry, vay = c.vy + c.w * rx, vn = vax * nx + vay * ny;
          let f = KS * comp - CS * vn; if (f < 0) f = 0; if (f > G * 3.2) f = G * 3.2;
          ax += nx * f; ay += ny * f; aw += (rx * ny * f - ry * nx * f) / INERTIA;
          c.contact[i] = true; nC++; tx += 1 / nl; ty += s / nl; c.drop[i] = clamp(d - .36, .12, RMAX - .36);
        } else { c.contact[i] = false; c.drop[i] = RMAX - .36; }
      }

      /* nitro */
      const wantN = !jet && inp.nitro && (c.nitroOn ? c.nitro > 0 : c.nitro > 10);
      if (wantN && !c.nitroOn) { W.ev.push({ k: 'nitro' }); }
      c.nitroOn = wantN;
      if (wantN) {
        const u = 25 * dt; c.nitro = Math.max(0, c.nitro - u);
        W.st.nitroUsed += u; W.st.nitroDist += Math.max(0, c.vx) * dt;
      } else c.nitro = Math.min(100, c.nitro + 3 * dt);

      /* jump */
      c.jumpCd = Math.max(0, c.jumpCd - dt);
      if (!jet && inp.jump && !c.jumpHeld) {
        const gnd = nC > 0 || c.air < .12 || c.onTop;
        if (gnd && c.jumps === 0 && c.jumpCd <= 0) {
          const sl = T.slopeAt(c.x), nl = Math.sqrt(1 + sl * sl), jx = -sl / nl, jy = 1 / nl;
          c.vx += jx * 9; c.vy = Math.max(c.vy, 0) + jy * 9; c.jumpCd = .3; c.air = .001;
          c.contact[0] = c.contact[1] = false; nC = 0; c.onTop = false; c.jumpX = c.x; c.jumps = 1; c.sinceJ = 0;
          W.ev.push({ k: 'jump' });
        } else if (c.jumps < 2 && nC === 0 && !c.onTop && c.sinceJ > .12) {
          c.vy = Math.max(c.vy * .3, 0) + 9.5; c.vx += 2; c.jumps++; c.sinceJ = 0; c.w *= .5;
          W.st.dj++; W.ev.push({ k: 'djump' });
        }
      }
      c.jumpHeld = !!inp.jump;
      const grounded = nC > 0 || c.onTop;

      /* drive / brake */
      if (grounded) {
        if (nC > 0) { const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; } else { tx = 1; ty = 0; }
        const vf = c.vx * tx + c.vy * ty; let aF = 0;
        const target = wantN ? nitroV(D) : cruiseV(D), maxA = wantN ? 36 : 20, th = wantN ? 1 : inp.throttle;
        if (th > 0) aF = clamp((target - vf) * 2.5, -10, maxA) * th;
        if (inp.brake) { if (vf > 1.5) aF -= 34; else aF = clamp(-(vf + 8) * 3, -24, 24); }
        aF -= vf * .05;
        const k = nC > 0 ? nC / 2 : .7; aF *= k; ax += tx * aF; ay += ty * aF;
      } else if (wantN) { ax += Math.cos(c.a) * 14 * .4; ay += Math.sin(c.a) * 14 * .4; }

      /* jetpack flight */
      if (jet) {
        const fade = sstep(c.jetT / 1.4);
        const lo = T.heightSolid(c.x + c.vx * .2), hi = Math.max(lo, T.heightSolid(c.x + c.vx * .5), T.heightSolid(c.x + c.vx * .9)), lat = lerp(lo, hi, fade);
        c.jetOff = clamp(c.jetOff + inp.tilt * 7 * dt, -3, 4);
        const alt = lerp(1.8, JET_ALT + c.jetOff, fade);
        const vyT = clamp((lat + alt - c.y) * 2.4, -14, 14);
        ay += (vyT - c.vy) * 5; ax += (jetV(D) - c.vx) * 1.6;
      }

      /* rotation */
      if (jet) aw += wrapA(Math.atan2(c.vy, Math.max(c.vx, 8)) * .9 - c.a) * 30;
      else if (inp.tilt !== 0) aw += inp.tilt * (nC > 0 ? 7 : 15);
      else if (nC === 0 && c.air > .35) {
        c.predT -= dt;
        if (c.predT <= 0) {
          c.predT = .05; c.pred = null;
          for (let t = .05; t < 2; t += .05) {
            const px = c.x + c.vx * t, py = c.y + c.vy * t - .5 * G * t * t;
            if (py - .9 < T.heightAt(px)) { c.pred = Math.atan(T.slopeAt(px)); break; }
          }
        }
        if (c.pred != null) aw += clamp(wrapA(c.pred - c.a), -1, 1) * 28 * lerp(.35, .15, D);
      }
      aw -= c.w * (jet ? 6 : nC > 0 ? 1.8 : (inp.tilt ? .4 : 2.2));

      /* integrate */
      c.lastVy = c.vy; c.vx += ax * dt; c.vy += ay * dt; c.w = clamp(c.w + aw * dt, -5, 5);
      const sp = Math.hypot(c.vx, c.vy); if (sp > VMAX) { c.vx *= VMAX / sp; c.vy *= VMAX / sp; }
      c.x += c.vx * dt; c.y += c.vy * dt; c.a = wrapA(c.a + c.w * dt);
      c.wr += (c.vx / .36) * dt;
      c.onTop = false;

      /* air / landing */
      if (nC === 0) { if (prevContact) { c.jumpX = c.x; } c.air += dt; }
      else {
        if (c.air > .15) {
          const sl = Math.atan(T.slopeAt(c.x)), err = Math.abs(wrapA(c.a - sl)), imp = Math.max(0, -c.lastVy);
          const len = c.x - c.jumpX; if (!c.jetFlag && len > W.st.longest) W.st.longest = len;
          if (err > .8 || (err > .55 && imp > 22)) { crash(W, 'landing'); }
          else if (err > .35) { c.vx *= .88; W.shake = Math.max(W.shake, .35); W.heat = Math.min(1, W.heat + .08); W.ev.push({ k: 'rough' }); }
          else if (err < .2) { W.st.clean++; c.nitro = Math.min(100, c.nitro + 10); W.heat = Math.max(0, W.heat - .1); W.ev.push({ k: 'clean', len: c.jetFlag ? 0 : len }); }
          else W.ev.push({ k: 'land' });
          c.jetFlag = false;
        }
        c.air = 0; if (c.sinceJ > .2) c.jumps = 0;
      }
      if (!c.alive) return;

      /* chassis hard points */
      const HP = [[-.7, .62, 1], [.7, .62, 1], [2.05, -.25, 0], [-2.05, -.25, 0], [-1, -.45, 0], [1, -.45, 0]];
      let roof = false;
      if (!jet) for (const p of HP) {
        const rx = p[0] * ca - p[1] * sa, ry = p[0] * sa + p[1] * ca, wx = c.x + rx, wy = c.y + ry, gh = T.heightAt(wx), pen = gh - wy;
        if (pen > 0 && pen < 8) {
          if (p[2]) { if (pen > .05) roof = true; c.y += pen * .5; }
          else { c.y += pen * .6; if (c.vy < 0) c.vy *= .3; c.vx -= c.vx * 3 * dt; }
        }
      }
      c.roofT = roof ? c.roofT + dt : 0; if (c.roofT > .12) { crash(W, 'rolled'); return; }
      if (T.inPit(c.x) && c.y < T.level(c.x) - 3) { crash(W, 'fell'); return; }
      if (c.y < T.heightAt(c.x) - 6 && !T.inPit(c.x)) { crash(W, 'buried'); return; }

      /* obstacles */
      const cs = [[-1.4, -.1, .5], [0, .1, .6], [1.4, -.1, .5]];
      for (const o of T.obs) {
        if (o.dead) continue;
        if (o.vx) { o.x += o.vx * dt; o.y = Math.min(T.heightSolid(o.x - o.w / 2), T.heightSolid(o.x + o.w / 2)); }
        if (Math.abs(o.x - c.x) > 7) continue;
        if (jet) continue;
        const bx0 = o.x - o.w / 2, bx1 = o.x + o.w / 2, by0 = o.y, by1 = o.y + o.h;
        let hit: any = null;
        for (let k = 0; k < 3; k++) {
          const cx = c.x + cs[k][0] * ca - cs[k][1] * sa, cy = c.y + cs[k][0] * sa + cs[k][1] * ca, r = cs[k][2];
          const qx = clamp(cx, bx0, bx1), qy = clamp(cy, by0, by1), dx = cx - qx, dy = cy - qy, d2 = dx * dx + dy * dy;
          if (k === 1 && o.hard) { const dd = Math.sqrt(d2); if (dd < o.minD) o.minD = dd; }
          if (d2 < r * r) {
            const d = Math.sqrt(d2) || 1e-4; let nx = dx / d, ny = dy / d;
            if (d2 === 0) { nx = 0; ny = 1; }
            const pen = r - d; if (!hit || pen > hit.pen) hit = { nx, ny, pen };
          }
        }
        if (!o.passed && o.x + o.w / 2 < c.x - 2) {
          o.passed = true;
          if (o.hard && !o.hit && o.minD > .6 && o.minD < 1.6 && c.vx > 18) {
            W.st.near++; c.nitro = Math.min(100, c.nitro + 6); W.heat = Math.max(0, W.heat - .05); W.ev.push({ k: 'near' });
          }
        }
        if (!hit) continue;
        const relV = (c.vx - o.vx) * (-hit.nx) + c.vy * (-hit.ny);
        if (hit.ny > .6) { c.x += hit.nx * hit.pen; c.y += hit.ny * hit.pen; if (c.vy < 0) c.vy = 0; c.onTop = true; c.air = 0; if (c.sinceJ > .2) c.jumps = 0; continue; }
        o.hit = true;
        if (!o.hard) { o.dead = true; c.vx *= .95; W.heat = Math.min(1, W.heat + .03); W.ev.push({ k: 'knock', x: o.x, y: o.y + o.h / 2, t: o.t }); continue; }
        if (o.t === 'police') { o.dead = true; c.vx *= .5; W.heat = Math.min(1, W.heat + .3); W.shake = 1; W.mercy = 1.5; W.ev.push({ k: 'hit', x: o.x, y: o.y + .7 }); continue; }
        if (relV > 14) { c.x += hit.nx * hit.pen; crash(W, 'collision'); return; }
        const before = c.vx; c.x += hit.nx * hit.pen; c.vx = Math.min(c.vx, o.vx) - 1; if (c.vx < -3) c.vx = -3;
        W.heat = Math.min(1, W.heat + .15); W.shake = .7; W.st.hits++;
        if (before > 0 && (before - c.vx) > .3 * before) W.mercy = 1.5;
        W.ev.push({ k: 'hit', x: o.x, y: o.y + o.h / 2 });
      }

      /* pickups */
      for (const p of T.pick) {
        if (p.got) continue; const dx = p.x - c.x; if (dx > 5 || dx < -5) continue;
        const dy = p.y - c.y, rr = p.t === 'coin' ? (jet ? 3.2 : 1.9) : 2.4;
        if (dx * dx + dy * dy > rr * rr) continue;
        p.got = true;
        if (p.t === 'coin') { W.st.coins++; c.nitro = Math.min(100, c.nitro + .25); W.ev.push({ k: 'coin' }); }
        else if (p.t === 'nitro') { c.nitro = Math.min(100, c.nitro + NITRO_PICK); W.ev.push({ k: 'pnitro', x: p.x, y: p.y }); }
        else { c.jetT = JET_T; c.jetExt = 0; c.jetOff = 0; c.jetFlag = true; c.jumps = 0; W.jetCx = c.x + 8; W.st.jets++; W.ev.push({ k: 'pjet' }); }
      }

      /* distance, stage */
      if (c.x > W.maxX) W.maxX = c.x;
      const sg = stageOf(c.x); if (sg !== W.stage) { W.stage = sg; W.ev.push({ k: 'stage', s: sg }); }
      W.cpT += dt; if (W.cpT >= 5) { W.cpT -= 5; W.cps.push([+W.t.toFixed(1), dist(W)]); }
      W.pruneT += dt;
      if (W.pruneT > 2) {
        W.pruneT = 0; T.obs = T.obs.filter((o: any) => !o.dead && o.x > c.x - 70);
        T.pick = T.pick.filter((p: any) => !p.got && p.x > c.x - 70);
      }

      /* heat */
      const sp2 = c.vx;
      if (sp2 < 26 && c.air === 0) W.heat += .08 * dt;
      if (sp2 < 0) W.heat += .1 * dt;
      if (sp2 > 36) W.heat -= .06 * dt;
      if (c.nitroOn) W.heat -= .08 * dt;
      if (jet) W.heat -= .15 * dt;
      W.heat += (.15 - W.heat) * .02 * dt;
      W.heat = clamp(W.heat, 0, 1);
      stepPolice(W, dt, false);
    }

    function stepPolice(W: any, dt: number, dead: boolean) {
      const c = W.car, P = W.pol, D = diff(c.x);
      W.mercy = Math.max(0, W.mercy - dt); W.icd = Math.max(0, W.icd - dt);
      const ramp = Math.min(1, W.t / 3);
      let vP = lerp(28, 46, D) * (.96 + .1 * W.heat) * ramp;
      if (P.gap > 60) vP *= 1.1;
      if (W.mercy > 0 && vP > c.vx) vP = Math.max(c.vx, 0) + 2;
      P.v = vP; P.x += vP * dt; P.gap = c.x - P.x;
      if (P.gap > 75) { P.x = c.x - 75; P.gap = 75; }
      if (dead) return;
      if (P.gap <= 3.8) { crash(W, 'caught'); return; }
      const thr = [30, 18, 10]; let t = W.tier;
      while (t < 3 && P.gap < thr[t]) t++;
      while (t > 0 && P.gap > thr[t - 1] + 5) t--;
      if (t !== W.tier) { W.tier = t; W.ev.push({ k: 'tier', t }); }
      const want = [1, 1, 2, D > .7 ? 3 : 2][t];
      for (let i = 1; i < 3; i++) {
        const u = P.units[i]; const on = i < want;
        if (on && !u.on) { u.on = true; u.off = Math.max(u.off, P.gap + 30); }
        if (!on && u.on && t < 1) u.on = false;
        if (u.on) { const tg = i === 1 ? 9 : 17; u.off += (tg - u.off) * Math.min(1, dt * 1.2); }
      }
      if (D >= .3 && W.tier >= 3 && W.icd <= 0 && !W.pend) { W.pend = { t: 2 }; W.warn = 2; W.icd = 6; W.ev.push({ k: 'warn' }); }
      if (W.pend) {
        W.pend.t -= dt; W.warn = Math.max(0, W.pend.t);
        if (W.pend.t <= 0) {
          const x = c.x + 75, T = W.T;
          let ok = !T.inPit(x - 6) && !T.inPit(x + 6) && Math.abs(T.slopeAt(x)) < .12 && c.air === 0 && c.jetT <= 0;
          if (ok) { T.addObs('police', x, -10); W.pend = null; W.warn = 0; }
          else if (W.pend.t < -2) { W.pend = null; W.warn = 0; }
        }
      }
    }

    /* ---------- particles ---------- */
    const FX = {
      p: [] as any[],
      emit(x: number, y: number, vx: number, vy: number, life: number, size: number, col: string, add?: boolean) {
        if (this.p.length > 300) this.p.shift();
        this.p.push({ x, y, vx, vy, life, max: life, size, col, add });
      },
      update(dt: number) {
        for (let i = this.p.length - 1; i >= 0; i--) {
          const q = this.p[i]; q.life -= dt;
          if (q.life <= 0) { this.p.splice(i, 1); continue; }
          q.vy -= (q.add ? 0 : 6) * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        }
      },
      clear() { this.p.length = 0; }
    };

    /* ---------- renderer ---------- */
    const PAL = [
      { top: '#2b1a6b', bot: '#ff7a5c', sun: '#ffd36b', road: '#2a2640', grd: '#4a2d5c', edge: '#ff4fa3', far: '#8a3f86', mid: '#5a2f70', near: '#1d1033', neon: ['#ffd36b', '#ff7ab8', '#5ef2ff'] },
      { top: '#150b45', bot: '#c4337f', sun: '#ff8ad6', road: '#241d3a', grd: '#2e1a4a', edge: '#37e6ff', far: '#5a2a80', mid: '#341660', near: '#12082a', neon: ['#ff3ea5', '#4de1ff', '#b57bff'] },
      { top: '#070b22', bot: '#26567f', sun: '#9fd8ff', road: '#1d2233', grd: '#1b2740', edge: '#ffb347', far: '#1d4468', mid: '#142f50', near: '#0a1426', neon: ['#ffb347', '#7fd0ff', '#ff6b4a'] },
      { top: '#04040f', bot: '#5d1030', sun: '#ff4d6d', road: '#17141f', grd: '#1a0f1e', edge: '#ff2d55', far: '#3f1030', mid: '#26081f', near: '#0c040f', neon: ['#ff2d55', '#e8f0ff', '#ff9aa8'] }
    ];
    const PR: any[] = PAL.map(p => {
      const o: any = {};
      for (const k in p) o[k] = k === 'neon' ? p[k] : hex((p as any)[k]);
      return o;
    });

    function createRenderer(canvas: HTMLCanvasElement, mkCanvas: (w: number, h: number) => HTMLCanvasElement) {
      const ctx = canvas.getContext('2d', { alpha: false })!;
      let W = 0, H = 0, s = 1; const strips: any[] = []; let built = false;
      function resize(w: number, h: number, d: number) {
        W = w; H = h; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
        ctx.setTransform(d, 0, 0, d, 0, 0); s = h / 720;
      }
      function makeStrip(st: number, layer: number) {
        const cv = mkCanvas(1024, 340), g = cv.getContext('2d')!, rnd = mulberry32(st * 97 + layer * 13 + 5), P = PR[st];
        const body = rgb(mixC(layer === 0 ? P.far : layer === 1 ? P.mid : P.near, [0, 0, 0], layer === 2 ? .1 : 0));
        const cfg = [
          [[30, 80, 30, 70], [60, 150, 40, 90], [60, 220, 50, 110]],
          [[60, 150, 30, 60], [100, 250, 40, 80], [110, 300, 50, 100]],
          [[40, 110, 40, 90], [60, 170, 40, 90], [70, 190, 50, 110]],
          [[90, 200, 30, 60], [130, 290, 36, 70], [150, 320, 44, 90]]
        ][st][layer];
        const R = (x: number, y: number, w: number, h: number) => { g.fillRect(x, y, w, h); if (x + w > 1024) g.fillRect(x - 1024, y, w, h); };
        let x = -10;
        while (x < 1030) {
          const w = cfg[2] + rnd() * (cfg[3] - cfg[2]), h = cfg[0] + rnd() * (cfg[1] - cfg[0]);
          g.fillStyle = body; R(x, 340 - h, w, h);
          if (layer > 0 && rnd() < .5) { g.fillStyle = body; R(x + w * .3, 340 - h - 14, w * .12, 14); }
          if (st === 2 && rnd() < .3) {
            g.fillStyle = body;
            if (rnd() < .5) { R(x + w * .5, 340 - h - 60, 10, 60); g.fillStyle = '#ff3b3b'; R(x + w * .5 + 2, 340 - h - 64, 6, 6); }
            else { g.strokeStyle = body; g.lineWidth = 3; g.beginPath(); g.moveTo(x + w * .2, 340 - h); g.lineTo(x + w * .2, 340 - h - 70); g.lineTo(x + w * .2 + 70, 340 - h - 70); g.moveTo(x + w * .2, 340 - h - 70); g.lineTo(x + w * .2 - 30, 340 - h - 55); g.stroke(); }
          }
          if (layer >= 1) {
            const pw = layer === 2 ? .55 : .35, cols = P.neon;
            for (let wy = 340 - h + 8; wy < 336; wy += 11) for (let wx = x + 5; wx < x + w - 6; wx += 9) {
              if (rnd() < pw * (st === 0 ? .35 : 1)) { g.fillStyle = cols[(rnd() * 3) | 0]; g.globalAlpha = .35 + rnd() * .5; g.fillRect(wx, wy, 4, 6); }
            }
            g.globalAlpha = 1;
          }
          if (layer === 2 && st >= 1 && rnd() < .35) {
            const c = P.neon[(rnd() * 3) | 0], sw = 22 + rnd() * 18, sh = 40 + rnd() * 50, sx2 = x + w * .5, sy2 = 340 - h * rnd() * .8 - sh - 10;
            const gr = g.createRadialGradient(sx2 + sw / 2, sy2 + sh / 2, 2, sx2 + sw / 2, sy2 + sh / 2, sh);
            gr.addColorStop(0, c + '88'); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.fillRect(sx2 - sh, sy2 - sh / 2, sw + 2 * sh, sh * 2);
            g.fillStyle = c; g.fillRect(sx2, sy2, sw, sh * .18); g.fillRect(sx2, sy2 + sh * .4, sw, sh * .18); g.fillRect(sx2, sy2 + sh * .8, sw, sh * .18);
          }
          x += w + rnd() * (st === 1 ? 6 : 14);
        }
        if (st === 0 && layer === 2) {
          g.strokeStyle = body; g.fillStyle = body;
          for (let i = 0; i < 10; i++) {
            const px = rnd() * 1024, ph = 70 + rnd() * 60; g.lineWidth = 4; g.beginPath();
            g.moveTo(px, 340); g.quadraticCurveTo(px + 10, 340 - ph / 2, px + 4, 340 - ph); g.stroke();
            for (let k = 0; k < 6; k++) {
              const an = -Math.PI / 2 + (k - 2.5) * .5; g.beginPath(); g.moveTo(px + 4, 340 - ph);
              g.quadraticCurveTo(px + 4 + Math.cos(an) * 25, 340 - ph + Math.sin(an) * 25 - 8, px + 4 + Math.cos(an) * 42, 340 - ph + Math.sin(an) * 42 + 12);
              g.lineWidth = 3; g.stroke();
            }
          }
        }
        if (st === 3 && layer === 1) {
          for (let i = 0; i < 3; i++) {
            const bx = 100 + i * 330 + rnd() * 60, gr = g.createLinearGradient(bx, 340, bx + 60, 0);
            gr.addColorStop(0, 'rgba(255,230,230,.0)'); gr.addColorStop(1, 'rgba(255,230,230,.18)'); g.fillStyle = gr;
            g.beginPath(); g.moveTo(bx, 340); g.lineTo(bx + 110, 0); g.lineTo(bx + 170, 0); g.closePath(); g.fill();
          }
        }
        return cv;
      }
      function build() { if (built) return; built = true; for (let st = 0; st < 4; st++) { strips[st] = []; for (let l = 0; l < 3; l++) strips[st][l] = makeStrip(st, l); } }
      const mixPal = (k: string, i0: number, fr: number) => mixC(PR[i0][k], PR[Math.min(3, i0 + 1)][k], fr);

      /* vehicle vector art */
      function drawVehicle(ppm: number, x: number, y: number, a: number, drop: number[], wr: number, style: any, t: number, nitro: boolean, face: number, jet: boolean) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(-a); ctx.scale(ppm * (face < 0 ? -1 : 1), -ppm);
        const pol = style.police;
        ctx.globalCompositeOperation = 'lighter';
        let g = ctx.createRadialGradient(0, -.7, .2, 0, -.7, 2.8);
        g.addColorStop(0, style.glow + '66'); g.addColorStop(1, style.glow + '00');
        ctx.fillStyle = g; ctx.fillRect(-3, -2, 6, 2.6);
        ctx.globalCompositeOperation = 'source-over';

        for (let i = 0; i < 2; i++) {
          const wx = i ? 1.3 : -1.3, wy = -.1 - drop[i];
          ctx.fillStyle = '#07060c'; ctx.beginPath(); ctx.arc(wx, wy, .38, 0, 7); ctx.fill();
          ctx.save(); ctx.translate(wx, wy); ctx.rotate(-wr); ctx.strokeStyle = '#9aa0c0'; ctx.lineWidth = .05; ctx.beginPath();
          for (let k = 0; k < 5; k++) { const an = k * 1.2566; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * .27, Math.sin(an) * .27); }
          ctx.stroke(); ctx.strokeStyle = style.glow; ctx.lineWidth = .04; ctx.beginPath(); ctx.arc(0, 0, .29, 0, 7); ctx.stroke(); ctx.restore();
        }

        if (nitro) {
          const fl = 1.4 + Math.sin(t * 60) * .35; ctx.globalCompositeOperation = 'lighter';
          g = ctx.createLinearGradient(-2.2, 0, -2.2 - fl * 1.6, 0); g.addColorStop(0, '#fff'); g.addColorStop(.3, '#4de1ff'); g.addColorStop(1, 'rgba(122,44,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-2.15, -.05); ctx.lineTo(-2.2 - fl * 1.7, .12); ctx.lineTo(-2.2 - fl * 1.7, -.22); ctx.closePath(); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }

        if (jet) {
          ctx.globalCompositeOperation = 'lighter';
          for (const wx of [-1.3, 1.3]) {
            const fl = 1.5 + Math.sin(t * 70 + wx * 3) * .4; g = ctx.createLinearGradient(0, -.5, 0, -.5 - fl * 1.4);
            g.addColorStop(0, '#fff'); g.addColorStop(.25, '#ffd36b'); g.addColorStop(.6, 'rgba(255,45,149,.65)'); g.addColorStop(1, 'rgba(255,45,149,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(wx - .25, -.5); ctx.lineTo(wx + .25, -.5); ctx.lineTo(wx + Math.sin(t * 50) * .05, -.5 - fl * 1.4); ctx.closePath(); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        g = ctx.createLinearGradient(0, .65, 0, -.45); g.addColorStop(0, style.c1); g.addColorStop(1, style.c2); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-2.1, -.42); ctx.lineTo(-2.2, .02); ctx.lineTo(-1.95, .22); ctx.lineTo(-1, .3); ctx.lineTo(-.45, .64);
        ctx.lineTo(.55, .64); ctx.lineTo(1.2, .28); ctx.lineTo(2.05, .16); ctx.lineTo(2.22, -.08); ctx.lineTo(2.1, -.42); ctx.closePath(); ctx.fill();
        if (pol) { ctx.fillStyle = '#10163a'; ctx.fillRect(-2.1, -.42, 4.2, .3); }

        ctx.fillStyle = '#0b1328'; ctx.beginPath(); ctx.moveTo(-.9, .33); ctx.lineTo(-.4, .58); ctx.lineTo(.5, .58); ctx.lineTo(1.05, .31); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(120,220,255,.25)'; ctx.beginPath(); ctx.moveTo(-.4, .58); ctx.lineTo(.5, .58); ctx.lineTo(.3, .33); ctx.lineTo(-.6, .33); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = style.glow; ctx.lineWidth = .06; ctx.beginPath(); ctx.moveTo(-2.1, -.12); ctx.lineTo(2.1, -.06); ctx.stroke();

        if (jet) {
          ctx.fillStyle = '#2b1d52'; ctx.fillRect(-1.5, .55, 1.05, .5); ctx.fillStyle = '#ff2d95'; ctx.fillRect(-1.5, .95, 1.05, .1); ctx.fillStyle = '#ffd36b'; ctx.fillRect(-1.5, .7, .12, .25);
          ctx.globalCompositeOperation = 'lighter'; const f2 = 1.8 + Math.sin(t * 80) * .5; g = ctx.createLinearGradient(-1.5, 0, -1.5 - f2, 0);
          g.addColorStop(0, '#fff'); g.addColorStop(.3, '#ffb347'); g.addColorStop(1, 'rgba(255,45,149,0)'); ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(-1.5, 1.02); ctx.lineTo(-1.5 - f2, .8); ctx.lineTo(-1.5, .58); ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        }

        ctx.fillStyle = '#fff3b0'; ctx.fillRect(2.0, -.02, .2, .12); ctx.fillStyle = '#ff2840'; ctx.fillRect(-2.2, .0, .12, .14);
        ctx.globalCompositeOperation = 'lighter';
        g = ctx.createRadialGradient(-2.2, .07, .02, -2.2, .07, .9); g.addColorStop(0, 'rgba(255,40,70,.7)'); g.addColorStop(1, 'rgba(255,40,70,0)');
        ctx.fillStyle = g; ctx.fillRect(-3.2, -.9, 2, 2);

        if (style.beam) {
          g = ctx.createLinearGradient(2.2, 0, 12, 0); g.addColorStop(0, 'rgba(255,245,200,.35)'); g.addColorStop(1, 'rgba(255,245,200,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(2.2, .06); ctx.lineTo(12, -1.3); ctx.lineTo(12, 1.4); ctx.closePath(); ctx.fill();
        }

        if (pol) {
          const ph = Math.floor(t * 8 + style.ph) % 2; const c1 = ph ? '#ff2840' : '#2f6bff', c2 = ph ? '#2f6bff' : '#ff2840';
          ctx.fillStyle = c1; ctx.fillRect(-.5, .64, .5, .14); ctx.fillStyle = c2; ctx.fillRect(0, .64, .5, .14);
          const pairs: [number, string][] = [[-.25, c1], [.25, c2]];
          for (const [lx, c] of pairs) {
            g = ctx.createRadialGradient(lx, .72, .02, lx, .72, 2.2); g.addColorStop(0, c + 'cc'); g.addColorStop(1, c + '00');
            ctx.fillStyle = g; ctx.fillRect(lx - 2.2, -1.5, 4.4, 4.4);
          }
        }
        ctx.globalCompositeOperation = 'source-over'; ctx.restore();
      }

      function palm(x: number, y: number, sc: number, t: number) {
        ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.strokeStyle = '#1a0f26'; ctx.lineWidth = .35; ctx.lineCap = 'round'; ctx.beginPath();
        ctx.moveTo(0, 0); ctx.quadraticCurveTo(.5, 2.2, .2, 4.4); ctx.stroke();
        ctx.strokeStyle = '#143a2e'; ctx.lineWidth = .2;
        for (let k = 0; k < 7; k++) {
          const an = -Math.PI / 2 + (k - 3) * .5 + Math.sin(t * 1.2 + k) * .03; ctx.beginPath(); ctx.moveTo(.2, 4.4);
          ctx.quadraticCurveTo(.2 + Math.cos(an) * 1.5, 4.4 - Math.sin(an) * -1.4 + .7, .2 + Math.cos(an) * 2.5, 4.4 + Math.sin(an) * 2.5 - 1.4);
          ctx.stroke();
        }
        ctx.restore();
      }

      function lamp(x: number, y: number, sc: number, pal: number[], fl: number) {
        ctx.fillStyle = '#120c1e'; ctx.fillRect(x - 1.5 * sc, y - 5.5 * sc, 3 * sc, 5.5 * sc); ctx.fillRect(x - 1.5 * sc, y - 5.5 * sc, 10 * sc, 3 * sc);
        const g = ctx.createRadialGradient(x + 7 * sc, y - 5.2 * sc, 1, x + 7 * sc, y - 5.2 * sc, 60 * sc);
        g.addColorStop(0, rgb(pal, .6 * fl)); g.addColorStop(1, rgb(pal, 0)); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g; ctx.fillRect(x - 60 * sc, y - 65 * sc, 140 * sc, 130 * sc); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = rgb(pal); ctx.fillRect(x + 5 * sc, y - 5.5 * sc, 5 * sc, 1.5 * sc);
      }

      function drawPickup(p: any, X: number, Y: number, k: number, t: number) {
        if (p.t === 'coin') {
          const sw = Math.abs(Math.cos(t * 5 + p.x * .4)), rx = k * .42 * (.25 + .75 * sw), ry = k * .42;
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,211,107,.2)'; ctx.beginPath(); ctx.arc(X, Y, k * .8, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(X - rx * .15, Y - ry * .15, rx * .55, ry * .55, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = '#b8801a'; ctx.lineWidth = Math.max(1, k * .05); ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, 7); ctx.stroke(); return;
        }
        const nit = p.t === 'nitro', col = nit ? '55,230,255' : '255,60,160';
        ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(X, Y, 2, X, Y, k * 2.4);
        gg.addColorStop(0, `rgba(${col},.55)`); gg.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = gg; ctx.fillRect(X - k * 2.4, Y - k * 2.4, k * 4.8, k * 4.8); ctx.globalCompositeOperation = 'source-over';
        if (nit) {
          ctx.fillStyle = '#1a5fd6'; ctx.fillRect(X - k * .42, Y - k * .7, k * .84, k * 1.4); ctx.fillStyle = '#37e6ff'; ctx.fillRect(X - k * .42, Y - k * .7, k * .2, k * 1.4);
          ctx.fillStyle = '#d9faff'; ctx.fillRect(X - k * .2, Y - k * .98, k * .4, k * .3);
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(X + k * .08, Y - k * .5); ctx.lineTo(X - k * .2, Y + k * .02); ctx.lineTo(X, Y + k * .02); ctx.lineTo(X - k * .08, Y + k * .5); ctx.lineTo(X + k * .2, Y - k * .06); ctx.lineTo(X, Y - k * .06); ctx.closePath(); ctx.fill();
        } else {
          ctx.fillStyle = '#ff2d95'; ctx.fillRect(X - k * .62, Y - k * .75, k * .5, k * 1.35); ctx.fillRect(X + k * .12, Y - k * .75, k * .5, k * 1.35);
          ctx.fillStyle = '#ffd36b'; ctx.fillRect(X - k * .62, Y + k * .6, k * .5, k * .2); ctx.fillRect(X + k * .12, Y + k * .6, k * .5, k * .2);
          ctx.fillStyle = '#ffd36b'; ctx.fillRect(X - k * .62, Y - k * .55, k * .5, k * .1); ctx.fillRect(X + k * .12, Y - k * .55, k * .5, k * .1);
          ctx.fillStyle = '#2b1d52'; ctx.fillRect(X - k * .12, Y - k * .55, k * .24, k * .95);
          ctx.globalCompositeOperation = 'lighter'; const fl = .5 + Math.sin(t * 40) * .15; ctx.fillStyle = 'rgba(255,180,70,.85)';
          for (const sx0 of [-.37, .37]) { ctx.beginPath(); ctx.moveTo(X + k * (sx0 - .2), Y + k * .8); ctx.lineTo(X + k * (sx0 + .2), Y + k * .8); ctx.lineTo(X + k * sx0, Y + k * (.8 + fl * 1.4)); ctx.closePath(); ctx.fill(); }
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.font = `900 ${Math.max(10, k * .46)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = nit ? '#9be7ff' : '#ffb3dd';
        ctx.fillText(nit ? 'NITRO' : 'JETPACK', X, Y - k * 1.35); ctx.textAlign = 'left';
      }

      function draw(Wd: any, cam: any, o: any) {
        build();
        const T = Wd.T, c = Wd.car, ppm = Math.min(H / 14, W / 17) * cam.zoom, SX = W * .34, SY = H * .62, t = o.time;
        const sx = (x: number) => SX + (x - cam.x) * ppm + cam.ox, sy = (y: number) => SY - (y - cam.y) * ppm + cam.oy;
        const fs = stageF(cam.x), i0 = Math.min(3, Math.floor(fs)), fr = i0 >= 3 ? 0 : fs - i0, i1 = Math.min(3, i0 + 1);
        const top = mixPal('top', i0, fr), bot = mixPal('bot', i0, fr), road = mixPal('road', i0, fr), grd = mixPal('grd', i0, fr), edge = mixPal('edge', i0, fr), sun = mixPal('sun', i0, fr), nearC = mixPal('near', i0, fr);
        const hy = H * .55;

        // sky
        let g = ctx.createLinearGradient(0, 0, 0, hy + 40 * s); g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        // stars
        const starsA = clamp((fs - .9) / 1.1, 0, 1);
        if (starsA > 0) {
          ctx.fillStyle = '#fff';
          for (let i = 0; i < 70; i++) {
            ctx.globalAlpha = starsA * (.3 + .7 * hash(i * 5 + 2)) * (.7 + .3 * Math.sin(t * 2 + i));
            ctx.fillRect(hash(i * 3 + 1) * W, hash(i * 7 + 4) * hy * .8, 1.6, 1.6);
          }
          ctx.globalAlpha = 1;
        }

        // sun / moon
        const sunA = lerp([1, .6, .3, .2][i0], [1, .6, .3, .2][i1], fr);
        ctx.globalCompositeOperation = 'lighter'; g = ctx.createRadialGradient(W * .7, hy - 30 * s, 5, W * .7, hy - 30 * s, 170 * s);
        g.addColorStop(0, rgb(sun, .9 * sunA)); g.addColorStop(.35, rgb(sun, .35 * sunA)); g.addColorStop(1, rgb(sun, 0));
        ctx.fillStyle = g; ctx.fillRect(W * .7 - 180 * s, hy - 210 * s, 360 * s, 360 * s); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = rgb(sun, .95 * sunA); ctx.beginPath(); ctx.arc(W * .7, hy - 30 * s, 46 * s, 0, 7); ctx.fill();

        // parallax skyline
        const F = [.06, .18, .4], OFF = [0, 22, 50], stripW = 1024 * s, stripH = 340 * s, base0 = H / 14;
        for (let l = 0; l < 3; l++) {
          const by = hy + OFF[l] * s - cam.y * base0 * F[l] * .12;
          let xo = -(((cam.x * base0 * F[l]) % stripW) + stripW) % stripW;
          ctx.globalAlpha = 1; for (let x = xo; x < W; x += stripW) ctx.drawImage(strips[i0][l], x, by - stripH, stripW + 1, stripH);
          if (fr > 0 && i1 !== i0) { ctx.globalAlpha = fr; for (let x = xo; x < W; x += stripW) ctx.drawImage(strips[i1][l], x, by - stripH, stripW + 1, stripH); ctx.globalAlpha = 1; }
          if (l === 2) { ctx.fillStyle = rgb(nearC); ctx.fillRect(0, by - 1, W, H); }
        }

        // terrain & props
        const x0 = cam.x - (SX + 20) / ppm, x1 = cam.x + (W - SX + 20) / ppm;
        const STEPPX = 8; const n = Math.ceil(W / STEPPX) + 4;

        for (const d of T.deco) {
          if (d.t === 'bridge' && d.x1 > x0 && d.x0 < x1) {
            const l = sx(d.x0), r = sx(d.x1), ty = sy(T.heightSolid((d.x0 + d.x1) / 2));
            ctx.fillStyle = '#0a1a2e'; ctx.fillRect(l, ty + ppm * .7, r - l, H);
          }
        }

        {
          let run: any = null;
          for (let i = 0; i < n; i++) {
            const px = i * STEPPX - STEPPX, wx = cam.x + (px - SX - cam.ox) / ppm; const pit = T.inPit(wx);
            if (pit && !run) run = { a: px, lv: T.level(wx) };
            if (!pit && run) {
              const gy = sy(run.lv - 2.2); const gw = ctx.createLinearGradient(0, gy, 0, H);
              gw.addColorStop(0, rgb(mixC(bot, [0, 20, 50], .5))); gw.addColorStop(1, '#020611');
              ctx.fillStyle = gw; ctx.fillRect(run.a, gy, px - run.a, H); run = null;
            }
          }
          if (run) { const gy = sy(run.lv - 2.2); ctx.fillStyle = '#04101f'; ctx.fillRect(run.a, gy, W, H); }
        }

        const pts: any[] = [];
        for (let i = 0; i < n; i++) {
          const px = i * STEPPX - STEPPX, wx = cam.x + (px - SX - cam.ox) / ppm;
          pts.push([px, sy(T.heightAt(wx)), T.inPit(wx), wx]);
        }
        g = ctx.createLinearGradient(0, H * .6, 0, H); g.addColorStop(0, rgb(mixC(grd, [255, 255, 255], .04))); g.addColorStop(1, rgb(mixC(grd, [0, 0, 0], .6))); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(pts[0][0], H + 30); for (const p of pts) ctx.lineTo(p[0], Math.min(p[1], H + 30)); ctx.lineTo(pts[pts.length - 1][0], H + 30); ctx.closePath(); ctx.fill();

        for (const d of T.deco) {
          if (d.t === 'bridge' && d.x1 > x0 && d.x0 < x1) {
            const l = sx(d.x0), r = sx(d.x1), ty = sy(T.heightSolid(d.x0)), by = ty + ppm * .7;
            const gw = ctx.createLinearGradient(0, by, 0, H); gw.addColorStop(0, rgb(mixC(bot, [0, 20, 50], .55))); gw.addColorStop(1, '#030814');
            ctx.fillStyle = gw; ctx.fillRect(l, by, r - l, H);
            ctx.fillStyle = '#0d1c33'; for (let px = d.x0 + 4; px < d.x1; px += 12) { const pxs = sx(px); ctx.fillRect(pxs - ppm * .5, by, ppm, H); }
            ctx.fillStyle = '#0d1c33'; ctx.fillRect(l, ty + ppm * .28, r - l, ppm * .5);
          }
        }

        for (const d of T.deco) {
          if (d.t === 'deck' && d.x1 > x0 && d.x0 < x1) {
            const cols = ['#c2452f', '#2d6aa3', '#d19b2a', '#3a8a5c']; let k = 0;
            for (let lvl = d.base; lvl < d.top - .1; lvl += 2.6) {
              for (let xx = d.x0 - 3; xx < d.x1 + 3; xx += 6.2) {
                ctx.fillStyle = cols[(Math.floor(xx / 6.2) + k * 2 + 4000) % 4];
                const bx = sx(xx), by = sy(lvl + 2.6); ctx.fillRect(bx, by, 6.1 * ppm, 2.55 * ppm);
                ctx.fillStyle = 'rgba(0,0,0,.28)'; for (let r2 = 1; r2 < 6; r2++) ctx.fillRect(bx + r2 * ppm, by, ppm * .08, 2.55 * ppm);
              }
              k++;
            }
          }
        }

        const ps = Math.floor(x0 / 9) - 1, pe = Math.floor(x1 / 9) + 1;
        function propInfo(i: number) {
          const r = hash(i * 3 + 1); if (r < .35) return null;
          const r2 = hash(i * 3 + 2), r3 = hash(i * 3 + 3), x = i * 9 + hash(i) * 6, s2 = stageOf(x); let ty: string;
          if (s2 === 0) ty = r2 < .6 ? 'palm' : r2 < .8 ? 'lamp' : 'sign';
          else if (s2 === 1) ty = r2 < .3 ? 'palm' : r2 < .6 ? 'lamp' : 'sign';
          else if (s2 === 2) ty = r2 < .4 ? 'crates' : r2 < .7 ? 'lamp' : 'pipes';
          else ty = r2 < .5 ? 'lamp' : r2 < .8 ? 'barrier' : 'wreck';
          return { x, ty, front: r3 < .35, r2 };
        }

        const pal2 = PR[i0].neon;
        function drawProp(p: any, front: boolean) {
          const gy = T.heightSolid(p.x) + (front ? -1.15 : .95); if (T.inPit(p.x)) return;
          const X = sx(p.x), Y = sy(gy), k = front ? 1.15 : .85, sc = ppm * (front ? 1.15 : .85);
          let inBridge = false;
          for (const d of T.deco) if (d.t === 'bridge' && p.x > d.x0 - 3 && p.x < d.x1 + 3) { inBridge = true; break; }
          if (inBridge) return;
          switch (p.ty) {
            case 'palm': ctx.save(); ctx.translate(X, Y); ctx.scale(sc, -sc); palm(0, 0, 1, t); ctx.restore(); break;
            case 'lamp': lamp(X, Y, ppm * k / 12, mixC(pal2.length ? hex(pal2[1]) : [255, 255, 255], [255, 255, 255], .3), .8 + .2 * Math.sin(t * 20 + p.x)); break;
            case 'sign': {
              const w = ppm * 2.6 * k, h = ppm * 1.4 * k, cc = hex(pal2[(p.r2 * 3 | 0) % 3]); ctx.fillStyle = '#120c1e'; ctx.fillRect(X - ppm * .1, Y - ppm * 3.4 * k, ppm * .2, ppm * 3.4 * k);
              ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgb(cc, .28); ctx.fillRect(X - w / 2 - 8, Y - ppm * 3.4 * k - h - 8, w + 16, h + 16); ctx.globalCompositeOperation = 'source-over';
              ctx.fillStyle = rgb(cc); ctx.fillRect(X - w / 2, Y - ppm * 3.4 * k - h, w, h * .22); ctx.fillRect(X - w / 2, Y - ppm * 3.4 * k - h * .6, w, h * .22); ctx.fillRect(X - w / 2, Y - ppm * 3.4 * k - h * .2, w * .6, h * .2); break;
            }
            case 'crates': ctx.fillStyle = '#6b4a2a'; ctx.fillRect(X - ppm * .8 * k, Y - ppm * 1.4 * k, ppm * 1.6 * k, ppm * 1.4 * k); ctx.fillRect(X - ppm * .5 * k, Y - ppm * 2.6 * k, ppm * 1.2 * k, ppm * 1.2 * k); ctx.strokeStyle = '#2b1a0c'; ctx.lineWidth = 2; ctx.strokeRect(X - ppm * .8 * k, Y - ppm * 1.4 * k, ppm * 1.6 * k, ppm * 1.4 * k); break;
            case 'pipes': ctx.fillStyle = '#394b63'; ctx.fillRect(X - ppm * 2 * k, Y - ppm * 1.0 * k, ppm * 4 * k, ppm * .6 * k); ctx.fillRect(X - ppm * 1.6 * k, Y - ppm * 1.6 * k, ppm * 3.2 * k, ppm * .6 * k); ctx.fillStyle = '#ffb347'; ctx.fillRect(X - ppm * 2 * k, Y - ppm * .4 * k, ppm * 4 * k, ppm * .12 * k); break;
            case 'barrier': ctx.fillStyle = '#ff2d55'; ctx.fillRect(X - ppm * 1.2 * k, Y - ppm * .9 * k, ppm * 2.4 * k, ppm * .9 * k); ctx.fillStyle = '#fff'; for (let q = 0; q < 4; q++) ctx.fillRect(X - ppm * 1.2 * k + q * ppm * .6 * k, Y - ppm * .9 * k, ppm * .25 * k, ppm * .9 * k); break;
            case 'wreck': ctx.fillStyle = '#1a0f1e'; ctx.fillRect(X - ppm * 1.6 * k, Y - ppm * .9 * k, ppm * 3.2 * k, ppm * .9 * k); ctx.fillStyle = '#ff2d55'; ctx.globalAlpha = .5 + .5 * Math.sin(t * 9 + p.x); ctx.fillRect(X - ppm * .2, Y - ppm * 1.1 * k, ppm * .4, ppm * .2); ctx.globalAlpha = 1; break;
          }
        }
        for (let i = ps; i <= pe; i++) { const p = propInfo(i); if (p && !p.front) drawProp(p, false); }

        for (const d of T.deco) {
          if (d.t === 'arch' && d.x > x0 - 8 && d.x < x1 + 8) {
            const X = sx(d.x), gy = T.heightSolid(d.x), Y = sy(gy), cc = hex(PAL[d.st].neon[0]), c2 = hex(PAL[d.st].neon[1]);
            ctx.fillStyle = '#120c1e'; ctx.fillRect(X - ppm * 6.5, Y - ppm * 7, ppm * .7, ppm * 7); ctx.fillRect(X + ppm * 5.8, Y - ppm * 7, ppm * .7, ppm * 7); ctx.fillRect(X - ppm * 6.5, Y - ppm * 7.6, ppm * 13, ppm * 1.1);
            ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgb(cc, .25); ctx.fillRect(X - ppm * 7, Y - ppm * 8.4, ppm * 14, ppm * 2.8); ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = rgb(cc); ctx.fillRect(X - ppm * 6.5, Y - ppm * 7.6, ppm * 13, ppm * .12); ctx.fillStyle = rgb(c2); ctx.fillRect(X - ppm * 6.5, Y - ppm * 6.7, ppm * 13, ppm * .1);
            ctx.font = `italic 800 ${Math.max(10, ppm * .62)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
            ctx.fillText((d.st === 0 ? 'VICE CITY RUN — ' : '') + STAGES[d.st].toUpperCase(), X, Y - ppm * 6.95); ctx.textAlign = 'left';
          }
        }

        ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; ctx.strokeStyle = rgb(road); ctx.lineWidth = ppm * .6; ctx.beginPath();
        let pen = false; for (const p of pts) { if (p[2]) { pen = false; continue; } const yy = p[1] + ppm * .3; if (!pen) { ctx.moveTo(p[0], yy); pen = true; } else ctx.lineTo(p[0], yy); } ctx.stroke();

        ctx.strokeStyle = rgb(edge); ctx.lineWidth = Math.max(2, ppm * .09); ctx.globalAlpha = .95; ctx.beginPath(); pen = false;
        for (const p of pts) { if (p[2]) { pen = false; continue; } if (!pen) { ctx.moveTo(p[0], p[1]); pen = true; } else ctx.lineTo(p[0], p[1]); } ctx.stroke();
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .25; ctx.lineWidth = ppm * .35; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

        ctx.setLineDash([ppm * 2.4, ppm * 3.2]); ctx.lineDashOffset = -(((-cam.x * ppm) % (ppm * 5.6))); ctx.strokeStyle = 'rgba(255,230,140,.75)'; ctx.lineWidth = Math.max(1.5, ppm * .07);
        ctx.beginPath(); pen = false; for (const p of pts) { if (p[2]) { pen = false; continue; } const yy = p[1] + ppm * .32; if (!pen) { ctx.moveTo(p[0], yy); pen = true; } else ctx.lineTo(p[0], yy); } ctx.stroke(); ctx.setLineDash([]);

        for (const ob of T.obs) {
          if (ob.dead || ob.x < x0 - 6 || ob.x > x1 + 6) continue;
          const X = sx(ob.x), Y = sy(ob.y), w = ob.w * ppm, h = ob.h * ppm;
          if (ob.t === 'cone') { ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(X - w / 2, Y); ctx.lineTo(X + w / 2, Y); ctx.lineTo(X, Y - h); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(X - w * .25, Y - h * .45, w * .5, h * .12); }
          else if (ob.t === 'barrel') { ctx.fillStyle = '#d6362f'; ctx.fillRect(X - w / 2, Y - h, w, h); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(X - w / 2, Y - h * .65, w, h * .14); ctx.fillRect(X - w / 2, Y - h * .3, w, h * .14); }
          else if (ob.t === 'barrier') {
            ctx.fillStyle = '#1a1a22'; ctx.fillRect(X - w / 2, Y - h, w, h); ctx.fillStyle = '#ffd23a';
            for (let q = 0; q < 6; q++) { ctx.beginPath(); ctx.moveTo(X - w / 2 + q * w / 6, Y); ctx.lineTo(X - w / 2 + q * w / 6 + w / 12, Y); ctx.lineTo(X - w / 2 + q * w / 6 + w / 6, Y - h); ctx.lineTo(X - w / 2 + q * w / 6 + w / 12, Y - h); ctx.fill(); }
            ctx.strokeStyle = '#ff2d55'; ctx.lineWidth = 2; ctx.strokeRect(X - w / 2, Y - h, w, h);
          } else if (ob.t === 'car') {
            drawVehicle(ppm, X, Y - .86 * ppm * .93, Math.atan(T.slopeAt(ob.x)), [.4, .4], 0, { c1: '#7e8aa6', c2: '#3a4258', glow: '#ffb347', police: false }, t, false, 1, false);
          } else if (ob.t === 'police') {
            drawVehicle(ppm, X, Y - .86 * ppm * .93, Math.atan(T.slopeAt(ob.x)), [.4, .4], t * -ob.vx, { c1: '#f2f5ff', c2: '#2a3f9a', glow: '#2f6bff', police: true, ph: 1 }, t, false, -1, false);
          }
        }

        for (const p of T.pick) {
          if (p.got || p.x < x0 - 4 || p.x > x1 + 4) continue;
          drawPickup(p, sx(p.x), sy(p.y + Math.sin(t * 4 + p.x * .5) * .15), ppm, t);
        }

        const P = Wd.pol, pstyle = { c1: '#f2f5ff', c2: '#2a3f9a', glow: '#2f6bff', police: true, ph: 0, beam: true };
        for (let i = 0; i < 3; i++) {
          const u = P.units[i]; if (!u.on) continue; const px = i === 0 ? P.x : P.x - u.off;
          const X = sx(px); if (X < -ppm * 6 || X > W + ppm * 6) continue; const gy = T.heightSolid(px) + .86;
          drawVehicle(ppm, X, sy(gy), Math.atan(T.slopeAt(px)), [.4, .4], px / .36, { ...pstyle, ph: i }, t, false, 1, false);
        }

        {
          const gh = T.heightSolid(c.x), hgt = Math.max(0, c.y - gh - .8), al = clamp(.5 - hgt * .06, .08, .5);
          ctx.save(); ctx.translate(sx(c.x), sy(gh) + ppm * .05); ctx.rotate(-Math.atan(T.slopeAt(c.x))); ctx.scale(1, .18);
          ctx.fillStyle = `rgba(0,0,0,${al})`; ctx.beginPath(); ctx.arc(0, 0, ppm * (2.2 - Math.min(hgt, 6) * .12), 0, 7); ctx.fill(); ctx.restore();
        }

        drawVehicle(ppm, sx(c.x), sy(c.y), c.a, c.drop, c.wr, { c1: '#ff2d95', c2: '#5b1fd6', glow: '#37e6ff', police: false, beam: fs > .7 }, t, c.nitroOn && c.alive, 1, c.jetT > 0 && c.alive);

        for (const q of FX.p) {
          const k = q.life / q.max; ctx.globalCompositeOperation = q.add ? 'lighter' : 'source-over'; ctx.globalAlpha = k; ctx.fillStyle = q.col;
          const X = sx(q.x), Y = sy(q.y), z = q.size * ppm * (q.add ? k : 1); ctx.fillRect(X - z / 2, Y - z / 2, z, z);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

        for (let i = ps; i <= pe; i++) { const p = propInfo(i); if (p && p.front) drawProp(p, true); }

        if ((c.nitroOn || c.jetT > 0) && c.alive && !o.reduced) {
          ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = c.jetT > 0 ? 'rgba(255,150,220,.45)' : 'rgba(120,230,255,.5)'; ctx.lineWidth = 2;
          for (let i = 0; i < 14; i++) {
            const yy = hash(i * 11 + Math.floor(t * 30)) * H, xx = hash(i * 17 + Math.floor(t * 40)) * W, l = 60 + hash(i) * 140;
            ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - l, yy); ctx.stroke();
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        if (o.tier > 0 && Wd.car.alive !== undefined) {
          const ph = Math.sin(t * 9) > 0; const a = .05 * o.tier;
          ctx.fillStyle = ph ? `rgba(255,40,70,${a})` : `rgba(47,107,255,${a})`; ctx.fillRect(ph ? 0 : W * .5, 0, W * .5, H);
        }
        g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H/ 2, Math.max(W, H) * .75);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (Wd.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Wd.flash * .45})`; ctx.fillRect(0, 0, W, H); }
        return { sx, sy, ppm };
      }
      return { resize, draw, build };
    }

    /* ---------- audio ---------- */
    function createAudio() {
      let ac: AudioContext | null = null, master: GainNode, eng: OscillatorNode, eng2: OscillatorNode, engF: BiquadFilterNode, engG: GainNode, nit: AudioBufferSourceNode, nitG: GainNode, sir: OscillatorNode, sirG: GainNode, noiseBuf: AudioBuffer, muted = false;
      return {
        init() {
          if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
          const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return;
          try {
            const ctx: AudioContext = new AC();
            ac = ctx;
            master = ctx.createGain(); master.gain.value = muted ? 0 : .45; master.connect(ctx.destination);
            engF = ctx.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 500; engG = ctx.createGain(); engG.gain.value = 0;
            eng = ctx.createOscillator(); eng.type = 'sawtooth'; eng2 = ctx.createOscillator(); eng2.type = 'square'; const g2 = ctx.createGain(); g2.gain.value = .4;
            eng.connect(engF); eng2.connect(g2); g2.connect(engF); engF.connect(engG); engG.connect(master); eng.start(); eng2.start();
            noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            nit = ctx.createBufferSource(); nit.buffer = noiseBuf; nit.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = .6;
            nitG = ctx.createGain(); nitG.gain.value = 0; nit.connect(bp); bp.connect(nitG); nitG.connect(master); nit.start();
            sir = ctx.createOscillator(); sir.type = 'square'; sir.frequency.value = 820; const lfo = ctx.createOscillator(); lfo.frequency.value = 1.7; const lg = ctx.createGain(); lg.gain.value = 190;
            lfo.connect(lg); lg.connect(sir.frequency); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; sirG = ctx.createGain(); sirG.gain.value = 0;
            sir.connect(lp); lp.connect(sirG); sirG.connect(master); sir.start(); lfo.start();
          } catch (e) { ac = null; }
        },
        update(speed: number, nitroOn: boolean, press: number, running: boolean) {
          if (!ac) return; const T = ac.currentTime;
          engG.gain.setTargetAtTime(running ? .07 + Math.min(speed, 60) / 60 * .06 : 0, T, .08);
          const f = 48 + Math.max(0, speed) * 3.0 + (nitroOn ? 30 : 0);
          eng.frequency.setTargetAtTime(f, T, .06); eng2.frequency.setTargetAtTime(f * .5, T, .06); engF.frequency.setTargetAtTime(350 + speed * 24, T, .1);
          nitG.gain.setTargetAtTime(running && nitroOn ? .1 : 0, T, .05);
          sirG.gain.setTargetAtTime(running ? press * .028 : 0, T, .2);
        },
        tone(f: number, d: number, type?: OscillatorType, v?: number, slide?: number) {
          if (!ac || muted) return; const T = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
          o.type = type || 'square'; o.frequency.setValueAtTime(f, T);
          if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), T + d);
          g.gain.setValueAtTime(v || .15, T); g.gain.exponentialRampToValueAtTime(.0001, T + d);
          o.connect(g); g.connect(master); o.start(T); o.stop(T + d + .02);
        },
        noise(d: number, v?: number, fq?: number) {
          if (!ac || muted) return; const T = ac.currentTime, s = ac.createBufferSource(); s.buffer = noiseBuf;
          const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(fq || 2000, T);
          f.frequency.exponentialRampToValueAtTime(100, T + d); const g = ac.createGain(); g.gain.setValueAtTime(v || .4, T);
          g.gain.exponentialRampToValueAtTime(.0001, T + d); s.connect(f); f.connect(g); g.connect(master); s.start(T); s.stop(T + d + .02);
        },
        sfx(k: string) {
          switch (k) {
            case 'crash': this.noise(.7, .7, 3000); this.tone(120, .5, 'sawtooth', .3, 30); break;
            case 'rough': this.noise(.2, .35, 1200); break; case 'land': this.noise(.12, .2, 900); break;
            case 'clean': this.tone(660, .1, 'triangle', .18, 990); setTimeout(() => this.tone(990, .12, 'triangle', .18, 1320), 70); break;
            case 'near': this.tone(900, .12, 'sine', .16, 1500); break; case 'nitro': this.noise(.35, .3, 4000); this.tone(200, .3, 'sawtooth', .12, 500); break;
            case 'knock': this.noise(.15, .3, 1800); break; case 'hit': this.noise(.3, .5, 1500); this.tone(90, .25, 'square', .2, 50); break;
            case 'warn': for (let i = 0; i < 3; i++) setTimeout(() => this.tone(1100, .12, 'square', .14), i * 180); break;
            case 'caught': this.tone(400, .6, 'sawtooth', .25, 80); this.noise(.5, .4, 800); break;
            case 'jump': this.tone(300, .14, 'square', .14, 700); break; case 'ui': this.tone(520, .07, 'square', .1, 780); break; case 'go': this.tone(880, .25, 'square', .15, 1320); break;
            case 'stage': this.tone(440, .1, 'triangle', .18, 880); setTimeout(() => this.tone(660, .15, 'triangle', .18, 1320), 100); break;
            case 'djump': this.tone(460, .12, 'square', .13, 1100); this.noise(.08, .15, 3000); break;
            case 'pnitro': this.tone(500, .1, 'triangle', .2, 900); setTimeout(() => this.tone(900, .16, 'triangle', .2, 1500), 80); break;
            case 'pjet': this.noise(.7, .35, 3500); this.tone(180, .6, 'sawtooth', .18, 800); setTimeout(() => this.tone(600, .2, 'triangle', .18, 1400), 120); break;
            case 'coin': this.tone(1100 + Math.random() * 250, .05, 'sine', .06, 1600); break;
          }
        },
        setMuted(m: boolean) { muted = m; if (ac && master) master.gain.value = m ? 0 : .45; },
        get muted() { return muted; },
        suspend() { if (ac && ac.state === 'running') ac.suspend(); },
        resume() { if (ac && ac.state === 'suspended') ac.resume(); },
        close() { if (ac) { try { ac.close(); } catch (e) {} ac = null; } }
      };
    }

    /* ---------- GameScope Production Backend Adapter ---------- */
    const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch (e) {} };

    class GameScopeAdapter {
      state: string;
      version: number;
      eventId: string;
      online: boolean;
      cbs: Set<any>;
      rcbs: Set<any>;
      queued: boolean;
      exitCb: () => void;
      scoreCb?: (score: number) => void;
      pid: string;
      displayName: string;
      cachedLeaderboard: any[] = [];

      constructor() {
        this.state = streamState;
        this.version = 1;
        this.eventId = 'evt-vice-city-1';
        this.online = true;
        this.cbs = new Set();
        this.rcbs = new Set();
        this.queued = false;
        this.exitCb = onExit;
        this.scoreCb = onScoreSubmitted;

        let savedUser: any = null;
        try {
          const raw = localStorage.getItem('gamescope_live_user');
          if (raw) savedUser = JSON.parse(raw);
        } catch {}

        this.pid = savedUser?.id || lsGet('vcr_pid') || ('usr-' + Math.random().toString(36).slice(2, 8));
        this.displayName = savedUser?.username || ('Operative-' + this.pid.slice(-4));
        lsSet('vcr_pid', this.pid);
      }

      status() { return { eventId: this.eventId, state: this.state, version: this.version, serverTime: Date.now() }; }
      setState(s: string) {
        this.state = s; this.version++;
        if (this.online) this.cbs.forEach(f => f(this.status())); else this.queued = true;
      }
      setOnline(on: boolean) {
        this.online = on;
        if (on) { this.rcbs.forEach(f => f()); if (this.queued) { this.queued = false; } }
      }
      async getIdentity() { return { playerId: this.pid, displayName: this.displayName }; }
      async getEventStatus() { return this.status(); }
      onEventStatus(cb: any) { this.cbs.add(cb); return () => this.cbs.delete(cb); }
      onReconnect(cb: any) { this.rcbs.add(cb); return () => this.rcbs.delete(cb); }

      async startSession() {
        try {
          const res = await api.startArcadeSession(this.pid, this.displayName);
          return res;
        } catch (err: any) {
          return { ok: false, code: 'NETWORK_ERROR' };
        }
      }

      async heartbeat(id: string, _t: any) {
        try {
          const res = await api.arcadeHeartbeat(id);
          return { ok: res.ok, status: this.status() };
        } catch {
          return { ok: false, status: this.status() };
        }
      }

      best() { return +(lsGet('vcr_best_' + this.eventId) || 0); }

      async submitResult(r: any) {
        try {
          const res = await api.submitArcadeRun({
            sessionId: r.sessionId,
            playerId: this.pid,
            playerName: this.displayName,
            distance: r.distance,
            endReason: r.endReason,
            checkpoints: r.checkpoints,
            stats: r.stats,
            clientBuild: r.clientBuild
          });

          if (res.ok) {
            const prev = this.best();
            if (r.distance > prev) lsSet('vcr_best_' + this.eventId, String(r.distance));
            if (this.scoreCb) this.scoreCb(r.distance);
          }
          return res;
        } catch (err: any) {
          // Fallback if offline
          const prev = this.best();
          const isRecord = r.distance > prev;
          if (isRecord) lsSet('vcr_best_' + this.eventId, String(r.distance));
          if (this.scoreCb) this.scoreCb(r.distance);
          return { ok: true, finalDistance: r.distance, personalBest: Math.max(prev, r.distance), rank: null, isRecord };
        }
      }

      async getLeaderboard(n: number) {
        try {
          const res = await api.getArcadeLeaderboard(n);
          if (res.leaderboard && res.leaderboard.length > 0) {
            const myBest = this.best();
            const rows = res.leaderboard.map((item: any, idx: number) => ({
              rank: idx + 1,
              name: item.username,
              distance: item.score,
              me: item.playerId === this.pid || item.username === this.displayName
            }));

            // If user has a best score and isn't on the board, append
            if (myBest > 0 && !rows.some(r => r.me)) {
              rows.push({ rank: rows.length + 1, name: 'You', distance: myBest, me: true });
              rows.sort((a, b) => b.distance - a.distance);
              rows.forEach((r, i) => r.rank = i + 1);
            }

            this.cachedLeaderboard = rows.slice(0, n);
            return this.cachedLeaderboard;
          }
        } catch {}

        return this.cachedLeaderboard.slice(0, n);
      }

      exit() { this.exitCb(); }
    }

    const CSS = `
:host{all:initial}
*{box-sizing:border-box}
.root{position:absolute;inset:0;overflow:hidden;background:#05030c;color:#fff;font-family:'Trebuchet MS',system-ui,-apple-system,Segoe UI,sans-serif;touch-action:none;overscroll-behavior:contain;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.hud{position:absolute;inset:0;pointer-events:none;display:none}
.hud.on{display:block}
.dist{position:absolute;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);font-size:clamp(28px,6vw,56px);font-weight:900;font-style:italic;text-shadow:0 0 18px #ff2d95,0 3px 0 #000;letter-spacing:.02em}
.dist small{font-size:.38em;margin-left:4px;color:#9be7ff}
.stage{position:absolute;top:calc(66px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);font-size:11px;letter-spacing:.2em;color:#ffd36b;text-transform:uppercase;text-shadow:0 0 8px #000;white-space:nowrap}
.left{position:absolute;top:calc(12px + env(safe-area-inset-top));left:calc(14px + env(safe-area-inset-left));width:min(160px,30vw)}
.lbl{font-size:9px;letter-spacing:.2em;color:#b9a9ee;margin:0 0 2px}
.press{display:flex;gap:3px;margin-bottom:8px}.press i{flex:1;height:8px;border-radius:2px;background:#ffffff1c;transition:background .15s,box-shadow .15s}
.press i.on0{background:#37e6ff;box-shadow:0 0 8px #37e6ff}.press i.on1{background:#ffd36b;box-shadow:0 0 8px #ffd36b}.press i.on2{background:#ff8a3a;box-shadow:0 0 8px #ff8a3a}.press i.on3{background:#ff2d55;box-shadow:0 0 10px #ff2d55;animation:pl .4s infinite alternate}
@keyframes pl{to{opacity:.45}}
.bar{height:8px;border-radius:2px;background:#ffffff1c;overflow:hidden}.bar b{display:block;height:100%;width:100%;background:linear-gradient(90deg,#7a2cff,#37e6ff);transform-origin:left;transition:transform .08s}
.bar.jb b{background:linear-gradient(90deg,#ff2d95,#ffd36b)}
#jw{display:none;margin-top:6px}#jw .lbl{color:#ffb3dd}
.spd{position:absolute;top:calc(12px + env(safe-area-inset-top));right:calc(190px + env(safe-area-inset-right));font-weight:800;font-size:16px;text-shadow:0 2px 0 #000}.spd small{font-size:9px;color:#9be7ff;margin-left:2px}
.coins{position:absolute;top:calc(36px + env(safe-area-inset-top));right:calc(190px + env(safe-area-inset-right));font-weight:800;font-size:14px;color:#ffd36b;text-shadow:0 2px 0 #000}
.ib{position:absolute;top:calc(10px + env(safe-area-inset-top));width:38px;height:38px;border-radius:8px;border:1px solid #ffffff44;background:#000a;color:#fff;font-size:15px;pointer-events:auto;cursor:pointer;touch-action:manipulation;display:grid;place-items:center;transition:background .15s,border-color .15s}
.ib:hover{background:#ffffff22;border-color:#fff}
#exitBtn{right:calc(12px + env(safe-area-inset-right));border-color:#ff2d9588;color:#ff2d95}
#exitBtn:hover{background:#ff2d9533;border-color:#ff2d95}
#fsBtn{right:calc(56px + env(safe-area-inset-right));border-color:#37e6ff88;color:#37e6ff}
#fsBtn:hover{background:#37e6ff33;border-color:#37e6ff}
#pauseBtn{right:calc(100px + env(safe-area-inset-right))}
#muteBtn{right:calc(144px + env(safe-area-inset-right))}
.toast{position:absolute;top:32%;left:50%;transform:translate(-50%,0);font-size:clamp(15px,3.2vw,28px);font-weight:900;font-style:italic;text-shadow:0 0 14px currentColor,0 2px 0 #000;opacity:0;white-space:nowrap;max-width:96vw;overflow:hidden;text-overflow:ellipsis}
.toast.show{animation:tt 1.1s ease-out}
@keyframes tt{0%{opacity:0;transform:translate(-50%,10px) scale(.8)}12%{opacity:1;transform:translate(-50%,0) scale(1.05)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-26px)}}
.warn{position:absolute;right:calc(14px + env(safe-area-inset-right));top:42%;padding:6px 10px;background:#ff2d55dd;border-radius:8px;font-weight:900;font-size:12px;letter-spacing:.08em;display:none;animation:pl .25s infinite alternate}
.warn.on{display:block}
.net{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);font-size:11px;color:#ffb347;display:none}.net.on{display:block}
.ready{position:absolute;inset:0;display:none;place-items:center;font-size:clamp(36px,9vw,88px);font-weight:900;font-style:italic;text-shadow:0 0 30px #ff2d95;pointer-events:none}.ready.on{display:grid}

.touch{position:absolute;inset:0;pointer-events:none;display:none;
  --u:clamp(44px,min(13vw,18vh),76px);--g:calc(var(--u)*1.25);--m:10px;
  --sl:env(safe-area-inset-left);--sr:env(safe-area-inset-right);--sb:env(safe-area-inset-bottom)}
.touch.on{display:block}
.tb{position:absolute;pointer-events:auto;border-radius:50%;border:2px solid #ffffff66;background:#10082aa6;color:#fff;font-weight:900;display:grid;place-items:center;touch-action:none;font-size:clamp(10px,calc(var(--u)*.17),14px);letter-spacing:.04em;box-shadow:0 0 16px #7a2cff55 inset;width:var(--u);height:var(--u);padding:0;text-align:center;line-height:1.1;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}
.tb.p{background:#ff2d95cc;border-color:#fff;transform:scale(.94)}
.tb small{display:block;font-size:.8em;opacity:.8}
#tBack{left:calc(var(--m) + var(--sl));bottom:calc(var(--m) + var(--sb))}
#tFwd{left:calc(var(--m)*2 + var(--u) + var(--sl));bottom:calc(var(--m) + var(--sb))}
#tBrk{left:calc(var(--m) + var(--sl));bottom:calc(var(--m)*2 + var(--u) + var(--sb))}
#tGas{right:calc(var(--m) + var(--sr));bottom:calc(var(--m) + var(--sb));width:var(--g);height:var(--g);font-size:clamp(12px,calc(var(--u)*.22),17px)}
#tJmp{right:calc(var(--m)*2 + var(--g) + var(--sr));bottom:calc(var(--m) + var(--sb));border-color:#ffd36b;color:#ffd36b}
#tNit{right:calc(var(--m) + var(--sr));bottom:calc(var(--m)*2 + var(--g) + var(--sb));border-color:#37e6ff;color:#37e6ff}

.screen{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:radial-gradient(900px 500px at 50% 20%,#4a1d8f55,transparent 70%),#06030ccc;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;padding:12px;padding-left:calc(12px + env(safe-area-inset-left));padding-right:calc(12px + env(safe-area-inset-right));-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:#ff2d9555 transparent;scroll-behavior:smooth}
.screen.on{display:flex}
* {scrollbar-width:thin;scrollbar-color:#ff2d9555 transparent;scroll-behavior:smooth}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#ff2d9555;border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:#ff2d95aa}
.card{width:min(520px,100%);margin:auto;text-align:center;box-sizing:border-box}
h1{margin:0;font-size:clamp(28px,min(8vw,10vh),56px);line-height:.95;font-weight:900;font-style:italic;letter-spacing:.01em;background:linear-gradient(180deg,#fff 10%,#ff7ac3 45%,#7a2cff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 18px #ff2d9588)}
.tag{margin:4px 0 10px;color:#9be7ff;letter-spacing:.16em;font-size:clamp(10px,2.2vw,12px);text-transform:uppercase}
.how{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;text-align:left;font-size:11px;color:#d8ccff;background:#ffffff0d;border:1px solid #ffffff1a;border-radius:10px;padding:8px 10px;margin:0 0 10px}
.how kbd,.kb kbd{background:#2a1a55;border:1px solid #6a4ac0;border-radius:4px;padding:1px 4px;font:700 10px monospace;color:#fff}
.btn{appearance:none;border:0;cursor:pointer;font:900 15px 'Trebuchet MS',system-ui,sans-serif;font-style:italic;letter-spacing:.04em;color:#fff;padding:10px 22px;border-radius:10px;background:linear-gradient(90deg,#ff2d95,#7a2cff);box-shadow:0 4px 16px #ff2d9566;touch-action:manipulation;transition:filter .15s;max-width:100%;white-space:normal;word-break:normal;box-sizing:border-box;line-height:1.2}
.btn:hover{filter:brightness(1.12)}.btn:disabled{opacity:.4;cursor:not-allowed;filter:none}
.btn.g{background:#ffffff14;box-shadow:none;border:1px solid #ffffff44;font-size:13px;padding:9px 16px}
.row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px}
.msg{min-height:16px;margin:6px 0 0;color:#ffb347;font-size:12px}
.lb{margin-top:10px;text-align:left;font-size:11.5px;background:#ffffff0a;border-radius:10px;padding:8px 12px;scrollbar-width:thin}
.lb div{display:flex;justify-content:space-between;padding:2px 0;color:#cbbff0}.lb div.me{color:#ffd36b;font-weight:800}.lb h4{margin:0 0 4px;font-size:9.5px;letter-spacing:.18em;color:#9be7ff}
.comp-box{margin:6px auto;padding:6px 12px;background:#ffffff0d;border:1px solid #ffd36b55;border-radius:8px;text-align:center;max-width:320px;box-sizing:border-box}
.comp-title{font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
.comp-msg{font-size:11px;color:#e2d9fc;margin-top:2px;line-height:1.3}
.post-lb{margin-top:6px;max-height:115px;overflow-y:auto;padding:6px 10px;box-sizing:border-box;border:1px solid #ffffff1a}
.big{font-size:clamp(38px,10vw,80px);font-weight:900;font-style:italic;line-height:1;text-shadow:0 0 20px #ff2d95}
.big small{font-size:.3em;color:#9be7ff;margin-left:4px}
.why{font-size:clamp(17px,4vw,24px);font-weight:900;font-style:italic;letter-spacing:.05em;margin-bottom:3px}
.stats{display:flex;gap:12px;justify-content:center;color:#cbbff0;font-size:11px;margin:8px 0}.stats b{display:block;font-size:16px;color:#fff}
.rec{display:inline-block;margin:4px 0;padding:2px 10px;border-radius:99px;background:#ffd36b;color:#2a1a00;font-weight:900;letter-spacing:.1em;animation:pl .5s infinite alternate}

.opts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0 6px}
.opt{appearance:none;cursor:pointer;color:#fff;text-align:center;font-family:inherit;background:#ffffff0f;border:2px solid #ffffff33;border-radius:12px;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;touch-action:manipulation;transition:border-color .15s,background .15s,transform .1s;box-sizing:border-box;max-width:100%}
.opt:hover,.opt:focus-visible{border-color:#37e6ff;background:#37e6ff14;outline:none}
.opt:active{transform:scale(.97)}
.opt:disabled{opacity:.5;cursor:wait}
.opt.sel{border-color:#ff2d95;background:#ff2d9526;box-shadow:0 0 12px #ff2d9555}
.opt .ic{font-size:clamp(22px,5vh,32px);line-height:1}
.opt b{font-size:clamp(12px,2.2vw,15px);font-style:italic;letter-spacing:.04em}
.opt span{font-size:10px;color:#cbbff0;line-height:1.3}
.opt em{font-style:normal;font-size:8px;letter-spacing:.12em;color:#2a1a00;background:#ffd36b;border-radius:99px;padding:2px 6px;font-weight:900;display:none}
.opt.rcm em{display:inline-block}
.kb{font-size:10.5px;color:#d8ccff;line-height:1.5}

@media (max-width:560px){
  .how{display:none}
  .screen{padding:8px}
  .card{width:100%}
  h1{font-size:clamp(26px,7vw,40px)}
  .tag{margin:2px 0 6px;font-size:10px}
  .opts{grid-template-columns:1fr 1fr;gap:6px;margin:6px 0}
  .opt{padding:6px 4px;border-radius:10px;gap:2px}
  .opt .ic{font-size:18px}
  .opt b{font-size:11px}
  .opt span{font-size:9px;line-height:1.2}
  .btn{padding:8px 14px;font-size:12px;letter-spacing:.02em}
  .btn.g{padding:7px 10px;font-size:11px}
  .row{gap:6px;margin-top:8px}
  .stats{margin:4px 0;gap:8px}.stats b{font-size:14px}
  .post-lb{max-height:90px;padding:4px 8px;font-size:10px}
}
@media (max-width:640px){
  .spd{top:calc(56px + env(safe-area-inset-top));right:calc(12px + env(safe-area-inset-right));font-size:14px}
  .coins{top:calc(76px + env(safe-area-inset-top));right:calc(12px + env(safe-area-inset-right));font-size:13px}
  .stage{top:calc(52px + env(safe-area-inset-top));font-size:10px}
  .left{width:min(140px,36vw)}
  .warn{top:34%;font-size:11px;padding:5px 8px}
}
@media (max-height:480px){
  .dist{font-size:24px}
  .stage{top:calc(36px + env(safe-area-inset-top));font-size:9px}
  .left{width:min(120px,22vw)}.lbl{font-size:7px}.press{margin-bottom:3px}.press i,.bar{height:5px}
  .how{display:none}
  .screen{padding-top:4px;padding-bottom:4px}
  .stats{margin:4px 0;gap:8px}.stats b{font-size:13px}
  .row{margin-top:6px}.btn{padding:7px 14px;font-size:12px}
  .post-lb{max-height:75px;overflow-y:auto}
}
@media (pointer:coarse){.how{display:none}}
`;

    function mount(container: HTMLElement, adapter: any) {
      const ac = new AbortController(), sig = { signal: ac.signal };
      const timers = new Set<any>();
      const later = (f: () => void, ms: number) => { const id = setTimeout(() => { timers.delete(id); f(); }, ms); timers.add(id); return id; };
      const every = (f: () => void, ms: number) => { const id = setInterval(f, ms); timers.add(id); return id; };
      const unsubs: (() => void)[] = []; let destroyed = false;

      const shadow = (container as any).shadowRoot || (container.attachShadow ? container.attachShadow({ mode: 'open' }) : container);
      shadow.innerHTML = `<style>${CSS}</style>
      <div class="root" id="root" tabindex="0">
        <canvas id="cv"></canvas>
        <div class="hud" id="hud">
          <div class="dist"><span id="d">0</span><small>m</small></div>
          <div class="stage" id="stg"></div>
          <div class="left">
            <div class="lbl">POLICE PRESSURE</div>
            <div class="press" id="press"><i></i><i></i><i></i><i></i></div>
            <div class="lbl">NITRO</div>
            <div class="bar"><b id="nb"></b></div>
            <div id="jw"><div class="lbl">JETPACK</div><div class="bar jb"><b id="jb"></b></div></div>
          </div>
          <div class="spd"><span id="sp">0</span><small>KM/H</small></div>
          <div class="coins">🪙 <span id="cn">0</span></div>
          <button class="ib" id="muteBtn" aria-label="Mute">🔊</button>
          <button class="ib" id="pauseBtn" aria-label="Pause">❚❚</button>
          <button class="ib" id="fsBtn" aria-label="Fullscreen" title="Toggle Fullscreen">⛶</button>
          <button class="ib" id="exitBtn" aria-label="Exit Arcade" title="Return to Stream">✕</button>
          <div class="toast" id="toast"></div>
          <div class="warn" id="warn">⚠ ROADBLOCK AHEAD</div>
          <div class="net" id="net">Reconnecting to GameScope…</div>
          <div class="ready" id="ready"></div>
        </div>
        <div class="touch" id="touch">
          <button class="tb" id="tBack" aria-label="Tilt back">⟲<small>BACK</small></button>
          <button class="tb" id="tFwd" aria-label="Tilt forward">⟳<small>FWD</small></button>
          <button class="tb" id="tBrk" aria-label="Brake">BRAKE</button>
          <button class="tb" id="tGas" aria-label="Accelerate">GAS</button>
          <button class="tb" id="tNit" aria-label="Nitro">NITRO</button>
          <button class="tb" id="tJmp" aria-label="Jump"><span>JUMP<small>tap ×2</small></span></button>
        </div>
        <div class="screen on" id="sMenu"><div class="card">
          <h1>VICE CITY<br>RUN</h1><div class="tag">Escape the City. Beat the Chase.</div>
          <div class="how" id="how">
            <div><kbd>W</kbd> / <kbd>↑</kbd> Accelerate</div><div><kbd>S</kbd> / <kbd>↓</kbd> Brake / reverse</div>
            <div><kbd>A</kbd> Tilt back (nose up)</div><div><kbd>D</kbd> Tilt forward (nose down)</div>
            <div><kbd>SPACE</kbd> Nitro</div><div><kbd>SHIFT</kbd>/<kbd>J</kbd> Jump — tap again in air = <b>double jump</b></div>
            <div><kbd>P</kbd> Pause &nbsp; <kbd>M</kbd> Mute</div><div>Jetpack: <kbd>A</kbd> fly higher, <kbd>D</kbd> lower</div>
          </div>
          <div style="color:#d8ccff;font-size:clamp(11px,2.2vw,12.5px);margin-bottom:6px">Outrun the police pursuit. Grab <b style="color:#9be7ff">nitro canisters</b>, <b style="color:#ff9ad0">jetpacks</b> and coins. Land clean to stay ahead.</div>
          <div class="row">
            <button class="btn" id="bPlay">START RUN</button>
            <button class="btn g" id="bExit1">RETURN TO STREAM</button>
          </div>
          <div class="msg" id="mMsg"></div>
        </div></div>
        <div class="screen" id="sCtrl"><div class="card">
          <div class="why" style="color:#ffd36b">CHOOSE YOUR CONTROLS</div>
          <div class="tag" style="margin-bottom:6px">Pick how you want to play — the run starts right after</div>
          <div class="opts">
            <button class="opt" id="oTouch"><div class="ic">👆</div><div class="t"><b>TOUCH BUTTONS</b><span>On-screen GAS, BRAKE, tilt, JUMP &amp; NITRO</span></div><em>RECOMMENDED</em></button>
            <button class="opt" id="oKey"><div class="ic">⌨️</div><div class="t"><b>KEYBOARD</b><span class="kb"><kbd>W</kbd><kbd>S</kbd> drive · <kbd>A</kbd><kbd>D</kbd> tilt<br><kbd>SPACE</kbd> nitro · <kbd>SHIFT</kbd> jump</span></div><em>RECOMMENDED</em></button>
          </div>
          <div class="msg" id="cHint" style="color:#d8ccff;font-size:11.5px;min-height:16px"></div>
          <div class="row"><button class="btn g" id="bCBack">BACK</button></div>
        </div></div>
        <div class="screen" id="sPause"><div class="card"><div class="big" style="font-size:clamp(36px,8vw,52px)">PAUSED</div><div class="msg" id="pMsg" style="color:#d8ccff"></div>
          <div class="row">
            <button class="btn" id="bResume">RESUME</button>
            <button class="btn g" id="bQuit">END RUN</button>
            <button class="btn g" id="bExit3">EXIT ARCADE</button>
          </div></div></div>
        <div class="screen" id="sOver"><div class="card">
          <div class="why" id="oWhy"></div><div class="big"><span id="oDist">0</span><small>m</small></div>
          <div class="rec" id="oRec" style="display:none">★ NEW RECORD ★</div>
          <div class="stats"><div><b id="oBest">–</b>BEST</div><div><b id="oRank">–</b>EVENT RANK</div><div><b id="oJump">0</b>LONGEST JUMP</div></div>
          <div class="stats" style="margin-top:2px"><div><b id="oClean">0</b>CLEAN LANDINGS</div><div><b id="oNear">0</b>NEAR MISSES</div><div><b id="oCoin">0</b>COINS</div></div>
          
          <div class="comp-box" id="oComp">
            <div class="comp-title" id="oCompTitle">YOU VS. #1</div>
            <div class="comp-msg" id="oCompMsg">Loading comparison…</div>
          </div>

          <div class="post-lb" id="oLb"></div>

          <div class="msg" id="oMsg"></div>
          <div class="row">
            <button class="btn" id="bRetry">RETRY</button>
            <button class="btn g" id="bCtrl2">CONTROLS</button>
            <button class="btn g" id="bExit2">RETURN TO STREAM</button>
          </div>
        </div></div>
        <div class="screen" id="sClose"><div class="card">
          <h1 style="font-size:clamp(28px,6vw,52px)" id="cTitle">ARCADE CLOSING</h1><div class="tag" id="cSub"></div>
          <div class="big" id="cBig" style="font-size:56px;display:none"></div>
          <div class="msg" id="cMsg" style="color:#d8ccff"></div>
        </div></div>
      </div>`;

      const $ = (id: string) => (shadow as any).getElementById ? (shadow as any).getElementById(id) : (shadow as any).querySelector('#' + id);
      const root = $('root'), cv = $('cv') as HTMLCanvasElement, hud = $('hud');
      const scr = { menu: $('sMenu'), ctrl: $('sCtrl'), pause: $('sPause'), over: $('sOver'), close: $('sClose') };
      const show = (n: string | null) => { for (const k in scr) (scr as any)[k].classList.toggle('on', k === n); };

      const rm = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
      const audio = createAudio();
      const rend = createRenderer(cv, (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; });
      let dprCap = Math.min(window.devicePixelRatio || 1, 2), vw = 0, vh = 0;

      function doResize() {
        const r = root.getBoundingClientRect();
        vw = Math.max(200, r.width); vh = Math.max(200, r.height);
        rend.resize(vw, vh, Math.min(window.devicePixelRatio || 1, dprCap));
      }
      const ro = new ResizeObserver(doResize); ro.observe(root); doResize();

      let state = 'MENU', session: any = null, W: any = null, demo: any = null, paused = false, evState = streamState, lastVer = 0, raf = 0, last = performance.now(), acc = 0, tAbs = 0, hbT = 0, starting = false;
      const cam = { x: 0, y: 0, zoom: 1, ox: 0, oy: 0 };
      const keys = new Set<string>(), touch: Record<string, boolean> = { gas: false, brake: false, back: false, fwd: false, nitro: false, jump: false };
      const inp = { throttle: 0, brake: false, tilt: 0, nitro: false, jump: false };

      const coarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)').matches : false;
      const savedCtrl = lsGet('vcr_ctrl');
      let touchMode = savedCtrl ? savedCtrl === 'touch' : coarse;
      let ctrlChosen = false;
      const tEl = $('touch');

      function newDemo() {
        demo = newWorld((Math.random() * 1e9) | 0); demo.demo = true; demo.car.x = 20;
        cam.x = 26; cam.y = demo.T.heightAt(26) + .8;
      }
      newDemo();

      function stepDemo(dt: number) {
        const c = demo.car, T = demo.T; T.ensure(c.x + 200); c.x += 16 * dt;
        c.y = T.heightSolid(c.x) + .86; c.a = Math.atan(T.slopeAt(c.x)); c.wr += dt * 16 / .36;
        demo.t += dt; demo.pol.x = c.x - 45; demo.pol.gap = 45; demo.maxX = c.x;
        for (const p of T.pick) if (!p.got && p.x < c.x + 1) p.got = true;
        if (c.x > 1100) newDemo();
      }

      const els = {
        d: $('d'), stg: $('stg'), sp: $('sp'), nb: $('nb'), jw: $('jw'), jb: $('jb'),
        cn: $('cn'), toast: $('toast'), warn: $('warn'), net: $('net'), ready: $('ready'),
        press: $('press').children
      };
      let hd = -1, hs = -1, hj = false;

      function toast(txt: string, col?: string) {
        const t = els.toast; t.textContent = txt; t.style.color = col || '#fff';
        t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
      }

      function leaderHTML(rows: any[], title: string) {
        return `<h4>${title}</h4>` + rows.map((r: any) => `<div class="${r.me ? 'me' : ''}"><span>#${r.rank} ${r.name}</span><span>${r.distance} m</span></div>`).join('');
      }

      async function refreshMenu(msg?: string) {
        if ($('mMsg')) $('mMsg').textContent = msg || '';
        const play = $('bPlay'); if (play) play.disabled = (evState !== 'BREAK' && evState !== 'UPCOMING');
      }

      let ctrlFrom = 'menu';
      function openCtrl() {
        if (state !== 'MENU' && state !== 'OVER') return;
        audio.init(); audio.sfx('ui');
        ctrlFrom = state === 'OVER' ? 'over' : 'menu';
        const portrait = window.innerHeight > window.innerWidth;
        $('oTouch').classList.toggle('sel', ctrlChosen || savedCtrl ? touchMode : false);
        $('oKey').classList.toggle('sel', ctrlChosen || savedCtrl ? !touchMode : false);
        $('oTouch').classList.toggle('rcm', coarse); $('oKey').classList.toggle('rcm', !coarse);
        $('cHint').textContent = coarse ? ('Phones and tablets play best with Touch Buttons.' + (portrait ? ' Rotate to landscape for a wider view.' : '')) : 'On a computer, Keyboard is the best fit — but you can still pick Touch Buttons.';
        $('oTouch').disabled = $('oKey').disabled = false;
        show('ctrl');
      }

      function pickCtrl(mode: string) {
        if (starting) return;
        touchMode = mode === 'touch'; ctrlChosen = true; lsSet('vcr_ctrl', mode);
        $('oTouch').classList.toggle('sel', touchMode); $('oKey').classList.toggle('sel', !touchMode);
        startRun();
      }

      function applyStatus(s: any) {
        if (destroyed || !s) return;
        if (s.version < lastVer) return;
        const changed = s.version > lastVer || s.state !== evState; lastVer = s.version;
        if (!changed) return;
        evState = s.state;
        if (s.state === 'BREAK' || s.state === 'UPCOMING') {
          if (state === 'CLOSED' || state === 'CLOSING') { state = 'MENU'; show('menu'); hud.classList.remove('on'); refreshMenu('The arcade is open again.'); }
          else if (state === 'MENU') refreshMenu();
        } else closeArcade(s.state);
      }

      function closeArcade(st: string) {
        if (state === 'CLOSED' || state === 'CLOSING') return;
        audio.sfx('warn');
        if (state === 'RUN') { endRun('EVENT_CLOSING', true); }
        state = st === 'STARTING' ? 'CLOSING' : 'CLOSED';
        paused = false; starting = false; hud.classList.remove('on'); tEl.classList.remove('on');
        $('cTitle').textContent = st === 'STARTING' ? 'ARCADE CLOSING' : 'ARCADE UNAVAILABLE';
        $('cSub').textContent = st === 'STARTING' ? 'The stream is about to resume' : 'The stream is live';
        $('cMsg').textContent = st === 'STARTING' ? 'Thanks for playing! Your completed scores have been finalized.' : 'Check back during the next stream break.';
        show('close');
        if (st === 'STARTING') later(() => { if (state === 'CLOSING' || state === 'CLOSED') adapter.exit(); }, 1500);
      }

      unsubs.push(adapter.onEventStatus(applyStatus));

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { if (state === 'RUN') pause(true); audio.suspend(); } else { audio.resume(); }
      }, sig);
      window.addEventListener('blur', () => { if (state === 'RUN') pause(true); }, sig);

      async function startRun() {
        if (state !== 'MENU' && state !== 'OVER') return;
        if (starting) return; starting = true;
        audio.init(); audio.sfx('ui');
        $('bPlay').disabled = true; $('bRetry').disabled = true; $('oTouch').disabled = true; $('oKey').disabled = true;
        let g: any;
        try { g = await adapter.startSession(); }
        catch (e) {
          starting = false; $('bPlay').disabled = false; $('bRetry').disabled = false; $('oTouch').disabled = false; $('oKey').disabled = false;
          if (destroyed) return;
          const m = 'Cannot reach GameScope — try again.'; $('mMsg').textContent = m; $('oMsg').textContent = m;
          show(state === 'OVER' ? 'over' : 'menu'); return;
        }
        starting = false;
        if (destroyed) return;
        $('bPlay').disabled = false; $('bRetry').disabled = false; $('oTouch').disabled = false; $('oKey').disabled = false;
        if (!g.ok) {
          const m = ({ EVENT_CLOSING: 'The arcade is closing.', EVENT_NOT_ACTIVE: 'The arcade is not active.' } as any)[g.code] || 'Could not start a session.';
          $('mMsg').textContent = m; $('oMsg').textContent = m; show(state === 'OVER' ? 'over' : 'menu'); return;
        }
        session = g; W = newWorld(g.seed); FX.clear(); paused = false; acc = 0; hbT = 0;
        keys.clear(); for (const k in touch) touch[k] = false;
        cam.x = W.car.x + 6; cam.y = W.T.heightAt(cam.x) + .8; cam.zoom = 1;
        state = 'RUN'; show(null); hud.classList.add('on'); tEl.classList.toggle('on', touchMode);
        hd = -1; hs = -1; hj = false; els.jw.style.display = 'none'; els.cn.textContent = '0';
        $('stg').textContent = STAGES[0]; root.focus();
        toast('GET READY', '#ffd36b');
      }

      async function endRun(reason: string, forced?: boolean) {
        if (!W || (state !== 'RUN' && !forced)) return;
        const w = W, d = dist(w); state = 'OVER'; hud.classList.remove('on'); tEl.classList.remove('on');
        const best = Math.max(adapter.best ? adapter.best() : 0, 0);
        $('oWhy').textContent = reason === 'caught' ? 'BUSTED!' : reason === 'EVENT_CLOSING' ? 'ARCADE CLOSING' : reason === 'QUIT' ? 'RUN ENDED' : 'CRASHED';
        $('oWhy').style.color = reason === 'caught' ? '#ff5a7a' : '#ffd36b';
        $('oDist').textContent = d; $('oBest').textContent = best ? best + ' m' : '–'; $('oRank').textContent = '…'; $('oRec').style.display = 'none';
        $('oJump').textContent = Math.round(w.st.longest) + ' m'; $('oClean').textContent = w.st.clean; $('oNear').textContent = w.st.near; $('oCoin').textContent = w.st.coins; $('oMsg').textContent = 'Submitting score…';
        if ($('oCompTitle')) $('oCompTitle').textContent = '';
        if ($('oCompMsg')) $('oCompMsg').textContent = 'Calculating ranking…';
        if ($('oLb')) $('oLb').innerHTML = '';
        const sess = session; session = null;
        if (!forced) show('over');
        try {
          const r = await adapter.submitResult({
            sessionId: sess.sessionId, distance: d, endReason: reason, checkpoints: w.cps,
            stats: {
              longestJump: Math.round(w.st.longest), clean: w.st.clean, near: w.st.near, coins: w.st.coins,
              jetpacks: w.st.jets, doubleJumps: w.st.dj, nitroUsed: Math.round(w.st.nitroUsed),
              nitroDist: Math.round(w.st.nitroDist), duration: +w.t.toFixed(1)
            },
            clientBuild: 'vcr-1.2'
          });
          if (destroyed) return;
          if (r.ok) {
            $('oBest').textContent = r.personalBest + ' m'; $('oRank').textContent = r.rank ? ('#' + r.rank) : '–';
            $('oRec').style.display = r.isRecord && d > 0 ? 'inline-block' : 'none'; $('oMsg').textContent = '';
            if (forced) {
              $('cBig').style.display = 'block'; $('cBig').innerHTML = r.finalDistance + '<small>m</small>';
              $('cMsg').textContent = 'Your final run of ' + r.finalDistance + ' m was recorded. Thanks for playing!';
            }
          } else {
            $('oMsg').textContent = 'Score recorded locally.'; $('oRank').textContent = '–';
          }
        } catch (e) {
          if (!destroyed) $('oMsg').textContent = 'Score saved locally.';
        }

 
        try {
          const rows = await adapter.getLeaderboard(6);
          if (!destroyed && rows && rows.length > 0) {
            const topRow = rows[0];
            const userBest = Math.max(d, adapter.best ? adapter.best() : 0);
            const isNumberOne = Boolean(topRow.me || (userBest >= topRow.distance));

            if (isNumberOne) {
              if ($('oCompTitle')) {
                $('oCompTitle').textContent = "YOU'RE ON TOP!";
                $('oCompTitle').style.color = "#00ff88";
              }
              if ($('oCompMsg')) {
                $('oCompMsg').textContent = "You can always do better!";
              }
            } else {
              const diff = Math.max(0, topRow.distance - userBest);
              if ($('oCompTitle')) {
                $('oCompTitle').textContent = "YOU VS. #1";
                $('oCompTitle').style.color = "#ffd36b";
              }
              if ($('oCompMsg')) {
                $('oCompMsg').textContent = `You need ${diff.toLocaleString()} more meters to reach #1.`;
              }
            }

            if ($('oLb')) {
              $('oLb').innerHTML = leaderHTML(rows, 'EVENT LEADERBOARD — DISTANCE');
            }
          }
        } catch (e) {
          if ($('oCompMsg')) $('oCompMsg').textContent = '';
        }

        if (state === 'OVER' && (evState !== 'BREAK' && evState !== 'UPCOMING')) $('bRetry').disabled = true; else $('bRetry').disabled = false;
      }

      function pause(auto?: boolean) {
        if (state !== 'RUN' || paused || !W) return;
        paused = true; audio.suspend(); $('pMsg').textContent = auto ? 'Paused while inactive.' : ''; show('pause');
      }

      function resume() {
        if (state !== 'RUN' || !paused) return;
        paused = false; audio.resume(); show(null); last = performance.now(); root.focus();
      }

      // Fullscreen support
      function toggleFullscreen() {
        const target = container.parentElement || container;
        if (!document.fullscreenElement) {
          if (target.requestFullscreen) target.requestFullscreen();
          else if ((target as any).webkitRequestFullscreen) (target as any).webkitRequestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
          else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
        }
      }

      document.addEventListener('fullscreenchange', () => {
        const isFs = !!document.fullscreenElement;
        const fsBtn = $('fsBtn');
        if (fsBtn) {
          fsBtn.textContent = isFs ? '⛷' : '⛶';
          fsBtn.title = isFs ? 'Exit Fullscreen' : 'Fullscreen';
        }
        doResize();
      }, sig);

      /* inputs */
      const keyMap: Record<string, string> = {
        KeyW: 'gas', ArrowUp: 'gas', KeyS: 'brake', KeyJ: 'jump', ShiftLeft: 'jump', ShiftRight: 'jump',
        ArrowDown: 'brake', KeyA: 'back', ArrowLeft: 'back', KeyD: 'fwd', ArrowRight: 'fwd', Space: 'nitro'
      };

      window.addEventListener('keydown', e => {
        if (destroyed) return;
        const a = keyMap[e.code];
        if (a && (state === 'RUN')) { e.preventDefault(); keys.add(a); return; }
        if (e.code === 'KeyF') { toggleFullscreen(); return; }
        if (e.code === 'Escape' && scr.ctrl.classList.contains('on') && !starting) { show(ctrlFrom); return; }
        if (e.code === 'KeyP' || e.code === 'Escape') {
          if (state === 'RUN') { e.preventDefault(); paused ? resume() : pause(false); }
          else if (paused) resume();
        }
        if (e.code === 'KeyM') { audio.setMuted(!audio.muted); $('muteBtn').textContent = audio.muted ? '🔇' : '🔊'; }
      }, sig);

      window.addEventListener('keyup', e => { const a = keyMap[e.code]; if (a) keys.delete(a); }, sig);
      window.addEventListener('blur', () => { keys.clear(); for (const k in touch) touch[k] = false; }, sig);

      function bindTouch(id: string, key: string) {
        const b = $(id);
        const on = (e: PointerEvent) => {
          e.preventDefault(); touch[key] = true; b.classList.add('p');
          try { b.setPointerCapture(e.pointerId); } catch (_) {}
        };
        const off = (_e: PointerEvent) => { touch[key] = false; b.classList.remove('p'); };
        b.addEventListener('pointerdown', on, sig); b.addEventListener('pointerup', off, sig);
        b.addEventListener('pointercancel', off, sig); b.addEventListener('lostpointercapture', off, sig);
        b.addEventListener('contextmenu', (e: Event) => e.preventDefault(), sig);
      }

      bindTouch('tGas', 'gas'); bindTouch('tBrk', 'brake'); bindTouch('tBack', 'back');
      bindTouch('tFwd', 'fwd'); bindTouch('tNit', 'nitro'); bindTouch('tJmp', 'jump');

      root.addEventListener('touchmove', (e: TouchEvent) => { if (state === 'RUN') e.preventDefault(); }, { passive: false, signal: ac.signal });
      root.addEventListener('contextmenu', (e: Event) => { if (state === 'RUN') e.preventDefault(); }, sig);

      $('pauseBtn').addEventListener('click', () => pause(false), sig);
      $('muteBtn').addEventListener('click', () => { audio.setMuted(!audio.muted); $('muteBtn').textContent = audio.muted ? '🔇' : '🔊'; }, sig);
      $('fsBtn').addEventListener('click', toggleFullscreen, sig);
      $('exitBtn').addEventListener('click', () => adapter.exit(), sig);

      $('bPlay').addEventListener('click', openCtrl, sig);
      $('bRetry').addEventListener('click', () => { ctrlChosen ? startRun() : openCtrl(); }, sig);
      $('bCtrl2').addEventListener('click', openCtrl, sig);
      $('oTouch').addEventListener('click', () => pickCtrl('touch'), sig);
      $('oKey').addEventListener('click', () => pickCtrl('keyboard'), sig);
      $('bCBack').addEventListener('click', () => { if (!starting) show(ctrlFrom); }, sig);
      $('bResume').addEventListener('click', resume, sig);
      $('bQuit').addEventListener('click', () => { paused = false; show(null); endRun('QUIT'); }, sig);
      $('bExit1').addEventListener('click', () => adapter.exit(), sig);
      $('bExit2').addEventListener('click', () => adapter.exit(), sig);
      $('bExit3').addEventListener('click', () => adapter.exit(), sig);

      function sampleInput(dt: number) {
        const g = keys.has('gas') || touch.gas, b = keys.has('brake') || touch.brake;
        inp.throttle += ((g ? 1 : 0) - inp.throttle) * Math.min(1, dt / .12); inp.brake = b;
        const bk = keys.has('back') || touch.back, fw = keys.has('fwd') || touch.fwd;
        inp.tilt = bk && !fw ? 1 : fw && !bk ? -1 : 0;
        inp.nitro = keys.has('nitro') || touch.nitro;
        inp.jump = keys.has('jump') || touch.jump;
      }

      function handleEvents() {
        const w = W; if (!w) return; const c = w.car; let coins = 0;
        for (const e of w.ev) {
          switch (e.k) {
            case 'crash': audio.sfx(e.reason === 'caught' ? 'caught' : 'crash');
              if (e.reason === 'caught') { toast('BUSTED!', '#ff5a7a'); }
              else {
                toast(e.reason === 'fell' ? 'SPLASH!' : 'WRECKED!', '#ff8a3a');
                for (let i = 0; i < 26; i++) FX.emit(c.x, c.y, (Math.random() - .5) * 14, Math.random() * 9, .8, .22, i % 3 ? '#ffb347' : '#fff', true);
                for (let i = 0; i < 14; i++) FX.emit(c.x, c.y, (Math.random() - .5) * 8, Math.random() * 5, 1.1, .5, 'rgba(60,50,70,.8)', false);
              }
              break;
            case 'clean': audio.sfx('clean'); if (e.len > 0) toast(e.len > 18 ? 'BIG AIR! CLEAN LANDING' : 'CLEAN LANDING', '#37e6ff'); else toast('SMOOTH TOUCHDOWN', '#37e6ff'); break;
            case 'rough': audio.sfx('rough'); for (let i = 0; i < 8; i++) FX.emit(c.x, c.y - .6, (Math.random() - .5) * 6, Math.random() * 3, .5, .3, 'rgba(190,170,210,.6)', false); break;
            case 'land': audio.sfx('land'); for (let i = 0; i < 5; i++) FX.emit(c.x, c.y - .8, (Math.random() - .5) * 5, Math.random() * 2, .4, .25, 'rgba(190,170,210,.5)', false); break;
            case 'near': audio.sfx('near'); toast('NEAR MISS', '#ffd36b'); break;
            case 'nitro': audio.sfx('nitro'); break;
            case 'jump': audio.sfx('jump'); for (let i = 0; i < 8; i++) FX.emit(c.x, c.y - .8, (Math.random() - .5) * 5, Math.random() * 2 + 1, .4, .25, 'rgba(190,170,210,.5)', false); break;
            case 'djump': audio.sfx('djump'); for (let i = 0; i < 14; i++) { const an = i / 14 * Math.PI * 2; FX.emit(c.x, c.y - .2, Math.cos(an) * 6, Math.sin(an) * 4 - 1, .4, .28, i % 2 ? '#ff7ac3' : '#37e6ff', true); } break;
            case 'knock': audio.sfx('knock'); for (let i = 0; i < 8; i++) FX.emit(e.x, e.y, (Math.random() - .2) * 10, Math.random() * 7, .7, .25, '#ff7a1a', true); break;
            case 'hit': audio.sfx('hit'); for (let i = 0; i < 12; i++) FX.emit(e.x, e.y, (Math.random() - .5) * 10, Math.random() * 6, .6, .2, '#ffd36b', true); toast('IMPACT!', '#ff8a3a'); break;
            case 'warn': audio.sfx('warn'); break;
            case 'coin': coins++; break;
            case 'pnitro': audio.sfx('pnitro'); toast('NITRO +' + NITRO_PICK, '#37e6ff'); for (let i = 0; i < 14; i++) FX.emit(e.x, e.y, (Math.random() - .5) * 8, Math.random() * 6, .5, .25, '#37e6ff', true); break;
            case 'pjet': audio.sfx('pjet'); toast('JETPACK!', '#ff7ac3'); for (let i = 0; i < 20; i++) FX.emit(c.x, c.y, (Math.random() - .5) * 10, Math.random() * 8, .6, .3, i % 2 ? '#ffb347' : '#ff2d95', true); break;
            case 'stage': audio.sfx('stage'); toast('STAGE ' + (e.s + 1) + ' — ' + STAGES[e.s].toUpperCase(), '#ffd36b'); els.stg.textContent = STAGES[e.s]; break;
            case 'tier': if (e.t >= 2) toast(e.t === 3 ? 'CRITICAL PRESSURE!' : 'POLICE CLOSING IN', '#ff5a7a'); break;
          }
        }
        if (coins) audio.sfx('coin');
        w.ev.length = 0;
      }

      let fpsEma = 16, slowT = 0;
      function frame(now: number) {
        if (destroyed) return; raf = requestAnimationFrame(frame);
        let dt = Math.min((now - last) / 1000, .1); last = now; tAbs += dt;
        fpsEma += (dt * 1000 - fpsEma) * .05;
        if (fpsEma > 22 && dprCap > 1) { slowT += dt; if (slowT > 3) { dprCap = Math.max(1, dprCap - .5); slowT = 0; doResize(); } } else slowT = 0;
        let Wd = demo;
        if (state === 'RUN' && W) {
          Wd = W;
          if (!paused) {
            if (W.ready > 0) {
              W.ready -= dt; els.ready.classList.add('on'); els.ready.textContent = W.ready > .5 ? 'GET READY' : 'GO!';
              if (W.ready <= 0) { els.ready.classList.remove('on'); audio.sfx('go'); }
            } else {
              sampleInput(dt); acc += dt; let n = 0;
              while (acc >= STEP && n < 8) { step(W, STEP, inp); acc -= STEP; n++; }
              if (n === 8) acc = 0;
              hbT += dt;
              if (hbT >= 5 && session) {
                hbT = 0; const sid = session.sessionId;
                adapter.heartbeat(sid, { distance: dist(W), t: +W.t.toFixed(1) });
              }
            }
            const c = W.car;
            if (c.alive && !rm && W.ready <= 0) {
              if (c.nitroOn) FX.emit(c.x - 2.3, c.y - .1, -8, 0, .25, .3, '#37e6ff', true);
              if (c.jetT > 0) {
                FX.emit(c.x - 1.3 + (Math.random() - .5) * .8, c.y - .7, -3, -6 - Math.random() * 3, .45, .4, '#ffb347', true);
                FX.emit(c.x - 1.5, c.y + .5, -10, 0, .35, .35, '#ff7ac3', true);
                if (Math.random() < .5) FX.emit(c.x - 1.6, c.y - .9, -5, -2, .8, .6, 'rgba(130,120,160,.5)', false);
              }
              if (c.contact[0] && Math.abs(c.vx) > 6 && Math.random() < .4) FX.emit(c.x - 1.4, c.y - .85, -3, 1.2, .4, .25, 'rgba(190,170,210,.4)', false);
            }
            handleEvents(); FX.update(dt);
            if (!W.car.alive && W.over && W.overT > (W.over.reason === 'caught' ? 1.6 : 1.4)) endRun(W.over.reason);
          }
        } else { stepDemo(dt); }

        const T = Wd.T, c = Wd.car, jetOn = Wd === W && c.jetT > 0 && c.alive;
        const tx = c.x + c.vx / 6 + 2.5;
        const kx = 1 - Math.exp(-6 * dt), ky = 1 - Math.exp(-4 * dt);
        let ref = c.y;
        if (Wd === W && c.air > .05) { const gh = T.heightSolid(c.x); ref = gh + .9 + Math.max(0, c.y - gh - 3.5) * (jetOn ? .75 : .5); }
        cam.x += (tx - cam.x) * kx; cam.y += ((ref + .8) - cam.y) * ky;
        let tz = rm ? 1 : clamp(1 - (c.vx - 28) * .008, .76, 1);
        if (!rm && (jetOn || (c.y - T.heightSolid(c.x) > 6))) tz = Math.min(tz, jetOn ? .78 : .9);
        cam.zoom += (tz - cam.zoom) * (1 - Math.exp(-2 * dt));
        if (Wd.shake > 0 && !rm) { const m = Wd.shake * 9; cam.ox = (Math.random() - .5) * m; cam.oy = (Math.random() - .5) * m; } else { cam.ox = 0; cam.oy = 0; }
        rend.draw(Wd, cam, { time: tAbs, tier: Wd === W ? W.tier : 0, reduced: rm });

        if (state === 'RUN' && W) {
          const d = dist(W); if (d !== hd) { hd = d; els.d.textContent = d; }
          const s = Math.round(Math.max(0, W.car.vx) * 3.6); if (s !== hs) { hs = s; els.sp.textContent = s; }
          els.nb.style.transform = `scaleX(${W.car.nitro / 100})`;
          const jt = W.car.jetT > 0 && W.car.alive; if (jt !== hj) { hj = jt; els.jw.style.display = jt ? 'block' : 'none'; }
          if (jt) els.jb.style.transform = `scaleX(${clamp(W.car.jetT / JET_T, 0, 1)})`;
          els.cn.textContent = W.st.coins;
          const tier = W.tier; for (let i = 0; i < 4; i++) { els.press[i].className = i <= tier ? 'on' + i : ''; }
          els.warn.classList.toggle('on', W.warn > 0 && W.car.alive);
          audio.update(W.car.vx, (W.car.nitroOn || W.car.jetT > 0) && W.car.alive, W.tier / 3, !paused && W.car.alive && W.ready <= 0);
        } else audio.update(0, false, 0, false);
      }

      (async () => {
        try {
          const s = await adapter.getEventStatus(); if (destroyed) return;
          lastVer = s.version; evState = s.state;
          if (s.state !== 'BREAK' && s.state !== 'UPCOMING') { closeArcade(s.state); } else refreshMenu();
        } catch (e) {
          $('mMsg').textContent = 'Cannot reach GameScope — retrying…'; $('bPlay').disabled = true;
          later(() => { if (!destroyed) refreshMenu(); }, 3000);
        }
      })();

      raf = requestAnimationFrame(frame);
      root.focus();

      return {
        destroy() {
          if (destroyed) return; destroyed = true; cancelAnimationFrame(raf); ac.abort(); ro.disconnect();
          timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers.clear();
          unsubs.forEach(u => { try { u(); } catch (e) {} });
          audio.close(); FX.clear(); keys.clear();
          shadow.innerHTML = '';
        }
      };
    }

    const adapter = new GameScopeAdapter();
    adapterRef.current = adapter;
    const handle = mount(innerHost, adapter);
    handleRef.current = handle;

    return () => {
      if (document.fullscreenElement) {
        try { document.exitFullscreen(); } catch (e) {}
      }
      if (handleRef.current) handleRef.current.destroy();
    };
  }, []);

  // Sync event state changes (e.g. BREAK -> STARTING or LIVE)
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.setState(streamState);
      if (streamState === 'STARTING' || streamState === 'LIVE') {
        const timer = setTimeout(() => {
          onExit();
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [streamState, onExit]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-[#05030c] select-none"
    />
  );
};
