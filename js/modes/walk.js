// ============================================================
//  MEADOW LEVELS: run, jump, stomp grumpy blobs, bounce on
//  flowers and rescue 3 lost baby axolotls. Reach the flag!
// ============================================================
'use strict';

const MODES = {};

MODES.walk = (() => {
    const GY = 450; // top of the ground
    let L, P, cam, t = 0, pal;

    const PALETTES = [
        { // World 1: sunny day
            sky: ['#5EB8FF', '#BDE6FF'], sun: 'sun', hillFar: '#9FD8A8', hillNear: '#6CC36A',
            grass: '#56C94E', grassLight: '#8BEA6E', dirt: '#B5763C', dirtDark: '#94592A',
            brick: '#D98C4A', brickDark: '#A8612B', leaf: '#3FAE4A', leaf2: '#2F8F3A', trunk: '#7A4A22', cloud: '#FFFFFF'
        },
        { // World 2: sunset
            sky: ['#5A4BC8', '#FF8FB1', '#FFC98A'], sun: 'sunset', hillFar: '#C98BB8', hillNear: '#9E6AA8',
            grass: '#6CC06A', grassLight: '#A3E27E', dirt: '#A35F3E', dirtDark: '#7E4428',
            brick: '#C9785A', brickDark: '#94503A', leaf: '#4E9E5A', leaf2: '#3A7E48', trunk: '#6A3A22', cloud: '#FFE0EC'
        },
        { // World 3: starry night with fireflies
            sky: ['#0A0F35', '#23336E'], sun: 'moon', hillFar: '#243E6A', hillNear: '#1B3355',
            grass: '#2F9A64', grassLight: '#4FC98A', dirt: '#5E4230', dirtDark: '#473022',
            brick: '#6F6A8E', brickDark: '#4D4968', leaf: '#1F6E52', leaf2: '#175A42', trunk: '#4A3020', cloud: '#8E9AC8',
            night: true
        }
    ];

    // ---------------------------------------------------------
    //  LEVEL BUILDER — levels are made from little "chunks"
    // ---------------------------------------------------------
    function build(level) {
        const d = level.d;
        const rng = makeRng(level.seed);
        L = {
            solids: [], plats: [], movers: [], fires: [], enemies: [], flowers: [], stars: [],
            tacos: [], babies: [], friends: [], decor: [], fireballs: [], end: 0, flag: null, house: null
        };
        let boxStars = 0;
        const spots = [];

        const ground = (x, w) => {
            L.solids.push({ x, y: GY, w, h: 300, kind: 'ground' });
            for (let xx = x + 30 + rng.int(0, 60); xx < x + w - 30; xx += rng.int(90, 220)) {
                L.decor.push({ x: xx, kind: rng.pick(['tree', 'tree', 'pine', 'bush', 'bush', 'flowers', 'mushroom']), s: rng.range(0.8, 1.25), hue: rng() });
            }
        };
        const block = (x, y, w, h) => { const b = { x, y, w, h, kind: 'block' }; L.solids.push(b); return b; };
        const plat = (x, y, w) => { const p = { x, y, w, h: 18 }; L.plats.push(p); return p; };
        const star = (x, y) => L.stars.push({ x, y, got: false });
        const starArc = (x0, x1, y0, hgt, n) => {
            for (let i = 0; i < n; i++) {
                const tt = n === 1 ? 0.5 : i / (n - 1);
                star(lerp(x0, x1, tt), y0 - Math.sin(tt * Math.PI) * hgt);
            }
        };
        const starRow = (x0, y, n, gap = 40) => { for (let i = 0; i < n; i++) star(x0 + i * gap, y); };
        const friend = (x, quip) => L.friends.push({ x, quip: quip || rng.pick(AXOLOTL_QUIPS), facing: rng.chance(0.5) ? 1 : -1, show: 0 });
        const enemy = (x0, x1, kind) => L.enemies.push({
            kind, x: lerp(x0, x1, rng.range(0.3, 0.7)), y: GY - 30, w: 34, h: 30,
            vx: (rng.chance(0.5) ? 1 : -1) * (0.7 + d * 0.8), minX: x0, maxX: x1, alive: true, dead: 0, t: rng() * 100
        });
        const fire = (x) => L.fires.push({ x, y: GY - 34, w: 30, h: 34, t: rng() * 100 });
        const flower = (x, dir) => L.flowers.push({ x, dir, squish: 0, cool: 0 });
        const taco = (x, y) => L.tacos.push({ x, y, got: false });
        const box = (x, y, item) => {
            L.solids.push({ x, y, w: 40, h: 40, kind: 'box', item, used: false, bump: 0 });
            if (item === 'star') boxStars++;
        };

        // Each chunk starts with ground at x and returns where the next chunk begins.
        const C = {
            flat(x) {
                const len = rng.int(300, 420);
                ground(x, len);
                if (rng.chance(0.65)) starArc(x + 60, x + len - 60, GY - 45, rng.chance(0.5) ? 45 : 0, 5);
                if (rng.chance(0.4)) friend(x + len * rng.range(0.35, 0.65));
                else if (d > 0.1 && rng.chance(0.5)) enemy(x + 60, x + len - 40, 'blob');
                return x + len;
            },
            pit(x) {
                const gap = Math.round(Math.min(120, 70 + d * 45 + rng.range(0, 15)));
                ground(x, 160);
                starArc(x + 120, x + 160 + gap + 40, GY - 45, 70, 5);
                if (d > 0.45 && rng.chance(0.55)) {
                    L.fireballs.push({ x: x + 160 + gap / 2 - 12, y: H + 40, vy: 0, w: 24, h: 24, timer: rng.int(20, 120) });
                }
                return x + 160 + gap;
            },
            plats(x, high) {
                ground(x, 140);
                const n = rng.int(2, 3);
                let px0 = x + 140 + 55, y = GY;
                let mid = null;
                for (let i = 0; i < n; i++) {
                    const w = Math.round(130 - d * 25);
                    y = i === 0 ? GY - rng.int(55, 85) : clamp(y + rng.int(-60, 40), GY - 150, GY - 55);
                    const p = plat(px0, y, w);
                    if (i === 1) mid = p;
                    starRow(px0 + w / 2 - 20, y - 32, 2, 40);
                    px0 += w + rng.int(55, 70 + Math.round(d * 25));
                }
                if (high && mid) {
                    const hp = plat(mid.x + 10, mid.y - 90, 90);
                    spots.push({ x: hp.x + 45, y: hp.y - 40 });
                } else if (high) {
                    spots.push({ x: px0 - 100, y: y - 80 });
                }
                return px0;
            },
            stairs(x, high) {
                const steps = high ? 4 : 3, bw = 40, bh = 36;
                const len = 180 + steps * bw * 2 + 80;
                ground(x, len);
                let bx = x + 100;
                for (let i = 1; i <= steps; i++) { block(bx, GY - i * bh, bw, i * bh); bx += bw; }
                block(bx, GY - steps * bh, bw * 2, steps * bh);
                starRow(bx + 20, GY - steps * bh - 32, 2, 40);
                if (high) spots.push({ x: bx + bw, y: GY - steps * bh - 70 });
                bx += bw * 2;
                for (let i = steps - 1; i >= 1; i--) { block(bx, GY - i * bh, bw, i * bh); bx += bw; }
                return x + len;
            },
            fire(x) {
                const len = 420;
                ground(x, len);
                const n = d > 0.35 ? 2 : 1;
                for (let i = 0; i < n; i++) {
                    const fx = x + 140 + i * 160;
                    fire(fx);
                    starArc(fx - 30, fx + 60, GY - 60, 55, 3);
                }
                return x + len;
            },
            enemies(x) {
                const len = 480;
                ground(x, len);
                const n = 1 + (d > 0.3 ? 1 : 0) + (d > 0.75 ? 1 : 0);
                const seg = (len - 100) / n;
                for (let i = 0; i < n; i++) {
                    const x0 = x + 70 + i * seg;
                    const spiky = d > 0.4 && i === n - 1 && rng.chance(0.6);
                    enemy(x0, x0 + seg - 20, spiky ? 'spiky' : 'blob');
                }
                starRow(x + 110, GY - 110, 5, 55);
                return x + len;
            },
            flowerWall(x) {
                const len = 540;
                ground(x, len);
                flower(x + 150, 'up');
                block(x + 240, GY - 200, 110, 200);
                for (let i = 0; i < 4; i++) star(x + 150, GY - 90 - i * 45);
                spots.push({ x: x + 295, y: GY - 245 });
                return x + len;
            },
            flowerPit(x) {
                ground(x, 200);
                flower(x + 150, 'right');
                const gap = Math.round(220 + d * 60);
                // stars along the flower's launch arc
                let sx = x + 150, sy = GY - 30, vx = 9, vy = -13.5;
                for (let f = 1; f <= 42; f++) {
                    vy += 0.62; sx += vx; sy += vy;
                    if (f % 7 === 0) star(sx, sy);
                }
                ground(x + 200 + gap, 220);
                return x + 200 + gap + 220;
            },
            boxes(x) {
                const len = 460;
                ground(x, len);
                const bx = x + 170;
                const tacoBox = rng.chance(0.35) ? 1 : -1;
                for (let i = 0; i < 3; i++) box(bx + i * 40, GY - 125, i === tacoBox ? 'taco' : 'star');
                starRow(x + 50, GY - 40, 2, 40);
                if (d > 0.2 && rng.chance(0.5)) enemy(x + 300, x + len - 30, 'blob');
                return x + len;
            },
            mover(x) {
                ground(x, 140);
                const pitW = 380;
                const m = { x: x + 170, y: GY - 50, w: 120, h: 18, x0: x + 170, amp: 90, speed: 0.022 + d * 0.01, phase: rng() * TAU, dx: 0, dy: 0 };
                m.x0 = x + 140 + pitW / 2 - m.w / 2;
                L.movers.push(m);
                starRow(m.x0 + 20, GY - 110, 3, 40);
                return x + 140 + pitW;
            },
            tacoTower(x) {
                const len = 400;
                ground(x, len);
                plat(x + 120, GY - 80, 100);
                plat(x + 240, GY - 155, 100);
                star(x + 170, GY - 110);
                taco(x + 290, GY - 195);
                return x + len;
            }
        };

        // --- Start area with Mama Axolotl ---
        ground(-300, 800);
        L.friends.push({ x: 380, quip: 'Please find my 3 lost babies! 🥺', facing: -1, show: 0, mama: true });
        starArc(520, 700, GY - 45, 40, 4);
        let x = 500;

        // --- Plan the chunks ---
        const n = Math.round((4200 + d * 3200) / 400);
        const pool = ['flat', 'pit', 'pit', 'plats', 'stairs', 'fire', 'enemies', 'boxes', 'flowerPit'];
        if (d >= 0.25) pool.push('mover', 'enemies', 'pit', 'fire');
        if (d >= 0.5) pool.push('plats', 'mover', 'enemies', 'flowerPit');
        const spotAt = new Set([Math.floor(n * 0.22), Math.floor(n * 0.52), Math.floor(n * 0.82)]);
        const tacoAt = new Set([Math.floor(n * 0.38), Math.floor(n * 0.68)]);
        const spotKinds = ['flowerWall', 'stairsHigh', 'platsHigh'];
        let spotN = rng.int(0, 2);
        let prev = '';
        for (let i = 0; i < n; i++) {
            if (spotAt.has(i)) {
                const k = spotKinds[spotN++ % 3];
                if (k === 'flowerWall') x = C.flowerWall(x);
                else if (k === 'stairsHigh') x = C.stairs(x, true);
                else x = C.plats(x, true);
                prev = k;
                continue;
            }
            if (tacoAt.has(i)) { x = C.tacoTower(x); prev = 'tacoTower'; continue; }
            let k;
            do { k = rng.pick(pool); } while (k === prev && rng.chance(0.8));
            if (i === 0) k = 'flat';
            x = C[k](x);
            prev = k;
        }

        // --- The finish: stairs, flagpole and the axolotl family home ---
        const endLen = 1050;
        ground(x, endLen);
        let bx = x + 140;
        for (let i = 1; i <= 4; i++) { block(bx, GY - i * 36, 40, i * 36); bx += 40; }
        starRow(x + 40, GY - 40, 2, 40);
        L.flag = { x: bx + 150, top: GY - 300, flagY: GY - 290, got: false };
        L.house = { x: bx + 330 };
        L.end = x + endLen;

        // --- Join ground pieces that touch, so there are no seams ---
        const grounds = L.solids.filter(s => s.kind === 'ground').sort((a, b) => a.x - b.x);
        const merged = [];
        for (const gnd of grounds) {
            const last = merged[merged.length - 1];
            if (last && gnd.x <= last.x + last.w + 1) last.w = Math.max(last.w, gnd.x + gnd.w - last.x);
            else merged.push(gnd);
        }
        L.solids = merged.concat(L.solids.filter(s => s.kind !== 'ground'));

        // --- Place the 3 baby axolotls on the tricky spots ---
        spots.sort((a, b) => a.x - b.x);
        spots.slice(0, 3).forEach(s => L.babies.push({ x: s.x, y: s.y, got: false, follow: 0 }));

        return L.stars.length + boxStars;
    }

    // ---------------------------------------------------------
    //  PLAYER
    // ---------------------------------------------------------
    function makePlayer() {
        const c = Game.char;
        return {
            x: 120, y: GY - c.h, w: c.w, h: c.h, vx: 0, vy: 0,
            onGround: true, coyote: 0, jumpBuf: 0, facing: 1, cut: false,
            airJumps: 0, dashT: 0, dashUsed: false, pounding: false, poundHang: 0, charge: 0,
            launch: 0, inv: 0, sx: 1, sy: 1, combo: 0, gliding: false,
            state: 'play', onMover: null, safeX: 120, safeY: GY - c.h,
            bubbleT: 0, bubbleFromX: 0, bubbleFromY: 0, homeT: 0,
            trail: [], followers: []
        };
    }

    function init(level) {
        t = 0;
        pal = PALETTES[level.pal || 0];
        const total = build(level);
        P = makePlayer();
        cam = { x: 0, y: 0 };
        return { stars: total };
    }

    function jumpNow(v) {
        P.vy = -v;
        P.onGround = false; P.coyote = 0; P.jumpBuf = 0; P.cut = true;
        P.sx = 0.75; P.sy = 1.3;
        FX.dust(P.x + P.w / 2, P.y + P.h, 5);
    }

    function airAbility() {
        const c = Game.char;
        if (c.ability === 'doublejump' && P.airJumps < 1) {
            P.airJumps++;
            jumpNow(c.jump * 0.9);
            Sound.play('jump2');
            FX.sparkle(P.x + P.w / 2, P.y + P.h, '#FF8FD0');
        } else if (c.ability === 'flutter' && P.airJumps < 3) {
            P.airJumps++;
            P.vy = -8.4; P.cut = false;
            Sound.play('flap');
            FX.burst(P.x + P.w / 2, P.y + P.h / 2, { count: 5, color: '#DFF4FF', speed: 2, life: 18, shape: 'circle', gravity: 0.05, size: 4 });
        } else if (c.ability === 'dash' && !P.dashUsed) {
            P.dashUsed = true;
            P.dashT = 14;
            P.cut = false;
            Sound.play('dash');
            FX.shake(3);
        }
    }

    function hurt(fromX) {
        if (P.inv > 0 || P.state !== 'play') return;
        if (!Game.hurt()) {
            P.state = 'dead';
            P.vy = -10;
            return;
        }
        P.inv = 110;
        P.coyote = 0; P.jumpBuf = 0;
        P.vx = (P.x + P.w / 2 < fromX ? -1 : 1) * 5;
        P.vy = -7;
        P.launch = 14;
        P.cut = false; P.pounding = false; P.dashT = 0;
    }

    function fall() {
        const c = Game.char;
        if (c.ability === 'bubble') {
            P.state = 'bubble';
            P.bubbleT = 0;
            P.bubbleFromX = P.x; P.bubbleFromY = H + 20;
            Sound.play('pop');
            return;
        }
        if (!Game.hurt()) { P.state = 'dead'; P.vy = 0; return; }
        respawn();
    }

    function respawn() {
        P.x = P.safeX; P.y = P.safeY - 4;
        P.vx = 0; P.vy = 0; P.inv = 110; P.launch = 0;
        P.pounding = false; P.dashT = 0; P.state = 'play';
        FX.sparkle(P.x + P.w / 2, P.y + P.h / 2, '#FFFFFF');
    }

    function hitBox(b) {
        b.bump = 10;
        if (b.used) { Sound.play('land'); return; }
        b.used = true;
        Sound.play('box');
        if (b.item === 'star') {
            Game.collectStar(b.x + 20, b.y - 20);
            FX.burst(b.x + 20, b.y - 10, { count: 8, color: '#FFD400', speed: 3, angle: -Math.PI / 2, spread: 1.5, life: 25, shape: 'star', size: 6 });
        } else {
            L.tacos.push({ x: b.x + 20, y: b.y - 30, got: false });
        }
    }

    function land(s, impactVy) {
        if (P.pounding) {
            P.pounding = false;
            Sound.play('pound');
            FX.shake(9);
            FX.burst(P.x + P.w / 2, P.y + P.h, { count: 18, color: 'rgba(230,220,200,0.9)', speed: 5, angle: -Math.PI / 2, spread: 3, life: 30, shape: 'circle', size: 7, gravity: 0.1 });
            if (s.kind === 'box') hitBox(s);
            for (const e of L.enemies) {
                if (e.alive && Math.abs(e.x + e.w / 2 - (P.x + P.w / 2)) < 130 && Math.abs(e.y + e.h - (P.y + P.h)) < 30) stomp(e, true);
            }
        } else if (impactVy > 7) {
            P.sx = 1.3; P.sy = 0.72;
            FX.dust(P.x + P.w / 2, P.y + P.h, 6);
            Sound.play('land');
        }
        P.vy = 0;
        P.onGround = true;
        P.airJumps = 0; P.dashUsed = false; P.combo = 0; P.gliding = false;
        if ((s.kind === 'ground' || s.kind === 'block') && P.x > s.x + 8 && P.x + P.w < s.x + s.w - 8) {
            P.safeX = P.x; P.safeY = s.y - P.h;
        }
    }

    function stomp(e, byPound) {
        e.alive = false; e.dead = 30;
        P.combo++;
        const pts = 100 * Math.min(P.combo, 8);
        Game.addScore(pts, e.x + e.w / 2, e.y - 10);
        Sound.play('stomp');
        FX.burst(e.x + e.w / 2, e.y + e.h / 2, { count: 14, colors: e.kind === 'blob' ? ['#A77BEA', '#7E4FD0', '#FFFFFF'] : ['#FF6B6B', '#FFFFFF'], speed: 4, life: 30, size: 6 });
        if (!byPound) {
            const big = Game.char.ability === 'megahop' ? 14 : 12;
            P.coyote = 0; P.jumpBuf = 0;
            P.vy = Input.held.jump ? -big : -8;
            P.cut = Input.held.jump;
            P.airJumps = 0; P.dashUsed = false;
        }
    }

    function boing(f) {
        f.squish = 14; f.cool = 20;
        Sound.play('boing');
        P.pounding = false; P.dashT = 0; P.airJumps = 0; P.dashUsed = false;
        P.onGround = false; P.cut = false;
        P.coyote = 0; P.jumpBuf = 0;
        if (f.dir === 'up') {
            P.vy = -17;
            P.vx *= 0.5;
        } else {
            const s = f.dir === 'right' ? 1 : -1;
            P.vy = -13.5; P.vx = 9 * s; P.facing = s;
            P.launch = 45;
        }
        P.sx = 0.7; P.sy = 1.35;
        FX.burst(f.x, GY - 30, { count: 12, colors: ['#FF8FD0', '#FFD400', '#FFFFFF'], speed: 4, angle: -Math.PI / 2, spread: 2, life: 30, shape: 'star', size: 5 });
    }

    function updatePlayer() {
        const c = Game.char;
        const I = Input.held, IP = Input.pressed;
        // flower launches use normal gravity so floaty characters land in the same spot
        const grav = P.launch > 0 ? 0.62 : (c.gravity || 0.62);
        const maxFall = c.maxFall || 13;
        const dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
        if (dir && P.dashT <= 0) P.facing = dir;
        if (P.inv > 0) P.inv--;

        // carried by a moving cloud
        if (P.onMover) { P.x += P.onMover.dx; P.y += P.onMover.dy; }

        // Froggy's mega hop charge
        const charging = c.ability === 'megahop' && P.onGround && I.down;
        if (charging) {
            P.charge = Math.min(50, P.charge + 1);
            if (P.charge % 12 === 1) Sound.play('charge');
        } else if (!P.onGround || !I.down) {
            P.charge = Math.max(0, P.charge - 2);
        }

        // ---- sideways movement ----
        if (P.dashT > 0) {
            P.dashT--;
            P.vx = P.facing * 11;
            P.vy = 0;
            if (t % 2 === 0) FX.burst(P.x + P.w / 2, P.y + P.h / 2, { count: 2, color: '#E3B6FF', speed: 0.5, life: 16, shape: 'circle', size: 8, gravity: 0 });
        } else if (P.pounding) {
            P.vx = 0;
        } else {
            const maxSp = c.speed;
            const acc = P.onGround ? 0.8 : 0.5;
            if (charging) {
                P.vx *= 0.7;
            } else if (dir) {
                P.vx += dir * acc;
                const lim = P.launch > 0 ? 10 : maxSp;
                if (Math.abs(P.vx) > lim) P.vx = Math.sign(P.vx) * Math.max(lim, Math.abs(P.vx) - 0.6);
            } else if (P.launch <= 0) {
                P.vx *= P.onGround ? 0.7 : 0.92;
            }
            if (Math.abs(P.vx) < 0.05) P.vx = 0;
        }
        if (P.launch > 0) P.launch--;

        // ---- jumping (with a little forgiveness built in) ----
        if (IP.jump) P.jumpBuf = 8; else if (P.jumpBuf > 0) P.jumpBuf--;
        if (P.onGround) P.coyote = 7; else if (P.coyote > 0) P.coyote--;

        if (P.jumpBuf > 0 && P.coyote > 0 && !P.pounding) {
            let v = c.jump;
            if (c.ability === 'megahop' && P.charge > 10) {
                v *= 1 + (P.charge / 50) * 0.6;
                FX.sparkle(P.x + P.w / 2, P.y + P.h, '#8BFF8B');
                Sound.play('boing');
            } else {
                Sound.play('jump');
            }
            P.charge = 0;
            jumpNow(v);
        } else if (IP.jump && !P.onGround && P.coyote === 0 && !P.pounding) {
            airAbility();
        }

        // let go of jump early = smaller hop
        if (!I.jump && P.cut && P.vy < -4) { P.vy = -4; P.cut = false; }
        if (P.vy >= 0) P.cut = false;

        // ---- ground pound ----
        if ((c.ability === 'pound' || c.ability === 'strong') && !P.onGround && IP.down && !P.pounding && P.dashT <= 0) {
            P.pounding = true; P.poundHang = 9; P.vx = 0; P.cut = false;
            Sound.play('dash');
        }

        // ---- gravity ----
        P.gliding = false;
        if (P.pounding) {
            if (P.poundHang > 0) { P.poundHang--; P.vy = 0; } else P.vy = 16;
        } else if (P.dashT <= 0) {
            if (c.ability === 'glide' && I.jump && P.vy > 0) {
                P.vy = Math.min(P.vy + grav * 0.25, 1.5);
                P.gliding = true;
            } else {
                P.vy = Math.min(P.vy + grav, maxFall);
            }
        }

        // ---- move sideways and bump into walls ----
        P.x += P.vx;
        if (P.x < 0) { P.x = 0; P.vx = 0; }
        if (P.x + P.w > L.end) { P.x = L.end - P.w; P.vx = 0; }
        for (const s of L.solids) {
            if (overlap(P, s)) {
                if (P.x + P.w / 2 < s.x + s.w / 2) P.x = s.x - P.w; else P.x = s.x + s.w;
                P.vx = 0;
                if (P.dashT > 0) P.dashT = 0;
            }
        }

        // ---- move up/down and land on things ----
        const prevBottom = P.y + P.h;
        const impactVy = P.vy;
        P.y += P.vy;
        P.onGround = false;
        P.onMover = null;
        for (const s of L.solids) {
            if (overlap(P, s)) {
                if (P.vy > 0 || (P.vy === 0 && prevBottom <= s.y + 1)) {
                    P.y = s.y - P.h;
                    land(s, impactVy);
                } else if (P.vy < 0) {
                    P.y = s.y + s.h;
                    P.vy = 0.5;
                    P.cut = false;
                    if (s.kind === 'box') hitBox(s);
                }
            }
        }
        if (P.vy >= 0) {
            for (const p of L.plats.concat(L.movers)) {
                const top = p.y;
                const lenient = p.dy > 0 ? p.dy + 1 : 1;
                if (P.x + P.w > p.x + 4 && P.x < p.x + p.w - 4 && prevBottom <= top + lenient && P.y + P.h >= top) {
                    P.y = top - P.h;
                    land(p, impactVy);
                    if (p.x0 != null) P.onMover = p;
                }
            }
        }

        // squash & stretch relaxes back
        P.sx = lerp(P.sx, 1, 0.2);
        P.sy = lerp(P.sy, 1, 0.2);
        if (charging) { P.sx = 1 + P.charge * 0.006; P.sy = 1 - P.charge * 0.006; }

        // running dust
        if (P.onGround && Math.abs(P.vx) > 3 && t % 8 === 0) FX.dust(P.x + P.w / 2, P.y + P.h, 1);

        if (P.y > H + 80) fall();
    }

    function interact() {
        const c = Game.char;
        const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
        const magnet = c.ability === 'magnet';

        for (const s of L.stars) {
            if (s.got) continue;
            if (magnet) {
                const dd = dist(cx, cy, s.x, s.y);
                if (dd < 170) { s.x += (cx - s.x) * 0.12; s.y += (cy - s.y) * 0.12; }
            }
            if (overlap(P, { x: s.x - 13, y: s.y - 13, w: 26, h: 26 })) { s.got = true; Game.collectStar(s.x, s.y); }
        }
        for (const k of L.tacos) {
            if (!k.got && overlap(P, { x: k.x - 16, y: k.y - 14, w: 32, h: 28 })) { k.got = true; Game.collectTaco(k.x, k.y); }
        }
        for (const b of L.babies) {
            if (!b.got && overlap(P, { x: b.x - 22, y: b.y - 30, w: 44, h: 40 })) {
                b.got = true;
                P.followers.push(b);
                Game.collectBaby(b.x, b.y - 10);
            }
        }

        const hb = { x: P.x + 4, y: P.y + 6, w: P.w - 8, h: P.h - 8 };
        for (const f of L.fires) {
            if (overlap(hb, { x: f.x + 5, y: f.y + 8, w: f.w - 10, h: f.h - 8 })) hurt(f.x + f.w / 2);
        }
        for (const f of L.fireballs) {
            if (overlap(hb, f)) hurt(f.x + f.w / 2);
        }
        for (const e of L.enemies) {
            if (!e.alive || !overlap(P, e)) continue;
            const stompable = e.kind === 'blob' || c.ability === 'tough' || P.pounding;
            const fromAbove = P.vy > 0 && P.y + P.h - e.y < 18 + P.vy;
            if (stompable && (fromAbove || P.pounding)) stomp(e, false);
            else if (P.dashT > 0 && e.kind === 'blob') stomp(e, true);
            else hurt(e.x + e.w / 2);
        }
        for (const f of L.flowers) {
            if (f.cool > 0) continue;
            if (overlap(P, { x: f.x - 16, y: GY - 46, w: 32, h: 46 })) boing(f);
        }
        for (const f of L.friends) {
            if (Math.abs(f.x - cx) < 150 && Math.abs(GY - cy) < 200) f.show = 100;
        }

        // Grab the flag!
        const fl = L.flag;
        if (!fl.got && P.x + P.w >= fl.x - 2) {
            fl.got = true;
            P.state = 'flag';
            P.x = fl.x - P.w + 6;
            P.vx = 0; P.vy = 0; P.pounding = false; P.dashT = 0;
            const frac = clamp((GY - (P.y + P.h)) / 260, 0, 1);
            const tiers = [100, 400, 800, 1500, 2500, 5000];
            const bonus = tiers[Math.min(5, Math.floor(frac * 6))];
            fl.flagY = Math.min(GY - 60, Math.max(fl.top + 10, P.y));
            Game.addScore(bonus, fl.x + 30, P.y - 20, bonus >= 2500 ? '#FFD400' : '#FFFFFF');
            Sound.play('flag');
            if (bonus >= 2500) FX.confetti(fl.x, P.y, 30);
        }
    }

    function updateWorld() {
        for (const m of L.movers) {
            const nx = m.x0 + Math.sin(t * m.speed + m.phase) * m.amp;
            m.dx = nx - m.x; m.dy = 0;
            m.x = nx;
        }
        for (const e of L.enemies) {
            e.t++;
            if (e.alive) {
                e.x += e.vx;
                if (e.x < e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
                if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.vx = -Math.abs(e.vx); }
            } else if (e.dead > 0) e.dead--;
        }
        for (const f of L.fireballs) {
            if (f.y >= H + 40 && f.vy >= 0) {
                if (--f.timer <= 0) { f.vy = -15; f.timer = 110; }
                else continue;
            }
            f.y += f.vy;
            f.vy += 0.5;
            if (f.y > H + 40) { f.y = H + 40; f.vy = 0; }
            if (t % 3 === 0) FX.burst(f.x + 12, f.y + 12, { count: 1, colors: ['#FFB300', '#FF5722'], speed: 0.5, life: 16, gravity: -0.05, shape: 'circle', size: 6 });
        }
        for (const f of L.flowers) { if (f.cool > 0) f.cool--; f.squish *= 0.85; }
        for (const f of L.friends) if (f.show > 0) f.show--;
        for (const s of L.solids) if (s.bump) s.bump = Math.max(0, s.bump - 1);
    }

    function update() {
        t++;
        updateWorld();
        if (P.state === 'play') {
            updatePlayer();
            if (P.state === 'play') interact();
        } else if (P.state === 'bubble') {
            P.bubbleT++;
            const k = Math.min(1, P.bubbleT / 80);
            const e = k * k * (3 - 2 * k);
            P.x = lerp(P.bubbleFromX, P.safeX, e);
            P.y = lerp(P.bubbleFromY, P.safeY - 60, e) + Math.sin(P.bubbleT * 0.2) * 4;
            if (P.bubbleT > 95) {
                Sound.play('pop');
                FX.burst(P.x + P.w / 2, P.y + P.h / 2, { count: 16, colors: ['#BFE9FF', '#FFFFFF', '#FFB6E1'], speed: 3, life: 24, shape: 'circle', size: 5 });
                P.state = 'play';
                P.vx = 0; P.vy = 0; P.inv = 60;
            }
        } else if (P.state === 'flag') {
            const fl = L.flag;
            if (P.y + P.h < GY - 2) { P.y = Math.min(GY - P.h, P.y + 4); fl.flagY = Math.min(GY - 60, fl.flagY + 4); }
            else {
                P.state = 'home'; P.homeT = 0; P.facing = 1;
                P.x = fl.x + 10;
                P.y = GY - P.h;
            }
        } else if (P.state === 'home') {
            P.homeT++;
            const door = L.house.x + 70;
            if (P.homeT === 1) { Sound.play('win'); FX.confetti(P.x, GY - 150, 60); }
            if (P.x + P.w / 2 < door) { P.x += 2.6; P.vx = 2.6; }
            else {
                P.vx = 0;
                if (P.homeT % 35 === 0) FX.confetti(door, GY - 130, 30);
            }
            if (P.homeT === 170) Game.levelDone();
        }

        // babies you've found follow you like ducklings
        // (only when you move, so they wait politely in a line when you stop)
        const last = P.trail[0], fx = P.x + P.w / 2, fy = P.y + P.h;
        if (!last || Math.abs(fx - last.x) + Math.abs(fy - last.y) > 1.5) {
            P.trail.unshift({ x: fx, y: fy });
            if (P.trail.length > 80) P.trail.pop();
        }

        // camera
        let tx = P.x + P.w / 2 - W * 0.4 + P.facing * 40;
        if (P.state === 'home' || P.state === 'flag') tx = L.house.x - W * 0.55;
        cam.x += (tx - cam.x) * 0.1;
        cam.x = clamp(cam.x, 0, L.end - W);
        const ty = Math.min(0, P.y - 110);
        cam.y += (ty - cam.y) * 0.12;
    }

    function dying() {
        // classic "oops!" hop off the screen
        P.vy += 0.5;
        P.y += P.vy;
    }

    // ---------------------------------------------------------
    //  DRAWING
    // ---------------------------------------------------------
    function drawSky(g, p, tt, camX) {
        const grad = g.createLinearGradient(0, 0, 0, H);
        p.sky.forEach((c, i) => grad.addColorStop(i / (p.sky.length - 1), c));
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);
        if (p.night) {
            for (let i = 0; i < 70; i++) {
                const sx = (hash(i) * W * 1.3 - camX * 0.03) % W;
                const sy = hash(i + 50) * 300;
                g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(tt * 0.03 + i));
                g.fillStyle = '#FFFFFF';
                g.fillRect((sx + W) % W, sy, 2, 2);
            }
            g.globalAlpha = 1;
            g.fillStyle = 'rgba(255,250,210,0.18)';
            g.beginPath(); g.arc(790, 95, 70, 0, TAU); g.fill();
            g.fillStyle = '#FFF6C8';
            g.beginPath(); g.arc(790, 95, 42, 0, TAU); g.fill();
            g.fillStyle = 'rgba(200,190,140,0.5)';
            g.beginPath(); g.arc(775, 85, 8, 0, TAU); g.arc(802, 108, 6, 0, TAU); g.fill();
        } else if (p.sun === 'sunset') {
            g.fillStyle = 'rgba(255,220,150,0.35)';
            g.beginPath(); g.arc(760, 330, 110, 0, TAU); g.fill();
            g.fillStyle = '#FFD27A';
            g.beginPath(); g.arc(760, 330, 70, 0, TAU); g.fill();
        } else {
            g.fillStyle = 'rgba(255,240,150,0.35)';
            g.beginPath(); g.arc(820, 85, 70 + Math.sin(tt * 0.05) * 4, 0, TAU); g.fill();
            g.fillStyle = '#FFE14D';
            g.beginPath(); g.arc(820, 85, 44, 0, TAU); g.fill();
            g.fillStyle = '#FFF3A6';
            g.beginPath(); g.arc(808, 74, 14, 0, TAU); g.fill();
        }
        // smiley clouds
        for (let i = 0; i < 6; i++) {
            const span = W + 300;
            const cx = ((i * 260 + hash(i) * 120 - camX * 0.12 - tt * 0.15) % span + span) % span - 150;
            drawCloud(g, cx, 50 + hash(i + 9) * 140, 0.7 + hash(i + 3) * 0.6, p.cloud, !p.night);
        }
    }

    function drawHills(g, p, camX, camY) {
        const layer = (color, par, base, amp, freq, off) => {
            g.fillStyle = color;
            g.beginPath();
            g.moveTo(0, H);
            for (let x = 0; x <= W + 20; x += 20) {
                const wx = x + camX * par + off;
                const y = base + Math.sin(wx * freq) * amp + Math.sin(wx * freq * 2.3 + 1) * amp * 0.4 - camY * par;
                g.lineTo(x, y);
            }
            g.lineTo(W, H);
            g.closePath();
            g.fill();
        };
        layer(p.hillFar, 0.2, 330, 40, 0.006, 0);
        layer(p.hillNear, 0.45, 390, 30, 0.009, 500);
    }

    function drawDecor(g, dcr, x, y) {
        const p = pal;
        const s = dcr.s;
        if (dcr.kind === 'tree') {
            g.fillStyle = p.trunk; g.fillRect(x - 6 * s, y - 50 * s, 12 * s, 50 * s);
            g.fillStyle = p.leaf2;
            g.beginPath(); g.arc(x, y - 70 * s, 34 * s, 0, TAU); g.fill();
            g.fillStyle = p.leaf;
            g.beginPath(); g.arc(x - 12 * s, y - 78 * s, 24 * s, 0, TAU); g.arc(x + 14 * s, y - 72 * s, 22 * s, 0, TAU); g.fill();
            if (dcr.hue > 0.6) { g.fillStyle = '#FF5A7A'; g.beginPath(); g.arc(x - 10 * s, y - 64 * s, 4, 0, TAU); g.arc(x + 12 * s, y - 80 * s, 4, 0, TAU); g.arc(x + 4 * s, y - 60 * s, 4, 0, TAU); g.fill(); }
        } else if (dcr.kind === 'pine') {
            g.fillStyle = p.trunk; g.fillRect(x - 5 * s, y - 24 * s, 10 * s, 24 * s);
            g.fillStyle = p.leaf2;
            for (let i = 0; i < 3; i++) {
                g.beginPath();
                g.moveTo(x - (34 - i * 8) * s, y - (20 + i * 26) * s);
                g.lineTo(x + (34 - i * 8) * s, y - (20 + i * 26) * s);
                g.lineTo(x, y - (62 + i * 26) * s);
                g.fill();
            }
        } else if (dcr.kind === 'bush') {
            g.fillStyle = p.leaf2;
            g.beginPath(); g.arc(x - 14 * s, y - 10 * s, 16 * s, 0, TAU); g.arc(x + 12 * s, y - 12 * s, 18 * s, 0, TAU); g.arc(x, y - 20 * s, 18 * s, 0, TAU); g.fill();
            g.fillStyle = p.leaf;
            g.beginPath(); g.arc(x - 4 * s, y - 24 * s, 9 * s, 0, TAU); g.fill();
        } else if (dcr.kind === 'flowers') {
            const cols = ['#FF6FA8', '#FFD400', '#FFFFFF', '#B784FF'];
            for (let i = 0; i < 4; i++) {
                const fx = x + (i - 1.5) * 12;
                g.fillStyle = '#3DA83D'; g.fillRect(fx - 1, y - 14, 2, 14);
                g.fillStyle = cols[(i + Math.floor(dcr.hue * 4)) % 4];
                g.beginPath(); g.arc(fx, y - 16, 5, 0, TAU); g.fill();
                g.fillStyle = '#FFE680'; g.fillRect(fx - 1.5, y - 17.5, 3, 3);
            }
        } else if (dcr.kind === 'mushroom') {
            g.fillStyle = '#FFF1DC'; g.fillRect(x - 5, y - 16, 10, 16);
            g.fillStyle = '#FF4F5E';
            g.beginPath(); g.arc(x, y - 16, 15, Math.PI, 0); g.fill();
            g.fillStyle = '#FFFFFF';
            g.beginPath(); g.arc(x - 6, y - 22, 3, 0, TAU); g.arc(x + 6, y - 20, 2.5, 0, TAU); g.fill();
        }
    }

    function drawGround(g, s) {
        const p = pal;
        const x0 = Math.max(s.x, cam.x - 40), x1 = Math.min(s.x + s.w, cam.x + W + 40);
        if (x1 <= x0) return;
        const sx = x0 - cam.x, top = s.y - cam.y, w = x1 - x0;
        g.fillStyle = p.dirt;
        g.fillRect(sx, top, w, H - top + 20);
        g.fillStyle = p.dirtDark;
        for (let wx = Math.floor(x0 / 36) * 36; wx < x1; wx += 36) {
            for (let row = 0; row < 3; row++) {
                const hv = hash(wx * 0.37 + row * 13.1);
                if (hv < 0.55) g.fillRect(wx - cam.x + hv * 22, top + 30 + row * 26 + hash(wx + row) * 8, 7, 5);
            }
        }
        g.fillStyle = p.grass;
        g.fillRect(sx, top, w, 14);
        for (let wx = Math.floor(x0 / 16) * 16; wx < x1; wx += 16) {
            if (wx < s.x || wx + 16 > s.x + s.w) continue;
            g.beginPath(); g.arc(wx - cam.x + 8, top + 13, 8, 0, Math.PI); g.fill();
        }
        g.fillStyle = p.grassLight;
        g.fillRect(sx, top, w, 4);
        // dark edges at the side of pits
        g.fillStyle = 'rgba(0,0,0,0.18)';
        if (s.x >= x0) g.fillRect(s.x - cam.x, top, 4, H);
        if (s.x + s.w <= x1) g.fillRect(s.x + s.w - cam.x - 4, top, 4, H);
    }

    function drawBlock(g, s) {
        const x = s.x - cam.x, y = s.y - cam.y;
        if (x > W || x + s.w < 0) return;
        g.fillStyle = pal.brick;
        g.fillRect(x, y, s.w, s.h);
        g.fillStyle = pal.brickDark;
        for (let by = 0; by < s.h; by += 18) {
            g.fillRect(x, y + by, s.w, 2);
            const off = (by / 18) % 2 ? 10 : 30;
            for (let bx = off; bx < s.w; bx += 40) g.fillRect(x + bx, y + by, 2, 18);
        }
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.fillRect(x, y, s.w, 3);
        g.fillStyle = pal.grass;
        g.fillRect(x - 2, y - 4, s.w + 4, 7);
        g.fillStyle = pal.grassLight;
        g.fillRect(x - 2, y - 4, s.w + 4, 2);
    }

    function drawBox(g, s) {
        const bump = s.bump ? -Math.sin((s.bump / 10) * Math.PI) * 8 : 0;
        const x = s.x - cam.x, y = s.y - cam.y + bump;
        if (x > W || x + s.w < 0) return;
        g.fillStyle = s.used ? '#9A7A5A' : '#FFB800';
        rrect(g, x, y, 40, 40, 6); g.fill();
        g.lineWidth = 3; g.strokeStyle = s.used ? '#6A4A30' : '#B86B00'; g.stroke();
        if (!s.used) {
            g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 4, y + 4, 32, 5);
            const glow = 0.8 + 0.2 * Math.sin(t * 0.15);
            g.save(); g.translate(x + 20, y + 22); g.scale(glow, glow);
            drawStarShape(g, 0, 0, 11, 0, '#FFFFFF');
            g.restore();
        }
        g.fillStyle = s.used ? '#6A4A30' : '#B86B00';
        [[5, 5], [31, 5], [5, 31], [31, 31]].forEach(([a, b]) => g.fillRect(x + a, y + b, 4, 4));
    }

    function drawPlat(g, p) {
        const x = p.x - cam.x, y = p.y - cam.y;
        if (x > W || x + p.w < 0) return;
        g.fillStyle = pal.dirt;
        g.beginPath();
        g.moveTo(x + 4, y + 10);
        g.lineTo(x + p.w - 4, y + 10);
        g.lineTo(x + p.w * 0.6, y + 34);
        g.lineTo(x + p.w * 0.4, y + 34);
        g.closePath();
        g.fill();
        g.fillStyle = pal.grass;
        rrect(g, x, y, p.w, 16, 8); g.fill();
        g.fillStyle = pal.grassLight;
        rrect(g, x + 4, y + 2, p.w - 8, 4, 2); g.fill();
    }

    function drawMover(g, m) {
        const x = m.x - cam.x, y = m.y - cam.y;
        g.fillStyle = pal.night ? '#C8D0F0' : '#FFFFFF';
        rrect(g, x, y, m.w, 20, 10); g.fill();
        g.beginPath();
        g.arc(x + 25, y + 4, 16, Math.PI, 0);
        g.arc(x + 58, y + 2, 20, Math.PI, 0);
        g.arc(x + 92, y + 4, 16, Math.PI, 0);
        g.fill();
        g.fillStyle = '#555';
        g.beginPath(); g.arc(x + 50, y + 4, 2.5, 0, TAU); g.arc(x + 68, y + 4, 2.5, 0, TAU); g.fill();
        g.strokeStyle = '#555'; g.lineWidth = 2;
        g.beginPath(); g.arc(x + 59, y + 7, 5, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
        g.fillStyle = 'rgba(160,190,230,0.5)';
        g.fillRect(x + 8, y + 16, m.w - 16, 4);
    }

    function drawFire(g, f) {
        const x = f.x - cam.x + f.w / 2, y = f.y - cam.y + f.h;
        if (x < -60 || x > W + 60) return;
        const fl = Math.sin((t + f.t) * 0.3) * 0.08;
        g.fillStyle = 'rgba(255,150,40,0.25)';
        g.beginPath(); g.arc(x, y - 16, 32 + Math.sin(t * 0.2) * 3, 0, TAU); g.fill();
        const flame = (w, h, c) => {
            g.fillStyle = c;
            g.beginPath();
            g.moveTo(x - w, y);
            g.quadraticCurveTo(x - w * 1.1, y - h * 0.5, x + Math.sin((t + f.t) * 0.25) * 4, y - h);
            g.quadraticCurveTo(x + w * 1.1, y - h * 0.5, x + w, y);
            g.closePath(); g.fill();
        };
        flame(16, 40 * (1 + fl), '#FF4A1C');
        flame(11, 30 * (1 - fl), '#FF9A1C');
        flame(6, 18 * (1 + fl), '#FFE14D');
        g.fillStyle = '#6B3A1E';
        g.fillRect(x - 18, y - 4, 36, 6);
        g.fillStyle = '#8B5A2B';
        g.fillRect(x - 14, y - 7, 28, 4);
    }

    function drawEnemy(g, e) {
        const x = e.x - cam.x, y = e.y - cam.y;
        if (x < -60 || x > W + 60) return;
        if (!e.alive) {
            if (e.dead <= 0) return;
            g.globalAlpha = e.dead / 30;
            g.fillStyle = e.kind === 'blob' ? '#8E5BD6' : '#E84A4A';
            g.beginPath(); g.ellipse(x + 17, y + 26, 20, 5, 0, 0, TAU); g.fill();
            g.globalAlpha = 1;
            return;
        }
        const face = e.vx > 0 ? 1 : -1;
        const squ = Math.sin(e.t * 0.2) * 0.08;
        g.save();
        g.translate(x + 17, y + 30);
        g.scale(1 + squ, 1 - squ);
        if (e.kind === 'blob') {
            g.fillStyle = '#6B3FB8';
            g.beginPath(); g.ellipse(0, -13, 19, 15, 0, 0, TAU); g.fill();
            g.fillStyle = '#8E5BD6';
            g.beginPath(); g.ellipse(0, -15, 17, 14, 0, 0, TAU); g.fill();
            g.fillStyle = 'rgba(255,255,255,0.35)';
            g.beginPath(); g.ellipse(-7, -22, 5, 3, -0.4, 0, TAU); g.fill();
            // grumpy face
            g.fillStyle = '#FFF';
            g.beginPath(); g.arc(face * 3 - 5, -15, 5, 0, TAU); g.arc(face * 3 + 6, -15, 5, 0, TAU); g.fill();
            g.fillStyle = '#222';
            g.beginPath(); g.arc(face * 5 - 5, -14, 2.5, 0, TAU); g.arc(face * 5 + 6, -14, 2.5, 0, TAU); g.fill();
            g.strokeStyle = '#2A1050'; g.lineWidth = 2.5;
            g.beginPath(); g.moveTo(face * 3 - 10, -23); g.lineTo(face * 3 - 1, -19); g.moveTo(face * 3 + 11, -23); g.lineTo(face * 3 + 2, -19); g.stroke();
            g.beginPath(); g.arc(face * 3, -4, 5, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
        } else {
            // spiky critter: don't stomp this one!
            g.fillStyle = '#FFFFFF';
            for (let i = -2; i <= 2; i++) {
                g.beginPath();
                g.moveTo(i * 7 - 5, -18); g.lineTo(i * 7, -32 + Math.abs(i) * 3); g.lineTo(i * 7 + 5, -18);
                g.fill();
            }
            g.fillStyle = '#D93636';
            g.beginPath(); g.ellipse(0, -12, 18, 13, 0, Math.PI, 0); g.fill();
            g.fillRect(-18, -12, 36, 6);
            g.fillStyle = '#FFD1A8';
            g.beginPath(); g.ellipse(face * 14, -8, 8, 7, 0, 0, TAU); g.fill();
            g.fillStyle = '#222';
            g.beginPath(); g.arc(face * 16, -10, 2, 0, TAU); g.fill();
            g.fillStyle = '#6B3A1E';
            const st = Math.floor(e.t / 8) % 2 ? 2 : 0;
            g.fillRect(-12, -6, 7, 6 - st); g.fillRect(5, -6, 7, 4 + st);
        }
        g.restore();
    }

    function drawFlower(g, f) {
        const x = f.x - cam.x, y = GY - cam.y;
        if (x < -60 || x > W + 60) return;
        const sq = f.squish / 14;
        const ang = f.dir === 'up' ? 0 : (f.dir === 'right' ? 0.6 : -0.6);
        g.fillStyle = '#2E9E3A';
        g.fillRect(x - 3, y - 26 + sq * 10, 6, 26 - sq * 10);
        g.fillStyle = '#4CC85A';
        g.beginPath(); g.ellipse(x - 10, y - 10, 10, 5, -0.5, 0, TAU); g.ellipse(x + 10, y - 12, 10, 5, 0.5, 0, TAU); g.fill();
        g.save();
        g.translate(x, y - 30 + sq * 12);
        g.rotate(ang);
        g.scale(1 + sq * 0.4, 1 - sq * 0.4);
        const col = f.dir === 'up' ? '#FF5FAE' : '#FF9A2E';
        g.fillStyle = col;
        for (let i = 0; i < 6; i++) {
            const a = i * TAU / 6 + t * 0.02;
            g.beginPath(); g.ellipse(Math.cos(a) * 12, Math.sin(a) * 9, 9, 7, a, 0, TAU); g.fill();
        }
        g.fillStyle = '#FFE14D';
        g.beginPath(); g.ellipse(0, 0, 9, 7, 0, 0, TAU); g.fill();
        g.fillStyle = '#E09A00';
        g.fillRect(-3, -2, 2, 2); g.fillRect(2, -2, 2, 2);
        g.restore();
        // arrow hint
        const near = Math.abs(P.x + P.w / 2 - f.x) < 200;
        if (near) {
            const bob = Math.sin(t * 0.15) * 4;
            g.save();
            g.translate(x, y - 78 + bob);
            g.rotate(ang);
            g.fillStyle = 'rgba(255,255,255,0.9)';
            g.beginPath(); g.moveTo(0, -12); g.lineTo(10, 2); g.lineTo(3, 2); g.lineTo(3, 12); g.lineTo(-3, 12); g.lineTo(-3, 2); g.lineTo(-10, 2); g.closePath(); g.fill();
            g.restore();
        }
    }

    function drawFlag(g) {
        const fl = L.flag;
        const x = fl.x - cam.x;
        if (x < -200 || x > W + 200) return;
        g.fillStyle = '#6B4A2A';
        g.fillRect(x - 14, GY - cam.y - 16, 28, 16);
        g.fillStyle = '#E8F5E8';
        g.fillRect(x - 3, fl.top - cam.y, 6, GY - fl.top);
        g.fillStyle = 'rgba(0,0,0,0.15)';
        g.fillRect(x + 1, fl.top - cam.y, 2, GY - fl.top);
        g.fillStyle = '#FFD400';
        g.beginPath(); g.arc(x, fl.top - cam.y - 6, 9, 0, TAU); g.fill();
        const fy = fl.flagY - cam.y;
        const wave = Math.sin(t * 0.15) * 4;
        g.fillStyle = fl.got ? '#FFD400' : '#FF4FA3';
        g.beginPath(); g.moveTo(x + 3, fy); g.lineTo(x + 62 + wave, fy + 20); g.lineTo(x + 3, fy + 40); g.closePath(); g.fill();
        drawStarShape(g, x + 22, fy + 20, 8, 0, fl.got ? '#FF4FA3' : '#FFFFFF');
    }

    function drawHouse(g) {
        const x = L.house.x - cam.x, y = GY - cam.y;
        if (x < -300 || x > W + 100) return;
        g.fillStyle = '#FFD1E6'; g.fillRect(x, y - 110, 150, 110);
        g.fillStyle = '#FFB3D3'; for (let i = 0; i < 5; i++) g.fillRect(x, y - 100 + i * 22, 150, 3);
        g.fillStyle = '#E0457B';
        g.beginPath(); g.moveTo(x - 18, y - 106); g.lineTo(x + 75, y - 180); g.lineTo(x + 168, y - 106); g.closePath(); g.fill();
        g.fillStyle = '#C23466'; g.fillRect(x - 18, y - 110, 186, 8);
        g.fillStyle = '#7A4A22'; rrect(g, x + 52, y - 64, 38, 64, 16); g.fill();
        g.fillStyle = '#FFD400'; g.beginPath(); g.arc(x + 82, y - 30, 3, 0, TAU); g.fill();
        drawHeart(g, x + 75, y - 150, 22, '#FF4F8B', '#8B1040');
        g.fillStyle = '#9EE0FF'; g.fillRect(x + 12, y - 80, 28, 26); g.fillRect(x + 110, y - 80, 28, 26);
        g.fillStyle = '#FFFFFF'; g.fillRect(x + 25, y - 80, 2, 26); g.fillRect(x + 123, y - 80, 2, 26);
        g.fillStyle = '#FFFFFF'; g.fillRect(x + 12, y - 68, 28, 2); g.fillRect(x + 110, y - 68, 28, 2);
        drawAxolotl(g, x + 124, y, t, -1, 1.1);
        g.fillStyle = '#6B4A2A'; g.fillRect(x + 190, y - 50, 6, 50);
        g.fillStyle = '#FFF'; rrect(g, x + 160, y - 78, 70, 30, 6); g.fill();
        g.fillStyle = '#E0457B'; g.font = `700 14px ${FONT}`; g.textAlign = 'center'; g.fillText('HOME', x + 195, y - 58);
    }

    function drawPlayer(g) {
        const c = Game.char;
        if (P.inv > 0 && Math.floor(P.inv / 4) % 2 === 0 && P.state === 'play') return;
        const cx = P.x + P.w / 2 - cam.x, by = P.y + P.h - cam.y;
        const running = P.onGround && Math.abs(P.vx) > 0.5;
        let rot = 0;
        if (P.pounding && P.poundHang > 0) rot = (9 - P.poundHang) / 9 * TAU * P.facing;
        if (P.state === 'dead') rot = Math.PI;
        if (P.gliding) {
            // Mom's umbrella
            g.fillStyle = '#FF7BC0';
            g.beginPath(); g.arc(cx, by - P.h - 10, 26, Math.PI, 0); g.fill();
            g.strokeStyle = '#8B008B'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(cx, by - P.h - 10); g.lineTo(cx, by - P.h + 16); g.stroke();
        }
        if (P.charge > 10) {
            g.fillStyle = `rgba(140,255,140,${0.2 + (P.charge / 50) * 0.4})`;
            g.beginPath(); g.ellipse(cx, by - 4, 30 + P.charge * 0.3, 8, 0, 0, TAU); g.fill();
        }
        drawChar(g, c, cx, by, {
            t: Game.t, facing: P.facing, run: running, air: !P.onGround,
            sx: P.sx, sy: P.sy, rot
        });
        if (P.state === 'bubble') {
            g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
            g.fillStyle = 'rgba(190,230,255,0.3)';
            g.beginPath(); g.arc(cx, by - P.h / 2, Math.max(P.w, P.h) * 0.85, 0, TAU); g.fill(); g.stroke();
            drawHeart(g, cx + 22, by - P.h - 8, 12, '#FF4F8B');
        }
    }

    function drawFollowers(g) {
        P.followers.forEach((b, i) => {
            const pt = P.trail[Math.min(P.trail.length - 1, (i + 1) * 14)];
            if (!pt) return;
            if (P.state === 'home' && P.x + P.w / 2 >= L.house.x + 65 && P.homeT > 30 + i * 12) return; // went inside!
            // boing boing! each baby bounces along on a tiny pogo stick
            const ph = ((Game.t + i * 9) * 0.09) % Math.PI;
            const hop = Math.sin(ph) * 22;
            const squish = Math.max(0, 1 - ph / 0.35, 1 - (Math.PI - ph) / 0.35) * 4;
            drawPogo(g, pt.x - cam.x, pt.y - cam.y - hop, squish, i, Game.t * 1.4 + i * 20);
        });
    }

    function drawPogo(g, x, y, squish, k, at) {
        const lean = Math.sin(Game.t * 0.09 + k) * 0.08;
        g.save();
        g.translate(x, y);
        g.rotate(lean);
        g.scale(1.3, 1.3);
        // spring (it squishes when it hits the ground)
        const top = -12 + squish;
        g.strokeStyle = '#C8CCD8'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, 0);
        for (let j = 1; j <= 4; j++) g.lineTo(j % 2 ? -4 : 4, top * j / 4);
        g.lineTo(0, top);
        g.stroke();
        g.fillStyle = '#333'; g.fillRect(-2, -2, 4, 3);
        // pole, foot pegs and handlebar
        const col = ['#FF4F8B', '#3D8BFF', '#3DDC84'][k % 3];
        g.fillStyle = col;
        g.fillRect(-2, top - 30, 4, 30);
        g.fillRect(-9, top - 2, 18, 3);
        g.fillRect(-9, top - 32, 18, 4);
        g.fillStyle = '#333'; g.fillRect(-11, top - 32, 4, 4); g.fillRect(7, top - 32, 4, 4);
        // the baby standing on the pegs, holding on tight
        drawAxolotl(g, -3 * P.facing, top - 2, at, -P.facing, 0.6, '#FFC6E4');
        g.restore();
    }

    function draw(g) {
        drawSky(g, pal, Game.t, cam.x);
        drawHills(g, pal, cam.x, cam.y);
        for (const dcr of L.decor) {
            const x = dcr.x - cam.x;
            if (x > -80 && x < W + 80) drawDecor(g, dcr, x, GY - cam.y + 2);
        }
        drawHouse(g);
        for (const s of L.solids) {
            if (s.kind === 'ground') drawGround(g, s);
        }
        for (const s of L.solids) {
            if (s.kind === 'block') drawBlock(g, s);
            else if (s.kind === 'box') drawBox(g, s);
        }
        L.plats.forEach(p => drawPlat(g, p));
        L.movers.forEach(m => drawMover(g, m));
        drawFlag(g);
        L.flowers.forEach(f => drawFlower(g, f));
        L.fires.forEach(f => drawFire(g, f));
        for (const f of L.fireballs) {
            if (f.y > H + 30) continue;
            const x = f.x + 12 - cam.x, y = f.y + 12 - cam.y;
            g.fillStyle = 'rgba(255,120,0,0.35)'; g.beginPath(); g.arc(x, y, 18, 0, TAU); g.fill();
            g.fillStyle = '#FF5722'; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill();
            g.fillStyle = '#FFC107'; g.beginPath(); g.arc(x - 2, y - 2, 7, 0, TAU); g.fill();
            g.fillStyle = '#222'; g.fillRect(x - 5, y - 3, 3, 4); g.fillRect(x + 2, y - 3, 3, 4);
        }
        for (const s of L.stars) {
            if (s.got) continue;
            const x = s.x - cam.x;
            if (x > -30 && x < W + 30) drawStar(g, x, s.y - cam.y, Game.t + s.x * 0.1);
        }
        for (const k of L.tacos) if (!k.got) drawTaco(g, k.x - cam.x, k.y - cam.y, Game.t);
        for (const f of L.friends) {
            const x = f.x - cam.x;
            if (x < -200 || x > W + 200) continue;
            const face = P.x + P.w / 2 < f.x ? -1 : 1;
            drawAxolotl(g, x, GY - cam.y, Game.t + f.x, face, f.mama ? 1.25 : 1);
            if (f.show > 0) drawSpeech(g, x, GY - cam.y - (f.mama ? 40 : 32), f.quip, Math.min(1, f.show / 15), f.mama ? '#FF4FA3' : '#FF9AD0');
        }
        for (const b of L.babies) if (!b.got) drawBaby(g, b.x - cam.x, b.y - cam.y, Game.t);
        L.enemies.forEach(e => drawEnemy(g, e));
        drawFollowers(g);
        drawPlayer(g);
        FX.draw(g, cam.x, cam.y);
        if (pal.night) {
            for (let i = 0; i < 18; i++) {
                const fx = (hash(i * 3.1) * 1400 + Math.sin(Game.t * 0.01 + i) * 60 - cam.x * 0.6) % 1100;
                const fy = 180 + hash(i * 7.7) * 250 + Math.sin(Game.t * 0.02 + i * 2) * 30;
                const a = 0.5 + 0.5 * Math.sin(Game.t * 0.08 + i);
                g.fillStyle = `rgba(220,255,120,${a * 0.35})`;
                g.beginPath(); g.arc((fx + 1100) % 1100 - 70, fy, 8, 0, TAU); g.fill();
                g.fillStyle = `rgba(240,255,170,${a})`;
                g.beginPath(); g.arc((fx + 1100) % 1100 - 70, fy, 2.5, 0, TAU); g.fill();
            }
        }
        FX.drawTexts(g, cam.x, cam.y);
    }

    function progress() {
        return clamp((P.x - 120) / (L.flag.x - 120), 0, 1);
    }

    // Scenery for the title screen
    function drawScenery(g, camX, palIndex, tt) {
        const p = PALETTES[palIndex];
        drawSky(g, p, tt, camX);
        drawHills(g, p, camX, 0);
        g.fillStyle = p.dirt; g.fillRect(0, GY, W, H - GY);
        g.fillStyle = p.grass; g.fillRect(0, GY, W, 14);
        g.fillStyle = p.grassLight; g.fillRect(0, GY, W, 4);
        g.fillStyle = p.dirtDark;
        for (let i = 0; i < 40; i++) {
            const wx = (i * 67 - camX) % (W + 80);
            g.fillRect((wx + W + 80) % (W + 80) - 40, GY + 30 + (i % 3) * 26, 7, 5);
        }
    }

    return {
        GY, music: 'walk', icon: '🌸',
        tip: '← → run   ·   SPACE jump   ·   Bop blobs, find 3 babies, reach the flag!',
        debug: () => ({ L, P }),
        init, update, draw, dying, progress, drawScenery
    };
})();
