// ============================================================
//  TRAMPOLINE PARK LEVELS: boing from trampoline to trampoline!
//  Steer in the air, HOLD jump as you land for a BIG bounce,
//  don't fall onto the floor and don't crash into other kids.
//  At the end there's a slushy waiting for you!
// ============================================================
'use strict';

MODES.bounce = (() => {
    const FLOOR = 500;       // top of the padded floor
    const G = 0.5;           // gravity
    const NORMAL = 12.5, BIG = 16.5, SUPER = 18, FOAM = 10.5;
    let T, P, cam, t, lvl, pal;

    const PALETTES = [
        { wall: ['#FFE9A8', '#FFD1E6'], stripe: ['#FF7BC0', '#7FD4FF', '#FFD400', '#7FE3A0'], mat: ['#3D8BFF', '#2F6FD8'], pad: ['#FFD400', '#FF4F8B', '#3DDC84', '#FF8A3D'], frame: '#555C70', bed: '#26283A', night: false },
        { wall: ['#C9B6FF', '#FFC6A8'], stripe: ['#FF4F8B', '#FFB300', '#B36BFF', '#3DA9FF'], mat: ['#E0457B', '#B8325F'], pad: ['#3DA9FF', '#FFD400', '#B36BFF', '#3DDC84'], frame: '#4A4E66', bed: '#22243A', night: false },
        { wall: ['#0E0B2E', '#241A5A'], stripe: ['#39FF88', '#FF3DF0', '#3DE0FF', '#FFE03D'], mat: ['#1E1A4A', '#15123A'], pad: ['#39FF88', '#FF3DF0', '#3DE0FF', '#FFE03D'], frame: '#8A8FB8', bed: '#0A0A18', night: true }
    ];
    const SKIN = ['#FDBCB4', '#E8A77C', '#C68642', '#8D5524', '#F1C9A5'];
    const SHIRT = ['#FF4F5E', '#FFD400', '#3D8BFF', '#3DDC84', '#B36BFF', '#FF8A3D'];
    const HAIR = ['#3D1C00', '#FFE135', '#8B4513', '#222222', '#C0392B'];
    const KID_QUIPS = ['Wheee!', 'Watch me flip!', 'Higher! Higher!', 'I can touch the ceiling!', 'Boing boing!', 'Double bounce!', "Look, I'm flying!", 'This is my trampoline!'];

    function build(level) {
        const d = level.d;
        const rng = makeRng(level.seed);
        const len = Math.round(6500 + d * 4000);
        T = { tramps: [], kids: [], stars: [], tacos: [], babies: [], finishX: 0, counterX: 0, end: 0, finished: 0 };
        const tramp = (x, w, y, kind = 'normal', o = {}) => {
            const tr = Object.assign({ x, w, y, kind, squish: 0, x0: x, amp: 0, speed: 0, phase: 0, dx: 0, pad: rng.pick(pal.pad) }, o);
            T.tramps.push(tr);
            return tr;
        };
        const star = (x, y) => T.stars.push({ x, y, got: false });
        // stars along the arc from one trampoline to the next
        const arc = (x0, y0, x1, y1, peak, n) => {
            for (let i = 1; i <= n; i++) {
                const k = i / (n + 1);
                star(lerp(x0, x1, k), lerp(y0, y1, k) - Math.sin(k * Math.PI) * peak);
            }
        };

        let prev = tramp(40, 240, 440);
        let count = 0;
        const babyX = [0.22, 0.52, 0.8].map(f => f * len);
        const tacoX = [0.38, 0.7].map(f => f * len);
        while (prev.x + prev.w < len) {
            count++;
            const r = rng();
            let gap, w, y = 440, kind = 'normal', o = {};
            if (r < 0.07 && count > 3) {
                kind = 'foam'; w = 240; y = 470; gap = rng.range(60, 90);
            } else if (r < 0.15 && count > 3) {
                kind = 'super'; w = 110; gap = rng.range(70, 110);
            } else if (r < 0.22 + d * 0.18 && count > 2 && prev.kind !== 'foam') {
                // a wide gap: you need a BIG bounce (hold jump when you land) to cross it
                gap = rng.range(160 + d * 25, 180 + d * 35); w = rng.range(130, 170);
                prev.bigNext = true;
            } else {
                gap = rng.range(70, 115 + d * 35);
                w = rng.range(120, 175) - d * 30;
                if (rng.chance(0.25) && prev.kind !== 'foam') { y = 440 - rng.range(45, 85); gap = Math.min(gap, 100); }
                if (prev.kind === 'foam') gap = Math.min(gap, 70);
            }
            if (kind === 'normal' && d >= 0.4 && rng.chance(0.18 + d * 0.15)) o = { amp: 40 + d * 30, speed: 0.02 + d * 0.01, phase: rng() * TAU };
            const x = prev.x + prev.w + gap + (o.amp || 0);
            const tr = tramp(x, Math.round(w), y, kind, o);
            // stars between trampolines
            const peak = gap > 170 ? 250 : 130;
            if (rng.chance(0.7)) arc(prev.x + prev.w - 30, prev.y, tr.x + 30, tr.y, peak, gap > 170 ? 4 : 3);
            // kids bouncing on some trampolines
            if (kind === 'normal' && count > 3 && tr.w >= 140 && !o.amp && rng.chance(0.12 + d * 0.4)) {
                T.kids.push({
                    tr, side: rng.chance(0.5) ? 0.28 : 0.72, h: rng.range(70, 150), speed: rng.range(0.045, 0.07), phase: rng() * TAU,
                    skin: rng.pick(SKIN), shirt: rng.pick(SHIRT), hair: rng.pick(HAIR), quip: rng.chance(0.4) ? rng.pick(KID_QUIPS) : null, show: 0, oops: 0
                });
            }
            if (babyX.length && x > babyX[0] && kind === 'normal' && !T.kids.some(k => k.tr === tr)) {
                T.babies.push({ x: tr.x + tr.w / 2, y: tr.y - 235, got: false });
                babyX.shift();
            }
            if (tacoX.length && x > tacoX[0]) {
                T.tacos.push({ x: tr.x + tr.w / 2, y: tr.y - 150, got: false });
                tacoX.shift();
            }
            prev = tr;
        }
        // the finish: a safe landing mat and the snack bar with the slushy machine
        T.finishX = prev.x + prev.w + 90;
        T.counterX = T.finishX + 260;
        T.end = T.counterX + 420;
        return T.stars.length;
    }

    function init(level) {
        t = 0;
        lvl = level;
        pal = PALETTES[level.pal || 0];
        const total = build(level);
        const first = T.tramps[0];
        P = { x: first.x + 70, y: first.y - 120, vx: 0, vy: 0, inv: 0, stun: 0, rot: 0, flip: false, big: false,
              lastT: first, state: 'play', bubbleT: 0, fromX: 0, fromY: 0, finT: 0, dead: false, r: 0, facing: 1 };
        const c = Game.char;
        P.r = Math.min(c.w, c.h) * 0.45 + 2;
        cam = { x: 0, y: 0 };
        return { stars: total };
    }

    const kidPos = (k) => ({ x: k.tr.x + k.tr.w * k.side, y: k.tr.y - 20 - Math.abs(Math.sin(t * k.speed + k.phase)) * k.h });

    function landOn(tr) {
        const I = Input.held;
        tr.squish = 12;
        P.y = tr.y;
        P.lastT = tr;
        if (P.flip) {
            P.flip = false; P.rot = 0;
            Game.addScore(150, P.x, P.y - 80, '#FFD400');
            FX.text(P.x, P.y - 115, 'FLIP!', '#FFFFFF', 24);
        }
        if (tr.kind === 'foam') {
            P.vy = -FOAM;
            Sound.play('land');
            FX.burst(P.x, P.y, { count: 14, colors: pal.pad, speed: 4, angle: -Math.PI / 2, spread: 2, life: 30, size: 8, gravity: 0.2 });
            return;
        }
        const big = tr.kind === 'super' || I.jump;
        P.vy = -(tr.kind === 'super' ? SUPER : big ? BIG : NORMAL);
        if (big) {
            P.flip = true;
            Sound.play('jump2');
            FX.burst(P.x, P.y, { count: 10, colors: ['#FFFFFF', '#FFD400'], speed: 3, angle: -Math.PI / 2, spread: 2, life: 22, shape: 'star', size: 5 });
        } else {
            Sound.play('boing');
        }
    }

    function hurtAndRespawn(msg) {
        FX.text(P.x, P.y - 70, msg, '#FFFFFF', 26);
        if (Game.char.ability === 'bubble') {
            P.state = 'bubble'; P.bubbleT = 0; P.fromX = P.x; P.fromY = P.y;
            Sound.play('pop');
            return;
        }
        if (!Game.hurt()) { P.dead = true; P.state = 'dead'; return; }
        P.stun = 40;
        P.state = 'floor';
    }

    function respawn() {
        const tr = P.lastT;
        P.x = tr.x + tr.w / 2; P.y = tr.y - 160; P.vx = 0; P.vy = 0;
        P.inv = 90; P.state = 'play'; P.flip = false; P.rot = 0;
        FX.sparkle(P.x, P.y - 20, '#FFFFFF');
    }

    function update() {
        t++;
        const I = Input.held;
        const c = Game.char;

        for (const tr of T.tramps) {
            if (tr.amp) { const nx = tr.x0 + Math.sin(t * tr.speed + tr.phase) * tr.amp; tr.dx = nx - tr.x; tr.x = nx; }
            tr.squish *= 0.8;
        }
        for (const k of T.kids) {
            if (k.oops > 0) k.oops--;
            if (k.quip && Math.abs(k.tr.x - P.x) < 260) k.show = 90; else if (k.show > 0) k.show--;
        }

        if (P.state === 'finish') {
            P.finT++;
            if (P.x < T.counterX - 60) { P.x += 2.8; P.facing = 1; }
            if (P.finT === 70) { Sound.play('slurp'); FX.text(T.counterX + 100, FLOOR - 330, 'SLUSHY TIME! 🥤', '#FFFFFF', 34); FX.confetti(T.counterX, FLOOR - 160, 60); }
            if (P.finT === 140) { Sound.play('flap'); FX.text(P.x, FLOOR - 150, 'BRAIN FREEZE! 🥶', '#7FD4FF', 30); FX.burst(P.x, FLOOR - 90, { count: 20, colors: ['#BDEBFF', '#FFFFFF'], speed: 3, life: 40, shape: 'star', size: 6, gravity: -0.02 }); }
            if (P.finT === 220) Game.levelDone();
            followCam();
            return;
        }
        if (P.state === 'bubble') {
            P.bubbleT++;
            const k = Math.min(1, P.bubbleT / 80), e = k * k * (3 - 2 * k);
            const tr = P.lastT;
            P.x = lerp(P.fromX, tr.x + tr.w / 2, e);
            P.y = lerp(P.fromY, tr.y - 160, e) + Math.sin(P.bubbleT * 0.2) * 4;
            if (P.bubbleT > 95) { Sound.play('pop'); P.state = 'play'; P.vx = 0; P.vy = 0; P.inv = 60; }
            followCam();
            return;
        }
        if (P.state === 'floor') {
            if (--P.stun <= 0) respawn();
            followCam();
            return;
        }
        if (P.state !== 'play') return;

        if (P.inv > 0) P.inv--;
        const dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
        if (dir) P.facing = dir;
        const maxV = 4.6 + (c.ability === 'speedy' || c.ability === 'magnet' ? 0.5 : 0);
        P.vx = clamp(P.vx + dir * 0.45, -maxV, maxV);
        if (!dir) P.vx *= 0.96;
        const g = c.ability === 'floaty' ? 0.4 : G;
        P.vy = Math.min(P.vy + g + (I.down && P.vy > -2 ? 0.45 : 0), 14);
        const prevY = P.y;
        P.x += P.vx;
        P.y += P.vy;
        if (P.flip) { P.rot += TAU / 42 * P.facing; if (Math.abs(P.rot) >= TAU) { P.rot = 0; P.flip = false; Game.addScore(150, P.x, P.y - 70, '#FFD400'); FX.text(P.x, P.y - 105, 'FLIP!', '#FFFFFF', 24); } }
        if (I.down && P.vy > 3 && t % 3 === 0) FX.burst(P.x, P.y - 40, { count: 1, color: 'rgba(255,255,255,0.8)', speed: 0.5, life: 12, shape: 'circle', size: 5, gravity: 0 });

        // bounce!
        if (P.vy > 0) {
            for (const tr of T.tramps) {
                if (P.x > tr.x - 6 && P.x < tr.x + tr.w + 6 && prevY <= tr.y + 2 && P.y >= tr.y) {
                    P.x += tr.dx;
                    landOn(tr);
                    break;
                }
            }
        }
        // the finish mat
        if (P.x >= T.finishX - 20 && P.y >= FLOOR) {
            P.y = FLOOR; P.vy = 0; P.vx = 0; P.rot = 0; P.flip = false;
            P.state = 'finish'; P.finT = 0;
            Sound.play('win');
            FX.confetti(P.x, P.y - 100, 70);
            return;
        }
        // oof, the floor!
        if (P.y >= FLOOR) {
            P.y = FLOOR; P.vy = 0; P.vx = 0; P.rot = 0; P.flip = false;
            FX.shake(6);
            FX.burst(P.x, FLOOR, { count: 12, color: 'rgba(255,255,255,0.9)', speed: 3, angle: -Math.PI / 2, spread: 2.5, life: 24, shape: 'circle', size: 6 });
            hurtAndRespawn('Oof!');
            followCam();
            return;
        }
        // other kids
        if (P.inv <= 0) {
            for (const k of T.kids) {
                const kp = kidPos(k);
                if (dist(P.x, P.y - Game.char.h / 2, kp.x, kp.y - 18) < P.r * 0.8 + 14) {
                    k.oops = 50;
                    P.vx = (P.x < kp.x ? -1 : 1) * 5;
                    P.vy = Math.min(P.vy, -6);
                    P.inv = 90; P.flip = false; P.rot = 0;
                    Sound.play('stomp');
                    FX.shake(5);
                    FX.text(P.x, P.y - 90, 'Oops! Sorry!', '#FFFFFF', 22);
                    if (!Game.hurt()) { P.dead = true; P.state = 'dead'; }
                    break;
                }
            }
        }

        // collecting
        const cy = P.y - Game.char.h / 2;
        const magnet = c.ability === 'magnet';
        for (const s of T.stars) {
            if (s.got) continue;
            if (magnet && dist(s.x, s.y, P.x, cy) < 170) { s.x += (P.x - s.x) * 0.12; s.y += (cy - s.y) * 0.12; }
            if (dist(s.x, s.y, P.x, cy) < 30) { s.got = true; Game.collectStar(s.x, s.y); }
        }
        for (const k of T.tacos) if (!k.got && dist(k.x, k.y, P.x, cy) < 34) { k.got = true; Game.collectTaco(k.x, k.y); }
        for (const b of T.babies) if (!b.got && dist(b.x, b.y, P.x, cy) < 40) { b.got = true; Game.collectBaby(b.x, b.y - 20); }

        if (P.x < 20) { P.x = 20; P.vx = 0; }
        followCam();
    }

    function followCam() {
        const tx = P.state === 'finish' ? T.counterX - W * 0.55 : P.x - W * 0.35 + P.vx * 12;
        cam.x += (tx - cam.x) * 0.1;
        cam.x = clamp(cam.x, 0, T.end - W);
        const ty = Math.min(0, P.y - 190);
        cam.y += (ty - cam.y) * 0.1;
    }

    function dying() { P.vy += 0.4; P.y += P.vy; P.rot += 0.1; }

    // ---------- drawing ----------
    function drawRoom(g) {
        const grad = g.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, pal.wall[0]); grad.addColorStop(1, pal.wall[1]);
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);
        const par = 0.35, off = cam.x * par;
        // big colorful wall panels with words
        const words = ['BOUNCE!', 'JUMP!', 'BOING!', 'FLIP!', 'WHEEE!'];
        const i0 = Math.floor(off / 260) - 1;
        for (let i = i0; i < i0 + 6; i++) {
            const x = i * 260 - off, y = 120 - cam.y * par;
            const col = pal.stripe[((i % 4) + 4) % 4];
            if (pal.night) { g.shadowColor = col; g.shadowBlur = 18; }
            g.fillStyle = pal.night ? 'rgba(0,0,0,0)' : col;
            g.strokeStyle = col; g.lineWidth = 4;
            rrect(g, x + 20, y, 210, 90, 18);
            if (pal.night) g.stroke(); else g.fill();
            g.shadowBlur = 0;
            outlinedText(g, words[((i % 5) + 5) % 5], x + 125, y + 46, 34, pal.night ? col : '#FFFFFF', pal.night ? '#0E0B2E' : 'rgba(0,0,0,0.25)');
        }
        // ceiling lights
        for (let i = Math.floor(cam.x * 0.6 / 180) - 1; i < Math.floor(cam.x * 0.6 / 180) + 7; i++) {
            const x = i * 180 - cam.x * 0.6 + 90, y = 30 - cam.y * 0.6;
            g.fillStyle = 'rgba(255,255,255,0.35)';
            g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.lineTo(x + 60, y + 90); g.lineTo(x - 60, y + 90); g.fill();
            g.fillStyle = pal.night ? pal.stripe[((i % 4) + 4) % 4] : '#FFF8D0';
            g.fillRect(x - 16, y - 6, 32, 8);
        }
    }

    function drawFloor(g) {
        const y = FLOOR - cam.y;
        const x0 = Math.floor(cam.x / 80) * 80;
        for (let x = x0; x < cam.x + W + 80; x += 80) {
            g.fillStyle = pal.mat[(x / 80) % 2 ? 0 : 1];
            g.fillRect(x - cam.x, y, 80, H - y + 20);
        }
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.fillRect(0, y, W, 4);
        // finish mat
        const fx = T.finishX - cam.x;
        if (fx < W + 50) {
            for (let x = 0; x < T.end - T.finishX; x += 40) {
                g.fillStyle = (x / 40) % 2 ? '#FFFFFF' : '#FFD400';
                g.fillRect(fx + x, y, 40, 16);
            }
            outlinedText(g, 'SAFE LANDING!', fx + 100, y + 40, 18, '#FFFFFF', '#1F5FC4');
        }
    }

    function drawTramp(g, tr) {
        const x = tr.x - cam.x, y = tr.y - cam.y, w = tr.w;
        if (x > W + 50 || x + w < -50) return;
        const sag = tr.squish;
        const floorY = FLOOR - cam.y;
        if (tr.kind === 'foam') {
            g.fillStyle = pal.frame; g.fillRect(x, y - 6, w, floorY - y + 6);
            g.fillStyle = '#1F2033'; g.fillRect(x + 8, y, w - 16, floorY - y);
            for (let i = 0; i < 26; i++) {
                const cx = x + 14 + hash(i * 3.3 + tr.x) * (w - 28), cy = y + 2 + hash(i * 7.1 + tr.x) * 24 + (i % 3) * 6 + sag * 0.5;
                g.fillStyle = pal.pad[i % pal.pad.length];
                g.fillRect(cx - 9, cy - 9, 18, 18);
            }
            outlinedText(g, 'FOAM PIT', x + w / 2, y - 22, 16, '#FFFFFF', '#2A1060');
            return;
        }
        // legs
        g.fillStyle = pal.frame;
        g.fillRect(x + 10, y, 8, floorY - y); g.fillRect(x + w - 18, y, 8, floorY - y);
        // bed (sags when you land)
        g.fillStyle = pal.bed;
        g.beginPath();
        g.moveTo(x + 10, y);
        g.quadraticCurveTo(x + w / 2, y + sag * 2.2, x + w - 10, y);
        g.lineTo(x + w - 10, y + 6); g.quadraticCurveTo(x + w / 2, y + 6 + sag * 2.2, x + 10, y + 6);
        g.closePath(); g.fill();
        // padding
        const pad = tr.kind === 'super' ? '#FF3B3B' : tr.pad;
        g.fillStyle = pad;
        rrect(g, x - 4, y - 5, 18, 14, 5); g.fill();
        rrect(g, x + w - 14, y - 5, 18, 14, 5); g.fill();
        g.fillRect(x - 4, y + 4, w + 8, 6);
        if (tr.kind === 'super') {
            const bob = Math.sin(t * 0.15) * 4;
            g.fillStyle = '#FF3B3B';
            g.beginPath(); g.moveTo(x + w / 2, y - 60 + bob); g.lineTo(x + w / 2 + 16, y - 36 + bob); g.lineTo(x + w / 2 - 16, y - 36 + bob); g.fill();
            outlinedText(g, 'SUPER', x + w / 2, y - 22, 14, '#FFFFFF', '#B00020');
        }
        if (tr.bigNext) {
            // a friendly sign: the next gap needs a big bounce
            const bob = Math.sin(t * 0.12) * 3;
            outlinedText(g, 'HOLD ⬆ BIG BOUNCE!', x + w - 10, y - 150 + bob, 15, '#FFE14D', '#8A2A00');
            g.fillStyle = '#FFE14D';
            g.beginPath(); g.moveTo(x + w + 40, y - 138 + bob); g.lineTo(x + w + 56, y - 132 + bob); g.lineTo(x + w + 40, y - 126 + bob); g.fill();
        }
        if (tr.amp) {
            g.fillStyle = 'rgba(255,255,255,0.7)';
            g.fillRect(x + w / 2 - 20, y + 16, 40, 4);
            g.beginPath(); g.moveTo(x + w / 2 - 28, y + 18); g.lineTo(x + w / 2 - 20, y + 12); g.lineTo(x + w / 2 - 20, y + 24); g.fill();
            g.beginPath(); g.moveTo(x + w / 2 + 28, y + 18); g.lineTo(x + w / 2 + 20, y + 12); g.lineTo(x + w / 2 + 20, y + 24); g.fill();
        }
    }

    function drawKid(g, k) {
        const kp = kidPos(k);
        const x = kp.x - cam.x, y = kp.y - cam.y;
        if (x < -60 || x > W + 60) return;
        const up = Math.sin(t * k.speed + k.phase) > 0;
        g.fillStyle = k.skin;
        // arms up when going up, down when coming down
        if (up) { g.fillRect(x - 16, y - 44, 6, 16); g.fillRect(x + 10, y - 44, 6, 16); }
        else { g.fillRect(x - 16, y - 28, 6, 14); g.fillRect(x + 10, y - 28, 6, 14); }
        g.fillStyle = k.shirt; g.fillRect(x - 11, y - 30, 22, 18);
        g.fillStyle = '#3A4A7A'; g.fillRect(x - 10, y - 12, 8, 12); g.fillRect(x + 2, y - 12, 8, 12);
        g.fillStyle = k.skin; g.beginPath(); g.arc(x, y - 40, 11, 0, TAU); g.fill();
        g.fillStyle = k.hair; g.beginPath(); g.arc(x, y - 43, 11, Math.PI, 0); g.fill();
        g.fillStyle = '#222'; g.fillRect(x - 5, y - 42, 3, 3); g.fillRect(x + 3, y - 42, 3, 3);
        g.fillStyle = '#C2185B';
        if (k.oops > 0) { g.beginPath(); g.arc(x, y - 35, 3, 0, TAU); g.fill(); }
        else { g.beginPath(); g.arc(x, y - 36, 4, 0.1 * Math.PI, 0.9 * Math.PI); g.fill(); }
        if (k.oops > 0) drawSpeech(g, x, y - 52, 'Hey! Watch out!', Math.min(1, k.oops / 15), '#FFB300');
        else if (k.show > 0) drawSpeech(g, x, y - 52, k.quip, Math.min(1, k.show / 15), '#FF9AD0');
    }

    function drawSnackBar(g) {
        const x = T.counterX - cam.x, y = FLOOR - cam.y;
        if (x < -300 || x > W + 200) return;
        // sign
        g.fillStyle = '#FF4F8B'; rrect(g, x - 20, y - 260, 250, 50, 14); g.fill();
        outlinedText(g, '🥤 SNACK BAR', x + 105, y - 234, 26, '#FFFFFF', '#8B1040');
        // counter
        g.fillStyle = '#FFFFFF'; g.fillRect(x - 20, y - 100, 250, 12);
        g.fillStyle = '#3DA9FF'; g.fillRect(x - 10, y - 88, 230, 88);
        g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 5; i++) g.fillRect(x + i * 46, y - 88, 20, 88);
        // slushy machine with swirling tanks
        const tanks = ['#3DA9FF', '#FF3B5C', '#8BE33D'];
        tanks.forEach((c, i) => {
            const tx = x + 30 + i * 60;
            g.fillStyle = '#DDE3EE'; g.fillRect(tx - 4, y - 190, 48, 90);
            g.fillStyle = c; g.fillRect(tx, y - 170, 40, 66);
            g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3;
            const sw = t * 0.1 + i;
            g.beginPath(); g.moveTo(tx + 20 + Math.cos(sw) * 14, y - 140 + Math.sin(sw) * 20); g.lineTo(tx + 20 - Math.cos(sw) * 14, y - 140 - Math.sin(sw) * 20); g.stroke();
            g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(tx + 4, y - 166, 6, 58);
        });
        // the friendly worker
        drawAxolotl(g, x + 205, y - 100, t, -1, 1.1);
    }

    function drawSlushy(g, x, y, s) {
        g.save(); g.translate(x, y); g.scale(s, s);
        g.fillStyle = '#FFFFFF';
        g.beginPath(); g.moveTo(-14, -40); g.lineTo(14, -40); g.lineTo(10, 0); g.lineTo(-10, 0); g.closePath(); g.fill();
        const cols = ['#3DA9FF', '#FF3B5C', '#8BE33D'];
        cols.forEach((c, i) => {
            g.fillStyle = c;
            const y0 = -38 + i * 12;
            g.beginPath(); g.moveTo(-13 + i * 1.3, y0); g.lineTo(13 - i * 1.3, y0); g.lineTo(12 - i * 1.3, y0 + 12); g.lineTo(-12 + i * 1.3, y0 + 12); g.fill();
        });
        g.fillStyle = cols[0];
        g.beginPath(); g.arc(0, -40, 15, Math.PI, 0); g.fill();
        g.fillStyle = '#FF4F8B'; g.fillRect(3, -68, 4, 32);
        g.restore();
    }

    function drawPlayer(g) {
        const c = Game.char;
        if (P.inv > 0 && Math.floor(P.inv / 4) % 2 === 0 && P.state === 'play') return;
        const x = P.x - cam.x, y = P.y - cam.y;
        if (P.state === 'floor') {
            drawChar(g, c, x, y, { t: Game.t, rot: Math.PI / 2 * P.facing, scale: 0.95 });
            for (let i = 0; i < 3; i++) {
                const a = Game.t * 0.15 + i * TAU / 3;
                drawStarShape(g, x + Math.cos(a) * 22, y - 40 + Math.sin(a) * 7, 5, a, '#FFD400');
            }
            return;
        }
        const shiver = P.state === 'finish' && P.finT > 140 ? Math.sin(Game.t * 1.5) * 2 : 0;
        const squash = P.vy < -10 ? 1.15 : 1;
        drawChar(g, c, x + shiver, y, { t: Game.t, facing: P.facing, rot: P.rot, air: P.state !== 'finish', run: P.state === 'finish' && P.x < T.counterX - 60, sy: squash, sx: 1 / squash });
        if (P.state === 'finish' && P.finT > 70) drawSlushy(g, x + 26 * P.facing, y - c.h * 0.35, 1.2);
        if (P.state === 'bubble') {
            g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.fillStyle = 'rgba(190,230,255,0.3)';
            g.beginPath(); g.arc(x, y - c.h / 2, Math.max(c.w, c.h) * 0.85, 0, TAU); g.fill(); g.stroke();
        }
    }

    function draw(g) {
        drawRoom(g);
        drawFloor(g);
        drawSnackBar(g);
        for (const tr of T.tramps) drawTramp(g, tr);
        for (const s of T.stars) {
            if (s.got) continue;
            const x = s.x - cam.x;
            if (x > -30 && x < W + 30) drawStar(g, x, s.y - cam.y, Game.t + s.x * 0.1);
        }
        for (const k of T.tacos) if (!k.got) drawTaco(g, k.x - cam.x, k.y - cam.y, Game.t);
        for (const b of T.babies) if (!b.got) drawBaby(g, b.x - cam.x, b.y - cam.y + 15, Game.t);
        for (const k of T.kids) drawKid(g, k);
        drawPlayer(g);
        FX.draw(g, cam.x, cam.y);
        FX.drawTexts(g, cam.x, cam.y);
    }

    function progress() { return clamp((P.x - 100) / (T.finishX - 100), 0, 1); }

    return {
        music: 'bounce', icon: '🤸',
        tip: '← → steer · HOLD SPACE as you land for a BIG bounce · ↓ drop faster · don\'t hit the floor!',
        debug: () => ({ T, P }),
        init, update, draw, dying, progress
    };
})();
