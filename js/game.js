// ============================================================
//  GAME: levels, hearts & score, menus, the HUD and the main
//  loop that runs everything 60 times a second.
// ============================================================
'use strict';

// 3 worlds x 10 levels. Each world repeats the family's favourite adventures:
// skiing, biking, swimming, the trampoline park and space — with a meadow walk
// before each one!
// (id and seed stay the same forever so saved stars and level layouts never move.)
const LEVELS = [
    { id: 'w1-walk',  world: 1, mode: 'walk',  name: 'Axolotl Meadow',    d: 0.0,  pal: 0, seed: 1 * 7919 },
    { id: 'w1-ski',   world: 1, mode: 'ski',   name: 'Snowy Slopes',      d: 0.05, pal: 0, seed: 2 * 7919 },
    { id: 'w1-walk2', world: 1, mode: 'walk',  name: 'Bumblebee Field',   d: 0.04, pal: 0, seed: 1301 },
    { id: 'w1-bike',  world: 1, mode: 'bike',  name: 'Ramp Town',         d: 0.1,  pal: 0, seed: 3 * 7919 },
    { id: 'w1-walk3', world: 1, mode: 'walk',  name: 'Taco Hill',         d: 0.07, pal: 0, seed: 1302 },
    { id: 'w1-swim',  world: 1, mode: 'swim',  name: 'City Pool',         d: 0.08, pal: 0, seed: 101 },
    { id: 'w1-walk4', world: 1, mode: 'walk',  name: 'Rainbow Creek',     d: 0.1,  pal: 0, seed: 1303 },
    { id: 'w1-bounce', world: 1, mode: 'bounce', name: 'Bounce Park',     d: 0.1,  pal: 0, seed: 111 },
    { id: 'w1-walk5', world: 1, mode: 'walk',  name: 'Picnic Park',       d: 0.13, pal: 0, seed: 1304 },
    { id: 'w1-space', world: 1, mode: 'space', name: 'Starry Space',      d: 0.12, pal: 0, seed: 4 * 7919 },
    { id: 'w2-walk',  world: 2, mode: 'walk',  name: 'Sunset Hills',      d: 0.4,  pal: 1, seed: 5 * 7919 },
    { id: 'w2-ski',   world: 2, mode: 'ski',   name: 'Snowball Peak',     d: 0.45, pal: 1, seed: 6 * 7919 },
    { id: 'w2-walk2', world: 2, mode: 'walk',  name: 'Golden Grove',      d: 0.42, pal: 1, seed: 2301 },
    { id: 'w2-bike',  world: 2, mode: 'bike',  name: 'Big City Jumps',    d: 0.5,  pal: 1, seed: 7 * 7919 },
    { id: 'w2-walk3', world: 2, mode: 'walk',  name: 'Pinky Pond',        d: 0.47, pal: 1, seed: 2302 },
    { id: 'w2-swim',  world: 2, mode: 'swim',  name: 'Sunset Splash',     d: 0.5,  pal: 1, seed: 202 },
    { id: 'w2-walk4', world: 2, mode: 'walk',  name: 'Lantern Lane',      d: 0.52, pal: 1, seed: 2303 },
    { id: 'w2-bounce', world: 2, mode: 'bounce', name: 'Super Bounce Arena', d: 0.5, pal: 1, seed: 222 },
    { id: 'w2-walk5', world: 2, mode: 'walk',  name: 'Dusky Meadow',      d: 0.56, pal: 1, seed: 2304 },
    { id: 'w2-space', world: 2, mode: 'space', name: 'Asteroid Alley',    d: 0.55, pal: 1, seed: 8 * 7919 },
    { id: 'w3-walk',  world: 3, mode: 'walk',  name: 'Firefly Forest',    d: 0.8,  pal: 2, seed: 9 * 7919 },
    { id: 'w3-ski',   world: 3, mode: 'ski',   name: 'Midnight Mountain', d: 0.85, pal: 2, seed: 10 * 7919 },
    { id: 'w3-walk2', world: 3, mode: 'walk',  name: 'Moonbeam Marsh',    d: 0.82, pal: 2, seed: 3301 },
    { id: 'w3-bike',  world: 3, mode: 'bike',  name: 'Neon Night Ride',   d: 0.9,  pal: 2, seed: 11 * 7919 },
    { id: 'w3-walk3', world: 3, mode: 'walk',  name: 'Owl Hollow',        d: 0.87, pal: 2, seed: 3302 },
    { id: 'w3-swim',  world: 3, mode: 'swim',  name: 'Night Swim',        d: 0.9,  pal: 2, seed: 303 },
    { id: 'w3-walk4', world: 3, mode: 'walk',  name: 'Glowworm Gully',    d: 0.92, pal: 2, seed: 3303 },
    { id: 'w3-bounce', world: 3, mode: 'bounce', name: 'Glow Bounce',     d: 0.9,  pal: 2, seed: 333 },
    { id: 'w3-walk5', world: 3, mode: 'walk',  name: 'Starlight Path',    d: 0.96, pal: 2, seed: 3304 },
    { id: 'w3-space', world: 3, mode: 'space', name: 'Comet Chase',       d: 1.0,  pal: 2, seed: 12 * 7919 }
].map((l, i, all) => Object.assign(l, {
    index: i,
    label: `${l.world}-${all.slice(0, i).filter(o => o.world === l.world).length + 1}`
}));

