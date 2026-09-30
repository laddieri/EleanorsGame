// ============================================================
//  GAME: levels, hearts & score, menus, the HUD and the main
//  loop that runs everything 60 times a second.
// ============================================================
'use strict';

// 3 worlds x 5 levels. Each world repeats the family's
// favourite adventures: meadow walk, skiing, biking, swimming and space!
// (id and seed stay the same forever so saved stars and level layouts never move.)
const LEVELS = [
    { id: 'w1-walk',  world: 1, mode: 'walk',  name: 'Axolotl Meadow',    d: 0.0,  pal: 0, seed: 1 * 7919 },
    { id: 'w1-ski',   world: 1, mode: 'ski',   name: 'Snowy Slopes',      d: 0.05, pal: 0, seed: 2 * 7919 },
    { id: 'w1-bike',  world: 1, mode: 'bike',  name: 'Ramp Town',         d: 0.1,  pal: 0, seed: 3 * 7919 },
    { id: 'w1-swim',  world: 1, mode: 'swim',  name: 'City Pool',         d: 0.08, pal: 0, seed: 101 },
    { id: 'w1-space', world: 1, mode: 'space', name: 'Starry Space',      d: 0.12, pal: 0, seed: 4 * 7919 },
    { id: 'w2-walk',  world: 2, mode: 'walk',  name: 'Sunset Hills',      d: 0.4,  pal: 1, seed: 5 * 7919 },
    { id: 'w2-ski',   world: 2, mode: 'ski',   name: 'Snowball Peak',     d: 0.45, pal: 1, seed: 6 * 7919 },
    { id: 'w2-bike',  world: 2, mode: 'bike',  name: 'Big City Jumps',    d: 0.5,  pal: 1, seed: 7 * 7919 },
    { id: 'w2-swim',  world: 2, mode: 'swim',  name: 'Sunset Splash',     d: 0.5,  pal: 1, seed: 202 },
    { id: 'w2-space', world: 2, mode: 'space', name: 'Asteroid Alley',    d: 0.55, pal: 1, seed: 8 * 7919 },
    { id: 'w3-walk',  world: 3, mode: 'walk',  name: 'Firefly Forest',    d: 0.8,  pal: 2, seed: 9 * 7919 },
    { id: 'w3-ski',   world: 3, mode: 'ski',   name: 'Midnight Mountain', d: 0.85, pal: 2, seed: 10 * 7919 },
    { id: 'w3-bike',  world: 3, mode: 'bike',  name: 'Neon Night Ride',   d: 0.9,  pal: 2, seed: 11 * 7919 },
    { id: 'w3-swim',  world: 3, mode: 'swim',  name: 'Night Swim',        d: 0.9,  pal: 2, seed: 303 },
    { id: 'w3-space', world: 3, mode: 'space', name: 'Comet Chase',       d: 1.0,  pal: 2, seed: 12 * 7919 }
].map((l, i, all) => Object.assign(l, {
    index: i,
    label: `${l.world}-${all.slice(0, i).filter(o => o.world === l.world).length + 1}`
}));

// Older saves stored stars by level number (before the swim levels were added).
(function migrateSave() {
    const d = Save.data;
    if (d.ids) return;
    const OLD = ['w1-walk', 'w1-ski', 'w1-bike', 'w1-space', 'w2-walk', 'w2-ski', 'w2-bike', 'w2-space', 'w3-walk', 'w3-ski', 'w3-bike', 'w3-space'];
    const best = {};
    for (const k in d.best) if (OLD[+k]) best[OLD[+k]] = d.best[k];
    d.best = best;
    const lastOpen = OLD[Math.max(0, Math.min(OLD.length, d.unlocked || 1) - 1)];
    d.unlocked = LEVELS.findIndex(l => l.id === lastOpen) + 1;
    d.ids = true;
    Save.write();
})();

const WORLD_NAMES = ['Sunny Days', 'Sunset Adventure', 'Starlight Night'];

