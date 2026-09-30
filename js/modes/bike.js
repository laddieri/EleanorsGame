// ============================================================
//  BIKE LEVELS: race through town! Hold → to pedal faster,
//  ← to brake, SPACE to hop. Fly off ramps over the river and
//  hold ← or → in the air to do flips for big points!
// ============================================================
'use strict';

MODES.bike = (() => {
    const BASE = 440;
    const GRAV = 0.42;
    let B, P, camX, camY, t, lvl, pal;

    const PALETTES = [
        { sky: ['#6EC6FF', '#D8F1FF'], far: '#9DB7D6', near: '#7B93B8', win: '#CFE8FF', ground: '#8A8F9C', road: '#4A4D5A', water: '#3AA0E8', night: false },
        { sky: ['#6A56C9', '#FF9BB0', '#FFD29A'], far: '#B58CB4', near: '#8E6A9C', win: '#FFE4B0', ground: '#8C7C8C', road: '#4A3F52', water: '#E07BA8', night: false },
        { sky: ['#07082A', '#1E1F5A'], far: '#1D2350', near: '#252C66', win: '#FFE36B', ground: '#3C3F5A', road: '#22243A', water: '#2A4FA8', night: true }
    ];

    const base = () => 5.8 + lvl.d * 1.6;

    function build(level) {
        const d = level.d;
        const rng = makeRng(level.seed + 23);
        const len = Math.round(9500 + d * 6500);
        B = { segs: [], barriers: [], boosts: [], stars: [], tacos: [], babies: [], decor: [], finishX: 0, finished: 0, len };
        let x = -400;
        const seg = (type, w, o = {}) => { B.segs.push(Object.assign({ type, x0: x, x1: x + w }, o)); x += w; };
        const star = (sx, sy) => B.stars.push({ x: sx, y: sy, got: false });
        const lamps = (x0, x1) => { for (let lx = x0 + 60; lx < x1 - 40; lx += rng.int(220, 340)) B.decor.push({ x: lx, kind: rng.chance(0.6) ? 'lamp' : 'tree' }); };

        // simulate a ramp jump so stars follow the path you'll actually fly
        const flyPath = (rx, h, slope, kick, extra, vx) => {
            const pts = [];
            let px0 = rx, py = BASE - h, vy = -(slope * vx + kick + extra);
            for (let f = 0; f < 200; f++) {
                vy += GRAV; px0 += vx; py += vy;
                pts.push({ x: px0, y: py });
                if (py > BASE) break;
            }
            return pts;
        };
        const gapFor = (h, rampLen, kick) => {
            const vx = base() * 0.7;
            const slope = h / rampLen;
            const vy0 = slope * vx + kick;
            const tt = (vy0 + Math.sqrt(vy0 * vy0 + 2 * GRAV * h)) / GRAV;
            return clamp(Math.round((vx * tt - 30) * 0.85), 110, 360);
        };

        seg('flat', 1300); lamps(-400, 900);
        let babyN = 0;
        const babyAt = [0.22, 0.52, 0.8].map(f => f * len);
        let tacoAt = [0.4, 0.72].map(f => f * len);

        while (x < len) {
            const needBaby = babyN < 3 && x > babyAt[babyN];
            let k = rng.pick(['gap', 'gap', 'kicker', 'hills', 'barrier', 'boost', 'gap']);
            if (needBaby) k = 'gap';
            if (k === 'gap') {
                const h = Math.round(60 + d * 30 + rng.range(0, 20)), rl = 190, kick = 5;
                const flatStart = x;
                seg('flat', 160); lamps(flatStart, x);
                const rx = x;
                seg('ramp', rl, { h, kick });
                const gap = gapFor(h, rl, kick);
                seg('gap', gap);
                const land = x;
                seg('flat', 420); lamps(land + 100, x);
                // stars on the normal flight path
                const path = flyPath(rx + rl, h, h / rl, kick, 0, base());
                for (let i = 5; i < path.length - 3; i += 7) star(path[i].x, path[i].y - 20);
                if (needBaby) {
                    const hp = flyPath(rx + rl, h, h / rl, kick, 6.5, base());
                    let apex = hp[0];
                    hp.forEach(p => { if (p.y < apex.y) apex = p; });
                    B.babies.push({ x: apex.x, y: apex.y + 30, got: false });
                    babyN++;
                }
            } else if (k === 'kicker') {
                const h = 55 + Math.round(rng.range(0, 25));
                seg('flat', 150);
                const rx = x;
                seg('ramp', 150, { h, kick: 7 });
                const land = x;
                seg('flat', 520); lamps(land + 200, x);
                const path = flyPath(rx + 150, h, h / 150, 7, 0, base());
                for (let i = 6; i < path.length - 3; i += 8) star(path[i].x, path[i].y - 20);
            } else if (k === 'hills') {
                const n = rng.int(2, 3);
                seg('flat', 120);
                for (let i = 0; i < n; i++) {
                    const hx = x, hw = rng.int(240, 320), hh = rng.int(40, 70 + Math.round(d * 30));
                    seg('hill', hw, { h: hh });
                    star(hx + hw / 2, BASE - hh - 40);
                }
                const s0 = x;
                seg('flat', 200); lamps(s0, x);
            } else if (k === 'barrier') {
                const s0 = x;
                seg('flat', 560); lamps(s0, x);
                const n = d > 0.35 ? 2 : 1;
                for (let i = 0; i < n; i++) {
                    const bx = s0 + 220 + i * 190;
                    B.barriers.push({ x: bx, hit: false, vy: 0, fy: 0, rot: 0 });
                    star(bx, BASE - 110);
                }
            } else if (k === 'boost') {
                const s0 = x;
                seg('flat', 520); lamps(s0, x);
                B.boosts.push({ x0: s0 + 120, x1: s0 + 220 });
                for (let i = 0; i < 5; i++) star(s0 + 280 + i * 45, BASE - 30);
            }
            if (tacoAt.length && x > tacoAt[0]) {
                B.tacos.push({ x: x - 150, y: BASE - 90, got: false });
                tacoAt.shift();
            }
        }
        const s0 = x;
        seg('flat', 1400); lamps(s0, x);
        B.finishX = s0 + 350;
        return B.stars.length;
    }

    function segAt(x) {
        const s = B.segs;
        let lo = 0, hi = s.length - 1;
        while (lo <= hi) {
            const m = (lo + hi) >> 1;
            if (x < s[m].x0) hi = m - 1;
            else if (x >= s[m].x1) lo = m + 1;
            else return s[m];
        }
        return null;
    }

    function groundY(x) {
        const s = segAt(x);
        if (!s) return BASE;
        const k = (x - s.x0) / (s.x1 - s.x0);
        if (s.type === 'flat') return BASE;
        if (s.type === 'ramp') return BASE - s.h * k;
        if (s.type === 'hill') return BASE - s.h * Math.sin(Math.PI * k);
        return null; // gap
    }

    function slopeAt(x) {
        const a = groundY(x - 2), b = groundY(x + 2);
        if (a === null || b === null) return 0;
        return (b - a) / 4;
    }

    function init(level) {
        t = 0;
        lvl = level;
        pal = PALETTES[level.pal || 0];
        const total = build(level);
        P = { x: 200, y: BASE, vx: 0, vy: 0, ground: true, rot: 0, rotV: 0, spinAcc: 0, airT: 0,
              crash: 0, inv: 0, lipT: 0, jumpBuf: 0, boost: 0, safeX: 200, bubble: 0, bubbleFrom: 0, dead: false, wheel: 0 };
        camX = P.x - 260; camY = 0;
        return { stars: total };
    }

    function wipeout() {
        P.crash = 45;
        P.vx = 2.5;
        Sound.play('crash');
        FX.shake(9);
        FX.burst(P.x, P.y - 20, { count: 18, colors: ['#FFD400', '#FFFFFF', '#FF6B6B'], speed: 5, life: 30, shape: 'star', size: 6 });
        if (!Game.hurt()) P.dead = true;
    }

    function update() {
        t++;
        const I = Input.held, IP = Input.pressed;
        const c = Game.char;

        if (B.finished) {
            B.finished++;
            P.vx *= 0.97;
            P.x += P.vx;
            P.y = groundY(P.x) || BASE;
            P.wheel += P.vx * 0.08;
            if (B.finished % 30 === 0) FX.confetti(P.x + 80, P.y - 120, 30);
            if (B.finished === 130) Game.levelDone();
            camX += (P.x - 380 - camX) * 0.05;
            return;
        }

        if (P.bubble > 0) {
            // Gramma B's love bubble floats you back to safety
            P.bubble++;
            const k = Math.min(1, P.bubble / 80), e = k * k * (3 - 2 * k);
            P.x = lerp(P.bubbleFrom, P.safeX, e);
            P.y = lerp(H + 40, BASE - 80, e) + Math.sin(P.bubble * 0.2) * 4;
            if (P.bubble > 95) {
                Sound.play('pop');
                P.bubble = 0; P.ground = false; P.vy = 0; P.vx = base(); P.rot = 0; P.inv = 60;
            }
            camX += (P.x - 260 - camX) * 0.15;
            return;
        }

        if (P.inv > 0) P.inv--;
        if (P.boost > 0) P.boost--;
        if (IP.jump) P.jumpBuf = 8; else if (P.jumpBuf > 0) P.jumpBuf--;

        let target = base() + (I.right ? 2.6 : 0) - (I.left ? 1.8 : 0) + (P.boost > 0 ? 4 : 0);
        target = Math.max(target, base() * 0.7);
        if (P.crash > 0) { P.crash--; target = 2.5; if (P.crash === 0) P.inv = 60; }

        if (P.ground) {
            P.vx = approach(P.vx, target, P.boost > 0 ? 0.3 : 0.1);
            const gy = groundY(P.x);
            const slope = slopeAt(P.x);
            const vyG = slope * P.vx;
            if (P.jumpBuf > 0 && P.crash <= 0) {
                P.vy = vyG - 9.5;
                P.ground = false;
                P.jumpBuf = 0;
                P.lipT = 0;
                Sound.play('jump');
                FX.dust(P.x, P.y, 5);
            } else {
                const nx = P.x + P.vx;
                const ngy = groundY(nx);
                if (ngy === null || ngy > gy + vyG + 4) {
                    const s = segAt(P.x);
                    P.vy = vyG;
                    if (s && s.type === 'ramp') {
                        P.vy -= s.kick;
                        P.lipT = 10;
                        if (P.jumpBuf > 0) { P.vy -= 6.5; P.lipT = 0; P.jumpBuf = 0; bigAir(); }
                    }
                    P.ground = false;
                } else {
                    P.x = nx;
                    P.y = ngy;
                    P.rot = lerp(P.rot, Math.atan(slope), 0.5);
                    const s = segAt(P.x);
                    if (s && s.type === 'flat' && P.crash <= 0) {
                        const nextRampish = segAt(P.x + 200);
                        if (!nextRampish || nextRampish.type === 'flat') P.safeX = P.x;
                    }
                    for (const bz of B.boosts) {
                        if (P.x > bz.x0 && P.x < bz.x1 && P.boost < 80) {
                            if (P.boost <= 0) { Sound.play('boost'); FX.text(P.x, P.y - 80, 'BOOST!', '#7FFFFF', 22); }
                            P.boost = 90;
                        }
                    }
                    if (t % 4 === 0 && P.vx > 7) FX.dust(P.x - 20, P.y, 1, 'rgba(200,200,210,0.7)');
                }
            }
        }

        if (!P.ground) {
            if (P.lipT > 0) {
                P.lipT--;
                if (P.jumpBuf > 0) { P.vy -= 6.5; P.lipT = 0; P.jumpBuf = 0; bigAir(); }
            }
            P.vy += GRAV;
            P.x += P.vx;
            P.y += P.vy;
            P.airT++;
            const dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
            if (dir && P.crash <= 0) P.rotV += dir * 0.012;
            else {
                P.rotV *= 0.85;
                const want = clamp(Math.atan2(P.vy, P.vx) * 0.6, -0.6, 0.6);
                P.rot += wrapAngle(want - P.rot) * 0.05;
            }
            P.rotV = clamp(P.rotV, -0.17, 0.17);
            P.rot += P.rotV;
            P.spinAcc += P.rotV;

            const gy = groundY(P.x);
            if (gy !== null && P.y >= gy && P.vy >= 0) land(gy);
            if (P.y > H + 60 - Math.min(0, camY)) fallInRiver(c);
        }

        P.wheel += P.vx * 0.08;
        interact(c);

        if (P.x >= B.finishX && !B.finished) {
            B.finished = 1;
            Sound.play('win');
            FX.confetti(P.x + 60, P.y - 100, 90);
        }

        camX += (P.x - 260 + (P.vx - base()) * 20 - camX) * 0.15;
        const ty = Math.min(0, P.y - 140);
        camY += (ty - camY) * 0.12;
    }

    function bigAir() {
        Sound.play('jump2');
        FX.text(P.x, P.y - 80, 'BIG AIR!', '#FFE14D', 24);
    }

    function land(gy) {
        const slope = slopeAt(P.x);
        const gA = Math.atan(slope);
        const diff = Math.abs(wrapAngle(P.rot - gA));
        const flips = Math.floor(Math.abs(P.spinAcc) / (TAU - 0.9));
        P.y = gy;
        P.ground = true;
        P.vy = 0;
        if (diff < 1.05 && P.crash <= 0) {
            FX.dust(P.x, P.y, 8);
            Sound.play('land');
            if (flips > 0) {
                const names = ['', 'FLIP!', 'DOUBLE FLIP!', 'TRIPLE FLIP!!', 'MEGA FLIP!!!'];
                Game.addScore(500 * flips * flips, P.x, P.y - 70, '#FFD400');
                FX.text(P.x, P.y - 110, names[Math.min(4, flips)], '#FFFFFF', 28);
                Sound.play('flip');
                FX.confetti(P.x, P.y - 40, 20);
            }
            if (diff < 0.3 && (flips > 0 || P.airT > 50)) {
                Game.addScore(100, P.x + 40, P.y - 40, '#7FFFA0');
                FX.text(P.x, P.y - 145, 'PERFECT!', '#7FFFA0', 20);
            }
        } else if (P.crash <= 0 && P.inv <= 0) {
            wipeout();
        }
        P.rot = gA;
        P.rotV = 0;
        P.spinAcc = 0;
        P.airT = 0;
    }

    function fallInRiver(c) {
        Sound.play('splash');
        FX.burst(P.x, BASE + 60, { count: 25, colors: ['#9FDBFF', '#FFFFFF'], speed: 6, angle: -Math.PI / 2, spread: 1.4, life: 35, shape: 'circle', size: 6 });
        P.rot = 0; P.rotV = 0; P.spinAcc = 0; P.airT = 0;
        if (c.ability === 'bubble') {
            P.bubble = 1;
            P.bubbleFrom = P.x;
            Sound.play('pop');
            return;
        }
        if (!Game.hurt()) { P.dead = true; return; }
        P.x = P.safeX; P.y = BASE; P.ground = true; P.vy = 0; P.vx = base(); P.inv = 90; P.crash = 0;
        camX = P.x - 260;
    }

    function interact(c) {
        const magnet = c.ability === 'magnet';
        const px = P.x, py = P.y - 40;
        for (const s of B.stars) {
            if (s.got) continue;
            if (magnet && dist(s.x, s.y, px, py) < 170) { s.x += (px - s.x) * 0.15; s.y += (py - s.y) * 0.15; }
            if (Math.abs(s.x - px) < 30 && Math.abs(s.y - py) < 40) { s.got = true; Game.collectStar(s.x, s.y); }
        }
        for (const k of B.tacos) if (!k.got && Math.abs(k.x - px) < 32 && Math.abs(k.y - py) < 44) { k.got = true; Game.collectTaco(k.x, k.y); }
        for (const b of B.babies) if (!b.got && Math.abs(b.x - px) < 44 && Math.abs(b.y - py) < 50) { b.got = true; Game.collectBaby(b.x, b.y - 20); }
        for (const br of B.barriers) {
            if (br.hit) { br.fy += br.vy; br.vy += 0.5; br.rot += 0.2; continue; }
            if (Math.abs(br.x - P.x) < 18 && P.y > BASE - 26 && P.inv <= 0 && P.crash <= 0) {
                br.hit = true; br.vy = -8;
                wipeout();
            }
        }
    }

    function dying() {
        P.crash = 10;
        P.vx *= 0.9;
    }

    // ---------- drawing ----------
    function drawCity(g) {
        const grad = g.createLinearGradient(0, 0, 0, H);
        pal.sky.forEach((c, i) => grad.addColorStop(i / (pal.sky.length - 1), c));
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);
        if (pal.night) {
            g.fillStyle = '#FFFFFF';
            for (let i = 0; i < 60; i++) g.fillRect(hash(i) * W, hash(i + 40) * 250, 2, 2);
            g.fillStyle = '#FFF6C8'; g.beginPath(); g.arc(150, 90, 34, 0, TAU); g.fill();
        } else {
            for (let i = 0; i < 4; i++) {
                const cx = ((i * 330 - camX * 0.08 - t * 0.2) % (W + 300) + W + 300) % (W + 300) - 150;
                drawCloud(g, cx, 50 + i * 30, 0.8, 'rgba(255,255,255,0.9)', true);
            }
        }
        const layer = (color, par, hmin, hmax, slot, seed, windows) => {
            const off = camX * par;
            const i0 = Math.floor(off / slot) - 1, i1 = Math.floor((off + W) / slot) + 1;
            for (let i = i0; i <= i1; i++) {
                const bw = slot - 8 - Math.floor(hash(i * 0.13 + seed) * 20);
                const bh = hmin + Math.floor(hash(i * 0.71 + seed) * (hmax - hmin));
                const sx = i * slot - off;
                const top = BASE - bh - camY * par;
                g.fillStyle = color;
                g.fillRect(sx, top, bw, bh + 200);
                if (!windows) continue;
                // each window's on/off is fixed by its building, row and column so it never flickers
                for (let row = 0; top + 12 + row * 22 < BASE - 30 - camY * par; row++) {
                    const wy = top + 12 + row * 22;
                    for (let k = 0; sx + 8 + k * 16 < sx + bw - 12; k++) {
                        const lit = hash(i * 31.7 + k * 3.1 + row * 7.3 + seed) > (pal.night ? 0.45 : 0.72);
                        g.fillStyle = lit ? pal.win : 'rgba(0,0,0,0.15)';
                        g.fillRect(sx + 8 + k * 16, wy, 8, 12);
                    }
                }
            }
        };
        layer(pal.far, 0.15, 120, 260, 90, 1, false);
        layer(pal.near, 0.35, 70, 200, 110, 7, true);
    }

    function drawTerrain(g) {
        // river under the gaps
        const wy = BASE + 70 - camY;
        g.fillStyle = pal.water;
        g.fillRect(0, wy, W, H - wy + 10);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        for (let x = -((camX * 1 + t) % 60); x < W; x += 60) g.fillRect(x, wy + 6 + Math.sin((x + t) * 0.05) * 2, 26, 3);

        for (const s of B.segs) {
            if (s.x1 < camX - 20 || s.x0 > camX + W + 20) continue;
            if (s.type === 'gap') continue;
            const x0 = Math.max(s.x0, camX - 20), x1 = Math.min(s.x1, camX + W + 20);
            g.beginPath();
            g.moveTo(x0 - camX, H + 20);
            for (let x = x0; x <= x1; x += 8) g.lineTo(x - camX, groundY(Math.min(x, s.x1 - 0.01)) - camY);
            g.lineTo(x1 - camX, groundY(s.x1 - 0.01) - camY);
            g.lineTo(x1 - camX, H + 20);
            g.closePath();
            g.fillStyle = s.type === 'ramp' ? '#C97A34' : pal.ground;
            g.fill();
            if (s.type === 'ramp') {
                g.strokeStyle = '#9A5A22'; g.lineWidth = 2;
                for (let px0 = s.x0 + 20; px0 < s.x1; px0 += 24) {
                    if (px0 < camX - 10 || px0 > camX + W + 10) continue;
                    g.beginPath(); g.moveTo(px0 - camX, groundY(px0) - camY); g.lineTo(px0 - camX, BASE - camY); g.stroke();
                }
                const lipX = s.x1 - camX, lipY = BASE - s.h - camY;
                g.fillStyle = '#FF4FA3';
                g.fillRect(lipX - 4, lipY - 30, 4, 30);
                g.beginPath(); g.moveTo(lipX, lipY - 30); g.lineTo(lipX + 16, lipY - 24); g.lineTo(lipX, lipY - 18); g.fill();
            }
            // road surface
            g.beginPath();
            for (let x = x0; x <= x1; x += 8) {
                const y = groundY(Math.min(x, s.x1 - 0.01)) - camY;
                if (x === x0) g.moveTo(x - camX, y); else g.lineTo(x - camX, y);
            }
            g.strokeStyle = s.type === 'ramp' ? '#8A4A18' : pal.road;
            g.lineWidth = 10;
            g.stroke();
            if (s.type !== 'ramp') {
                g.strokeStyle = '#FFD400';
                g.lineWidth = 2;
                g.setLineDash([20, 18]);
                g.lineDashOffset = 0;
                g.beginPath();
                for (let x = x0; x <= x1; x += 8) {
                    const y = groundY(Math.min(x, s.x1 - 0.01)) - camY + 1;
                    if (x === x0) g.moveTo(x - camX, y); else g.lineTo(x - camX, y);
                }
                g.stroke();
                g.setLineDash([]);
            }
            // side walls of pits
            const edge = (ex) => { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(ex - camX - 3, groundY(ex) - camY, 6, H); };
            const prevGap = B.segs[B.segs.indexOf(s) - 1];
            if (prevGap && prevGap.type === 'gap') edge(s.x0 + 1);
        }
    }

    function drawDecor(g) {
        for (const dc of B.decor) {
            const x = dc.x - camX;
            if (x < -60 || x > W + 60) continue;
            const y = BASE - camY - 6;
            if (dc.kind === 'lamp') {
                g.fillStyle = '#3A3D4C'; g.fillRect(x - 2, y - 110, 4, 110); g.fillRect(x - 2, y - 110, 26, 4);
                g.fillStyle = pal.night ? '#FFE36B' : '#FFF6D0';
                g.beginPath(); g.arc(x + 22, y - 102, 6, 0, TAU); g.fill();
                if (pal.night) {
                    g.fillStyle = 'rgba(255,227,107,0.12)';
                    g.beginPath(); g.moveTo(x + 22, y - 100); g.lineTo(x - 10, y); g.lineTo(x + 54, y); g.fill();
                }
            } else {
                g.fillStyle = '#6B4424'; g.fillRect(x - 4, y - 40, 8, 40);
                g.fillStyle = pal.night ? '#1F5A48' : '#3FAE4A';
                g.beginPath(); g.arc(x, y - 55, 24, 0, TAU); g.arc(x - 14, y - 44, 16, 0, TAU); g.arc(x + 14, y - 44, 16, 0, TAU); g.fill();
            }
        }
    }

    function drawBike(g) {
        const c = Game.char;
        if (P.inv > 0 && Math.floor(P.inv / 4) % 2 === 0 && P.bubble === 0) return;
        g.save();
        g.translate(P.x - camX, P.y - camY);
        g.rotate(P.rot);
        const wheel = (wx) => {
            g.strokeStyle = '#1E1E26'; g.lineWidth = 5;
            g.beginPath(); g.arc(wx, -14, 13, 0, TAU); g.stroke();
            g.strokeStyle = '#B8BCC8'; g.lineWidth = 1.5;
            for (let s = 0; s < 4; s++) {
                const a = P.wheel + s * Math.PI / 2;
                g.beginPath(); g.moveTo(wx, -14); g.lineTo(wx + Math.cos(a) * 11, -14 + Math.sin(a) * 11); g.stroke();
            }
        };
        wheel(-20); wheel(20);
        g.strokeStyle = '#E8335A'; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-20, -14); g.lineTo(-4, -30); g.lineTo(14, -30); g.lineTo(20, -14);
        g.moveTo(-4, -30); g.lineTo(2, -14); g.lineTo(-20, -14);
        g.moveTo(14, -30); g.lineTo(16, -40);
        g.stroke();
        g.strokeStyle = '#333'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(10, -42); g.lineTo(22, -42); g.stroke();
        g.fillStyle = '#333'; g.fillRect(-10, -36, 12, 4);
        g.lineCap = 'butt';
        drawChar(g, c, -2, -30, { t: Game.t, facing: 1, run: P.ground && P.vx > 0.5, air: !P.ground, scale: 0.8 });
        g.restore();
        if (P.bubble > 0) {
            g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.fillStyle = 'rgba(190,230,255,0.3)';
            g.beginPath(); g.arc(P.x - camX, P.y - camY - 30, 50, 0, TAU); g.fill(); g.stroke();
        }
        if (P.crash > 0) {
            for (let i = 0; i < 3; i++) {
                const a = Game.t * 0.15 + i * TAU / 3;
                drawStarShape(g, P.x - camX + Math.cos(a) * 22, P.y - camY - 80 + Math.sin(a) * 7, 5, a, '#FFD400');
            }
        }
    }

    function draw(g) {
        drawCity(g);
        drawDecor(g);
        drawTerrain(g);
        for (const bz of B.boosts) {
            const x = bz.x0 - camX, y = BASE - camY;
            if (x > W || x < -120) continue;
            g.fillStyle = 'rgba(0,255,255,0.35)';
            g.fillRect(x, y - 5, bz.x1 - bz.x0, 8);
            g.fillStyle = '#7FFFFF';
            for (let i = 0; i < 4; i++) {
                const ax = x + 10 + i * 22 + ((t * 2) % 22);
                g.beginPath(); g.moveTo(ax, y - 4); g.lineTo(ax + 10, y - 1); g.lineTo(ax, y + 2); g.fill();
            }
        }
        for (const br of B.barriers) {
            const x = br.x - camX, y = BASE - camY + br.fy;
            if (x < -60 || x > W + 60 || y > H + 60) continue;
            g.save(); g.translate(x, y); g.rotate(br.rot);
            g.fillStyle = '#444'; g.fillRect(-16, -26, 4, 26); g.fillRect(12, -26, 4, 26);
            for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : '#E53935'; g.fillRect(-20 + i * 10, -26, 10, 10); }
            g.restore();
        }
        // finish arch
        const fx = B.finishX - camX, fy = BASE - camY;
        if (fx > -200 && fx < W + 200) {
            g.fillStyle = '#555'; g.fillRect(fx - 90, fy - 160, 8, 160); g.fillRect(fx + 82, fy - 160, 8, 160);
            for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) {
                g.fillStyle = (i + j) % 2 ? '#111' : '#FFF';
                g.fillRect(fx - 90 + i * 18, fy - 170 + j * 14, 18, 14);
            }
            outlinedText(g, 'FINISH', fx, fy - 190, 26, '#FFD400', '#7A2A00');
        }
        for (const s of B.stars) {
            if (s.got) continue;
            const x = s.x - camX;
            if (x > -30 && x < W + 30) drawStar(g, x, s.y - camY, Game.t + s.x * 0.1);
        }
        for (const k of B.tacos) if (!k.got) drawTaco(g, k.x - camX, k.y - camY, Game.t);
        for (const b of B.babies) if (!b.got) drawBaby(g, b.x - camX, b.y - camY + 20, Game.t, 'goggles');
        drawBike(g);
        FX.draw(g, camX, camY);
        // gentle speed lines: they glide smoothly and fade in/out (no flashing)
        const fast = P.boost > 0 || (Input.held.right && P.vx > base() + 1.5);
        P.speedFx = lerp(P.speedFx || 0, fast ? 1 : 0, 0.05);
        if (P.speedFx > 0.02) {
            g.strokeStyle = `rgba(255,255,255,${0.3 * P.speedFx})`; g.lineWidth = 2;
            for (let k = 0; k < 7; k++) {
                const ly = 60 + hash(k * 1.7) * (H - 120);
                const lx = W + 80 - ((t * 14 + hash(k * 5.3) * (W + 160)) % (W + 160));
                g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 70, ly); g.stroke();
            }
        }
        FX.drawTexts(g, camX, camY);
    }

    function progress() { return clamp((P.x - 200) / (B.finishX - 200), 0, 1); }

    return {
        music: 'bike', icon: '🚲',
        tip: '→ pedal faster · ← brake · SPACE hop · in the air hold ← or → to FLIP!',
        debug: () => ({ B, P }),
        init, update, draw, dying, progress
    };
})();