// Saves remember the furthest unlocked level by its id (lastOpen), so adding
// new levels never scrambles anyone's progress. Older saves are converted here.
(function migrateSave() {
    const d = Save.data;
    const pick = (list, n) => list[Math.max(0, Math.min(list.length, n || 1) - 1)];
    if (!d.ids) {
        // very first version: stars stored by level number, 12 levels
        const OLD = ['w1-walk', 'w1-ski', 'w1-bike', 'w1-space', 'w2-walk', 'w2-ski', 'w2-bike', 'w2-space', 'w3-walk', 'w3-ski', 'w3-bike', 'w3-space'];
        const best = {};
        for (const k in d.best) if (OLD[+k]) best[OLD[+k]] = d.best[k];
        d.best = best;
        d.lastOpen = pick(OLD, d.unlocked);
        d.ids = true;
    }
    if (!d.lastOpen) {
        // second version: 15 levels (with swimming), unlock stored by level number
        const V2 = ['w1-walk', 'w1-ski', 'w1-bike', 'w1-swim', 'w1-space', 'w2-walk', 'w2-ski', 'w2-bike', 'w2-swim', 'w2-space', 'w3-walk', 'w3-ski', 'w3-bike', 'w3-swim', 'w3-space'];
        d.lastOpen = pick(V2, d.unlocked);
    }
    d.unlocked = Math.max(1, LEVELS.findIndex(l => l.id === d.lastOpen) + 1);
    Save.write();
})();

const WORLD_NAMES = ['Sunny Days', 'Sunset Adventure', 'Starlight Night'];