const Game = {
    state: 'title', stateT: 0, t: 0,
    char: null, level: null, mode: null,
    hearts: 3, maxHearts: 3, score: 0, levelScore: 0,
    stars: 0, starsTotal: 0, babies: 0,
    pulse: { hearts: 0, stars: 0, babies: 0 },

    setState(s) {
        this.state = s;
        this.stateT = 0;
        Input.clearPressed();
    },

    startLevel(i) {
        const lv = LEVELS[i];
        this.level = lv;
        this.mode = MODES[lv.mode];
        this.maxHearts = this.char.hearts;
        this.hearts = this.maxHearts;
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
        this.pulse.hearts = 20;
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
        this.hearts--;
        this.pulse.hearts = 20;
        Sound.play('hurt');
        FX.shake(7);
        FX.flash(0.5);
        if (this.hearts <= 0) {
            this.hearts = 0;
            this.setState('dying');
            Sound.stopMusic();
            Sound.play('gameover');
            return false;
        }
        return true;
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
        Save.data.unlocked = Math.max(Save.data.unlocked, Math.min(LEVELS.length, lv.index + 2));
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
        if (c === 'chars') this.show('title');
        else if (c === 'levels') this.showChars();
        else if (c === 'pause') this.resume();
        else if (c === 'complete' || c === 'over') this.showLevels();
    },

    // ----- screens -----
    showTitle() {
        Game.setState('title');
        Game.mode = null;
        Sound.music('title');
        this.show('title');
    },

    showChars() {
        Game.setState('menu');
        Game.mode = null;
        Sound.music('title');
        this.show('chars');
        const cur = (Game.char && document.querySelector(`.char-card[data-id="${Game.char.id}"]`)) || document.querySelector('.char-card');
        if (cur) this.select(cur, false);
    },

    showLevels() {
        Game.setState('menu');
        Game.mode = null;
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
        this.el('cTitle').textContent = last ? '🎉 You beat the game! 🎉' : lv.mode === 'swim' ? '🏊 Swim Test Passed!' : 'Level Complete!';
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
        this.el('playingAs').textContent = Game.char ? `${Game.char.emoji} ${Game.char.name}` : '';
    },

    onAction(el) {
        const a = el.dataset.action;
        Sound.unlock();
        Sound.play('click');
        el.blur();
        if (a === 'play') this.showChars();
        else if (a === 'char') {
            Game.char = CHAR_BY_ID[el.dataset.id];
            Save.data.char = Game.char.id;
            Save.write();
            this.showLevels();
        } else if (a === 'level') Game.startLevel(+el.dataset.idx);
        else if (a === 'to-title') this.showTitle();
        else if (a === 'to-chars') this.showChars();
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
    // left panel
    g.fillStyle = 'rgba(25,12,60,0.55)';
    rrect(g, 10, 10, 250 + Math.max(0, Game.maxHearts - 3) * 30, 74, 16); g.fill();
    const slots = Math.max(Game.maxHearts, Game.hearts);
    for (let i = 0; i < slots; i++) {
        const full = i < Game.hearts;
        const s = 24 * (P.hearts > 0 && full ? 1 + Math.sin(P.hearts * 0.6) * 0.15 : 1);
        drawHeart(g, 36 + i * 30, 22, s, full ? (i >= Game.maxHearts ? '#FFD400' : '#FF3D6E') : '#3a2a4a', full ? '#5A1030' : '#1a1030');
    }
    const ss = 1 + (P.stars > 0 ? P.stars * 0.03 : 0);
    g.save(); g.translate(36, 66); g.scale(ss, ss);
    starPath(g, 0, 0, 13); g.fillStyle = '#FFD400'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#8A4B00'; g.stroke();
    g.restore();
    outlinedText(g, `${Game.stars}/${Game.starsTotal}`, 56, 67, 20, '#FFFFFF', '#2A1060', 'left');
    // baby axolotls to find
    for (let i = 0; i < 3; i++) {
        const got = i < Game.babies;
        const bx = 160 + i * 34, by = 76;
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
    const pr = Game.mode.progress();
    g.fillStyle = '#FFD400';
    rrect(g, px0, py - 3, Math.max(6, pw * pr), 6, 3); g.fill();
    g.fillStyle = '#FF4FA3';
    g.beginPath(); g.moveTo(px0 + pw, py - 12); g.lineTo(px0 + pw + 12, py - 8); g.lineTo(px0 + pw, py - 4); g.fill();
    g.fillStyle = '#FFFFFF'; g.fillRect(px0 + pw - 1, py - 12, 2, 16);
    const c = Game.char;
    drawChar(g, c, px0 + pw * pr, py + 12, { t: Game.t, scale: 22 / Math.max(c.h, c.w), run: true });

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
    rrect(g, W / 2 - 330, y - 110, 660, 230, 26); g.fill();
    g.lineWidth = 6; g.strokeStyle = '#FF4FA3'; g.stroke();
    outlinedText(g, `WORLD ${lv.label}`, W / 2, y - 76, 22, '#FFD400', '#7A2A00');
    outlinedText(g, `${MODES[lv.mode].icon} ${lv.name}`, W / 2, y - 34, 42, '#FFFFFF', '#FF4FA3');
    g.fillStyle = '#4A3A7A';
    g.font = `600 17px ${FONT}`;
    g.textAlign = 'center';
    g.fillText(MODES[lv.mode].tip, W / 2, y + 14);
    g.fillStyle = '#E0457B';
    g.font = `700 18px ${FONT}`;
    g.fillText(`Playing as ${Game.char.name} — ${Game.char.power}: ${Game.char.powerDesc}`, W / 2, y + 44);
    drawBaby(g, W / 2 - 200, y + 96, Game.t, null, 0.7);
    g.fillStyle = '#6A4A9A';
    g.font = `700 17px ${FONT}`;
    g.fillText('Find the 3 lost baby axolotls!', W / 2, y + 88);
    if (Game.stateT > 30 && Math.floor(Game.t / 20) % 2 === 0) {
        outlinedText(g, Input.isTouchDevice() ? 'Tap ⬆ to start!' : 'Press SPACE to start!', W / 2, y + 150, 22, '#FFFFFF', '#2A1060');
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

    if (Save.data.char && CHAR_BY_ID[Save.data.char]) Game.char = CHAR_BY_ID[Save.data.char];
    UI.showTitle();
    requestAnimationFrame(frame);
}

boot();
