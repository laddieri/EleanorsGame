// ============================================================
//  INPUT: keyboard, touch buttons and gamepads all feed into
//  one simple set of actions: left, right, up, down, jump,
//  pause, confirm and back.
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
    const ACTIONS = Object.keys(ACTION_KEYS);
    const GAME_KEYS = new Set([].concat(...Object.values(ACTION_KEYS)));

    const kb = {};        // keys held right now
    const kbTap = {};     // keys pressed since last poll (so quick taps are never missed)
    const touch = {};     // touch buttons held
    const touchTap = {};
    const pad = {};       // gamepad buttons held

    const held = {}, pressed = {}, prev = {};
    ACTIONS.forEach(a => { held[a] = pressed[a] = prev[a] = false; });

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
    function readPad() {
        for (const k in pad) pad[k] = false;
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of pads) {
            if (!gp) continue;
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

    function keyHeld(a) {
        for (const code of ACTION_KEYS[a]) if (kb[code]) return true;
        return false;
    }
    function keyTapped(a) {
        for (const code of ACTION_KEYS[a]) if (kbTap[code]) return true;
        return false;
    }

    // Called once per game tick.
    function poll() {
        readPad();
        for (const a of ACTIONS) {
            const tAct = a === 'confirm' ? 'jump' : a;
            const h = keyHeld(a) || !!touch[tAct] || !!pad[a];
            pressed[a] = (h && !prev[a]) || keyTapped(a) || !!touchTap[tAct];
            held[a] = h;
            prev[a] = h;
        }
        for (const k in kbTap) kbTap[k] = false;
        for (const k in touchTap) touchTap[k] = false;
    }

    // Forget any presses (used when screens change so one press doesn't count twice)
    function clearPressed() {
        for (const a of ACTIONS) pressed[a] = false;
        for (const k in kbTap) kbTap[k] = false;
        for (const k in touchTap) touchTap[k] = false;
    }

    function isTouchDevice() {
        return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 ||
               (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    }

    return { held, pressed, poll, clearPressed, setupTouch, isTouchDevice };
})();