const Game = {
    state: 'title', stateT: 0, t: 0,
    char: null, level: null, mode: null,
    picks: [null, null],   // the characters chosen for player 1 and player 2
    twoP: false,           // playing together?
    players: [],           // in a level: { char, hearts, maxHearts, out, pulse } per player
    cur: 0,                // which player the level code is working on right now
    score: 0, levelScore: 0,
    stars: 0, starsTotal: 0, babies: 0,
    pulse: { stars: 0, babies: 0 },

    get coop() { return this.players.length > 1; },

    // Hearts belong to whichever player is being updated right now
    get hearts() { const p = this.players[this.cur]; return p ? p.hearts : 0; },
    set hearts(v) { const p = this.players[this.cur]; if (p) p.hearts = v; },
    get maxHearts() { const p = this.players[this.cur]; return p ? p.maxHearts : 3; },

    // Switch Game.char and the controls to player i (-1 = back to normal)
    use(i) {
        this.cur = Math.max(0, i);
        const p = this.players[this.cur];
        this.char = p ? p.char : this.picks[0];
        Input.use(this.players.length > 1 ? i : -1);
    },

    setState(s) {
        this.state = s;
        this.stateT = 0;
        Input.clearPressed();
    },

    startLevel(i) {
        const lv = LEVELS[i];
        this.level = lv;
        this.mode = MODES[lv.mode];
        const picks = this.twoP ? this.picks : [this.picks[0]];
        this.players = picks.map(c => ({ char: c, hearts: c.hearts, maxHearts: c.hearts, out: false, pulse: 0 }));
        Input.setSplit(this.players.length > 1);
        this.use(-1);
        this.stars = 0;
        this.babies = 0;
        this.levelScore = 0;
        FX.clear();
        const info = this.mode.init(lv);
        this.starsTotal = info.stars;
        UI.hide();
        this.setState('intro');
        Sound.music(this.mode.music);
    },

    collectStar(x, y) {
        this.stars++;
        this.score += 10; this.levelScore += 10;
        this.pulse.stars = 12;
        Sound.play('star');
        FX.sparkle(x, y);
    },

    collectTaco(x, y) {
        this.hearts = Math.min(this.hearts + 1, this.maxHearts + 2);
        this.players[this.cur].pulse = 20;
        this.addScore(100);
        Sound.play('taco');
        FX.text(x, y - 20, 'YUM! +1 ❤', '#FF8FB8', 24);
        FX.burst(x, y, { count: 14, colors: ['#F5C518', '#2ECC40', '#E02020'], speed: 4, life: 30, size: 5 });
    },

    collectBaby(x, y) {
        this.babies++;
        this.pulse.babies = 30;
        this.addScore(500);
        Sound.play('baby');
        FX.confetti(x, y, 35);
        const msg = this.babies === 3 ? 'All 3 babies found!' : `Baby axolotl ${this.babies}/3!`;
        FX.text(x, y - 40, msg, '#FF9AD0', 26);
    },

    // Called by levels when you get hurt. Returns false if you're out of hearts.
    hurt() {
        if (this.state !== 'play') return true;
        const pl = this.players[this.cur];
        pl.hearts--;
        pl.pulse = 20;
        Sound.play('hurt');
        FX.shake(7);
        FX.flash(0.5);
        if (pl.hearts <= 0) {
            pl.hearts = 0;
            pl.out = true;
            // In a 2-player game your partner can still rescue you!
            if (this.players.some(o => !o.out)) return false;
            this.setState('dying');
            Sound.stopMusic();
            Sound.play('gameover');
            return false;
        }
        return true;
    },

    // Back to the menus: everyone shares the controls again
    endLevel() {
        this.players = [];
        Input.setSplit(false);
        this.use(-1);
    },

    // A rescued player pops out of their bubble with some hearts back
    revive(i) {
        const pl = this.players[i];
        if (!pl || !pl.out) return;
        pl.out = false;
        pl.hearts = Math.max(1, Math.ceil(pl.maxHearts * 2 / 3));
        pl.pulse = 20;
    },

    addScore(n, x, y, color) {
        this.score += n;
        this.levelScore += n;
        if (x != null) FX.text(x, y, '+' + n, color || '#FFFFFF', 22);
    },

    levelDone() {
        if (this.state !== 'play') return;
        const lv = this.level;
        const pct = this.starsTotal ? this.stars / this.starsTotal : 1;
        const rating = 1 + (pct >= 0.7 ? 1 : 0) + (this.babies >= 3 ? 1 : 0);
        const key = lv.id;
        const prev = Save.data.best[key] || { rating: 0, score: 0 };
        const newBest = this.levelScore > prev.score;
        Save.data.best[key] = { rating: Math.max(prev.rating, rating), score: Math.max(prev.score, this.levelScore) };
        const next = Math.min(LEVELS.length - 1, lv.index + 1);
        if (next + 1 > Save.data.unlocked) { Save.data.unlocked = next + 1; Save.data.lastOpen = LEVELS[next].id; }
        Save.write();
        this.setState('complete');
        Sound.stopMusic();
        UI.showComplete(rating, pct, newBest);
    }
};

