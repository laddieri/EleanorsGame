// ============================================================
//  CO-OP: two players on one screen, like the old couch games!
//  Each level keeps a list of players. These helpers run code
//  once for each player, and handle the rescue bubbles:
//  if you run out of hearts (or get left behind off-screen)
//  you float in a bubble back to your partner and pop out.
// ============================================================
'use strict';

const Coop = {
    COLORS: ['#FF4FA3', '#3D8BFF'],

    // Run fn(player, i) for each player, with Game.char and Input
    // switched to that player while it runs.
    each(list, fn) {
        for (let i = 0; i < list.length; i++) { Game.use(i); fn(list[i], i); }
        Game.use(-1);
    },

    // Put a player into a rescue bubble at world position (x, y)
    bubble(p, x, y, msg) {
        p.ko = { x, y, t: 0 };
        Sound.play('pop');
        if (msg) FX.text(x, y - 50, msg, '#BFE9FF', 22);
    },

    // Float a bubble toward (tx, ty). Returns true once it gets there.
    floatTo(p, tx, ty) {
        const b = p.ko;
        b.t++;
        const d = dist(b.x, b.y, tx, ty);
        const sp = Math.min(d, 1 + b.t * 0.08, 9);
        if (d > 0.01) { b.x += (tx - b.x) / d * sp; b.y += (ty - b.y) / d * sp; }
        return b.t > 50 && d < 30;
    },

    // Pop! The player is back in the game (with some hearts if they had none).
    pop(p, i) {
        const b = p.ko;
        p.ko = null;
        Game.revive(i);
        Sound.play('pop');
        FX.burst(b.x, b.y, { count: 16, colors: ['#BFE9FF', '#FFFFFF', '#FFB6E1'], speed: 3, life: 24, shape: 'circle', size: 5 });
        FX.text(b.x, b.y - 40, 'Back in!', '#FFFFFF', 22);
    },

    // The bubble with a little character inside, centered at screen (x, y)
    drawBubble(g, ch, x, y, i) {
        const wob = Math.sin(Game.t * 0.12) * 2;
        const r = 34;
        drawChar(g, ch, x, y + 20, { t: Game.t, scale: 40 / Math.max(ch.w, ch.h), air: true, facing: 1 });
        g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3;
        g.fillStyle = 'rgba(190,230,255,0.32)';
        g.beginPath(); g.ellipse(x, y, r + wob, r - wob, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.beginPath(); g.ellipse(x - 13, y - 15, 7, 4, -0.6, 0, TAU); g.fill();
        this.label(g, x, y - r - 6, i);
    },

    // A little "P1" / "P2" marker above a player (only in 2-player games)
    label(g, x, y, i) {
        if (!Game.coop) return;
        const c = this.COLORS[i];
        g.fillStyle = c;
        g.beginPath(); g.moveTo(x - 6, y - 8); g.lineTo(x + 6, y - 8); g.lineTo(x, y); g.fill();
        outlinedText(g, 'P' + (i + 1), x, y - 18, 15, '#FFFFFF', c);
    }
};
