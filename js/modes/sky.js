// ============================================================
//  3D SKY PATH LEVELS: run INTO the screen along a floating
//  path in the sky! The path curves, goes up and down hills,
//  has gaps to jump, hedges to dodge, grumpy blobs to bop,
//  wobbly narrow bridges and flowers that launch you sky-high.
//
//  How the 3D works: the world is made of thin slices of path
//  ("segments") lined up one after another going away from you.
//  Every frame we work out where each slice lands on the screen:
//  things far away are drawn smaller and closer to the middle
//  (that's "perspective"). Then we paint them from the farthest
//  to the nearest, so near things cover far things.
// ============================================================
'use strict';

MODES.sky = (() => {
    const SEG = 200;          // how long each slice of path is
    const ROAD = 1000;        // half the width of the path
    const K = 560;            // the camera's "zoom" (focal length in pixels)
    const HOR = 175;          // where the horizon sits on the screen
    const CAM_H = 650;        // how high the camera floats above the path
    const BEHIND = 1300;      // how far the camera stays behind the player
    const DRAW = 170;         // how many slices to draw
    const THICK = 260;        // how thick the floating path is
    const CHAR_U = 4.4;       // world units per character pixel
    const G = 1.8;            // gravity
    const FAR = K / BEHIND;   // size of things right where the player is

    const PALETTES = [
        { // sunny day
            sky: ['#4DA8FF', '#A8DCFF', '#E6F6FF'], sea: ['#FFFFFF', '#CFEBFF'], sun: 'sun',
            grass: ['#5FD35A', '#4FC24C'], path: ['#F7DCA6', '#F0CF8E'], edge: ['#FF7BC0', '#FFFFFF'],
            dirt: '#B5763C', dirtDark: '#8E5A2A', cloud: '#FFFFFF', island: '#6CC36A', fog: '#D8F0FF'
        },
        { // sunset
            sky: ['#5A4BC8', '#FF8FB1', '#FFC98A'], sea: ['#FFE0EC', '#FFB59A'], sun: 'sunset',
            grass: ['#6CC06A', '#5AAE5A'], path: ['#F6C6A6', '#EDB592'], edge: ['#FFD400', '#FF7B5C'],
            dirt: '#A35F3E', dirtDark: '#7E4428', cloud: '#FFE0EC', island: '#9E6AA8', fog: '#FFC9A8'
        },
        { // starry night
            sky: ['#05081F', '#141F55', '#2B3A80'], sea: ['#3A4A8E', '#1B2558'], sun: 'moon',
            grass: ['#2F9A64', '#278556'], path: ['#7E7AC0', '#706CB0'], edge: ['#39FF88', '#FF3DF0'],
            dirt: '#4A3A6A', dirtDark: '#33264E', cloud: '#8E9AC8', island: '#1F6E52', fog: '#2B3A80', night: true
        }
    ];

    let S, PL = [], P, pal, t, lvl, cam, skyX;

    // ---------- building the level ----------
    function build(level) {
        const d = level.d;
        const rng = makeRng(level.seed);
        S = { segs: [], stars: [], tacos: [], babies: [], hedges: [], blobs: [], flowers: [], deco: [], checks: [0], finishSeg: 0, finishZ: 0 };
        const segs = S.segs;
        let y = 0, half = ROAD;

        // add n slices: bend by `curve`, climb by `dy`, and change width to `w`
        function add(n, curve = 0, dy = 0, w = half, gap = false) {
            const y0 = y, w0 = half;
            for (let k = 0; k < n; k++) {
                const e1 = n > 1 ? (1 - Math.cos(Math.PI * k / n)) / 2 : 0;
                const e2 = (1 - Math.cos(Math.PI * (k + 1) / n)) / 2;
                const ww = Math.min(1, (k + 1) / 5);
                segs.push({
                    i: segs.length, curve, gap,
                    y1: y0 + dy * e1, y2: y0 + dy * e2,
                    w1: lerp(w0, w, Math.min(1, k / 5)), w2: lerp(w0, w, ww),
                    rx1: 0, rx2: 0, items: []
                });
            }
            y = y0 + dy; half = w;
        }
        const here = () => segs.length;
        const zOf = (si) => si * SEG + SEG / 2;
        const gy = (si) => { const s = segs[Math.min(si, segs.length - 1)]; return (s.y1 + s.y2) / 2; };
        const star = (si, x, h) => S.stars.push({ x, z: zOf(si), y: gy(si) + h, got: false });

        // where the babies and tacos go (as a fraction of the level)
        const LEN = Math.round(1500 + d * 600);
        const babyAt = [0.22, 0.55, 0.82];
        const tacoAt = [0.4, 0.72];
        let lastType = '';
        const side = () => (rng.chance(0.5) ? -1 : 1);
        const wantBaby = () => babyAt.length && here() > babyAt[0] * LEN;
        const placeBaby = (si, x, h) => { S.babies.push({ x, z: zOf(si), y: gy(si) + h, got: false }); babyAt.shift(); };

        add(24);
        while (here() < LEN) {
            S.checks.push(here());
            // tacos sit on solid path at the start of a section
            if (tacoAt.length && here() > tacoAt[0] * LEN) {
                S.tacos.push({ x: rng.range(-400, 400), z: zOf(here() + 3), y: y + 130, got: false });
                tacoAt.shift();
            }
            const r = rng();
            let type;
            if (r < 0.2) type = 'run';
            else if (r < 0.38) type = 'gap';
            else if (r < 0.52) type = 'hedges';
            else if (r < 0.64) type = 'blobs';
            else if (r < 0.75) type = 'narrow';
            else if (r < 0.87) type = 'flower';
            else type = 'stones';
            if (type === lastType && type !== 'run') type = 'run';
            if (here() < 40 && (type === 'narrow' || type === 'stones')) type = 'gap';
            lastType = type;

            if (type === 'run') {
                const n = rng.int(20, 32);
                const s0 = here();
                add(n, rng.chance(0.75) ? rng.range(-5, 5) : 0, rng.range(-1400, 1400));
                // a wavy line of stars
                const ph = rng() * TAU;
                for (let k = 4; k < n - 2; k += 4) star(s0 + k, Math.sin(ph + k * 0.25) * 550, 110);
            } else if (type === 'gap') {
                add(8, rng.chance(0.4) ? rng.range(-3, 3) : 0);
                const g0 = here();
                const gl = rng.int(6, Math.round(9 + d * 6));
                add(gl, 0, 0, half, true);
                // stars along the jump
                for (let k = 0; k <= 4; k++) {
                    const f = k / 4;
                    star(g0 - 3 + Math.round(f * (gl + 5)), 0, 140 + Math.sin(f * Math.PI) * 300);
                }
                if (wantBaby()) placeBaby(g0 + Math.floor(gl / 2), side() * 620, 380);
                add(8);
            } else if (type === 'hedges') {
                const curve = rng.chance(0.5) ? rng.range(-2.5, 2.5) : 0;
                const s0 = here();
                const rows = rng.int(3, 4 + Math.round(d * 2));
                add(8 + rows * 11, curve, rng.range(-500, 500));
                const lanes = [-667, 0, 667];
                let open = 1;
                for (let k = 0; k < rows; k++) {
                    const si = s0 + 6 + k * 11;
                    // the open lane only moves over one step at a time
                    if (k && rng.chance(0.5)) open = open === 1 ? rng.pick([0, 2]) : 1;
                    const blocks = rng.chance(0.35 + d * 0.4) ? 2 : 1;
                    let placed = 0;
                    lanes.forEach((x, li) => {
                        if (li === open || placed >= blocks) return;
                        if (blocks === 1 && rng.chance(0.5) && li !== 2) return;
                        S.hedges.push({ x, z: zOf(si), w: 560, h: 230, si, broken: 0 });
                        placed++;
                    });
                    if (!placed) S.hedges.push({ x: lanes[(open + 1) % 3], z: zOf(si), w: 560, h: 230, si, broken: 0 });
                    star(si - 2, lanes[open], 110); star(si + 1, lanes[open], 110);
                }
                if (wantBaby()) placeBaby(s0 + 6 + rows * 11 - 4, side() * 850, 90);
            } else if (type === 'blobs') {
                const s0 = here();
                const n = rng.int(24, 30);
                add(n, rng.range(-3, 3), rng.range(-600, 600));
                const nb = rng.int(2, 3 + Math.round(d * 2));
                for (let k = 0; k < nb; k++) {
                    const si = s0 + 6 + Math.floor(k * (n - 10) / nb);
                    S.blobs.push({ si, z: zOf(si), x: 0, amp: rng.range(300, 550), speed: rng.range(0.018, 0.028 + d * 0.01), ph: rng() * TAU, squash: 0, dead: 0 });
                    star(si, 0, 360);
                }
            } else if (type === 'narrow') {
                const w = 430 - d * 90;
                add(6, 0, 0, w);
                const s0 = here();
                const n = rng.int(14, 20);
                add(n, rng.chance(0.6) ? rng.range(-2.5, 2.5) : 0, rng.range(-300, 300), w);
                for (let k = 2; k < n; k += 4) star(s0 + k, 0, 110);
                add(6, 0, 0, ROAD);
            } else if (type === 'flower') {
                add(10, rng.chance(0.3) ? rng.range(-2, 2) : 0);
                const fl = here() - 4;
                S.flowers.push({ x: 0, z: zOf(fl), si: fl, squish: 0 });
                const g0 = here();
                const gl = rng.int(18, 22);
                add(gl, 0, 0, half, true);
                for (let k = 0; k <= 6; k++) {
                    const f = k / 6;
                    star(fl + 2 + Math.round(f * (gl + 2)), 0, 200 + Math.sin(f * Math.PI) * 820);
                }
                if (wantBaby()) placeBaby(g0 + Math.floor(gl * 0.5), side() * 520, 1000);
                add(18);
            } else if (type === 'stones') {
                add(8);
                const n = rng.int(2, 3);
                const w = 650 - d * 120;
                // each stone is long enough that a normal jump from the edge lands on it
                for (let k = 0; k < n; k++) {
                    const gl = rng.int(4, 6 + Math.round(d * 2));
                    add(gl, 0, 0, w, true);
                    const s1 = here();
                    add(rng.int(28, 32), 0, 0, w);
                    for (let k2 = 3; k2 < 26; k2 += 5) star(s1 + k2, 0, 130);
                    if (k === 1 && wantBaby()) placeBaby(s1 + 8, side() * 380, 340);
                }
                add(8, 0, 0, ROAD);
            }
        }
        // the finish: a rainbow arch and Mama Axolotl's house
        add(12);
        S.finishSeg = here();
        S.finishZ = S.finishSeg * SEG;
        add(60);
        // babies that didn't find a spot yet go near the end
        while (babyAt.length) placeBaby(S.finishSeg - 6 - babyAt.length * 4, side() * 700, 300);

        // floating islands, balloons and clouds off to the sides (just for looks)
        for (let si = 4; si < segs.length; si += rng.int(5, 9)) {
            const sd = side();
            const kind = rng.pick(['island', 'island', 'balloon', 'cloud', 'cloud']);
            S.deco.push({ kind, si, x: sd * rng.range(1700, 3800), z: zOf(si), y: gy(si) + (kind === 'cloud' ? rng.range(-900, -300) : rng.range(-500, 500)), c: rng.pick(['#FF4F8B', '#FFD400', '#3D8BFF', '#3DDC84', '#B36BFF']), ph: rng() * TAU });
        }
        return S.stars.length;
    }

    // ---------- the path: where's the ground? ----------
    const segAt = (z) => S.segs[clamp(Math.floor(z / SEG), 0, S.segs.length - 1)];
    function groundAt(z) {
        const s = segAt(z);
        const f = clamp((z - s.i * SEG) / SEG, 0, 1);
        return lerp(s.y1, s.y2, f);
    }
    function halfAt(z) {
        const s = segAt(z);
        return lerp(s.w1, s.w2, clamp((z - s.i * SEG) / SEG, 0, 1));
    }
    const onPath = (z, x) => { const s = segAt(z); return !s.gap && Math.abs(x) < halfAt(z) + 30; };

    // ---------- start ----------
    function init(level) {
        t = 0;
        lvl = level;
        pal = PALETTES[level.pal || 0];
        const total = build(level);
        PL = [];
        Coop.each(Game.players, (pl, i) => {
            PL.push({
                x: Game.coop ? (i ? 350 : -350) : 0, z: 1600, fallZ: 0, y: 0, vx: 0, vy: 0, speed: 0,
                ground: true, falling: false, fallT: 0, inv: 0, wait: 30, air: 0,
                jumps: 0, flutters: 0, dashed: false, dashT: 0, charge: 0, pounding: false,
                state: 'play', finT: 0, ko: null, dead: false, rot: 0, bubbleT: 0, lastLand: 0
            });
        });
        P = PL[0];
        cam = { x: 0, y: CAM_H, z: 1600 - BEHIND };
        skyX = 0;
        return { stars: total };
    }

    const active = (p) => !p.ko && !p.dead;

    function topSpeed(c) { return 92 + (c.speed - 4.3) * 18; }

    // ---------- update ----------
    function update() {
        t++;
        for (const b of S.blobs) {
            if (b.dead) { b.dead++; continue; }
            b.x = Math.sin(t * b.speed + b.ph) * b.amp;
            if (b.squash > 0) b.squash--;
        }
        for (const f of S.flowers) f.squish *= 0.85;
        for (const h of S.hedges) if (h.broken) h.broken++;

        Coop.each(PL, (p, i) => {
            P = p;
            updateOne(i);
            if (Game.coop && Game.players[i].out && Game.state === 'play' && !P.ko) toBubble(P, 'Rescue me!');
        });
        P = PL[0];

        // 2 players: whoever is ahead can't run too far away from their partner
        if (Game.coop) {
            const on = PL.filter(p => active(p) && p.state === 'play');
            if (on.length === 2) {
                const [a, b] = on[0].z < on[1].z ? on : [on[1], on[0]];
                if (b.z > a.z + 1500) { b.z = a.z + 1500; b.speed = Math.min(b.speed, a.speed); }
            }
        }
        // the camera follows the player (or the one behind, in 2-player games)
        const on = PL.filter(active);
        const follow = on.length ? on : PL;
        const fz = Math.min(...follow.map(p => p.z));
        const fx = follow.reduce((s, p) => s + p.x, 0) / follow.length;
        cam.z = fz - BEHIND;
        cam.x += (fx * 0.7 - cam.x) * 0.15;
        cam.y += (groundAt(fz) + CAM_H - cam.y) * 0.12;
        // the sky slides sideways on bends
        skyX += segAt(fz).curve * (follow[0].speed || 0) * 0.004;
    }

    // Put a player into a rescue bubble that floats back to their partner
    function toBubble(p, msg) {
        p.ko = { t: 0, x: p.x, y: p.y, z: p.z };
        p.falling = false; p.dead = false; p.state = 'play';
        Sound.play('pop');
        const sp = project(p.x, p.y + 200, p.z);
        if (msg && sp) FX.text(sp.x, sp.y - 40, msg, '#BFE9FF', 22);
    }

    function updateOne(i) {
        const I = Input.held, Pr = Input.pressed;
        const c = Game.char;

        if (P.ko) {
            const mate = PL.find(o => o !== P && active(o));
            if (!mate) return;
            const b = P.ko;
            b.t++;
            const k = Math.min(1, b.t / 70), e = k * k * (3 - 2 * k);
            const tz = mate.z - 150, hw = halfAt(tz) * 0.7;
            const tx = clamp(mate.x + (mate.x > 0 ? -300 : 300), -hw, hw), ty = groundAt(tz) + 320;
            P.x = lerp(b.x, tx, e); P.z = lerp(b.z, tz, e); P.y = lerp(b.y, ty, e) + Math.sin(b.t * 0.2) * 20;
            if (b.t > 80 && onPath(P.z, P.x)) {
                P.ko = null;
                Game.revive(i);
                Sound.play('pop');
                const sp = project(P.x, P.y, P.z);
                if (sp) {
                    FX.burst(sp.x, sp.y, { count: 16, colors: ['#BFE9FF', '#FFFFFF', '#FFB6E1'], speed: 3, life: 24, shape: 'circle', size: 5 });
                    FX.text(sp.x, sp.y - 40, 'Back in!', '#FFFFFF', 22);
                }
                P.vy = 0; P.ground = false; P.falling = false; P.speed = mate.speed; P.inv = 90;
            }
            return;
        }
        if (P.dead) { P.vy -= G; P.y += P.vy; P.rot += 0.1; return; }

        if (P.state === 'finish') {
            P.finT++;
            P.speed = Math.max(0, P.speed - 2.5);
            P.z += P.speed;
            P.x += ((Game.coop ? (i ? 280 : -280) : 0) - P.x) * 0.05;
            P.y = groundAt(P.z) + (P.finT > 40 ? Math.abs(Math.sin(P.finT * 0.15)) * 160 : 0);
            if (P.finT === 50) {
                const sp = project(0, groundAt(P.z) + 400, P.z + 600);
                if (sp) FX.text(sp.x, sp.y, 'Mama Axolotl says THANK YOU!', '#FF9AD0', 28);
                Sound.play('baby');
            }
            if (P.finT === 160) Game.levelDone();
            return;
        }

        if (P.falling) {
            P.fallT++;
            P.vy -= G;
            P.y += P.vy;
            P.z += P.speed;
            P.speed *= 0.97;
            P.rot += 0.08;
            if (P.fallT === 1) { Sound.play('hurt'); FX.shake(5); }
            if (P.fallT > 45) {
                if (Game.coop && PL.some(o => o !== P && active(o) && o.state === 'play')) {
                    if (c.ability === 'bubble' || Game.hurt()) toBubble(P, 'Whoops!');
                    else toBubble(P, 'Rescue me!');
                    return;
                }
                if (c.ability !== 'bubble' && !Game.hurt()) { P.dead = true; P.vy = 0; return; }
                respawn(c.ability === 'bubble' ? 'Love Bubble!' : 'Try again!');
            }
            return;
        }

        if (P.inv > 0) P.inv--;
        if (P.dashT > 0) P.dashT--;

        // running forward (it's automatic!) — hold ↓ on the ground to slow down
        let top = topSpeed(c);
        if (P.wait > 0) { P.wait--; top = 0; }
        else if (P.ground && I.down && c.ability !== 'megahop') top *= 0.55;
        if (P.ground && I.down && c.ability === 'megahop') top *= 0.4;
        if (P.dashT > 0) top *= 1.7;
        P.speed = approach(P.speed, top, P.speed < top ? 5 : 3);
        const prevZ = P.z;
        P.z += P.speed;

        // steering
        const dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
        P.vx = dir ? clamp(P.vx + dir * 4, -34, 34) : P.vx * 0.8;
        P.x += P.vx;
        // bends push you toward the outside a little
        P.x -= segAt(P.z).curve * (P.speed / 100) * 3.2;

        // jumping and powers
        const jv = c.jump * 3.4;
        if (P.ground) {
            P.jumps = 0; P.flutters = 0; P.dashed = false; P.pounding = false;
            if (c.ability === 'megahop' && I.down && P.wait <= 0) {
                P.charge = Math.min(60, P.charge + 1);
                if (P.charge % 12 === 0) Sound.play('charge');
            }
            if (Pr.jump && P.wait <= 0) {
                const mega = c.ability === 'megahop' ? 1 + P.charge / 60 * 0.6 : 1;
                P.vy = jv * mega;
                P.ground = false;
                P.charge = 0;
                Sound.play(mega > 1.2 ? 'jump2' : 'jump');
            } else if (!(c.ability === 'megahop' && I.down)) P.charge = 0;
        } else {
            P.air++;
            if (Pr.jump) {
                if (c.ability === 'doublejump' && P.jumps < 1) { P.jumps++; P.vy = jv * 0.9; Sound.play('jump2'); sparkleAt(P, '#FFFFFF'); }
                else if (c.ability === 'flutter' && P.flutters < 3) { P.flutters++; P.vy = Math.max(P.vy, jv * 0.6); Sound.play('flap'); }
                else if (c.ability === 'dash' && !P.dashed) { P.dashed = true; P.dashT = 24; P.vy = Math.max(P.vy, 8); Sound.play('dash'); }
            }
            if ((c.ability === 'pound' || c.ability === 'strong') && Pr.down && !P.pounding) {
                P.pounding = true; P.vy = -38; Sound.play('dash');
            }
        }
        // Ricky Fish floats down gently
        const grav = c.ability === 'floaty' && P.vy < 0 ? G * 0.7 : G;
        P.vy -= grav;
        if (c.ability === 'glide' && I.jump && P.vy < -4) P.vy = -4;
        if (P.dashT > 0) P.vy = Math.max(P.vy, 0);
        const prevY = P.y;
        P.y += P.vy;

        // landing on the path (or falling off it!)
        const gnd = groundAt(P.z);
        const solid = onPath(P.z, P.x);
        if (P.ground) {
            if (!solid) { P.ground = false; P.vy = Math.min(P.vy, 0); }
            else if (gnd - P.y < 90 && P.vy <= 0) { P.y = gnd; P.vy = 0; }
            else P.ground = false;
        }
        if (!P.ground && P.vy <= 0 && P.y <= gnd) {
            if (solid) land(gnd);                          // feet on the path
            else if (P.y < gnd - 40) { P.falling = true; P.fallT = 0; P.fallZ = P.z; return; }   // whoops, off the edge!
        }
        if (P.ground) P.y = gnd;

        // flowers launch you sky-high!
        for (const f of S.flowers) {
            if (Math.abs(f.z - P.z) < 260 && Math.abs(P.x - f.x) < 320 && P.y - groundAt(f.z) < 40 && P.vy <= 0) {
                P.vy = 62; P.ground = false; f.squish = 1; P.jumps = 0; P.flutters = 0; P.dashed = false; P.pounding = false;
                Sound.play('boing');
                const sp = project(f.x, groundAt(f.z), f.z);
                if (sp) {
                    FX.text(sp.x, sp.y - 60, 'BOING!', '#FFFFFF', 30);
                    FX.burst(sp.x, sp.y, { count: 16, colors: ['#FF7BC0', '#FFD400', '#FFFFFF'], speed: 5, angle: -Math.PI / 2, spread: 2, life: 30, shape: 'star', size: 6 });
                }
            }
        }

        hitThings(prevZ, c);
        collect(prevZ, c);

        // the finish line!
        if (P.z >= S.finishZ && Game.state === 'play') {
            P.state = 'finish'; P.finT = 0;
            for (const o of PL) if (o !== P && !o.ko && !o.dead && o.state === 'play') { o.state = 'finish'; o.finT = 0; o.falling = false; }
            Sound.play('win');
            FX.confetti(W / 2, H / 2, 90);
            Game.addScore(1000);
            FX.text(W / 2, H / 2 - 60, 'You made it home!', '#FFFFFF', 34);
        }
    }

    function land(gnd) {
        P.y = gnd; P.vy = 0; P.ground = true; P.air = 0; P.rot = 0;
        if (P.pounding) {
            P.pounding = false;
            Sound.play('pound'); FX.shake(8);
            const sp = project(P.x, gnd, P.z);
            if (sp) FX.burst(sp.x, sp.y, { count: 18, colors: ['#FFFFFF', pal.path[0]], speed: 5, angle: -Math.PI / 2, spread: 2.6, life: 26, shape: 'circle', size: 6 });
        } else if (t - P.lastLand > 10) Sound.play('land');
        P.lastLand = t;
    }

    function respawn(msg) {
        // back to the last safe spot on the path
        const fallSeg = Math.floor((P.fallZ || P.z) / SEG);
        let si = 0;
        for (const ck of S.checks) if (ck <= fallSeg) si = ck;
        P.z = Math.max(1600, si * SEG + SEG); P.x = 0; P.y = groundAt(P.z); P.vy = 0; P.vx = 0;
        P.speed = 0; P.falling = false; P.ground = true; P.rot = 0; P.wait = 40; P.inv = 90;
        P.charge = 0; P.dashT = 0; P.pounding = false;
        FX.text(W / 2, H / 2 - 40, msg, '#FFFFFF', 30);
    }

    function sparkleAt(p, color) {
        const sp = project(p.x, p.y + 60, p.z);
        if (sp) FX.sparkle(sp.x, sp.y, color);
    }

    function bonk(msg) {
        P.speed = Math.min(P.speed, 20); P.inv = 90;
        Sound.play('stomp'); FX.shake(6);
        FX.text(W / 2, H / 2 + 20, msg, '#FFFFFF', 28);
        if (!Game.hurt()) { P.dead = true; P.vy = 20; }
    }

    // swept check: did we pass z during this tick?
    const passed = (z, prevZ, pad) => z > prevZ - pad && z < P.z + pad;

    function hitThings(prevZ, c) {
        for (const h of S.hedges) {
            if (h.broken || !passed(h.z, prevZ, 60)) continue;
            if (Math.abs(P.x - h.x) > h.w / 2 + 70) continue;
            const top = groundAt(h.z) + h.h;
            if (P.y >= top - 10) continue;            // jumped over it
            if (P.pounding || c.ability === 'tough' || P.dashT > 0) {
                h.broken = 1;
                Sound.play('crash'); FX.shake(5);
                Game.addScore(50);
                const sp = project(h.x, groundAt(h.z) + 100, h.z);
                if (sp) {
                    FX.burst(sp.x, sp.y, { count: 22, colors: ['#3FAE4A', '#2F8F3A', '#FF7BC0', '#FFFFFF'], speed: 6, life: 34, size: 7 });
                    FX.text(sp.x, sp.y - 60, 'CRUNCH!', '#FFFFFF', 26);
                }
                continue;
            }
            if (P.inv > 0) continue;
            bonk('Bonk! Ouch, a hedge!');
            return;
        }
        for (const b of S.blobs) {
            if (b.dead || !passed(b.z, prevZ, 80)) continue;
            if (Math.abs(P.x - b.x) > 190) continue;
            const by = groundAt(b.z);
            if (P.y > by + 230) continue;
            const sp = project(b.x, by + 80, b.z);
            if (P.vy < 0 && P.y > by + 60 || P.pounding || c.ability === 'tough' || P.dashT > 0) {
                b.dead = 1;
                if (!P.ground) { P.vy = 34; P.pounding = false; P.jumps = 0; P.flutters = 0; }
                Sound.play('stomp');
                Game.addScore(100);
                if (sp) {
                    FX.text(sp.x, sp.y - 50, 'BOP! +100', '#FFD400', 26);
                    FX.burst(sp.x, sp.y, { count: 14, colors: ['#A77BEA', '#7E4FD0', '#FFFFFF'], speed: 4, life: 30, size: 6 });
                }
                continue;
            }
            if (P.inv > 0) continue;
            b.squash = 20;
            bonk('Oof! Jump on blobs!');
            return;
        }
    }

    function collect(prevZ, c) {
        const my = P.y + Game.char.h * CHAR_U * 0.5;
        const magnet = c.ability === 'magnet';
        for (const s of S.stars) {
            if (s.got) continue;
            if (magnet && Math.abs(s.z - P.z) < 1400 && s.z > P.z - 100) {
                s.x += (P.x - s.x) * 0.08; s.y += (my - s.y) * 0.08;
            }
            if (passed(s.z, prevZ, 90) && Math.abs(s.x - P.x) < 190 && Math.abs(s.y - my) < 210) {
                s.got = true;
                const sp = project(s.x, s.y, s.z);
                Game.collectStar(sp ? sp.x : W / 2, sp ? sp.y : H / 2);
            }
        }
        for (const k of S.tacos) {
            if (!k.got && passed(k.z, prevZ, 90) && Math.abs(k.x - P.x) < 220 && Math.abs(k.y - my) < 230) {
                k.got = true;
                const sp = project(k.x, k.y, k.z);
                Game.collectTaco(sp ? sp.x : W / 2, sp ? sp.y : H / 2);
            }
        }
        for (const b of S.babies) {
            if (!b.got && passed(b.z, prevZ, 110) && Math.abs(b.x - P.x) < 240 && Math.abs(b.y - my) < 260) {
                b.got = true;
                const sp = project(b.x, b.y, b.z);
                Game.collectBaby(sp ? sp.x : W / 2, sp ? sp.y : H / 2);
            }
        }
    }

    function dying() { for (const p of PL) if (p.dead) { p.vy -= G * 0.6; p.y += p.vy; p.rot += 0.12; } }

    // ---------- 3D projection ----------
    // Turn a spot in the world (x across, y up, z away from you) into a spot
    // on the screen. s = how many screen pixels one world unit is, over there.
    // x is measured from the middle of the path, so we add how much the path
    // has bent by then (the curve offset).
    function curveAt(z) {
        const s = segAt(z);
        const f = clamp((z - s.i * SEG) / SEG, 0, 1);
        return lerp(s.rx1, s.rx2, f);
    }
    function project(x, y, z) {
        const dz = z - cam.z;
        if (dz < 40) return null;
        const s = K / dz;
        return { x: W / 2 + (x + curveAt(z) - cam.x) * s, y: HOR - (y - cam.y) * s, s };
    }

    // Work out how much the path bends from the camera onward
    function computeCurves() {
        const base = Math.floor(cam.z / SEG);
        const segs = S.segs;
        const frac = (cam.z - base * SEG) / SEG;
        const b0 = segs[clamp(base, 0, segs.length - 1)];
        let x = 0, dx = -b0.curve * frac;
        for (let n = 0; n < DRAW + 2; n++) {
            const s = segs[base + n];
            if (!s) { if (base + n < 0) continue; break; }
            s.rx1 = x; s.rx2 = x + dx;
            x += dx; dx += s.curve;
        }
        return base;
    }

    // ---------- drawing ----------
    function drawSky(g) {
        const grad = g.createLinearGradient(0, 0, 0, HOR + 40);
        grad.addColorStop(0, pal.sky[0]); grad.addColorStop(0.6, pal.sky[1]); grad.addColorStop(1, pal.sky[2]);
        g.fillStyle = grad;
        g.fillRect(0, 0, W, HOR + 40);
        // a sea of clouds below the path
        const sea = g.createLinearGradient(0, HOR, 0, H);
        sea.addColorStop(0, pal.sea[0]); sea.addColorStop(1, pal.sea[1]);
        g.fillStyle = sea;
        g.fillRect(0, HOR, W, H - HOR);
        if (pal.night) {
            for (let i = 0; i < 60; i++) {
                const x = ((hash(i) * 2400 - skyX * 0.3) % W + W) % W, y = hash(i + 50) * (HOR - 10);
                g.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t * 0.03 + i))})`;
                g.fillRect(x, y, 2, 2);
            }
        }
        // sun or moon, sliding sideways on bends
        const sx = ((W * 0.75 - skyX * 0.5) % (W + 200) + W + 200) % (W + 200) - 100;
        if (pal.sun === 'moon') {
            g.fillStyle = '#FFF8D8'; g.beginPath(); g.arc(sx, 70, 34, 0, TAU); g.fill();
            g.fillStyle = pal.sky[0]; g.beginPath(); g.arc(sx + 14, 62, 30, 0, TAU); g.fill();
        } else {
            g.fillStyle = pal.sun === 'sunset' ? 'rgba(255,200,120,0.5)' : 'rgba(255,240,150,0.5)';
            g.beginPath(); g.arc(sx, 80, 54, 0, TAU); g.fill();
            g.fillStyle = pal.sun === 'sunset' ? '#FFB347' : '#FFE14D';
            g.beginPath(); g.arc(sx, 80, 38, 0, TAU); g.fill();
        }
        // far clouds on the horizon
        for (let i = 0; i < 9; i++) {
            const span = W + 300;
            const x = (((i * 170 - skyX) % span) + span) % span - 150;
            drawCloud(g, x, HOR - 14 + (i % 3) * 6, 0.7 + (i % 2) * 0.3, pal.cloud, false);
        }
        // the soft cloud sea right at the horizon
        g.fillStyle = pal.sea[0];
        for (let i = 0; i < 14; i++) {
            const span = W + 160;
            const x = (((i * 80 - skyX * 1.4) % span) + span) % span - 80;
            g.beginPath(); g.arc(x, HOR + 14, 34 + (i % 3) * 8, 0, TAU); g.fill();
        }
    }

    function quad(g, x1, y1, w1, x2, y2, w2, color) {
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(x1 - w1, y1); g.lineTo(x2 - w2, y2);
        g.lineTo(x2 + w2, y2); g.lineTo(x1 + w1, y1);
        g.closePath(); g.fill();
    }

    function drawSegment(g, s, p1, p2) {
        const alt = Math.floor(s.i / 3) % 2;
        const w1 = s.w1 * p1.s, w2 = s.w2 * p2.s;
        const fin = s.i >= S.finishSeg && s.i < S.finishSeg + 2;
        // the edge (flowers / neon)
        quad(g, p1.x, p1.y, w1 * 1.08, p2.x, p2.y, w2 * 1.08, pal.edge[alt]);
        // grass
        quad(g, p1.x, p1.y, w1, p2.x, p2.y, w2, pal.grass[alt]);
        // the path in the middle (checkered at the finish line)
        if (fin) {
            const n = 8;
            for (let k = 0; k < n; k++) {
                const a = -1 + k * 2 / n, b = a + 2 / n;
                g.fillStyle = (k + s.i) % 2 ? '#FFFFFF' : '#222244';
                g.beginPath();
                g.moveTo(p1.x + a * w1, p1.y); g.lineTo(p2.x + a * w2, p2.y);
                g.lineTo(p2.x + b * w2, p2.y); g.lineTo(p1.x + b * w1, p1.y);
                g.closePath(); g.fill();
            }
        } else if (s.w1 > 600) {
            quad(g, p1.x, p1.y, w1 * 0.55, p2.x, p2.y, w2 * 0.55, pal.path[alt]);
        } else {
            quad(g, p1.x, p1.y, w1 * 0.8, p2.x, p2.y, w2 * 0.8, pal.path[alt]);
        }
        // the front side of the path, where it starts again after a gap
        const prev = S.segs[s.i - 1];
        if (prev && prev.gap) {
            const bot = HOR - (s.y1 - THICK - cam.y) * p1.s;
            g.fillStyle = pal.dirt;
            g.beginPath();
            g.moveTo(p1.x - w1 * 1.08, p1.y); g.lineTo(p1.x + w1 * 1.08, p1.y);
            g.lineTo(p1.x + w1 * 0.9, bot); g.lineTo(p1.x - w1 * 0.9, bot);
            g.closePath(); g.fill();
            g.fillStyle = pal.dirtDark;
            g.fillRect(p1.x - w1, p1.y + (bot - p1.y) * 0.55, w1 * 2, Math.max(1, (bot - p1.y) * 0.12));
            g.fillStyle = pal.grass[0];
            g.fillRect(p1.x - w1 * 1.08, p1.y, w1 * 2.16, Math.max(2, (bot - p1.y) * 0.12));
        }
    }

    // ---------- sprites (things standing on or floating over the path) ----------
    function at(g, p, fn) {
        if (!p || p.s * BEHIND / K < 0.04) return;
        const f = p.s / FAR;
        if (p.x < -400 * f || p.x > W + 400 * f || p.y < -300 * f || p.y > H + 300 * f) return;
        g.save(); g.translate(p.x, p.y); g.scale(f, f);
        fn();
        g.restore();
    }

    function shadow(g, x, z, r) {
        const p = project(x, groundAt(z), z);
        if (!p || !onPath(z, x)) return;
        g.fillStyle = 'rgba(30,20,60,0.22)';
        g.beginPath(); g.ellipse(p.x, p.y, r * p.s, r * p.s * 0.3, 0, 0, TAU); g.fill();
    }

    function drawHedge(g, h) {
        const gy0 = groundAt(h.z);
        const p = project(h.x, gy0, h.z);
        if (!p) return;
        const ww = h.w * p.s / 2, hh = h.h * p.s;
        if (h.broken) {
            if (h.broken > 30) return;
            g.globalAlpha = 1 - h.broken / 30;
        }
        g.fillStyle = '#2F8F3A';
        rrect(g, p.x - ww, p.y - hh, ww * 2, hh, Math.min(ww, hh) * 0.35); g.fill();
        g.fillStyle = '#3FAE4A';
        rrect(g, p.x - ww * 0.94, p.y - hh * 0.97, ww * 1.88, hh * 0.6, Math.min(ww, hh) * 0.3); g.fill();
        // little flowers
        const n = 5;
        for (let k = 0; k < n; k++) {
            const fx = p.x - ww * 0.8 + (k / (n - 1)) * ww * 1.6, fy = p.y - hh * (0.55 + 0.25 * hash(k + h.z));
            g.fillStyle = k % 2 ? '#FF7BC0' : '#FFFFFF';
            g.beginPath(); g.arc(fx, fy, Math.max(1, 14 * p.s), 0, TAU); g.fill();
            g.fillStyle = '#FFD400';
            g.beginPath(); g.arc(fx, fy, Math.max(0.5, 5 * p.s), 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
    }

    function drawBlob(g, b) {
        const by = groundAt(b.z);
        const p = project(b.x, by, b.z);
        if (!p) return;
        if (b.dead) {
            if (b.dead > 30) return;
            at(g, p, () => {
                g.fillStyle = '#8E5BD6';
                g.beginPath(); g.ellipse(0, -6, 52, 12, 0, 0, TAU); g.fill();
                drawStarShape(g, -18, -30 - b.dead, 8, b.dead * 0.2, '#FFD400');
                drawStarShape(g, 18, -34 - b.dead, 8, -b.dead * 0.2, '#FFD400');
            });
            return;
        }
        at(g, p, () => {
            const sq = b.squash > 0 ? 1 + Math.sin(b.squash) * 0.15 : 1 + Math.sin(t * 0.2 + b.ph) * 0.05;
            g.fillStyle = 'rgba(30,20,60,0.2)';
            g.beginPath(); g.ellipse(0, 0, 54, 14, 0, 0, TAU); g.fill();
            g.save(); g.scale(1 / sq, sq);
            g.fillStyle = '#8E5BD6';
            g.beginPath(); g.ellipse(0, -40, 50, 42, 0, Math.PI, 0); g.lineTo(50, 0); g.lineTo(-50, 0); g.fill();
            g.fillStyle = '#A77BEA';
            g.beginPath(); g.ellipse(-16, -60, 14, 9, -0.5, 0, TAU); g.fill();
            // grumpy face
            g.fillStyle = '#FFFFFF';
            g.fillRect(-24, -46, 16, 16); g.fillRect(8, -46, 16, 16);
            g.fillStyle = '#1A1030';
            g.fillRect(-18, -40, 8, 10); g.fillRect(12, -40, 8, 10);
            g.fillRect(-28, -54, 20, 5); g.fillRect(8, -54, 20, 5);
            g.fillRect(-10, -18, 20, 5);
            g.restore();
        });
    }

    function drawFlower(g, f) {
        const p = project(f.x, groundAt(f.z), f.z);
        if (!p) return;
        const r = 260 * p.s, sq = 1 - f.squish * 0.4;
        for (let k = 0; k < 6; k++) {
            const a = k * TAU / 6 + t * 0.01;
            g.fillStyle = k % 2 ? '#FF7BC0' : '#FF4F8B';
            g.beginPath(); g.ellipse(p.x + Math.cos(a) * r * 0.55, p.y + Math.sin(a) * r * 0.55 * 0.3 * sq, r * 0.42, r * 0.42 * 0.32 * sq, 0, 0, TAU); g.fill();
        }
        g.fillStyle = '#FFD400';
        g.beginPath(); g.ellipse(p.x, p.y - 6 * p.s, r * 0.36, r * 0.36 * 0.32 * sq, 0, 0, TAU); g.fill();
        if (f.squish < 0.2) {
            const bob = Math.sin(t * 0.12) * 4;
            at(g, project(f.x, groundAt(f.z) + 320, f.z), () => outlinedText(g, 'BOING ⬆', 0, bob, 22, '#FFFFFF', '#C2185B'));
        }
    }

    function drawDeco(g, d) {
        const p = project(d.x, d.y + (d.kind === 'balloon' ? Math.sin(t * 0.03 + d.ph) * 60 : 0), d.z);
        if (!p) return;
        at(g, p, () => {
            if (d.kind === 'cloud') { drawCloud(g, 0, 0, 2.2, pal.cloud, false); return; }
            if (d.kind === 'balloon') {
                g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2;
                g.beginPath(); g.moveTo(0, 30); g.lineTo(4, 90); g.stroke();
                g.fillStyle = d.c;
                g.beginPath(); g.ellipse(0, 0, 24, 30, 0, 0, TAU); g.fill();
                g.fillStyle = 'rgba(255,255,255,0.5)';
                g.beginPath(); g.ellipse(-8, -10, 6, 9, -0.4, 0, TAU); g.fill();
                return;
            }
            // a little floating island with a tree
            g.fillStyle = pal.dirt;
            g.beginPath(); g.moveTo(-90, 0); g.lineTo(90, 0); g.lineTo(30, 70); g.lineTo(0, 110); g.lineTo(-40, 60); g.closePath(); g.fill();
            g.fillStyle = pal.island;
            rrect(g, -96, -14, 192, 22, 10); g.fill();
            g.fillStyle = '#7A4A22'; g.fillRect(-8, -80, 16, 70);
            g.fillStyle = pal.grass[1];
            g.beginPath(); g.arc(0, -96, 44, 0, TAU); g.fill();
            g.fillStyle = pal.grass[0];
            g.beginPath(); g.arc(-12, -106, 26, 0, TAU); g.fill();
        });
    }

    function drawFinish(g) {
        const z = S.finishZ;
        const gy0 = groundAt(z);
        const pl = project(-ROAD * 1.05, gy0, z), pr = project(ROAD * 1.05, gy0, z);
        if (!pl || !pr) return;
        const cx = (pl.x + pr.x) / 2, rad = (pr.x - pl.x) / 2;
        const cols = ['#FF3B5C', '#FF8A3D', '#FFD400', '#3DDC84', '#3D8BFF', '#B36BFF'];
        g.lineWidth = Math.max(1, rad * 0.06);
        cols.forEach((c, k) => {
            g.strokeStyle = c;
            g.beginPath(); g.arc(cx, pl.y, rad * (1 - k * 0.06), Math.PI, 0); g.stroke();
        });
        const top = project(0, gy0 + ROAD * 0.95, z);
        if (top) at(g, top, () => {
            g.fillStyle = '#FFFFFF'; rrect(g, -120, -26, 240, 46, 14); g.fill();
            g.lineWidth = 4; g.strokeStyle = '#FF4FA3'; g.stroke();
            outlinedText(g, 'HOME! 🏠', 0, -2, 26, '#FF4FA3', '#FFFFFF');
        });
    }

    function drawHome(g) {
        const z = S.finishZ + 2600;
        const p = project(0, groundAt(z), z);
        if (!p) return;
        at(g, p, () => {
            // Mama Axolotl's cozy house
            g.fillStyle = '#FFB6D9'; g.fillRect(-160, -170, 320, 170);
            g.fillStyle = '#E0457B';
            g.beginPath(); g.moveTo(-190, -170); g.lineTo(0, -300); g.lineTo(190, -170); g.closePath(); g.fill();
            g.fillStyle = '#7A4A22'; rrect(g, -36, -110, 72, 110, 30); g.fill();
            g.fillStyle = '#BFE9FF'; g.fillRect(-130, -140, 60, 50); g.fillRect(70, -140, 60, 50);
            g.fillStyle = '#FFFFFF'; g.fillRect(-102, -140, 4, 50); g.fillRect(98, -140, 4, 50);
            drawHeart(g, 0, -220, 40, '#FF4F8B', '#8B1040');
        });
        const m = project(-380, groundAt(z - 300), z - 300);
        at(g, m, () => {
            drawAxolotl(g, 0, 0, t, 1, 5);
            if (Math.floor(t / 30) % 2 === 0) drawHeart(g, 40, -160, 30, '#FF4F8B', '#8B1040');
        });
    }

    function drawPlayer(g, p, i) {
        const ch = Game.char;
        if (p.ko) {
            const sp = project(p.x, p.y, p.z);
            if (sp) at(g, sp, () => Coop.drawBubble(g, ch, 0, -40, i));
            return;
        }
        if (p.inv > 0 && Math.floor(p.inv / 4) % 2 === 0 && !p.falling) return;
        if (!p.falling) shadow(g, p.x, p.z, ch.w * CHAR_U * 0.7);
        const sp = project(p.x, p.y, p.z);
        if (!sp) return;
        const sc = sp.s * CHAR_U;
        const charging = p.charge > 0 ? 1 - p.charge / 60 * 0.25 : 1;
        // seen from behind, we lean into the steering a little
        const lean = clamp(p.vx / 34, -1, 1) * 0.18;
        drawChar(g, ch, sp.x, sp.y, {
            t: Game.t, run: p.ground && p.speed > 5, air: !p.ground, scale: sc,
            facing: p.vx < -4 ? -1 : 1, rot: p.rot || lean, sy: charging, sx: 1 / charging
        });
        if (p.dashT > 0) {
            g.fillStyle = 'rgba(255,255,255,0.7)';
            for (let k = 0; k < 4; k++) g.fillRect(sp.x - 30 + k * 18, sp.y + 4 + (k % 2) * 6, 6, 16 + (t + k * 3) % 10);
        }
        if (Game.char.ability === 'glide' && !p.ground && Input.held.jump && p.vy <= -3.9) {
            at(g, project(p.x, p.y + ch.h * CHAR_U + 40, p.z), () => {
                g.fillStyle = '#FF7BC0';
                g.beginPath(); g.ellipse(0, 0, 50, 18, 0, Math.PI, 0); g.fill();
            });
        }
        Coop.label(g, sp.x, sp.y - ch.h * sc - 10, i);
    }

    function draw(g) {
        drawSky(g);
        const base = computeCurves();
        const segs = S.segs;

        // sort the things in the world into the slices they're on
        for (let n = 0; n < DRAW; n++) { const s = segs[base + n]; if (s) s.items.length = 0; }
        const put = (z, item) => {
            const s = segs[Math.floor(z / SEG)];
            if (s && s.i >= base && s.i < base + DRAW) s.items.push(item);
        };
        for (const d of S.deco) put(d.z, ['deco', d]);
        for (const f of S.flowers) put(f.z, ['flower', f]);
        for (const h of S.hedges) put(h.z, ['hedge', h]);
        for (const b of S.blobs) put(b.z, ['blob', b]);
        for (const s of S.stars) if (!s.got) put(s.z, ['star', s]);
        for (const k of S.tacos) if (!k.got) put(k.z, ['taco', k]);
        for (const b of S.babies) if (!b.got) put(b.z, ['baby', b]);
        PL.forEach((p, i) => put(p.z, ['player', p, i]));
        put(S.finishZ + 2600, ['home']);
        put(S.finishZ + 1, ['finish']);

        // paint from far away to close up
        for (let n = DRAW - 1; n >= 0; n--) {
            const s = segs[base + n];
            if (!s) continue;
            const fade = clamp((DRAW - n) / 35, 0, 1);
            g.globalAlpha = fade;
            if (!s.gap) {
                const p1 = project(0, s.y1, s.i * SEG);
                const p2 = project(0, s.y2, (s.i + 1) * SEG);
                if (p1 && p2) drawSegment(g, s, p1, p2);   // project() adds the bends for us
            }
            // sprites on this slice, farthest first
            s.items.sort((a, b) => (b[1] ? b[1].z : 0) - (a[1] ? a[1].z : 0));
            for (const it of s.items) {
                g.globalAlpha = fade;
                const o = it[1];
                switch (it[0]) {
                    case 'deco': drawDeco(g, o); break;
                    case 'flower': drawFlower(g, o); break;
                    case 'hedge': drawHedge(g, o); break;
                    case 'blob': drawBlob(g, o); break;
                    case 'star': {
                        const p = project(o.x, o.y, o.z);
                        if (p) { shadowSmall(g, o); at(g, p, () => drawStar(g, 0, 0, Game.t + o.z * 0.01, 16)); }
                        break;
                    }
                    case 'taco': at(g, project(o.x, o.y, o.z), () => drawTaco(g, 0, 0, Game.t, 1.8)); break;
                    case 'baby': at(g, project(o.x, o.y, o.z), () => drawBaby(g, 0, 20, Game.t, null, 1.5)); break;
                    case 'player': g.globalAlpha = 1; Game.use(it[2]); drawPlayer(g, o, it[2]); Game.use(-1); break;
                    case 'home': drawHome(g); break;
                    case 'finish': drawFinish(g); break;
                }
            }
        }
        g.globalAlpha = 1;
        FX.draw(g);
        FX.drawTexts(g);

        // where are the babies? a little arrow when one is close
        for (const b of S.babies) {
            if (b.got) continue;
            const dz = b.z - (P ? P.z : 0);
            if (dz < 0 || dz > 9000) continue;
            const p = project(b.x, b.y, b.z);
            if (p && p.y < 60) outlinedText(g, '⬆ Baby up high!', clamp(p.x, 120, W - 120), 96, 18, '#FF9AD0', '#5A1040');
        }
    }

    function shadowSmall(g, s) {
        if (!onPath(s.z, s.x)) return;
        const p = project(s.x, groundAt(s.z), s.z);
        if (!p) return;
        g.fillStyle = 'rgba(30,20,60,0.12)';
        g.beginPath(); g.ellipse(p.x, p.y, 60 * p.s, 18 * p.s, 0, 0, TAU); g.fill();
    }

    function progress(i) {
        const p = PL[i || 0];
        return p ? clamp(p.z / S.finishZ, 0, 1) : 0;
    }

    return {
        music: 'sky', icon: '🌈',
        tip: 'It\'s 3D! ← → steer · SPACE jump gaps & hedges · ↓ slow down · bop blobs, bounce on flowers!',
        debug: () => ({ S, P, PL, cam }),
        init, update, draw, dying, progress
    };
})();