// ============================================================
//  MENUS (the HTML screens on top of the game)
// ============================================================
const UI = {
    current: null, sel: null, cooldown: 0,
    el: (id) => document.getElementById(id),

    show(name) {
        document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show'));
        const scr = this.el('scr-' + name);
        scr.classList.add('show');
        scr.scrollTop = 0;
        this.current = name;
        this.cooldown = 8;
        Input.clearPressed();
        const items = this.items();
        const def = scr.querySelector('.menu-item.default:not([disabled])') || items[0];
        this.select(def, false);
        document.getElementById('btnPause').classList.toggle('hidden', true);
    },

    hide() {
        document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show'));
        this.current = null;
        this.select(null);
        document.getElementById('btnPause').classList.toggle('hidden', false);
    },

    active() { return !!this.current; },

    items() {
        if (!this.current) return [];
        return [...this.el('scr-' + this.current).querySelectorAll('.menu-item:not([disabled])')];
    },

    select(el, sound = true) {
        if (this.sel) this.sel.classList.remove('sel');
        this.sel = el;
        if (el) {
            el.classList.add('sel');
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            if (sound) Sound.play('move');
        }
    },

    move(dx, dy) {
        const items = this.items();
        if (!items.length) return;
        if (!this.sel || !items.includes(this.sel)) { this.select(items[0]); return; }
        const r = this.sel.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let best = null, bestScore = Infinity;
        for (const it of items) {
            if (it === this.sel) continue;
            const b = it.getBoundingClientRect();
            const ix = b.left + b.width / 2 - cx, iy = b.top + b.height / 2 - cy;
            const along = ix * dx + iy * dy;
            if (along <= 4) continue;
            const across = Math.abs(ix * dy) + Math.abs(iy * dx);
            const score = along + across * 2.5;
            if (score < bestScore) { bestScore = score; best = it; }
        }
        if (best) this.select(best);
    },

    handleInput() {
        if (this.cooldown > 0) { this.cooldown--; return; }
        const p = Input.pressed;
        if (p.left) this.move(-1, 0);
        else if (p.right) this.move(1, 0);
        else if (p.up) this.move(0, -1);
        else if (p.down) this.move(0, 1);
        if (p.confirm && this.sel) { this.sel.click(); }
        else if (p.back || (this.current === 'pause' && p.pause)) this.back();
    },

    back() {
        Sound.play('click');
        const c = this.current;
        if (c === 'chars') { if (this.pickFor === 1) this.showChars(0); else this.show('title'); }
        else if (c === 'levels') this.showChars();
        else if (c === 'pause') this.resume();
        else if (c === 'complete' || c === 'over') this.showLevels();
    },

    // ----- screens -----
    showTitle() {
        Game.setState('title');
        Game.mode = null;
        Game.endLevel();
        Sound.music('title');
        this.show('title');
    },

    // pickFor: 0 = player 1 is choosing, 1 = player 2 is choosing
    showChars(pickFor = 0) {
        Game.setState('menu');
        Game.mode = null;
        Sound.music('title');
        Game.endLevel();
        this.pickFor = pickFor;
        const taken = pickFor === 1 ? Game.picks[0] : null;
        this.el('charsTitle').innerHTML = !Game.twoP ? "Who's playing?"
            : `<span class="ptag p${pickFor + 1}">P${pickFor + 1}</span> Player ${pickFor + 1}, pick your character!`;
        document.querySelectorAll('.char-card').forEach(card => {
            const isTaken = !!taken && card.dataset.id === taken.id;
            card.disabled = isTaken;
            card.classList.toggle('taken', isTaken);
        });
        this.show('chars');
        let want = Game.picks[pickFor];
        if (!want || want === taken) want = CHARACTERS.find(c => c !== taken);
        const cur = document.querySelector(`.char-card[data-id="${want.id}"]`) || document.querySelector('.char-card:not([disabled])');
        if (cur) this.select(cur, false);
    },

    showLevels() {
        Game.setState('menu');
        Game.mode = null;
        Game.endLevel();
        FX.clear();
        Sound.music('title');
        this.buildLevels();
        this.show('levels');
        const next = document.querySelector('.level-btn.next') || document.querySelector('.level-btn:not([disabled])');
        if (next) this.select(next, false);
    },

    pause() {
        if (Game.state !== 'play' && Game.state !== 'intro') return;
        Game.pausedFrom = Game.state;
        Game.setState('paused');
        this.el('pauseLevel').textContent = `${Game.level.label} · ${Game.level.name}`;
        this.show('pause');
        Sound.play('click');
    },

    resume() {
        this.hide();
        Game.setState(Game.pausedFrom || 'play');
        if (Game.pausedFrom === 'intro') Game.stateT = 40;
    },

    showComplete(rating, pct, newBest) {
        const lv = Game.level;
        const last = lv.index === LEVELS.length - 1;
        this.el('cTitle').textContent = last ? '🎉 You beat the game! 🎉' : lv.mode === 'swim' ? '🏊 Swim Test Passed!' : lv.mode === 'bounce' ? '🥤 Slushy Time!' : 'Level Complete!';
        this.el('cSub').textContent = `${lv.label} · ${lv.name}`;
        this.el('cStars').textContent = `${Game.stars} / ${Game.starsTotal}`;
        this.el('cBabies').textContent = `${Game.babies} / 3`;
        this.el('cScore').textContent = Game.levelScore.toLocaleString();
        this.el('cBest').style.display = newBest ? 'inline-block' : 'none';
        const bigs = document.querySelectorAll('#scr-complete .bs');
        bigs.forEach((b, i) => {
            b.classList.remove('on', 'pop');
            if (i < rating) setTimeout(() => { b.classList.add('on', 'pop'); Sound.play(i === 2 ? 'baby' : 'star'); }, 450 + i * 420);
        });
        const hints = [];
        if (pct < 0.7) hints.push('collect 70% of the stars');
        if (Game.babies < 3) hints.push('find all 3 baby axolotls');
        this.el('cHint').textContent = rating === 3
            ? (last ? 'You are a SUPERSTAR! Can you get ★★★ on every level?' : 'PERFECT! Every star earned!')
            : `For ★★★: ${hints.join(' and ')}!`;
        this.el('btnNext').textContent = last ? '🗺️ Level Map' : 'Next Level ▶';
        this.show('complete');
    },

    showOver() {
        this.el('oSub').textContent = `${Game.level.label} · ${Game.level.name}`;
        this.show('over');
    },

    buildChars() {
        const grid = this.el('charGrid');
        grid.innerHTML = '';
        const pips = (n) => '●'.repeat(n) + '○'.repeat(5 - n);
        CHARACTERS.forEach(c => {
            const speed = clamp(Math.round((c.speed - 3.6) / 0.35), 1, 5);
            const g = c.gravity || 0.62;
            const jh = (c.jump * c.jump) / (2 * g);
            const jump = clamp(Math.round((jh - 85) / 14), 1, 5);
            const b = document.createElement('button');
            b.className = 'menu-item char-card';
            b.dataset.action = 'char';
            b.dataset.id = c.id;
            b.style.setProperty('--c1', c.card[0]);
            b.style.setProperty('--c2', c.card[1]);
            b.style.setProperty('--bd', c.border);
            b.innerHTML = `
                <canvas class="char-prev" width="200" height="150"></canvas>
                <span class="cname">${c.name}</span>
                <span class="ctitle">${c.title}</span>
                <span class="cpower">${c.emoji} ${c.power}</span>
                <span class="cdesc">${c.powerDesc}</span>
                <span class="cstats"><span>Speed <i>${pips(speed)}</i></span><span>Jump <i>${pips(jump)}</i></span><span>Hearts <i>${'♥'.repeat(c.hearts)}</i></span></span>`;
            grid.appendChild(b);
        });
    },

    drawCharPreviews() {
        document.querySelectorAll('.char-card').forEach(card => {
            const cv = card.querySelector('canvas');
            const g = cv.getContext('2d');
            const c = CHAR_BY_ID[card.dataset.id];
            const on = card === this.sel || card.matches(':hover');
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.clearRect(0, 0, cv.width, cv.height);
            g.fillStyle = 'rgba(255,255,255,0.45)';
            g.beginPath(); g.ellipse(100, 128, 55, 12, 0, 0, TAU); g.fill();
            const hop = on ? Math.abs(Math.sin(Game.t * 0.12)) * 18 : 0;
            const size = Math.max(c.h, c.w * 0.8);
            const sc = clamp(95 / size, 1.4, 2.4);
            drawChar(g, c, 100, 128 - hop, { t: Game.t, run: on, air: hop > 4, scale: sc, facing: 1 });
        });
    },

    buildLevels() {
        const grid = this.el('levelGrid');
        grid.innerHTML = '';
        let total = 0;
        for (let w = 0; w < 3; w++) {
            const row = document.createElement('div');
            row.className = 'world-row';
            row.innerHTML = `<div class="world-name">World ${w + 1}<small>${WORLD_NAMES[w]}</small></div>`;
            for (const lv of LEVELS.filter(l => l.world === w + 1)) {
                const i = lv.index;
                const best = Save.data.best[lv.id];
                const rating = best ? best.rating : 0;
                total += rating;
                const locked = i >= Save.data.unlocked;
                const b = document.createElement('button');
                b.className = 'menu-item level-btn w' + (w + 1);
                b.dataset.action = 'level';
                b.dataset.idx = i;
                if (locked) b.disabled = true;
                if (i === Save.data.unlocked - 1 && !best) b.classList.add('next');
                b.innerHTML = locked
                    ? `<span class="lv-icon">🔒</span><span class="lv-num">${lv.label}</span><span class="lv-name">???</span>`
                    : `<span class="lv-icon">${MODES[lv.mode].icon}</span><span class="lv-num">${lv.label}</span><span class="lv-name">${lv.name}</span><span class="lv-stars">${'★'.repeat(rating)}<em>${'★'.repeat(3 - rating)}</em></span>`;
                row.appendChild(b);
            }
            grid.appendChild(row);
        }
        this.el('totalStars').textContent = `★ ${total} / ${LEVELS.length * 3}`;
        const who = (Game.twoP ? Game.picks : [Game.picks[0]]).filter(Boolean);
        this.el('playingAs').textContent = who.map(c => `${c.emoji} ${c.name}`).join(' & ');
    },

    onAction(el) {
        const a = el.dataset.action;
        Sound.unlock();
        Sound.play('click');
        el.blur();
        if (a === 'play' || a === 'play2') {
            Game.twoP = a === 'play2';
            this.showChars(0);
        } else if (a === 'char') {
            const c = CHAR_BY_ID[el.dataset.id];
            Game.picks[this.pickFor] = c;
            Save.data[this.pickFor === 1 ? 'char2' : 'char'] = c.id;
            Save.write();
            if (Game.twoP && this.pickFor === 0) {
                if (Game.picks[1] === c) Game.picks[1] = null;
                this.showChars(1);
            } else {
                Game.char = Game.picks[0];
                this.showLevels();
            }
        } else if (a === 'level') Game.startLevel(+el.dataset.idx);
        else if (a === 'to-title') this.showTitle();
        else if (a === 'to-chars') this.showChars(0);
        else if (a === 'to-levels') this.showLevels();
        else if (a === 'resume') this.resume();
        else if (a === 'restart' || a === 'replay' || a === 'retry') Game.startLevel(Game.level.index);
        else if (a === 'next') {
            const n = Game.level.index + 1;
            if (n < LEVELS.length) Game.startLevel(n); else this.showLevels();
        } else if (a === 'music') toggleMusic();
        else if (a === 'fullscreen') toggleFullscreen();
    }
};

