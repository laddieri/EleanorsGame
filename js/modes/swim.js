// ============================================================
//  SWIM LEVELS: pass the swim test at the city pool! Swim to
//  the far wall, dodge the splashing kids, dive under pool
//  noodles and cannonballs, and grab the diving rings on the
//  bottom of the pool.
// ============================================================
'use strict';

MODES.swim = (() => {
    const PY = 170;          // where the swimmer sits on the screen
    const POOL_L = 70, POOL_R = 890;
    const LANES = 6, LANE_W = (POOL_R - POOL_L) / LANES;
    const DIVE = 46, DIVE_COOL = 40;
    let S, P, camY, t, lvl, pal;

    const PALETTES = [
        { water: ['#3FC8F0', '#1E9FE0'], deck: '#F3E6CC', tile: '#E2D2B0', light: 'rgba(255,255,255,0.22)', night: false },
        { water: ['#4FB6E8', '#3A7FD0'], deck: '#F5D9C8', tile: '#E6BFA8', light: 'rgba(255,220,200,0.22)', night: false },
        { water: ['#1C6FB8', '#0E3F80'], deck: '#4A4E6A', tile: '#3C4058', light: 'rgba(150,230,255,0.18)', night: true }
    ];

    const SKIN = ['#FDBCB4', '#E8A77C', '#C68642', '#8D5524', '#F1C9A5'];
    const CAPS = ['#FF4F5E', '#FFD400', '#3D8BFF', '#3DDC84', '#B36BFF', '#FF8A3D', '#FF7BC0'];
    const KID_QUIPS = ['Marco!', 'Polo!', 'Watch this!', 'I can float!', 'Cannonball!!', 'Race you!', 'The water is SO cold', 'I lost my goggles', 'Is it snack time?', 'Look, no hands!', 'Splash splash!', 'I can hold my breath!'];
    const laneX = (i) => POOL_L + LANE_W * (i + 0.5);
    const base = () => 3.3 + lvl.d * 1.3;

    function build(level) {
        const d = level.d;
        const rng = makeRng(level.seed);
        const len = Math.round(9000 + d * 5000);
        S = { len, obs: [], stars: [], rings: [], tacos: [], babies: [], cannon: [], finished: 0 };
        const kid = (x, y) => ({ skin: rng.pick(SKIN), cap: rng.pick(CAPS), goggles: rng.chance(0.4), hair: rng.chance(0.4), phase: rng() * TAU, x, y,
            quip: rng.chance(0.35) ? rng.pick(KID_QUIPS) : null, show: 0, hit: 0 });

        let y = 600;
        while (y < len - 400) {
            const n = clamp(rng.int(1, 2 + Math.round(d * 2)), 1, LANES - 2);
            const lanes = [0, 1, 2, 3, 4, 5].sort(() => rng() - 0.5).slice(0, n);
            for (const ln of lanes) {
                const x = laneX(ln) + rng.range(-25, 25);
                const r = rng();
                if (r < 0.45) S.obs.push(Object.assign(kid(x, y), { kind: 'kid', r: 22, vx: 0, home: x }));
                else if (r < 0.6 + d * 0.1) S.obs.push(Object.assign(kid(x, y), { kind: 'swimmer', r: 22, vx: (rng.chance(0.5) ? 1 : -1) * (1 + d * 1.2) }));
                else if (r < 0.75) S.obs.push(Object.assign(kid(x, y), { kind: 'tube', r: 32, vx: rng.range(-0.3, 0.3), spin: rng() * TAU, tube: rng.pick(['#FF4F8B', '#FFD400', '#3DDC84', '#7FD4FF']) }));
                else if (r < 0.88) S.obs.push({ kind: 'noodle', x, y, w: 110, color: rng.pick(['#FF4F8B', '#3DDC84', '#FFD400', '#B36BFF']), phase: rng() * TAU, hit: 0 });
                else S.obs.push({ kind: 'ball', x, y, r: 20, vx: (rng.chance(0.5) ? 1 : -1) * 1.5, bonked: false, spin: 0 });
            }
            // stars in a free lane
            const free = [0, 1, 2, 3, 4, 5].filter(l => !lanes.includes(l));
            if (free.length && rng.chance(0.32 - d * 0.12)) {
                const ln = rng.pick(free);
                for (let i = 0; i < 3; i++) S.stars.push({ x: laneX(ln), y: y - 40 + i * 40, got: false });
            }
            y += rng.range(170 - d * 55, 230 - d * 60);
        }
        // diving rings on the pool floor (dive to grab them!)
        for (let ry = 1000; ry < len - 500; ry += rng.range(1100, 1500)) {
            const ln = rng.int(0, LANES - 1);
            for (let i = 0; i < 3; i++) S.rings.push({ x: laneX(ln), y: ry + i * 45, got: false, color: CAPS[i + 1] });
        }
        // cannonball kids (they jump in from the side!)
        if (d >= 0.1) {
            for (let cy = 1800; cy < len - 800; cy += rng.range(1500 - d * 600, 2100 - d * 700)) {
                S.cannon.push({ x: laneX(rng.int(1, 4)), y: cy, state: 'wait', timer: 0, side: rng.chance(0.5) ? -1 : 1, kid: kid(0, 0) });
            }
        }
        [0.35, 0.7].forEach(f => S.tacos.push({ x: laneX(rng.int(0, 5)), y: len * f, got: false }));
        [0.2, 0.5, 0.8].forEach(f => {
            const by = Math.round(len * f);
            const bx = laneX(rng.pick([0, 5, 1, 4]));
            S.babies.push({ x: bx, y: by, got: false });
        });
        // keep babies, tacos and rings from being buried under kids
        const clearAround = (list, r) => list.forEach(it => { S.obs = S.obs.filter(o => dist(o.x, o.y, it.x, it.y) > r); });
        clearAround(S.babies, 80); clearAround(S.tacos, 70); clearAround(S.rings, 60);
        S.stars = S.stars.filter(s => !S.obs.some(o => dist(o.x, o.y, s.x, s.y) < 45));
        S.obs.sort((a, b) => a.y - b.y);
        return S.stars.length + S.rings.length;
    }

    function init(level) {
        t = 0;
        lvl = level;
        pal = PALETTES[level.pal || 0];
        const total = build(level);
        P = { x: laneX(2) + LANE_W / 2, y: 0, vx: 0, speed: 0, dive: 0, cool: 0, stun: 0, inv: 0, dead: false, facing: 1 };
        camY = P.y - PY;
        return { stars: total };
    }

    const diveLen = () => (Game.char.ability === 'floaty' ? DIVE * 2 : DIVE); // Ricky Fish is a natural!

    function bump(o, msg) {
        if (P.inv > 0 || P.stun > 0 || P.dead) return;
        P.stun = 40;
        P.speed = 0.5;
        P.vx = P.x < o.x ? -3 : 3;
        Sound.play('splash');
        FX.shake(5);
        FX.burst(P.x, P.y - 10, { count: 20, colors: ['#FFFFFF', '#BDEBFF'], speed: 4, life: 30, shape: 'circle', size: 6, gravity: 0.1 });
        FX.text(P.x, P.y - 80, msg || 'Oops! Sorry!', '#FFFFFF', 22);
        if (!Game.hurt()) P.dead = true;
    }

    function update() {
        t++;
        const I = Input.held, IP = Input.pressed;
        const c = Game.char;

        if (S.finished) {
            S.finished++;
            P.speed *= 0.9;
            P.y = Math.min(P.y + P.speed, S.len);
            if (S.finished % 30 === 0) FX.confetti(P.x, P.y - 80, 30);
            if (S.finished === 150) Game.levelDone();
            camY += (P.y - PY - camY) * 0.1;
            return;
        }

        if (P.inv > 0) P.inv--;
        if (P.cool > 0) P.cool--;
        if (P.stun > 0) {
            P.stun--;
            P.vx *= 0.9;
            if (P.stun === 0) P.inv = 80;
        } else {
            const dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
            if (dir) P.facing = dir;
            P.vx = clamp((P.vx + dir * 0.5) * 0.88, -5.5, 5.5);
            const target = base() + (I.down ? 2.4 : 0) + (P.dive > 0 ? 0.6 : 0);
            P.speed = approach(P.speed, target, 0.06);
            if (IP.jump && P.dive <= 0 && P.cool <= 0) {
                P.dive = diveLen();
                Sound.play('pop');
                FX.burst(P.x, P.y - 10, { count: 12, colors: ['#FFFFFF', '#BDEBFF'], speed: 3, angle: -Math.PI / 2, spread: 2, life: 22, shape: 'circle', size: 5 });
            }
        }
        if (P.dive > 0) {
            P.dive--;
            if (t % 5 === 0) FX.burst(P.x + (Math.random() - 0.5) * 16, P.y - 10, { count: 1, color: 'rgba(255,255,255,0.8)', speed: 0.6, angle: -Math.PI / 2, spread: 1, life: 30, shape: 'circle', size: 4, gravity: -0.03 });
            if (P.dive === 0) {
                P.cool = DIVE_COOL;
                Sound.play('splash');
                FX.burst(P.x, P.y - 10, { count: 10, colors: ['#FFFFFF', '#BDEBFF'], speed: 3, life: 20, shape: 'circle', size: 5 });
            }
        } else if (P.stun <= 0 && t % 14 === 0 && P.speed > 1) {
            // swim-stroke splashes
            const side = (t / 14) % 2 ? -1 : 1;
            FX.burst(P.x + side * 18, P.y - 14, { count: 3, color: 'rgba(255,255,255,0.9)', speed: 1.5, angle: -Math.PI / 2, spread: 1.5, life: 16, shape: 'circle', size: 4 });
        }

        P.x = clamp(P.x + P.vx, POOL_L + 20, POOL_R - 20);
        P.y += P.speed;
        const under = P.dive > 0;

        // ---- the other kids & pool toys ----
        for (const o of S.obs) {
            if (o.y < P.y - 700) continue;
            if (o.y > P.y + 700) break;
            if (o.hit > 0) o.hit--;
            if (o.kind === 'swimmer') {
                o.x += o.vx;
                if (o.x < POOL_L + 24 || o.x > POOL_R - 24) o.vx = -o.vx;
            } else if (o.kind === 'kid') {
                o.x = o.home + Math.sin(t * 0.02 + o.phase) * 14;
            } else if (o.kind === 'tube') {
                o.x += o.vx; o.spin += 0.01;
                if (o.x < POOL_L + 34 || o.x > POOL_R - 34) o.vx = -o.vx;
            } else if (o.kind === 'ball') {
                o.x += o.vx; o.spin += o.vx * 0.05;
                if (o.x < POOL_L + 22 || o.x > POOL_R - 22) o.vx = -o.vx;
                o.vx *= 0.995;
                if (Math.abs(o.vx) < 1) o.vx = Math.sign(o.vx || 1) * 1;
            }
            if (o.quip && Math.abs(o.y - P.y) < 220) o.show = 90; else if (o.show > 0) o.show--;
            if (under || P.stun > 0) continue;
            if (o.kind === 'noodle') {
                if (Math.abs(P.y - o.y) < 12 && Math.abs(P.x - o.x) < o.w / 2 + 12) { o.hit = 20; bump(o, 'Noodle bonk!'); }
            } else if (o.kind === 'ball') {
                if (dist(P.x, P.y, o.x, o.y) < o.r + 18) {
                    o.vx = (o.x > P.x ? 1 : -1) * 6;
                    o.y += 30;
                    if (!o.bonked) { o.bonked = true; Game.addScore(25, o.x, o.y - 40, '#FFD400'); }
                    Sound.play('boing');
                    FX.text(o.x, o.y - 60, 'BONK!', '#FFFFFF', 20);
                }
            } else if (dist(P.x, P.y, o.x, o.y) < o.r + 14) {
                o.hit = 30;
                bump(o);
            }
        }

        // ---- cannonballs! ----
        for (const cb of S.cannon) {
            if (cb.state === 'wait' && cb.y - P.y < 420) { cb.state = 'warn'; cb.timer = 75; }
            else if (cb.state === 'warn') {
                if (--cb.timer <= 0) {
                    cb.state = 'splash'; cb.timer = 30;
                    Sound.play('splash');
                    FX.shake(6);
                    FX.burst(cb.x, cb.y, { count: 40, colors: ['#FFFFFF', '#BDEBFF', '#7FD4FF'], speed: 7, life: 40, shape: 'circle', size: 7, gravity: 0.2 });
                    FX.text(cb.x, cb.y - 70, 'CANNONBALL!', '#FFFFFF', 24);
                    if (!under && dist(P.x, P.y, cb.x, cb.y) < 70) bump(cb, 'Whoa, big splash!');
                }
            } else if (cb.state === 'splash' && --cb.timer <= 0) {
                cb.state = 'done';
                S.obs.push(Object.assign(cb.kid, { kind: 'kid', r: 22, vx: 0, home: cb.x, x: cb.x, y: cb.y, quip: 'Did you see that?!' }));
                S.obs.sort((a, b) => a.y - b.y);
            }
        }

        // ---- collecting ----
        const magnet = c.ability === 'magnet';
        const grab = (list, r, cb) => {
            for (const s of list) {
                if (s.got) continue;
                if (magnet && dist(s.x, s.y, P.x, P.y) < 160) { s.x += (P.x - s.x) * 0.12; s.y += (P.y - s.y) * 0.12; }
                if (dist(s.x, s.y, P.x, P.y) < r) { s.got = true; cb(s); }
            }
        };
        if (!under) {
            grab(S.stars, 30, s => Game.collectStar(s.x, s.y - 20));
            grab(S.tacos, 32, k => Game.collectTaco(k.x, k.y - 20));
            grab(S.babies, 36, b => Game.collectBaby(b.x, b.y - 30));
        } else {
            grab(S.rings, 34, r => { Game.collectStar(r.x, r.y - 10); FX.text(r.x, r.y - 40, 'Ring!', r.color, 18); });
        }

        if (P.y >= S.len - 30) {
            S.finished = 1;
            P.dive = 0;
            Sound.play('whistle');
            Sound.play('win');
            FX.text(W / 2, S.len - 150, 'SWIM TEST PASSED!', '#FFD400', 38);
            FX.confetti(P.x, P.y - 80, 90);
        }
        camY = P.y - PY;
    }

    function dying() { P.stun = 10; P.speed *= 0.9; }

    // ---------- drawing ----------
    function drawWater(g) {
        const grad = g.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, pal.water[0]); grad.addColorStop(1, pal.water[1]);
        g.fillStyle = grad;
        g.fillRect(POOL_L, 0, POOL_R - POOL_L, H);
        // lane lines on the pool floor
        g.fillStyle = 'rgba(10,50,120,0.35)';
        for (let i = 0; i < LANES; i++) {
            const x = laneX(i);
            g.fillRect(x - 5, 0, 10, H);
            const ty = S.len - 90 - camY;
            if (ty > -30 && ty < H + 30) g.fillRect(x - 25, ty, 50, 10);
        }
        // shimmering light on the water
        g.strokeStyle = pal.light;
        g.lineWidth = 3;
        const y0 = Math.floor(camY / 70) * 70;
        for (let wy = y0; wy < camY + H + 70; wy += 70) {
            for (let k = 0; k < 5; k++) {
                const hx = POOL_L + hash(wy * 0.13 + k) * (POOL_R - POOL_L);
                const yy = wy - camY + hash(wy + k * 7) * 60;
                g.beginPath();
                g.moveTo(hx - 30, yy);
                g.quadraticCurveTo(hx, yy + Math.sin(t * 0.05 + k + wy) * 8, hx + 30, yy);
                g.stroke();
            }
        }
        if (pal.night) {
            for (let wy = Math.floor(camY / 260) * 260; wy < camY + H + 260; wy += 260) {
                for (const lx of [POOL_L + 4, POOL_R - 4]) {
                    const rg = g.createRadialGradient(lx, wy - camY, 0, lx, wy - camY, 110);
                    rg.addColorStop(0, 'rgba(160,240,255,0.45)'); rg.addColorStop(1, 'rgba(160,240,255,0)');
                    g.fillStyle = rg; g.fillRect(lx - 110, wy - camY - 110, 220, 220);
                }
            }
        }
    }

    function drawDeck(g) {
        for (const [x0, w] of [[0, POOL_L], [POOL_R, W - POOL_R]]) {
            g.fillStyle = pal.deck;
            g.fillRect(x0, 0, w, H);
            g.fillStyle = pal.tile;
            for (let wy = Math.floor(camY / 35) * 35; wy < camY + H + 35; wy += 35) g.fillRect(x0, wy - camY, w, 2);
            g.fillRect(x0 + w / 2, 0, 2, H);
        }
        // pool edge
        g.fillStyle = '#FFFFFF';
        g.fillRect(POOL_L - 6, 0, 6, H); g.fillRect(POOL_R, 0, 6, H);
        // distance markers, umbrellas and towels
        for (let wy = Math.floor(camY / 500) * 500; wy < camY + H + 500; wy += 500) {
            if (wy <= 0 || wy > S.len) continue;
            const y = wy - camY;
            outlinedText(g, `${Math.round(wy / 100)}m`, POOL_L / 2, y, 16, '#FFFFFF', '#1F5FC4');
            const ux = POOL_R + (W - POOL_R) / 2, uy = y + 200;
            if (hash(wy) > 0.4) {
                for (let s = 0; s < 8; s++) {
                    g.fillStyle = s % 2 ? '#FFFFFF' : (hash(wy + 3) > 0.5 ? '#FF4F8B' : '#3D8BFF');
                    g.beginPath(); g.moveTo(ux, uy); g.arc(ux, uy, 30, s * TAU / 8, (s + 1) * TAU / 8); g.fill();
                }
            } else {
                g.fillStyle = hash(wy + 9) > 0.5 ? '#FFD400' : '#3DDC84';
                g.fillRect(ux - 18, uy - 34, 36, 68);
                g.fillStyle = 'rgba(255,255,255,0.6)';
                g.fillRect(ux - 18, uy - 20, 36, 5); g.fillRect(ux - 18, uy + 14, 36, 5);
            }
        }
    }

    function drawFinish(g) {
        const y = S.len - camY;
        if (y < -200 || y > H + 300) return;
        // backstroke flags
        const fy = y - 120;
        g.strokeStyle = '#666'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, fy); g.lineTo(W, fy); g.stroke();
        for (let x = 20; x < W; x += 34) {
            g.fillStyle = CAPS[(x / 34 | 0) % CAPS.length];
            g.beginPath(); g.moveTo(x, fy); g.lineTo(x + 16, fy); g.lineTo(x + 8, fy + 18); g.fill();
        }
        // the wall and touch pads
        g.fillStyle = '#FFFFFF';
        g.fillRect(POOL_L - 6, y, POOL_R - POOL_L + 12, 16);
        g.fillStyle = pal.deck;
        g.fillRect(0, y + 16, W, H);
        for (let i = 0; i < LANES; i++) {
            g.fillStyle = '#FFD400';
            g.fillRect(laneX(i) - 40, y - 6, 80, 10);
        }
        outlinedText(g, 'FINISH — SWIM TEST', W / 2, y + 60, 26, '#FFD400', '#1F5FC4');
        // lifeguard on a tall chair
        const lx = W / 2 + 280, ly = y + 150;
        g.fillStyle = '#FFFFFF';
        g.fillRect(lx - 30, ly - 60, 6, 70); g.fillRect(lx + 24, ly - 60, 6, 70);
        g.fillRect(lx - 30, ly - 60, 60, 8);
        g.fillStyle = '#FF3B3B';
        rrect(g, lx - 20, ly - 100, 40, 44, 8); g.fill();
        g.fillStyle = '#FFFFFF'; g.font = `700 11px ${FONT}`; g.textAlign = 'center'; g.fillText('GUARD', lx, ly - 74);
        g.fillStyle = '#E8A77C';
        g.beginPath(); g.arc(lx, ly - 114, 15, 0, TAU); g.fill();
        g.fillStyle = '#222'; g.fillRect(lx - 12, ly - 118, 24, 6);
        g.fillStyle = '#C23466'; g.fillRect(lx - 5, ly - 104, 10, 2);
        if (S.finished) {
            // holds up a PASSED sign
            g.fillStyle = '#FFFFFF'; rrect(g, lx - 70, ly - 190, 90, 44, 8); g.fill();
            g.strokeStyle = '#3DDC84'; g.lineWidth = 4; g.stroke();
            g.fillStyle = '#1E9E5A'; g.font = `700 18px ${FONT}`; g.fillText('PASSED ✓', lx - 25, ly - 162);
        }
    }

    function drawKid(g, o, x, y) {
        const splash = Math.sin(t * 0.25 + o.phase);
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.beginPath(); g.ellipse(x, y + 6, 28, 10, 0, 0, TAU); g.fill();
        if (o.kind === 'tube') {
            g.save(); g.translate(x, y); g.rotate(o.spin);
            g.lineWidth = 16; g.strokeStyle = o.tube;
            g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.stroke();
            g.lineWidth = 16; g.strokeStyle = 'rgba(255,255,255,0.8)';
            for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(0, 0, 26, i * TAU / 4, i * TAU / 4 + 0.35); g.stroke(); }
            g.restore();
        }
        // arms splashing
        g.fillStyle = o.skin;
        const ay = o.kind === 'swimmer' ? 0 : splash * 6;
        g.fillRect(x - 24, y - 6 - ay, 8, 14);
        g.fillRect(x + 16, y - 6 + ay, 8, 14);
        // head
        g.beginPath(); g.arc(x, y - 6, 15, 0, TAU); g.fill();
        g.fillStyle = o.cap;
        g.beginPath(); g.arc(x, y - 9, 15, Math.PI, 0); g.fill();
        if (o.hair && !o.goggles) { g.fillRect(x - 15, y - 10, 5, 10); g.fillRect(x + 10, y - 10, 5, 10); }
        if (o.goggles) {
            g.fillStyle = '#222'; g.fillRect(x - 13, y - 9, 26, 3);
            g.fillStyle = '#7FD4FF'; g.fillRect(x - 11, y - 11, 9, 6); g.fillRect(x + 2, y - 11, 9, 6);
        } else {
            g.fillStyle = '#222'; g.fillRect(x - 7, y - 8, 3, 3); g.fillRect(x + 4, y - 8, 3, 3);
        }
        g.fillStyle = '#C2185B';
        if (o.hit > 0) { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
        else g.fillRect(x - 4, y - 1, 8, 2);
        if (Math.abs(splash) > 0.9 && o.kind !== 'swimmer') {
            g.fillStyle = 'rgba(255,255,255,0.85)';
            g.beginPath(); g.arc(x + (splash > 0 ? 22 : -22), y - 18, 4, 0, TAU); g.arc(x + (splash > 0 ? 28 : -28), y - 24, 3, 0, TAU); g.fill();
        }
        if (o.show > 0) drawSpeech(g, x, y - 24, o.quip, Math.min(1, o.show / 15), '#7FD4FF');
    }

    function drawObs(g, o) {
        const x = o.x, y = o.y - camY;
        if (y < -80 || y > H + 80) return;
        if (o.kind === 'noodle') {
            const bob = Math.sin(t * 0.06 + o.phase) * 2;
            g.fillStyle = 'rgba(255,255,255,0.4)';
            g.beginPath(); g.ellipse(x, y + 6, o.w / 2 + 8, 10, 0, 0, TAU); g.fill();
            g.fillStyle = o.color;
            rrect(g, x - o.w / 2, y - 8 + bob, o.w, 16, 8); g.fill();
            g.fillStyle = 'rgba(255,255,255,0.45)';
            rrect(g, x - o.w / 2 + 6, y - 5 + bob, o.w - 12, 4, 2); g.fill();
            g.fillStyle = 'rgba(0,0,0,0.25)';
            g.beginPath(); g.ellipse(x - o.w / 2 + 3, y + bob, 3, 6, 0, 0, TAU); g.fill();
        } else if (o.kind === 'ball') {
            g.save(); g.translate(x, y - 6); g.rotate(o.spin);
            const cols = ['#FF4F5E', '#FFFFFF', '#3D8BFF', '#FFFFFF', '#FFD400', '#FFFFFF'];
            for (let s = 0; s < 6; s++) {
                g.fillStyle = cols[s];
                g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, o.r, s * TAU / 6, (s + 1) * TAU / 6); g.fill();
            }
            g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
            g.restore();
        } else {
            drawKid(g, o, x, y);
        }
    }

    function drawCannon(g) {
        for (const cb of S.cannon) {
            const y = cb.y - camY;
            if (y < -100 || y > H + 100) continue;
            if (cb.state === 'warn') {
                const k = 1 - cb.timer / 75;
                g.fillStyle = `rgba(20,40,90,${0.15 + k * 0.25})`;
                g.beginPath(); g.ellipse(cb.x, y, 30 + k * 40, 12 + k * 16, 0, 0, TAU); g.fill();
                if (Math.floor(t / 8) % 2) outlinedText(g, '!', cb.x, y - 10, 34, '#FFD400', '#B00020');
                // the kid flying in from the deck
                const sx = cb.side < 0 ? 20 : W - 20;
                const kx = lerp(sx, cb.x, k), ky = y - Math.sin(k * Math.PI) * 140 - 40;
                const o = cb.kid;
                g.fillStyle = o.skin;
                g.beginPath(); g.arc(kx, ky, 16, 0, TAU); g.fill();
                g.fillStyle = o.cap;
                g.beginPath(); g.arc(kx, ky - 3, 16, Math.PI, 0); g.fill();
                g.fillStyle = o.skin; g.fillRect(kx - 18, ky + 4, 36, 10);
                g.fillStyle = '#222'; g.fillRect(kx - 6, ky - 2, 3, 3); g.fillRect(kx + 3, ky - 2, 3, 3);
                g.fillStyle = '#C2185B'; g.beginPath(); g.arc(kx, ky + 5, 4, 0, TAU); g.fill();
            }
        }
    }

    function drawPlayer(g) {
        const c = Game.char;
        if (P.inv > 0 && Math.floor(P.inv / 4) % 2 === 0) return;
        const x = P.x, y = P.y - camY;
        if (P.dive > 0) {
            // a shadowy shape under the water, with a breath meter
            drawChar(g, c, x, y + 10, { t: Game.t, facing: P.facing, scale: 0.85, alpha: 0.35, air: true });
            g.fillStyle = 'rgba(30,110,200,0.35)';
            g.beginPath(); g.ellipse(x, y - 15, c.w * 0.9, c.h * 0.55, 0, 0, TAU); g.fill();
            const left = P.dive / diveLen();
            g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4;
            g.beginPath(); g.arc(x, y - 70, 10, -Math.PI / 2, -Math.PI / 2 + TAU * left); g.stroke();
            return;
        }
        const bob = Math.sin(Game.t * 0.2) * 2;
        const waterline = y - 6 + bob;
        g.save();
        g.beginPath(); g.rect(0, 0, W, waterline); g.clip();
        drawChar(g, c, x, y + 16 + bob, { t: Game.t, facing: P.facing, run: P.stun <= 0, rot: P.stun > 0 ? Math.sin(P.stun * 0.4) * 0.5 : 0, scale: 0.95 });
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(x, waterline, c.w * 0.75 + 6, 7, 0, 0, TAU); g.stroke();
        if (P.cool > 0) {
            g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
            g.beginPath(); g.arc(x, y - c.h - 20, 8, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - P.cool / DIVE_COOL)); g.stroke();
        }
        if (P.stun > 0) {
            for (let i = 0; i < 3; i++) {
                const a = Game.t * 0.15 + i * TAU / 3;
                drawStarShape(g, x + Math.cos(a) * 22, y - c.h - 6 + Math.sin(a) * 7, 5, a, '#FFD400');
            }
        }
    }

    function draw(g) {
        drawWater(g);
        // diving rings on the bottom (sparkly when you're diving)
        for (const r of S.rings) {
            if (r.got) continue;
            const y = r.y - camY;
            if (y < -30 || y > H + 30) continue;
            g.globalAlpha = P.dive > 0 ? 1 : 0.55;
            g.strokeStyle = r.color; g.lineWidth = 6;
            g.beginPath(); g.ellipse(r.x, y, 14, 9, 0, 0, TAU); g.stroke();
            g.globalAlpha = 1;
        }
        drawDeck(g);
        drawFinish(g);
        for (const s of S.stars) {
            if (s.got) continue;
            const y = s.y - camY;
            if (y > -30 && y < H + 30) drawStar(g, s.x, y - 16, Game.t + s.y * 0.1);
        }
        for (const k of S.tacos) { const y = k.y - camY; if (!k.got && y > -40 && y < H + 40) drawTaco(g, k.x, y - 20, Game.t); }
        for (const b of S.babies) { const y = b.y - camY; if (!b.got && y > -60 && y < H + 60) drawBaby(g, b.x, y, Game.t, 'goggles'); }
        let i = 0;
        const list = S.obs;
        for (; i < list.length && list[i].y < P.y; i++) drawObs(g, list[i]);
        drawPlayer(g);
        for (; i < list.length; i++) {
            if (list[i].y - camY > H + 80) break;
            drawObs(g, list[i]);
        }
        drawCannon(g);
        FX.draw(g, 0, camY);
        FX.drawTexts(g, 0, camY);
    }

    function progress() { return clamp(P.y / S.len, 0, 1); }

    return {
        music: 'swim', icon: '🏊',
        tip: '← → swim sideways · hold ↓ to kick FAST · SPACE to dive under kids & noodles!',
        debug: () => ({ S, P }),
        init, update, draw, dying, progress
    };
})();
