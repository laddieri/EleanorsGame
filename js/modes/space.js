// ============================================================
//  SPACE LEVELS: float with your jetpack! Hold SPACE to fly
//  up, dodge asteroids and comets, zoom through rings, and
//  dock at the space station.
// ============================================================
'use strict';

MODES.space = (() => {
    let S, P, camX, t, lvl, pal;

    const PALETTES = [
        { bg: ['#0B0630', '#1B0F4E'], neb1: 'rgba(170,60,220,0.22)', neb2: 'rgba(40,120,255,0.18)' },
        { bg: ['#1A0526', '#3A0E3A'], neb1: 'rgba(255,80,140,0.22)', neb2: 'rgba(255,170,60,0.14)' },
        { bg: ['#020312', '#08123A'], neb1: 'rgba(40,200,200,0.18)', neb2: 'rgba(120,60,255,0.2)' }
    ];

    const speed = () => 3.2 + lvl.d * 1.3;

    function rockShape(rng, n) {
        const pts = [];
        for (let i = 0; i < n; i++) pts.push(0.75 + rng() * 0.3);
        return pts;
    }

    function build(level) {
        const d = level.d;
        const rng = makeRng(level.seed + 37);
        const len = Math.round(9500 + d * 5500);
        S = { len, rocks: [], comets: [], rings: [], stars: [], tacos: [], babies: [], planets: [], bg: [], lane: [], stationX: len, finished: 0 };

        // a wandering "safe lane" keeps every level possible
        let ly = 270, dv = 0;
        for (let x = 0; x <= len + 1000; x += 40) {
            dv = clamp(dv + rng.range(-0.9, 0.9), -3.5, 3.5);
            ly += dv;
            if (ly < 110) { ly = 110; dv = Math.abs(dv); }
            if (ly > 430) { ly = 430; dv = -Math.abs(dv); }
            S.lane.push(ly);
        }
        const laneY = (x) => S.lane[clamp(Math.round(x / 40), 0, S.lane.length - 1)];
        S.laneY = laneY;
        const laneHalf = 95 - d * 25;

        for (let x = 900; x < len - 500; x += rng.range(170 - d * 70, 250 - d * 80)) {
            const n = rng.int(1, 2);
            for (let i = 0; i < n; i++) {
                const r = rng.range(18, 34 + d * 12);
                let y;
                let tries = 0;
                do { y = rng.range(30, H - 30); tries++; } while (Math.abs(y - laneY(x)) < laneHalf + r && tries < 20);
                if (tries >= 20) continue;
                S.rocks.push({
                    x: x + rng.range(-40, 40), y, r, rot: rng() * TAU, vr: rng.range(-0.03, 0.03),
                    bob: rng.range(0, d * 40), phase: rng() * TAU, shape: rockShape(rng, 9),
                    color: rng.pick(['#8B7B6B', '#7A7F8C', '#9A7A62'])
                });
            }
        }
        if (d >= 0.1) {
            for (let x = 2400; x < len - 1200; x += rng.range(1700 - d * 700, 2300 - d * 800)) {
                S.comets.push({ x, y: rng.range(80, H - 80), vx: -(3 + d * 2), vy: 0, warned: false, active: false, spawnX: x });
            }
        }
        for (let x = 1400; x < len - 600; x += rng.range(900, 1300)) {
            S.rings.push({ x, y: laneY(x), done: false, ok: false });
            S.rocks = S.rocks.filter(o => Math.abs(o.x - x) > 120 || Math.abs(o.y - laneY(x)) > 150);
        }
        for (let x = 500; x < len - 300; x += 125) {
            if (!rng.chance(0.8)) continue;
            const y = laneY(x) + Math.sin(x * 0.01) * laneHalf * 0.5;
            if (S.rocks.some(o => dist(o.x, o.y, x, y) < o.r + 30)) continue;
            S.stars.push({ x, y, got: false });
        }
        [0.35, 0.7].forEach(f => S.tacos.push({ x: len * f, y: laneY(len * f), got: false }));
        [0.2, 0.5, 0.8].forEach((f, i) => {
            const bx = len * f;
            const off = (i % 2 ? 1 : -1) * (laneHalf + 45);
            let by = laneY(bx) + off;
            if (by < 60 || by > H - 60) by = laneY(bx) - off;
            by = clamp(by, 60, H - 60);
            S.babies.push({ x: bx, y: by, got: false });
            S.rocks = S.rocks.filter(o => dist(o.x, o.y, bx, by) > o.r + 70);
        });

        const pc = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F1C'];
        for (let i = 0; i < 7; i++) {
            S.planets.push({ x: 300 + i * 700 + rng.range(0, 300), y: rng.range(60, 480), r: rng.range(25, 70), color: pc[i % pc.length], ring: rng.chance(0.4), par: rng.range(0.08, 0.15) });
        }
        for (let i = 0; i < 160; i++) S.bg.push({ x: rng() * W, y: rng() * H, s: rng.range(0.5, 2.2), tw: rng() * TAU, par: rng.range(0.03, 0.2) });
        S.stationX = len;
        return S.stars.length;
    }

    function init(level) {
        t = 0;
        lvl = level;
        pal = PALETTES[level.pal || 0];
        const total = build(level);
        P = { sx: 170, y: 270, vy: 0, inv: 0, tilt: 0, thrust: false, dead: false, dock: 0, combo: 0, r: 0 };
        const c = Game.char;
        P.r = Math.min(c.w, c.h) * 0.45 + 4;
        camX = 0;
        return { stars: total };
    }

    function hit(fromY) {
        if (P.inv > 0) return;
        P.inv = 100;
        P.vy = P.y < fromY ? -5 : 5;
        P.combo = 0;
        Sound.play('hurt');
        FX.shake(8);
        FX.burst(camX + P.sx, P.y, { count: 16, colors: ['#FFD400', '#FFFFFF', '#FF8A3D'], speed: 4, life: 28, shape: 'star', size: 5, gravity: 0 });
        if (!Game.hurt()) P.dead = true;
    }

    function update() {
        t++;
        const I = Input.held;
        const c = Game.char;
        const px = () => camX + P.sx;

        if (S.finished) {
            S.finished++;
            const tx = S.stationX - camX + 10;
            P.sx += (tx - P.sx) * 0.05;
            P.y += (H / 2 + 10 - P.y) * 0.05;
            camX += speed() * Math.max(0, 1 - S.finished / 60);
            if (S.finished % 30 === 0) FX.confetti(S.stationX, H / 2 - 60, 30);
            if (S.finished === 150) Game.levelDone();
            return;
        }

        camX += speed();
        if (P.inv > 0) P.inv--;

        P.thrust = I.jump || I.up;
        if (P.thrust) P.vy -= 0.45;
        if (I.down) P.vy += 0.4;
        P.vy += c.ability === 'floaty' ? 0.1 : 0.16;
        P.vy *= 0.97;
        P.vy = clamp(P.vy, -7, 7);
        P.y += P.vy;
        if (P.y < 30) { P.y = 30; P.vy = Math.abs(P.vy) * 0.3; }
        if (P.y > H - 30) { P.y = H - 30; P.vy = -Math.abs(P.vy) * 0.4; }
        const dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
        P.sx = clamp(P.sx + dir * 3.5, 70, 560);
        P.tilt = lerp(P.tilt, P.vy * 0.06 + dir * 0.15, 0.2);

        if (P.thrust && t % 2 === 0) {
            FX.burst(px() - 10, P.y + 22, { count: 1, colors: ['#FFB300', '#FF5722', '#FFF176'], speed: 2, angle: Math.PI * 0.75, spread: 0.6, life: 18, gravity: 0.05, shape: 'circle', size: 6, vx: -speed() * 0.3 });
        }

        const X = px();
        for (const o of S.rocks) {
            o.rot += o.vr;
            if (o.x < camX - 100 || o.x > camX + W + 100) continue;
            const oy = o.y + Math.sin(t * 0.02 + o.phase) * o.bob;
            if (dist(X, P.y, o.x, oy) < o.r * 0.85 + P.r) hit(oy);
        }
        for (const cm of S.comets) {
            if (!cm.active && cm.spawnX - camX < W + 500) { cm.active = true; cm.x = camX + W + 500; cm.warn = 70; Sound.play('boost'); }
            if (!cm.active) continue;
            if (cm.warn > 0) { cm.warn--; cm.x = camX + W + 500; cm.y += (P.y - cm.y) * 0.02; continue; }
            cm.x += cm.vx;
            if (t % 2 === 0) FX.burst(cm.x + 14, cm.y, { count: 1, colors: ['#9FF3FF', '#FFFFFF', '#6FB7FF'], speed: 1, life: 26, gravity: 0, shape: 'circle', size: 7, vx: 1 });
            if (dist(X, P.y, cm.x, cm.y) < 16 + P.r) hit(cm.y);
        }
        for (const rg of S.rings) {
            if (rg.done || X < rg.x) continue;
            rg.done = true;
            if (Math.abs(P.y - rg.y) < 44) {
                rg.ok = true;
                P.combo++;
                Sound.play('ring');
                Game.addScore(100 * P.combo, rg.x, rg.y - 70, '#7FFFFF');
                FX.burst(rg.x, rg.y, { count: 20, colors: ['#7FFFFF', '#FFFFFF', '#FF9AD0'], speed: 4, life: 30, shape: 'star', size: 5, gravity: 0 });
            } else P.combo = 0;
        }

        const magnet = c.ability === 'magnet';
        for (const s of S.stars) {
            if (s.got) continue;
            if (magnet && dist(s.x, s.y, X, P.y) < 170) { s.x += (X - s.x) * 0.12; s.y += (P.y - s.y) * 0.12; }
            if (dist(s.x, s.y, X, P.y) < 26 + P.r * 0.5) { s.got = true; Game.collectStar(s.x, s.y); }
        }
        for (const k of S.tacos) if (!k.got && dist(k.x, k.y, X, P.y) < 30 + P.r * 0.5) { k.got = true; Game.collectTaco(k.x, k.y); }
        for (const b of S.babies) if (!b.got && dist(b.x, b.y, X, P.y) < 36 + P.r * 0.5) { b.got = true; Game.collectBaby(b.x, b.y - 20); }

        if (X >= S.stationX - 60) {
            S.finished = 1;
            Sound.play('win');
            FX.confetti(S.stationX, H / 2 - 60, 90);
        }
    }

    function dying() { P.vy += 0.3; P.y += P.vy; P.tilt += 0.1; }

    // ---------- drawing ----------
    function drawRock(g, o, x, y) {
        g.save();
        g.translate(x, y);
        g.rotate(o.rot);
        g.fillStyle = o.color;
        g.beginPath();
        o.shape.forEach((k, i) => {
            const a = (i / o.shape.length) * TAU;
            const px0 = Math.cos(a) * o.r * k, py = Math.sin(a) * o.r * k;
            if (i === 0) g.moveTo(px0, py); else g.lineTo(px0, py);
        });
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath(); g.arc(-o.r * 0.25, -o.r * 0.2, o.r * 0.25, 0, TAU); g.arc(o.r * 0.3, o.r * 0.25, o.r * 0.16, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.beginPath(); g.arc(-o.r * 0.35, -o.r * 0.4, o.r * 0.22, 0, TAU); g.fill();
        g.restore();
    }

    function drawStation(g) {
        const x = S.stationX - camX, y = H / 2 - 20;
        if (x < -300 || x > W + 300) return;
        g.fillStyle = '#1E90FF';
        g.fillRect(x - 150, y - 14, 90, 36); g.fillRect(x + 90, y - 14, 90, 36);
        g.fillStyle = '#0A5FB0';
        for (let i = 0; i < 6; i++) { g.fillRect(x - 150 + i * 15, y - 14, 2, 36); g.fillRect(x + 90 + i * 15, y - 14, 2, 36); }
        g.fillStyle = '#9AA3B5'; g.fillRect(x - 60, y - 2, 150, 10);
        g.fillStyle = '#E4E8F0';
        rrect(g, x - 40, y - 60, 110, 120, 30); g.fill();
        g.fillStyle = '#C8CFDB'; g.fillRect(x - 40, y - 10, 110, 6);
        g.fillStyle = '#87CEEB';
        g.beginPath(); g.arc(x + 15, y - 28, 16, 0, TAU); g.fill();
        g.fillStyle = '#3A3F55';
        rrect(g, x - 44, y + 4, 26, 44, 8); g.fill();
        const blink = (t % 40) < 20;
        g.fillStyle = blink ? '#FF3355' : '#66FF99';
        g.beginPath(); g.arc(x + 70, y - 60, 6, 0, TAU); g.fill();
        drawAxolotl(g, x + 34, y + 44, t, -1, 0.9);
        outlinedText(g, 'SPACE STATION', x + 15, y - 90, 20, '#FFD400', '#2A1060');
    }

    function drawPlayer(g) {
        const c = Game.char;
        if (P.inv > 0 && Math.floor(P.inv / 4) % 2 === 0) return;
        const x = P.sx, y = P.y;
        g.save();
        g.translate(x, y);
        g.rotate(P.tilt);
        // jetpack
        g.fillStyle = '#B0B8C8'; rrect(g, -c.w / 2 - 12, -10, 12, 26, 4); g.fill();
        g.fillStyle = '#FF4F5E'; g.fillRect(-c.w / 2 - 12, -10, 12, 5);
        if (P.thrust) {
            const f = 10 + Math.random() * 10;
            g.fillStyle = '#FFB300';
            g.beginPath(); g.moveTo(-c.w / 2 - 12, 16); g.lineTo(-c.w / 2 - 6, 16 + f); g.lineTo(-c.w / 2, 16); g.fill();
        }
        g.restore();
        drawChar(g, c, x, y + c.h / 2, { t: Game.t, rot: P.tilt, air: true });
        // helmet bubble
        g.strokeStyle = 'rgba(210,235,255,0.9)'; g.lineWidth = 2.5;
        g.fillStyle = 'rgba(170,220,255,0.18)';
        g.beginPath(); g.arc(x, y - c.h * 0.15, Math.max(c.w, c.h) * 0.62, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.beginPath(); g.ellipse(x - c.w * 0.25, y - c.h * 0.45, 6, 4, -0.6, 0, TAU); g.fill();
    }

    function draw(g) {
        const grad = g.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, pal.bg[0]); grad.addColorStop(1, pal.bg[1]);
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);
        const neb = (cx, cy, r, col) => {
            const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
            rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = rg; g.fillRect(0, 0, W, H);
        };
        neb(((300 - camX * 0.05) % 1400 + 1400) % 1400 - 200, 180, 320, pal.neb1);
        neb(((900 - camX * 0.07) % 1600 + 1600) % 1600 - 300, 400, 280, pal.neb2);
        for (const s of S.bg) {
            const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.03 + s.tw));
            g.globalAlpha = a;
            g.fillStyle = '#FFFFFF';
            g.fillRect(((s.x - camX * s.par) % W + W) % W, s.y, s.s, s.s);
        }
        g.globalAlpha = 1;
        for (const p of S.planets) {
            const x = p.x - camX * p.par;
            if (x < -p.r * 2 || x > W + p.r * 2) continue;
            g.fillStyle = p.color;
            g.beginPath(); g.arc(x, p.y, p.r, 0, TAU); g.fill();
            const sh = g.createRadialGradient(x - p.r * 0.3, p.y - p.r * 0.3, 0, x, p.y, p.r);
            sh.addColorStop(0, 'rgba(255,255,255,0.25)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)');
            g.fillStyle = sh; g.beginPath(); g.arc(x, p.y, p.r, 0, TAU); g.fill();
            if (p.ring) {
                g.strokeStyle = 'rgba(230,200,130,0.6)'; g.lineWidth = 5;
                g.beginPath(); g.ellipse(x, p.y, p.r * 1.8, p.r * 0.35, 0.3, 0, TAU); g.stroke();
            }
        }
        // rings: back half, then things, then front half
        for (const rg of S.rings) {
            const x = rg.x - camX;
            if (x < -80 || x > W + 80) continue;
            g.strokeStyle = rg.done ? (rg.ok ? 'rgba(127,255,160,0.5)' : 'rgba(150,150,170,0.4)') : '#FFD400';
            g.lineWidth = 7;
            g.beginPath(); g.ellipse(x, rg.y, 16, 50, 0, Math.PI / 2, Math.PI * 1.5); g.stroke();
        }
        drawStation(g);
        for (const s of S.stars) {
            if (s.got) continue;
            const x = s.x - camX;
            if (x > -30 && x < W + 30) drawStar(g, x, s.y, Game.t + s.x * 0.1);
        }
        for (const k of S.tacos) if (!k.got) drawTaco(g, k.x - camX, k.y, Game.t);
        for (const b of S.babies) if (!b.got) drawBaby(g, b.x - camX, b.y + 15, Game.t, 'helmet');
        for (const o of S.rocks) {
            const x = o.x - camX;
            if (x < -80 || x > W + 80) continue;
            drawRock(g, o, x, o.y + Math.sin(t * 0.02 + o.phase) * o.bob);
        }
        for (const cm of S.comets) {
            if (!cm.active) continue;
            if (cm.warn > 0) {
                g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.5);
                g.fillStyle = '#FF3B3B';
                g.beginPath(); g.moveTo(W - 14, cm.y); g.lineTo(W - 44, cm.y - 18); g.lineTo(W - 44, cm.y + 18); g.fill();
                g.globalAlpha = 1;
                outlinedText(g, '!', W - 62, cm.y, 26, '#FFFFFF', '#B00020');
                continue;
            }
            const x = cm.x - camX;
            if (x < -100 || x > W + 100) continue;
            g.fillStyle = 'rgba(150,230,255,0.35)';
            g.beginPath(); g.arc(x, cm.y, 26, 0, TAU); g.fill();
            g.fillStyle = '#DFF8FF';
            g.beginPath(); g.arc(x, cm.y, 15, 0, TAU); g.fill();
            g.fillStyle = '#FFFFFF';
            g.beginPath(); g.arc(x - 4, cm.y - 4, 6, 0, TAU); g.fill();
        }
        drawPlayer(g);
        for (const rg of S.rings) {
            const x = rg.x - camX;
            if (x < -80 || x > W + 80) continue;
            g.strokeStyle = rg.done ? (rg.ok ? 'rgba(127,255,160,0.7)' : 'rgba(150,150,170,0.5)') : '#FFE14D';
            g.lineWidth = 7;
            g.beginPath(); g.ellipse(x, rg.y, 16, 50, 0, -Math.PI / 2, Math.PI / 2); g.stroke();
        }
        FX.draw(g, camX, 0);
        FX.drawTexts(g, camX, 0);
    }

    function progress() { return clamp((camX + P.sx) / S.stationX, 0, 1); }

    return {
        music: 'space', icon: '🚀',
        tip: 'Hold SPACE to fly up · ← → move · fly through rings, dodge rocks & comets!',
        debug: () => ({ S, P, camX }),
        init, update, draw, dying, progress
    };
})();