// ============================================================
//  HUD (hearts, stars, babies, score, progress)
// ============================================================
function drawHUD(g) {
    const P = Game.pulse;
    const coop = Game.coop;
    // left panel: one row of hearts per player, then stars & babies
    const most = Math.max(...Game.players.map(p => Math.max(p.maxHearts, p.hearts)));
    const hx = coop ? 82 : 36;            // where the hearts start
    const rowY = coop ? 74 : 44;          // extra height for player 2's row
    g.fillStyle = 'rgba(25,12,60,0.55)';
    rrect(g, 10, 10, Math.max(250, hx + most * 30 - 6), rowY + 30, 16); g.fill();
    Game.players.forEach((pl, r) => {
        const y = 22 + r * 30;
        if (coop) {
            const c = pl.char;
            outlinedText(g, 'P' + (r + 1), 30, y, 15, '#FFFFFF', Coop.COLORS[r]);
            drawChar(g, c, 56, y + 11, { t: Game.t, scale: 24 / Math.max(c.h, c.w) });
        }
        const slots = Math.max(pl.maxHearts, pl.hearts);
        for (let i = 0; i < slots; i++) {
            const full = i < pl.hearts;
            const s = 24 * (pl.pulse > 0 && full ? 1 + Math.sin(pl.pulse * 0.6) * 0.15 : 1);
            drawHeart(g, hx + i * 30, y, s, full ? (i >= pl.maxHearts ? '#FFD400' : '#FF3D6E') : '#3a2a4a', full ? '#5A1030' : '#1a1030');
        }
        if (pl.out && Math.floor(Game.t / 20) % 2 === 0) outlinedText(g, 'Bubble! 🫧', hx + 4, y, 16, '#BFE9FF', '#2A1060', 'left');
        if (pl.pulse > 0) pl.pulse--;
    });
    const sy = 22 + rowY;
    const ss = 1 + (P.stars > 0 ? P.stars * 0.03 : 0);
    g.save(); g.translate(36, sy); g.scale(ss, ss);
    starPath(g, 0, 0, 13); g.fillStyle = '#FFD400'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#8A4B00'; g.stroke();
    g.restore();
    outlinedText(g, `${Game.stars}/${Game.starsTotal}`, 56, sy + 1, 20, '#FFFFFF', '#2A1060', 'left');
    // baby axolotls to find
    for (let i = 0; i < 3; i++) {
        const got = i < Game.babies;
        const bx = 160 + i * 34, by = sy + 10;
        const bounce = got && P.babies > 0 && i === Game.babies - 1 ? Math.sin(P.babies * 0.5) * 4 : 0;
        if (got) drawAxolotl(g, bx, by + bounce, Game.t + i * 30, 1, 0.62, '#FFC6E4');
        else {
            g.globalAlpha = 0.45;
            drawAxolotl(g, bx, by, 0, 1, 0.62, '#6A5A8A');
            g.globalAlpha = 1;
            outlinedText(g, '?', bx - 2, by - 9, 14, '#FFFFFF', '#2A1060');
        }
    }

    // right panel: level + score
    g.fillStyle = 'rgba(25,12,60,0.55)';
    rrect(g, W - 262, 10, 182, 58, 16); g.fill();
    outlinedText(g, Game.level.label, W - 248, 29, 16, '#FFD400', '#2A1060', 'left');
    outlinedText(g, Game.level.name, W - 214, 29, 14, '#FFFFFF', '#2A1060', 'left', 600);
    outlinedText(g, Game.score.toLocaleString(), W - 94, 52, 22, '#FFFFFF', '#2A1060', 'right');

    // progress bar
    const pw = 300, px0 = W / 2 - pw / 2, py = 18;
    g.fillStyle = 'rgba(25,12,60,0.55)';
    rrect(g, px0 - 8, py - 10, pw + 16, 20, 10); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)';
    rrect(g, px0, py - 3, pw, 6, 3); g.fill();
    const prs = Game.players.map((pl, i) => Game.mode.progress(i));
    const pr = Math.max(...prs);
    g.fillStyle = '#FFD400';
    rrect(g, px0, py - 3, Math.max(6, pw * pr), 6, 3); g.fill();
    g.fillStyle = '#FF4FA3';
    g.beginPath(); g.moveTo(px0 + pw, py - 12); g.lineTo(px0 + pw + 12, py - 8); g.lineTo(px0 + pw, py - 4); g.fill();
    g.fillStyle = '#FFFFFF'; g.fillRect(px0 + pw - 1, py - 12, 2, 16);
    for (let i = Game.players.length - 1; i >= 0; i--) {
        const c = Game.players[i].char;
        drawChar(g, c, px0 + pw * prs[i], py + 12, { t: Game.t + i * 7, scale: 22 / Math.max(c.h, c.w), run: true });
    }

    for (const k in P) if (P[k] > 0) P[k]--;
}

