// ============================================================
//  ENGINE: canvas setup, math helpers, random numbers,
//  particles & effects, and saving progress.
// ============================================================
'use strict';

// The game world is always drawn at 960 x 540 (16:9).
// The canvas is scaled up or down by CSS to fit the screen.
const W = 960;
const H = 540;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let pixelRatio = 1;

function setupCanvas() {
    pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * pixelRatio;
    canvas.height = H * pixelRatio;
}
setupCanvas();

// ---------- Little math helpers ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
const TAU = Math.PI * 2;

function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function dist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
}

// Wrap an angle into the range -PI..PI
function wrapAngle(a) {
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
}

// Cheap repeatable "random" number from a position (for decorations)
function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
}

// Seeded random generator: the same level number always builds
// the same level, so you can learn it and beat your best score.
function makeRng(seed) {
    let s = seed >>> 0;
    const r = () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (a, b) => a + (b - a) * r();
    r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    return r;
}

// ---------- Effects: particles, floating text, screen shake ----------
const FX = {
    particles: [],
    texts: [],
    shakeAmt: 0,
    flashAmt: 0,

    burst(x, y, o = {}) {
        const n = o.count || 10;
        const colors = o.colors || [o.color || '#FFD700'];
        for (let i = 0; i < n; i++) {
            const a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || TAU)
                                      : Math.random() * TAU;
            const sp = (o.speed || 3) * (0.4 + Math.random() * 0.8);
            const life = (o.life || 40) * (0.6 + Math.random() * 0.6);
            this.particles.push({
                x, y,
                vx: Math.cos(a) * sp + (o.vx || 0),
                vy: Math.sin(a) * sp + (o.vy || 0),
                life, max: life,
                size: (o.size || 4) * (0.6 + Math.random() * 0.8),
                color: colors[Math.floor(Math.random() * colors.length)],
                g: o.gravity != null ? o.gravity : 0.15,
                drag: o.drag != null ? o.drag : 0.98,
                shape: o.shape || 'sq',
                rot: Math.random() * TAU,
                vr: (Math.random() - 0.5) * 0.3
            });
        }
    },

    sparkle(x, y, color) {
        this.burst(x, y, { count: 12, colors: [color || '#FFE45C', '#FFFFFF', '#FFF6B0'], speed: 3, life: 28, gravity: 0.02, shape: 'star', size: 5 });
    },

    confetti(x, y, n = 60) {
        this.burst(x, y, {
            count: n, colors: ['#FF4FA3', '#FFD400', '#3DDC84', '#3D8BFF', '#B36BFF', '#FF8A3D'],
            speed: 7, angle: -Math.PI / 2, spread: 2.2, life: 110, gravity: 0.12, drag: 0.985,
            shape: 'confetti', size: 6
        });
    },

    dust(x, y, n = 6, color = 'rgba(255,255,255,0.8)') {
        this.burst(x, y, { count: n, color, speed: 1.6, angle: -Math.PI / 2, spread: 2.6, life: 22, gravity: -0.02, shape: 'circle', size: 5 });
    },

    text(x, y, str, color = '#FFFFFF', size = 22) {
        this.texts.push({ x, y, str, color, size, life: 60 });
    },

    shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); },
    flash(a = 0.6) { this.flashAmt = Math.max(this.flashAmt, a); },

    clear() {
        this.particles.length = 0;
        this.texts.length = 0;
        this.shakeAmt = 0;
        this.flashAmt = 0;
    },

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.vx *= p.drag; p.vy *= p.drag;
            p.vy += p.g;
            p.x += p.vx; p.y += p.vy;
            p.rot += p.vr;
            if (--p.life <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            t.y -= 0.8;
            if (--t.life <= 0) this.texts.splice(i, 1);
        }
        this.shakeAmt *= 0.86;
        if (this.shakeAmt < 0.3) this.shakeAmt = 0;
        this.flashAmt *= 0.9;
    },

    // Particles live in world coordinates; pass the camera offset.
    draw(g, camX = 0, camY = 0) {
        for (const p of this.particles) {
            const a = Math.min(1, p.life / (p.max * 0.4));
            g.globalAlpha = a;
            g.fillStyle = p.color;
            const x = p.x - camX, y = p.y - camY;
            if (p.shape === 'circle') {
                g.beginPath(); g.arc(x, y, p.size * (0.5 + 0.5 * p.life / p.max), 0, TAU); g.fill();
            } else if (p.shape === 'star') {
                drawStarShape(g, x, y, p.size, p.rot, p.color);
            } else if (p.shape === 'confetti') {
                g.save(); g.translate(x, y); g.rotate(p.rot);
                g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                g.restore();
            } else {
                g.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
            }
        }
        g.globalAlpha = 1;
    },

    drawTexts(g, camX = 0, camY = 0) {
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        for (const t of this.texts) {
            const a = Math.min(1, t.life / 20);
            const pop = t.life > 52 ? 1 + (t.life - 52) * 0.06 : 1;
            g.globalAlpha = a;
            g.font = `700 ${Math.round(t.size * pop)}px ${FONT}`;
            g.lineWidth = 5;
            g.strokeStyle = 'rgba(40,20,70,0.85)';
            g.strokeText(t.str, t.x - camX, t.y - camY);
            g.fillStyle = t.color;
            g.fillText(t.str, t.x - camX, t.y - camY);
        }
        g.globalAlpha = 1;
        g.textBaseline = 'alphabetic';
    }
};

const FONT = "'Fredoka', 'Trebuchet MS', 'Segoe UI', sans-serif";

// ---------- Saving progress in the browser ----------
const Save = {
    KEY: 'eleanorsFamilyAdventure.v2',
    data: { unlocked: 1, best: {}, char: null, music: true },
    load() {
        try {
            const s = localStorage.getItem(this.KEY);
            if (s) Object.assign(this.data, JSON.parse(s));
        } catch (e) { /* private mode or blocked storage: play without saving */ }
    },
    write() {
        try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    }
};
Save.load();
