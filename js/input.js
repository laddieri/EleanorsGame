// ============================================================
//  INPUT: keyboard, touch buttons and gamepads all feed into
//  one simple set of actions: left, right, up, down, jump,
//  pause, confirm and back.
//
//  In 2-player mode the keyboard is split in half:
//    Player 1: A D move · W or SPACE jump · S special
//    Player 2: ← → move · ↑ jump · ↓ special
//  Gamepad 1 is Player 1, Gamepad 2 is Player 2, and the touch
//  buttons always belong to Player 1.
// ============================================================
'use strict';

const Input = (() => {
    const ACTION_KEYS = {
        left:    ['ArrowLeft', 'KeyA'],
        right:   ['ArrowRight', 'KeyD'],
        up:      ['ArrowUp', 'KeyW'],
        down:    ['ArrowDown', 'KeyS'],
        jump:    ['Space', 'KeyZ', 'KeyK', 'KeyX', 'ArrowUp', 'KeyW'],
        pause:   ['Escape', 'KeyP', 'Enter'],
        confirm: ['Enter', 'Space', 'KeyZ'],
        back:    ['Escape', 'Backspace']
    };
    // Movement keys for each half of the keyboard (2-player mode).
    // Actions not listed here (pause, confirm, back) work for everyone.
    const SPLIT_KEYS = [
        { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], jump: ['Space', 'KeyW', 'KeyZ', 'KeyX'] },
        { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], jump: ['ArrowUp', 'ShiftRight', 'Slash', 'Numpad0', 'KeyK'] }
    ];
    const ACTIONS = Object.keys(ACTION_KEYS);
    const GAME_KEYS = new Set([].concat(...Object.values(ACTION_KEYS), ...SPLIT_KEYS.map(s => [].concat(...Object.values(s)))));

    const kb = {};        // keys held right now
    const kbTap = {};     // keys pressed since last poll (so quick taps are never missed)
    const touch = {};     // touch buttons held
    const touchTap = {};
    const pads = [{}, {}]; // gamepad buttons held, one set per player
    let split = false;

    // One set of actions per player, plus "anyone" (used by the menus)
    const makeSet = () => {
        const s = { held: {}, pressed: {}, prev: {} };
        ACTIONS.forEach(a => { s.held[a] = s.pressed[a] = s.prev[a] = false; });
        return s;
    };
    const sets = [makeSet(), makeSet()];
    const held = {}, pressed = {};
    ACTIONS.forEach(a => { held[a] = pressed[a] = false; });

    window.addEventListener('keydown', (e) => {
        Sound.unlock();
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        if (!e.repeat) kbTap[e.code] = true;
        kb[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        kb[e.code] = false;
    });
    window.addEventListener('blur', () => {
        for (const k in kb) kb[k] = false;
        for (const k in touch) touch[k] = false;
    });

    // ---------- Touch buttons ----------
    function setupTouch() {
        document.querySelectorAll('#touch [data-act]').forEach(btn => {
            const act = btn.dataset.act;
            const down = (e) => {
                e.preventDefault();
                Sound.unlock();
                touch[act] = true; touchTap[act] = true;
                btn.classList.add('on');
                if (btn.setPointerCapture && e.pointerId != null) {
                    try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
                }
            };
            const up = (e) => {
                e.preventDefault();
                touch[act] = false;
                btn.classList.remove('on');
            };
            btn.addEventListener('pointerdown', down);
            btn.addEventListener('pointerup', up);
            btn.addEventListener('pointercancel', up);
            btn.addEventListener('lostpointercapture', up);
            btn.addEventListener('contextmenu', e => e.preventDefault());
        });
    }

    // ---------- Gamepad ----------
    function readPads() {
        for (const pad of pads) for (const k in pad) pad[k] = false;
        const list = navigator.getGamepads ? navigator.getGamepads() : [];
        let n = 0;
        for (const gp of list) {
            if (!gp) continue;
            const pad = pads[split ? Math.min(n, 1) : 0];
            n++;
            const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
            const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
            if (ax < -0.35 || b(14)) pad.left = true;
            if (ax > 0.35 || b(15)) pad.right = true;
            if (ay < -0.5 || b(12)) pad.up = true;
            if (ay > 0.5 || b(13)) pad.down = true;
            if (b(0) || b(2) || b(3)) { pad.jump = true; pad.confirm = true; }
            if (b(1)) { pad.jump = true; pad.back = true; }
            if (b(9)) pad.pause = true;
            if (b(8)) pad.back = true;
        }
    }

    function keysFor(a, p) {
        if (!split) return p === 0 ? ACTION_KEYS[a] : [];
        return SPLIT_KEYS[p][a] || ACTION_KEYS[a];
    }
    function keyHeld(a, p) {
        for (const code of keysFor(a, p)) if (kb[code]) return true;
        return false;
    }
    function keyTapped(a, p) {
        for (const code of keysFor(a, p)) if (kbTap[code]) return true;
        return false;
    }

    // Called once per game tick.
    function poll() {
        readPads();
        for (let p = 0; p < 2; p++) {
            const s = sets[p];
            for (const a of ACTIONS) {
                const tAct = a === 'confirm' ? 'jump' : a;
                const tch = p === 0 && !!touch[tAct];
                const h = keyHeld(a, p) || tch || !!pads[p][a];
                s.pressed[a] = (h && !s.prev[a]) || keyTapped(a, p) || (p === 0 && !!touchTap[tAct]);
                s.held[a] = h;
                s.prev[a] = h;
            }
        }
        for (const a of ACTIONS) {
            held[a] = sets[0].held[a] || sets[1].held[a];
            pressed[a] = sets[0].pressed[a] || sets[1].pressed[a];
        }
        for (const k in kbTap) kbTap[k] = false;
        for (const k in touchTap) touchTap[k] = false;
    }

    // Forget any presses (used when screens change so one press doesn't count twice)
    function clearPressed() {
        for (const a of ACTIONS) pressed[a] = sets[0].pressed[a] = sets[1].pressed[a] = false;
        for (const k in kbTap) kbTap[k] = false;
        for (const k in touchTap) touchTap[k] = false;
    }

    function isTouchDevice() {
        return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 ||
               (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    }

    const api = {
        held, pressed, poll, clearPressed, setupTouch, isTouchDevice,
        // Split the keyboard and gamepads between two players (or not)
        setSplit(on) { split = !!on; },
        // Point Input.held / Input.pressed at one player's controls (-1 = anyone)
        use(i) {
            api.held = i < 0 ? held : sets[i].held;
            api.pressed = i < 0 ? pressed : sets[i].pressed;
        }
    };
    return api;
})();