function drawIntro(g) {
    const lv = Game.level;
    const k = Math.min(1, Game.stateT / 18);
    const e = 1 - Math.pow(1 - k, 3);
    const y = lerp(-140, H / 2 - 20, e);
    g.fillStyle = `rgba(25,12,60,${0.55 * e})`;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.96)';
    const extra = Game.coop ? 26 : 0;     // room for the 2-player controls
    rrect(g, W / 2 - 330, y - 110, 660, 230 + extra, 26); g.fill();
    g.lineWidth = 6; g.strokeStyle = '#FF4FA3'; g.stroke();
    outlinedText(g, `WORLD ${lv.label}`, W / 2, y - 76, 22, '#FFD400', '#7A2A00');
    outlinedText(g, `${MODES[lv.mode].icon} ${lv.name}`, W / 2, y - 34, 42, '#FFFFFF', '#FF4FA3');
    g.fillStyle = '#4A3A7A';
    g.font = `600 17px ${FONT}`;
    g.textAlign = 'center';
    g.fillText(MODES[lv.mode].tip, W / 2, y + 14);
    g.fillStyle = '#E0457B';
    g.font = `700 18px ${FONT}`;
    if (Game.coop) {
        const [a, b] = Game.players.map(p => p.char);
        g.fillText(`${a.name} & ${b.name} — team up! Out of hearts? Float back in a bubble!`, W / 2, y + 44);
        g.font = `600 15px ${FONT}`;
        g.fillStyle = Coop.COLORS[0];
        g.fillText(`P1 ${a.name}: A D move · W or SPACE jump · S ${a.power}`, W / 2, y + 66);
        g.fillStyle = Coop.COLORS[1];
        g.fillText(`P2 ${b.name}: ← → move · ↑ jump · ↓ ${b.power}`, W / 2, y + 86);
    } else {
        g.fillText(`Playing as ${Game.char.name} — ${Game.char.power}: ${Game.char.powerDesc}`, W / 2, y + 44);
    }
    drawBaby(g, W / 2 - 200, y + 96 + extra, Game.t, null, 0.7);
    g.fillStyle = '#6A4A9A';
    g.font = `700 17px ${FONT}`;
    g.fillText('Find the 3 lost baby axolotls!', W / 2, y + 88 + extra);
    if (Game.stateT > 30 && Math.floor(Game.t / 20) % 2 === 0) {
        outlinedText(g, Input.isTouchDevice() ? 'Tap ⬆ to start!' : 'Press SPACE to start!', W / 2, y + 150 + extra, 22, '#FFFFFF', '#2A1060');
    }
}

