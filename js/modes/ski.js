// ============================================================
//  SKI LEVELS: zoom down the mountain! Weave through trees,
//  ski through gates for combos, launch off ramps and spin,
//  and outrun the giant rolling snowball in the second half.
// ============================================================
'use strict';

MODES.ski = (() => {
    const PY = 175; // where the skier sits on the screen
    let S, P, camY, t, lvl, pal;
    let flakes = [];

    const PALETTES = [
        { snow: ['#E3F2FF', '#FFFFFF'], speck: 'rgba(120,170,220,0.35)', pine: '#1E7A3E', pine2: '#2FA052', edge: '#16602F', light: false },
        { snow: ['#FFE3EE', '#FFF6EA'], speck: 'rgba(210,140,170,0.35)', pine: '#2E6E4A', pine2: '#3F8E5E', edge: '#244F38', light: false },
        { snow: ['#7F90C8', '#A9B8E6'], speck: 'rgba(255,255,255,0.35)', pine: '#15503A', pine2: '#1E6A4C', edge: '#0F3A2A', light: true }
    ];

    function build(level) {
        const d = level.d;
        const rng = makeRng(level.seed + 11);
        const len = Math.round(10000 + d * 7000);
        S = { len, objs: [], stars: [], tacos: [], babies: [], gates: [], ball: null, path: [], finished: 0 };

        // A winding "safe path" down the mountain. Trees stay off it.
        let cx = 480, drift = 0;
        for (let y = 0; y <= len + 800; y += 20) {
            drift = clamp(drift + rng.range(-0.55, 0.55), -3.2, 3.2);
            cx += drift;
            if (cx < 220) { cx = 220; drift = Math.abs(drift); }
            if (cx > 740) { cx = 740; drift = -Math.abs(drift); }
            S.path.push(cx);
        }
        const pathX = (y) => S.path[clamp(Math.round(y / 20), 0, S.path.length - 1)];
        const width = 250 - d * 90;
        S.pathX = pathX;
        S.width = width;

        let y = 650;
        while (y < len - 250) {
            const pc = pathX(y);
            const nTrees = rng.int(1, 2 + Math.round(d * 3));
            for (let i = 0; i < nTrees; i++) {
                const x = rng.range(50, 910);
                if (Math.abs(x - pc) > width / 2 + 24) S.objs.push({ kind: 'tree', x, y: y + rng.range(-40, 40), s: rng.range(0.85, 1.25) });
            }
            if (rng.chance(0.14 + d * 0.3)) S.objs.push({ kind: 'rock', x: pc + rng.range(-width / 3, width / 3), y });
            else if (rng.chance(0.14)) S.objs.push({ kind: 'snowman', x: pc + rng.range(-width / 3, width / 3), y: y + 60 });
            y += rng.range(115 - d * 35, 165 - d * 35);
        }

        for (let gy = 1100; gy < len - 500; gy += rng.range(650, 950)) {
            const gx = pathX(gy), gw = 160 - d * 40;
            S.gates.push({ y: gy, x1: gx - gw / 2, x2: gx + gw / 2, done: false, ok: false });
        }
        const ramps = [];
        for (let ry = 1500; ry < len - 700; ry += rng.range(1200, 1700)) {
            const r = { kind: 'ramp', x: pathX(ry), y: ry };
            ramps.push(r);
            S.objs.push(r);
        }
        // keep gates and ramps clear of rocks & snowmen
        const clear = (x, y, r) => {
            S.objs = S.objs.filter(o => o.kind === 'ramp' || Math.abs(o.y - y) > r || Math.abs(o.x - x) > r + 40);
        };
        S.gates.forEach(gt => clear((gt.x1 + gt.x2) / 2, gt.y, 90));
        ramps.forEach(r => clear(r.x, r.y, 110));

        // stars along the safe path
        for (let sy = 450; sy < len - 200; sy += 125) {
            if (!rng.chance(0.8)) continue;
            const sx = pathX(sy) + Math.sin(sy * 0.004) * width * 0.25;
            if (S.objs.some(o => o.kind !== 'tree' && Math.abs(o.y - sy) < 45 && Math.abs(o.x - sx) < 45)) continue;
            S.stars.push({ x: sx, y: sy, got: false });
        }
        // extra stars in the air after each ramp
        ramps.forEach(r => { for (let i = 1; i <= 3; i++) S.stars.push({ x: r.x, y: r.y + 60 + i * 55, got: false, air: true }); });

        [0.33, 0.66].forEach(f => S.tacos.push({ x: pathX(len * f) + rng.range(-40, 40), y: len * f, got: false }));

        // 3 babies hiding just off the path (you'll need to weave!)
        [0.2, 0.5, 0.8].forEach((f, i) => {
            const by = Math.round(len * f);
            const side = i % 2 ? 1 : -1;
            let bx = pathX(by) + side * (width / 2 + rng.range(50, 90));
            if (bx < 70 || bx > 890) bx = pathX(by) - side * (width / 2 + 70);
            bx = clamp(bx, 70, 890);
            S.babies.push({ x: bx, y: by, got: false });
            S.objs = S.objs.filter(o => dist(o.x, o.y, bx, by) > 85);
        });

        S.objs.sort((a, b) => a.y - b.y);
        return S.stars.length;
    }

    function init(level) {
        t = 0;
        lvl = level;
        pal = PALETTES[level.pal || 0];
        const total = build(level);
        P = { x: S.pathX(0), y: 0, vx: 0, speed: 0, air: 0, airMax: 1, fromRamp: false, spin: 0, spinDone: false,
              crash: 0, inv: 0, trail: [], combo: 0, facing: 1, dead: false };
        camY = -PY;
        flakes = [];
        for (let i = 0; i < 70; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 2.5, v: 0.5 + Math.random() });
        return { stars: total };
    }

    const base = () => 4.6 + lvl.d * 1.8;
    const airHeight = () => (P.air > 0 ? Math.sin(Math.PI * (1 - P.air / P.airMax)) * Math.min(90, P.airMax * 1.2) : 0);

    function crash(o) {
        if (P.inv > 0 || P.crash > 0) return;
        o.hit = true;
        P.crash = 55;
        P.speed = Math.min(P.speed, 1.5);
        P.combo = 0;
        P.spin = 0;
        P.x += P.x < o.x ? -16 : 16;
        Sound.play('crash');
        FX.shake(8);
        FX.burst(P.x, P.y, { count: 22, colors: ['#FFFFFF', '#DDEEFF'], speed: 5, life: 35, shape: 'circle', size: 6, gravity: 0.1 });
        if (!Game.hurt()) P.dead = true;
    }

    function update() {
        t++;
        const I = Input.held, IP = Input.pressed;
        const c = Game.char;

        if (S.finished) {
            S.finished++;
            P.speed *= 0.95;
            P.y += P.speed;
            P.vx *= 0.9;
            if (S.finished % 30 === 0) FX.confetti(P.x, P.y - 60, 30);
            if (S.finished === 140) Game.levelDone();
            camY = P.y - PY;
            return;
        }

        if (P.inv > 0) P.inv--;
        if (P.crash > 0) {
            P.crash--;
            P.speed *= 0.9;
            if (P.crash === 0) P.inv = 80;
        } else {
            const dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
            if (dir) P.facing = dir;
            P.vx += dir * (P.air > 0 ? 0.3 : 0.6);
            P.vx *= 0.9;
            P.vx = clamp(P.vx, -7.5, 7.5);
            if (P.air <= 0) {
                const target = base() + (I.down ? 3.4 : 0) - Math.abs(P.vx) * 0.08;
                P.speed = approach(P.speed, target, I.down ? 0.09 : 0.06);
            }
            if (IP.jump) {
                if (P.air <= 0) {
                    P.air = P.airMax = 32;
                    P.fromRamp = false; P.spinDone = false;
                    Sound.play('jump');
                } else if (!P.spinDone && P.air > 24) {
                    P.spin = 0.001; P.spinDone = true;
                    Sound.play('flip');
                }
            }
        }

        P.x = clamp(P.x + P.vx, 50, W - 50);
        P.y += P.speed;

        if (P.spin > 0) {
            P.spin += TAU / 24;
            if (P.spin >= TAU) {
                P.spin = 0;
                const pts = P.fromRamp ? 300 : 150;
                Game.addScore(pts, P.x, P.y - 60, '#7FE3FF');
                FX.text(P.x, P.y - 95, 'SPIN!', '#FFFFFF', 26);
            }
        }
        if (P.air > 0) {
            P.air--;
            if (P.air === 0) { FX.burst(P.x, P.y, { count: 8, color: '#FFFFFF', speed: 2.5, life: 20, shape: 'circle', size: 5 }); Sound.play('land'); }
        }

        if (P.air <= 0 && P.speed > 2) {
            if (t % 3 === 0 && (Math.abs(P.vx) > 4 || I.down)) FX.burst(P.x - P.vx * 2, P.y + 4, { count: 1, color: 'rgba(255,255,255,0.9)', speed: 1, life: 18, shape: 'circle', size: 5, gravity: -0.05 });
        }
        P.trail.push({ x: P.x, y: P.y, air: P.air > 0 });
        if (P.trail.length > 90) P.trail.shift();

        // ---- bumping into things ----
        const h = airHeight();
        if (P.crash <= 0) {
            for (const o of S.objs) {
                if (o.y < P.y - 60) continue;
                if (o.y > P.y + 60) break;
                const dx = Math.abs(o.x - P.x), dy = Math.abs(o.y - P.y);
                if (o.kind === 'tree' && !o.hit && h < 30 && dx < 18 * o.s && dy < 12) crash(o);
                else if (o.kind === 'rock' && !o.hit && h < 10 && dx < 22 && dy < 12) crash(o);
                else if (o.kind === 'snowman' && !o.hit && h < 18 && dx < 22 && dy < 14) {
                    o.hit = true;
                    P.speed *= 0.65;
                    Sound.play('snow');
                    FX.burst(o.x, o.y - 20, { count: 26, colors: ['#FFFFFF', '#E8F4FF', '#FF7A00'], speed: 5, life: 40, shape: 'circle', size: 7, gravity: 0.15 });
                    Game.addScore(50, o.x, o.y - 50);
                    FX.text(o.x, o.y - 80, 'SPLAT!', '#FFFFFF', 22);
                } else if (o.kind === 'ramp' && P.air <= 0 && dx < 38 && P.y > o.y - 12 && P.y < o.y + 14) {
                    P.air = P.airMax = Math.round(55 + P.speed * 4);
                    P.fromRamp = true; P.spinDone = false;
                    Sound.play('boing');
                    FX.text(P.x, P.y - 70, 'AIR!', '#FFE14D', 22);
                }
            }
        }

        // gates: ski between the flags for a combo!
        for (const gt of S.gates) {
            if (gt.done || P.y < gt.y) continue;
            gt.done = true;
            if (P.x > gt.x1 && P.x < gt.x2) {
                gt.ok = true;
                P.combo++;
                Sound.play('gate');
                Game.addScore(50 * P.combo, (gt.x1 + gt.x2) / 2, gt.y - 40, '#7FFFA0');
                if (P.combo > 1) FX.text((gt.x1 + gt.x2) / 2, gt.y - 75, `GATE x${P.combo}`, '#7FFFA0', 20);
            } else {
                P.combo = 0;
            }
        }

        // collecting
        const magnet = c.ability === 'magnet';
        for (const s of S.stars) {
            if (s.got) continue;
            const sy = s.air ? s.y - 50 : s.y;
            const py = P.y - h - 20;
            if (magnet && dist(s.x, sy, P.x, py) < 160) { s.x += (P.x - s.x) * 0.12; s.y += (py - sy) * 0.12; }
            if (Math.abs(s.x - P.x) < 26 && Math.abs(sy - py) < 34) { s.got = true; Game.collectStar(s.x, sy); }
        }
        for (const k of S.tacos) if (!k.got && Math.abs(k.x - P.x) < 30 && Math.abs(k.y - P.y) < 30) { k.got = true; Game.collectTaco(k.x, k.y - 20); }
        for (const b of S.babies) if (!b.got && Math.abs(b.x - P.x) < 32 && Math.abs(b.y - P.y) < 32) { b.got = true; Game.collectBaby(b.x, b.y - 30); }

        // ---- the giant rolling snowball! ----
        if (!S.ball && P.y > S.len * 0.5) {
            S.ball = { x: P.x, y: P.y - 560, stopped: false, spin: 0, r: 46 };
            Sound.play('rumble');
            FX.text(W / 2, P.y + 80, 'Uh oh... a GIANT SNOWBALL!', '#7FD4FF', 28);
            FX.shake(5);
        }
        const Bl = S.ball;
        if (Bl) {
            if (!Bl.stopped) {
                const v = base() + 0.6 + lvl.d * 0.8;
                Bl.y += v;
                Bl.spin += v * 0.03;
                Bl.x += clamp(P.x - Bl.x, -2, 2);
                if (Bl.y < P.y - 650) Bl.y = P.y - 650;
                if (t % 3 === 0) FX.burst(Bl.x + (Math.random() - 0.5) * 70, Bl.y, { count: 1, color: '#FFFFFF', speed: 1.5, angle: -Math.PI / 2, spread: 2, life: 22, shape: 'circle', size: 6, gravity: 0.05 });
                if (P.y > S.len - 250) {
                    Bl.stopped = true;
                    FX.text(Bl.x, Bl.y - 80, 'Wheee! I stopped!', '#FFFFFF', 20);
                }
                if (Bl.y > P.y - 30 && Math.abs(Bl.x - P.x) < 55 && P.inv <= 0) {
                    Sound.play('snow');
                    FX.text(P.x, P.y - 90, 'SPLAT! Snowball bump!', '#7FD4FF', 24);
                    FX.burst(P.x, P.y - 20, { count: 30, colors: ['#FFFFFF', '#DDEEFF'], speed: 6, life: 40, shape: 'circle', size: 7, gravity: 0.12 });
                    FX.shake(6);
                    Bl.y = P.y - 460;
                    P.inv = 100;
                    if (!Game.hurt()) P.dead = true;
                }
            }
        }

        if (P.y >= S.len) {
            S.finished = 1;
            Sound.play('win');
            FX.confetti(P.x, P.y - 60, 80);
        }

        camY = P.y - PY;
        for (const f of flakes) {
            f.y += f.v - P.speed * 0.25 * f.s * 0.5;
            f.x += Math.sin((t + f.y) * 0.01) * 0.4 - P.vx * 0.1;
            if (f.y < -10) { f.y = H + 10; f.x = Math.random() * W; }
            if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W; }
            if (f.x < -10) f.x = W + 10;
            if (f.x > W + 10) f.x = -10;
        }
    }

    function dying() {
        P.crash = 10;
    }

    // ---------- drawing ----------
    function drawTree(g, x, y, s) {
        g.fillStyle = 'rgba(80,110,160,0.25)';
        g.beginPath(); g.ellipse(x + 8, y + 2, 22 * s, 7 * s, 0, 0, TAU); g.fill();
        g.fillStyle = '#6B4424'; g.fillRect(x - 4 * s, y - 12 * s, 8 * s, 14 * s);
        for (let i = 0; i < 3; i++) {
            const w = (28 - i * 7) * s, by = y - (8 + i * 18) * s, ty = by - 30 * s;
            g.fillStyle = i % 2 ? pal.pine2 : pal.pine;
            g.beginPath(); g.moveTo(x - w, by); g.lineTo(x + w, by); g.lineTo(x, ty); g.closePath(); g.fill();
            g.fillStyle = '#FFFFFF';
            g.beginPath(); g.moveTo(x - w * 0.45, by - 13 * s); g.lineTo(x, ty); g.lineTo(x + w * 0.45, by - 13 * s);
            g.lineTo(x + w * 0.2, by - 10 * s); g.lineTo(x, by - 15 * s); g.lineTo(x - w * 0.2, by - 10 * s); g.closePath(); g.fill();
        }
    }

    function drawObj(g, o) {
        const x = o.x, y = o.y - camY;
        if (o.kind === 'tree') drawTree(g, x, y, o.s);
        else if (o.kind === 'rock') {
            g.fillStyle = 'rgba(80,110,160,0.25)'; g.beginPath(); g.ellipse(x + 4, y + 3, 24, 7, 0, 0, TAU); g.fill();
            g.fillStyle = '#7C8594'; g.beginPath(); g.ellipse(x, y - 6, 22, 14, 0, 0, TAU); g.fill();
            g.fillStyle = '#9EA7B5'; g.beginPath(); g.ellipse(x - 5, y - 10, 12, 7, 0, 0, TAU); g.fill();
            g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(x - 2, y - 17, 13, 5, 0, 0, TAU); g.fill();
        } else if (o.kind === 'snowman') {
            if (o.hit) {
                g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(x, y - 4, 26, 9, 0, 0, TAU); g.fill();
                g.fillStyle = '#FF7A00'; g.fillRect(x + 6, y - 8, 10, 3);
                return;
            }
            g.fillStyle = 'rgba(80,110,160,0.25)'; g.beginPath(); g.ellipse(x + 4, y + 2, 20, 6, 0, 0, TAU); g.fill();
            g.fillStyle = '#FFFFFF';
            g.beginPath(); g.arc(x, y - 16, 17, 0, TAU); g.fill();
            g.beginPath(); g.arc(x, y - 42, 12, 0, TAU); g.fill();
            g.strokeStyle = '#C5D8EE'; g.lineWidth = 2;
            g.beginPath(); g.arc(x, y - 16, 17, 0, TAU); g.stroke();
            g.fillStyle = '#222'; g.fillRect(x - 5, y - 46, 3, 3); g.fillRect(x + 3, y - 46, 3, 3);
            g.fillRect(x - 1, y - 22, 3, 3); g.fillRect(x - 1, y - 14, 3, 3);
            g.fillStyle = '#FF7A00'; g.beginPath(); g.moveTo(x, y - 42); g.lineTo(x + 12, y - 40); g.lineTo(x, y - 38); g.fill();
            g.fillStyle = '#E53935'; g.fillRect(x - 11, y - 33, 22, 5); g.fillRect(x + 5, y - 30, 5, 10);
            g.strokeStyle = '#6B4424'; g.lineWidth = 2.5;
            g.beginPath(); g.moveTo(x - 15, y - 22); g.lineTo(x - 28, y - 32); g.moveTo(x + 15, y - 22); g.lineTo(x + 28, y - 32); g.stroke();
        } else if (o.kind === 'ramp') {
            g.fillStyle = 'rgba(80,110,160,0.3)';
            g.beginPath(); g.moveTo(x - 40, y + 14); g.lineTo(x + 40, y + 14); g.lineTo(x + 34, y + 22); g.lineTo(x - 34, y + 22); g.fill();
            g.fillStyle = '#CFE6FF';
            g.beginPath(); g.moveTo(x - 38, y - 16); g.lineTo(x + 38, y - 16); g.lineTo(x + 42, y + 14); g.lineTo(x - 42, y + 14); g.closePath(); g.fill();
            g.fillStyle = '#A9CCF2';
            g.fillRect(x - 40, y + 6, 80, 8);
            g.fillStyle = '#FF8A00';
            for (let i = -2; i <= 2; i++) {
                g.beginPath(); g.moveTo(x + i * 14 - 6, y + 2); g.lineTo(x + i * 14, y - 8); g.lineTo(x + i * 14 + 6, y + 2); g.fill();
            }
            g.fillStyle = '#FF4FA3';
            g.fillRect(x - 44, y - 34, 3, 48); g.fillRect(x + 42, y - 34, 3, 48);
            g.beginPath(); g.moveTo(x - 41, y - 34); g.lineTo(x - 26, y - 28); g.lineTo(x - 41, y - 22); g.fill();
            g.beginPath(); g.moveTo(x + 45, y - 34); g.lineTo(x + 60, y - 28); g.lineTo(x + 45, y - 22); g.fill();
        }
    }

    function drawGate(g, gt) {
        const y = gt.y - camY;
        const col = gt.done ? (gt.ok ? '#3DDC84' : '#9AA7B8') : null;
        [[gt.x1, col || '#E53935'], [gt.x2, col || '#1E6FE8']].forEach(([x, c]) => {
            g.fillStyle = 'rgba(80,110,160,0.25)'; g.beginPath(); g.ellipse(x + 3, y + 2, 8, 3, 0, 0, TAU); g.fill();
            g.fillStyle = '#444'; g.fillRect(x - 2, y - 46, 4, 46);
            g.fillStyle = c;
            g.beginPath(); g.moveTo(x + 2, y - 46); g.lineTo(x + 24, y - 38); g.lineTo(x + 2, y - 30); g.fill();
        });
        if (!gt.done) {
            g.strokeStyle = 'rgba(255,255,255,0.6)';
            g.setLineDash([6, 6]); g.lineWidth = 2;
            g.beginPath(); g.moveTo(gt.x1, y); g.lineTo(gt.x2, y); g.stroke();
            g.setLineDash([]);
        }
    }

    function drawSnowball(g) {
        const Bl = S.ball;
        if (!Bl) return;
        const x = Bl.x, y = Bl.y - camY, r = Bl.r;
        if (y < -r - 20) {
            // friendly heads-up at the top of the screen
            const a = 0.6 + 0.4 * Math.sin(t * 0.3);
            g.globalAlpha = a;
            g.fillStyle = '#3DA9FF';
            g.beginPath(); g.moveTo(x, 12); g.lineTo(x + 18, 40); g.lineTo(x - 18, 40); g.fill();
            g.globalAlpha = 1;
            outlinedText(g, 'SNOWBALL!', x, 58, 18, '#FFFFFF', '#1F5FC4');
            return;
        }
        // shadow
        g.fillStyle = 'rgba(80,110,160,0.3)';
        g.beginPath(); g.ellipse(x + 6, y + 4, r * 1.05, r * 0.3, 0, 0, TAU); g.fill();
        const cy = y - r * 0.9;
        g.save();
        g.translate(x, cy);
        // the ball, with rolling bumps
        g.fillStyle = '#FFFFFF';
        g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        g.fillStyle = '#E3EEFB';
        g.beginPath(); g.arc(r * 0.18, r * 0.2, r * 0.8, 0, TAU); g.fill();
        g.fillStyle = '#FFFFFF';
        g.beginPath(); g.arc(-r * 0.1, -r * 0.1, r * 0.78, 0, TAU); g.fill();
        g.fillStyle = '#D2E3F7';
        for (let i = 0; i < 6; i++) {
            const ang = Bl.spin + i * TAU / 6;
            const py = Math.sin(ang) * r * 0.75;
            if (Math.cos(ang) < 0) continue;
            g.beginPath(); g.ellipse((i % 2 ? -1 : 1) * r * 0.5, py, 6, 3, 0, 0, TAU); g.fill();
        }
        // silly happy face
        g.fillStyle = '#FFFFFF';
        g.beginPath(); g.arc(-14, -10, 10, 0, TAU); g.arc(14, -10, 10, 0, TAU); g.fill();
        g.strokeStyle = '#9DB8DA'; g.lineWidth = 2;
        g.beginPath(); g.arc(-14, -10, 10, 0, TAU); g.stroke();
        g.beginPath(); g.arc(14, -10, 10, 0, TAU); g.stroke();
        const look = clamp((P.x - x) * 0.03, -3, 3);
        g.fillStyle = '#2A2A40';
        g.beginPath(); g.arc(-14 + look, -8, 5, 0, TAU); g.arc(14 + look, -8, 5, 0, TAU); g.fill();
        g.fillStyle = '#FFFFFF';
        g.beginPath(); g.arc(-12 + look, -10, 2, 0, TAU); g.arc(16 + look, -10, 2, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,130,170,0.55)';
        g.beginPath(); g.arc(-26, 6, 7, 0, TAU); g.arc(26, 6, 7, 0, TAU); g.fill();
        g.fillStyle = '#FF7A00';
        g.beginPath(); g.moveTo(-4, 0); g.lineTo(4, 0); g.lineTo(0, 9); g.fill();
        g.strokeStyle = '#2A2A40'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.arc(0, 10, 13, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
        g.lineCap = 'butt';
        g.restore();
    }

    function drawLodge(g) {
        const y = S.len - camY;
        if (y > H + 300 || y < -300) return;
        // finish banner
        g.fillStyle = '#444'; g.fillRect(90, y - 90, 8, 90); g.fillRect(862, y - 90, 8, 90);
        for (let i = 0; i < 24; i++) {
            g.fillStyle = i % 2 ? '#111' : '#FFF';
            g.fillRect(98 + i * 32, y - 90, 32, 14);
            g.fillStyle = i % 2 ? '#FFF' : '#111';
            g.fillRect(98 + i * 32, y - 76, 32, 14);
        }
        outlinedText(g, 'FINISH', 480, y - 108, 30, '#FFD400', '#7A2A00');
        // cozy lodge
        const lx = 380, ly = y + 260;
        g.fillStyle = '#8B5A2B'; g.fillRect(lx, ly - 100, 200, 100);
        g.fillStyle = '#6B4424'; for (let i = 0; i < 5; i++) g.fillRect(lx, ly - 95 + i * 20, 200, 3);
        g.fillStyle = '#FFFFFF';
        g.beginPath(); g.moveTo(lx - 24, ly - 96); g.lineTo(lx + 100, ly - 170); g.lineTo(lx + 224, ly - 96); g.closePath(); g.fill();
        g.fillStyle = '#7A4A22'; g.fillRect(lx + 150, ly - 170, 22, 40);
        g.fillStyle = '#FFE38A'; g.fillRect(lx + 24, ly - 70, 34, 28); g.fillRect(lx + 142, ly - 70, 34, 28);
        g.fillStyle = '#5A3418'; rrect(g, lx + 80, ly - 60, 40, 60, 12); g.fill();
        for (let i = 0; i < 4; i++) {
            const sy = ly - 180 - ((t * 0.6 + i * 25) % 100);
            g.fillStyle = `rgba(255,255,255,${0.6 - ((t * 0.6 + i * 25) % 100) / 180})`;
            g.beginPath(); g.arc(lx + 161 + Math.sin((t + i * 30) * 0.05) * 8, sy, 10 + i * 2, 0, TAU); g.fill();
        }
    }

    function drawPlayer(g) {
        const c = Game.char;
        if (P.inv > 0 && Math.floor(P.inv / 4) % 2 === 0) return;
        const x = P.x, y = P.y - camY, h = airHeight();
        g.fillStyle = 'rgba(60,90,140,0.3)';
        g.beginPath(); g.ellipse(x, y + 2, 24 - h * 0.1, 7 - h * 0.03, 0, 0, TAU); g.fill();
        if (P.crash > 0 || P.dead) {
            g.save(); g.translate(x, y);
            g.fillStyle = '#FF4FA3'; g.save(); g.rotate(0.9); g.fillRect(-4, -26, 7, 52); g.restore();
            g.fillStyle = '#3D8BFF'; g.save(); g.rotate(-0.4); g.fillRect(14, -30, 7, 52); g.restore();
            g.restore();
            drawChar(g, c, x, y - 4, { t: Game.t, rot: Math.PI / 2 * P.facing, scale: 0.9 });
            for (let i = 0; i < 3; i++) {
                const a = Game.t * 0.15 + i * TAU / 3;
                drawStarShape(g, x + Math.cos(a) * 22, y - 36 + Math.sin(a) * 8, 5, a, '#FFD400');
            }
            return;
        }
        const lean = P.vx * 0.05;
        const sc = 0.95 + h * 0.004;
        g.save();
        g.translate(x, y - h);
        if (P.spin) g.rotate(P.spin);
        const k = sc;
        g.fillStyle = '#FF4FA3';
        g.save(); g.translate(-8 * k, 4); g.rotate(lean); rrect(g, -3.5 * k, -24 * k, 7 * k, 50 * k, 3); g.fill(); g.restore();
        g.fillStyle = '#3D8BFF';
        g.save(); g.translate(8 * k, 4); g.rotate(lean); rrect(g, -3.5 * k, -24 * k, 7 * k, 50 * k, 3); g.fill(); g.restore();
        g.restore();
        drawChar(g, c, x, y - h + 4, { t: Game.t, facing: P.facing, rot: P.spin + lean * 0.6, scale: sc, air: h > 2 });
        // poles
        g.strokeStyle = '#555'; g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x - 18, y - h - 20); g.lineTo(x - 24 - P.vx, y - h + 12);
        g.moveTo(x + 18, y - h - 20); g.lineTo(x + 24 - P.vx, y - h + 12);
        g.stroke();
    }

    function draw(g) {
        const grad = g.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, pal.snow[0]); grad.addColorStop(1, pal.snow[1]);
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);

        // snow texture
        g.fillStyle = pal.speck;
        const y0 = Math.floor(camY / 40) * 40;
        for (let wy = y0; wy < camY + H + 40; wy += 40) {
            for (let k = 0; k < 6; k++) {
                const hx = hash(wy * 0.071 + k * 3.3);
                g.fillRect(hx * W, wy - camY + hash(wy + k) * 40, 3, 2);
            }
        }
        // ski tracks
        g.strokeStyle = pal.light ? 'rgba(255,255,255,0.4)' : 'rgba(150,185,225,0.55)';
        g.lineWidth = 3;
        for (const side of [-8, 8]) {
            g.beginPath();
            let pen = false;
            for (const p of P.trail) {
                if (p.air) { pen = false; continue; }
                if (!pen) { g.moveTo(p.x + side, p.y - camY + 4); pen = true; } else g.lineTo(p.x + side, p.y - camY + 4);
            }
            g.stroke();
        }
        // forest edges
        const e0 = Math.floor(camY / 55) * 55;
        for (let wy = e0 - 55; wy < camY + H + 80; wy += 55) {
            drawTree(g, 18 + hash(wy) * 14, wy - camY, 1.1);
            drawTree(g, W - 18 - hash(wy + 5) * 14, wy - camY + 25, 1.1);
        }

        drawLodge(g);
        S.gates.forEach(gt => { const y = gt.y - camY; if (y > -60 && y < H + 60) drawGate(g, gt); });
        for (const s of S.stars) {
            if (s.got) continue;
            const y = s.y - camY - (s.air ? 50 : 0);
            if (y > -30 && y < H + 30) drawStar(g, s.x, y - 14, Game.t + s.y * 0.1);
        }
        for (const k of S.tacos) { const y = k.y - camY; if (!k.got && y > -40 && y < H + 40) drawTaco(g, k.x, y - 20, Game.t); }
        for (const b of S.babies) { const y = b.y - camY; if (!b.got && y > -60 && y < H + 60) drawBaby(g, b.x, y, Game.t, 'scarf'); }

        // objects behind the player, then the player, then objects in front
        let i = 0;
        const list = S.objs;
        for (; i < list.length && list[i].y < P.y; i++) {
            const y = list[i].y - camY;
            if (y > -120 && y < H + 120) drawObj(g, list[i]);
        }
        drawPlayer(g);
        for (; i < list.length; i++) {
            const y = list[i].y - camY;
            if (y > H + 120) break;
            if (y > -120) drawObj(g, list[i]);
        }
        drawSnowball(g);
        FX.draw(g, 0, camY);

        // falling snow
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (const f of flakes) { g.beginPath(); g.arc(f.x, f.y, f.s, 0, TAU); g.fill(); }

        // gentle speed lines when tucking: they glide smoothly and fade in/out (no flashing)
        const fast = Input.held.down && P.speed > base() + 1 && !S.finished;
        P.speedFx = lerp(P.speedFx || 0, fast ? 1 : 0, 0.05);
        if (P.speedFx > 0.02) {
            g.strokeStyle = `rgba(255,255,255,${0.35 * P.speedFx})`; g.lineWidth = 2;
            for (let k = 0; k < 8; k++) {
                const lx = 60 + hash(k * 2.3) * (W - 120);
                const ly = H + 60 - ((t * 12 + hash(k * 4.1) * (H + 120)) % (H + 120));
                g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx, ly + 50); g.stroke();
            }
        }
        FX.drawTexts(g, 0, camY);
    }

    function progress() { return clamp(P.y / S.len, 0, 1); }

    return {
        music: 'ski', icon: '⛷️',
        tip: '← → steer  ·  hold ↓ to go FAST  ·  SPACE hop & spin  ·  stay ahead of the giant snowball!',
        debug: () => ({ S, P }),
        init, update, draw, dying, progress
    };
})();