// ============================================================
//  TITLE SCREEN SCENE — the whole family on parade!
// ============================================================
function drawTitleScene(g) {
    const t = Game.t;
    MODES.walk.drawScenery(g, t * 1.2, 0, t);
    const gy = MODES.walk.GY;
    const n = CHARACTERS.length;
    const spacing = 95;
    const span = n * spacing + 200;
    CHARACTERS.forEach((c, i) => {
        const x = ((i * spacing + t * 1.6) % span) - 120;
        const phase = (t + i * 23) % 70;
        const hop = phase < 26 ? Math.sin((phase / 26) * Math.PI) * 45 : 0;
        drawChar(g, c, x, gy - hop, { t: t + i * 10, run: hop === 0, air: hop > 0, facing: 1 });
    });
    const ax = ((t * 1.6 + n * spacing) % span) - 120;
    drawAxolotl(g, ax, gy, t, 1, 1.2);
    for (let i = 0; i < 8; i++) {
        drawStar(g, (i * 140 + 60 - t * 0.6 + 2000) % (W + 60) - 30, 270 + Math.sin(t * 0.03 + i) * 30, t + i * 20);
    }
}

// ============================================================
//  MAIN LOOP
// ============================================================
function tick() {
    Input.poll();
    Game.t++;
    Game.stateT++;
    if (UI.active()) UI.handleInput();

    switch (Game.state) {
        case 'intro':
            FX.update();
            if (Input.pressed.pause) { UI.pause(); break; }
            if (Game.stateT > 150 || (Game.stateT > 30 && Input.pressed.jump)) Game.setState('play');
            break;
        case 'play':
            if (Input.pressed.pause) { UI.pause(); break; }
            Game.mode.update();
            FX.update();
            break;
        case 'dying':
            if (Game.mode.dying) Game.mode.dying();
            FX.update();
            if (Game.stateT === 100) UI.showOver();
            break;
        case 'complete':
        case 'over':
        case 'menu':
        case 'title':
            FX.update();
            break;
    }
}

function render() {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const inLevel = Game.mode && ['intro', 'play', 'paused', 'dying', 'complete', 'over'].includes(Game.state);
    if (FX.shakeAmt > 0) ctx.translate((Math.random() - 0.5) * FX.shakeAmt * 2, (Math.random() - 0.5) * FX.shakeAmt * 2);
    if (inLevel) {
        Game.mode.draw(ctx);
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        drawHUD(ctx);
    } else {
        drawTitleScene(ctx);
        FX.draw(ctx);
    }
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (FX.flashAmt > 0.02) {
        ctx.fillStyle = `rgba(255,60,90,${FX.flashAmt * 0.45})`;
        ctx.fillRect(0, 0, W, H);
    }
    if (Game.state === 'intro') drawIntro(ctx);
    if (Game.state === 'dying') {
        ctx.fillStyle = `rgba(25,12,60,${Math.min(0.6, Game.stateT / 100)})`;
        ctx.fillRect(0, 0, W, H);
        if (Game.stateT > 20) outlinedText(ctx, 'Oh no!', W / 2, H / 2, 64, '#FFFFFF', '#FF4FA3');
    }
    if (UI.current === 'chars') UI.drawCharPreviews();
}

let lastTime = performance.now();
let acc = 0;
const STEP = 1000 / 60;
function frame(now) {
    requestAnimationFrame(frame);
    let dt = now - lastTime;
    lastTime = now;
    if (dt > 250) dt = STEP;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) { tick(); acc -= STEP; steps++; }
    if (steps >= 5) acc = 0;
    render();
}

// ============================================================
//  PAGE SETUP: layout, fullscreen, music button
// ============================================================
function layout() {
    const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const vw = document.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
    const portrait = vh > vw * 1.05;
    const touch = document.body.classList.contains('touch');
    let reserve = fs ? 0 : 92;
    if (touch && portrait) reserve += 200;
    if (touch && !portrait && !fs) reserve = 50;
    let w = Math.min(vw - (fs ? 0 : 16), (vh - reserve) * 16 / 9);
    w = Math.max(280, Math.floor(w));
    const root = document.documentElement;
    root.style.setProperty('--stage-w', w + 'px');
    root.style.setProperty('--u', (w / 100) + 'px');
    document.body.classList.toggle('small', w < 620);
    document.body.classList.toggle('portrait', portrait);
    document.body.classList.toggle('fs', fs);
}

function toggleFullscreen() {
    const wrap = document.getElementById('wrap');
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) {
        const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
        if (req) { const p = req.call(wrap); if (p && p.catch) p.catch(() => {}); }
    } else {
        const ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (ex) ex.call(document);
    }
}

function toggleMusic() {
    const on = Sound.toggleMusic();
    document.querySelectorAll('.music-btn').forEach(b => { b.textContent = on ? '🔊' : '🔇'; });
}

function boot() {
    if (Input.isTouchDevice()) document.body.classList.add('touch');
    window.addEventListener('touchstart', () => {
        if (!document.body.classList.contains('touch')) { document.body.classList.add('touch'); layout(); }
    }, { passive: true });
    layout();
    window.addEventListener('resize', () => { layout(); if (Math.min(2, window.devicePixelRatio || 1) !== pixelRatio) setupCanvas(); });
    document.addEventListener('fullscreenchange', layout);
    document.addEventListener('webkitfullscreenchange', layout);

    Input.setupTouch();
    UI.buildChars();
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (el && !el.disabled) UI.onAction(el);
    });
    document.addEventListener('pointerdown', () => Sound.unlock(), { passive: true });
    document.getElementById('btnPause').addEventListener('click', (e) => { e.currentTarget.blur(); UI.pause(); });
    document.querySelectorAll('.music-btn').forEach(b => { b.textContent = Sound.isMusicOn() ? '🔊' : '🔇'; });
    // hovering with the mouse moves the menu highlight too
    document.addEventListener('pointerover', (e) => {
        const it = e.target.closest && e.target.closest('.menu-item');
        if (it && UI.current && !it.disabled && it !== UI.sel && e.pointerType === 'mouse') UI.select(it, false);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && Game.state === 'play') UI.pause(); });

    if (Save.data.char && CHAR_BY_ID[Save.data.char]) Game.char = Game.picks[0] = CHAR_BY_ID[Save.data.char];
    if (Save.data.char2 && CHAR_BY_ID[Save.data.char2]) Game.picks[1] = CHAR_BY_ID[Save.data.char2];
    UI.showTitle();
    requestAnimationFrame(frame);
}

boot();
