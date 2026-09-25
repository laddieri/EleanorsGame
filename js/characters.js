// ============================================================
//  CHARACTERS: the whole family! Each one has their own
//  look, speed, jump and a special power.
// ============================================================
'use strict';

// Helpers for the pixel-art drawings.
// o = { t: time, run: true/false, air: true/false, blink: true/false }
function px(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }

function legs(g, c, x1, x2, y, w, h, o) {
    let h1 = h, h2 = h;
    if (o.air) { h1 = h2 = h - 2; }
    else if (o.run) {
        if (Math.floor(o.t / 5) % 2 === 0) h1 = h - 3; else h2 = h - 3;
    }
    px(g, c, x1, y, w, h1);
    px(g, c, x2, y, w, h2);
}

function eyes(g, x1, x2, y, s, o, c = '#000') {
    if (o.blink) { px(g, c, x1, y + s - 1, s, 1); px(g, c, x2, y + s - 1, s, 1); }
    else { px(g, c, x1, y, s, s); px(g, c, x2, y, s, s); }
}

const CHARACTERS = [
    {
        id: 'eleanor', name: 'Eleanor', title: 'The Princess', emoji: '👑',
        card: ['#FFB6C1', '#FFD6E0'], border: '#FF1493',
        cx: 16, bottom: 32, scale: 1.4, w: 26, h: 44,
        speed: 4.3, jump: 11.8, hearts: 3,
        ability: 'doublejump', power: 'Double Jump', powerDesc: 'Press jump again in the air!',
        draw(g, o) {
            px(g, '#FF1493', 8, 8, 16, 16);                   // dress
            px(g, '#FF69B4', 6, 18, 20, 6);                   // skirt flare
            px(g, '#FDBCB4', 8, 0, 16, 8);                    // face
            px(g, '#FFE135', 7, -1, 18, 3);                   // blonde hair
            px(g, '#FFE135', 5, 1, 4, 10); px(g, '#FFE135', 23, 1, 4, 10);
            eyes(g, 10, 19, 2, 3, o);
            px(g, '#FF69B4', 12, 6, 8, 2);                    // smile
            legs(g, '#FDBCB4', 10, 18, 24, 4, 8, o);
            px(g, '#FFD700', 8, -4, 4, 4); px(g, '#FFD700', 14, -6, 4, 6); px(g, '#FFD700', 20, -4, 4, 4); // crown
            px(g, '#FFD700', 8, -1, 16, 2);
            px(g, '#FF1493', 9, -3, 2, 2); px(g, '#00BFFF', 15, -5, 2, 2); px(g, '#FF1493', 21, -3, 2, 2);
        }
    },
    {
        id: 'william', name: 'William', title: 'The Prince', emoji: '🧢',
        card: ['#87CEEB', '#C9ECFA'], border: '#1E90FF',
        cx: 14, bottom: 28, scale: 1.5, w: 24, h: 40,
        speed: 5.1, jump: 11.4, hearts: 3,
        ability: 'speedy', power: 'Super Speedy', powerDesc: 'The fastest runner in the family!',
        draw(g, o) {
            px(g, '#1E90FF', 7, 7, 14, 14);
            px(g, '#FFFFFF', 12, 9, 4, 4);                    // star on shirt
            px(g, '#FDBCB4', 7, 0, 14, 7);
            px(g, '#FFE135', 6, -1, 16, 3);
            px(g, '#FFE135', 5, 1, 3, 3); px(g, '#FFE135', 20, 1, 3, 3);
            eyes(g, 9, 17, 2, 2, o);
            px(g, '#FF69B4', 11, 5, 6, 2);
            legs(g, '#1A4E9A', 7, 16, 21, 5, 7, o);
            px(g, '#4169E1', 7, -3, 14, 2);                   // cap
            px(g, '#4169E1', 9, -5, 10, 2);
            px(g, '#4169E1', 19, -3, 6, 2);                   // cap brim
        }
    },
    {
        id: 'mom', name: 'Mom', title: 'The Queen', emoji: '👩',
        card: ['#DDA0DD', '#F3D1F3'], border: '#8B008B',
        cx: 17, bottom: 36, scale: 1.4, w: 26, h: 48,
        speed: 4.3, jump: 11.8, hearts: 3,
        ability: 'glide', power: 'Graceful Glide', powerDesc: 'Hold jump while falling to float down.',
        draw(g, o) {
            px(g, '#8B0000', 9, 9, 16, 18);
            px(g, '#FDBCB4', 9, 0, 16, 9);
            px(g, '#8B4513', 7, -2, 20, 4);
            px(g, '#8B4513', 6, 2, 5, 10); px(g, '#8B4513', 23, 2, 5, 10);
            eyes(g, 12, 19, 3, 3, o);
            px(g, '#FF69B4', 13, 7, 8, 2);
            legs(g, '#1A1A1A', 10, 18, 27, 6, 9, o);
        }
    },
    {
        id: 'dad', name: 'Dad', title: 'The King', emoji: '💪',
        card: ['#8FA3B0', '#C9D3DA'], border: '#2F4F4F',
        cx: 18, bottom: 40, scale: 1.4, w: 30, h: 54,
        speed: 4.3, jump: 12.2, hearts: 3,
        ability: 'pound', power: 'Ground Pound', powerDesc: 'Press ↓ in the air to SMASH down!',
        draw(g, o) {
            px(g, '#2F4F4F', 8, 10, 20, 18);
            px(g, '#2F4F4F', 3, 10, 7, 14); px(g, '#2F4F4F', 26, 10, 7, 14);
            px(g, '#FDBCB4', 3, 20, 7, 6); px(g, '#FDBCB4', 26, 20, 7, 6);
            px(g, '#FDBCB4', 10, 0, 16, 10);
            px(g, '#8B4513', 9, -2, 18, 4);
            px(g, '#8B4513', 9, 2, 3, 2); px(g, '#8B4513', 24, 2, 3, 2);
            eyes(g, 13, 20, 3, 3, o);
            px(g, '#FF69B4', 14, 7, 8, 2);
            legs(g, '#1F3535', 10, 19, 28, 7, 12, o);
        }
    },
    {
        id: 'mila', name: 'Mila', title: 'The Beagle', emoji: '🐶',
        card: ['#E8A060', '#F7D2A8'], border: '#8B4513',
        cx: 24, bottom: 28, scale: 1.4, w: 44, h: 32,
        speed: 5.1, jump: 11.6, hearts: 3,
        ability: 'magnet', power: 'Super Sniffer', powerDesc: 'Stars zoom right to her nose!',
        draw(g, o) {
            const wag = Math.floor(o.t / 4) % 2 === 0 ? 0 : 2;
            px(g, '#8B4513', 4, 8 - wag, 4, 8); px(g, '#8B4513', 2, 4 - wag, 4, 4);
            px(g, '#FFFFFF', 2, 4 - wag, 4, 3);
            px(g, '#8B4513', 8, 8, 24, 12);
            px(g, '#FFFFFF', 12, 12, 16, 8);
            px(g, '#8B4513', 28, 4, 12, 12);
            px(g, '#8B4513', 28, 4, 4, 12); px(g, '#6B3410', 34, 4, 4, 13);
            px(g, '#000', 28, 4, 4, 4);
            px(g, '#FFFFFF', 38, 8, 6, 6);
            px(g, '#000', 40, 8, 4, 4);
            eyes(g, 31, 36, 8, 3, o);
            if (!o.blink) { px(g, '#FFF', 32, 8, 1, 1); px(g, '#FFF', 37, 8, 1, 1); }
            px(g, '#FF69B4', 41, 12, 3, 3);
            px(g, '#FF0000', 20, 7, 12, 2);
            px(g, '#FFD700', 25, 8, 2, 2);
            let l1 = 8, l2 = 8;
            if (o.run && !o.air) { if (Math.floor(o.t / 4) % 2) l1 = 5; else l2 = 5; }
            if (o.air) { l1 = l2 = 6; }
            px(g, '#8B4513', 10, 20, 4, l1); px(g, '#8B4513', 18, 20, 4, l2); px(g, '#8B4513', 26, 20, 4, l1);
            px(g, '#FFFFFF', 10, 16 + l1, 4, 4); px(g, '#FFFFFF', 18, 16 + l2, 4, 4); px(g, '#FFFFFF', 26, 16 + l1, 4, 4);
        }
    },
    {
        id: 'harry', name: 'Harry', title: 'The Elephant', emoji: '🐘',
        card: ['#B8B8B8', '#E2E2E2'], border: '#696969',
        cx: 22, bottom: 44, scale: 1.25, w: 44, h: 50,
        speed: 3.8, jump: 11.4, hearts: 5,
        ability: 'tough', power: 'Big & Tough', powerDesc: '5 hearts and stomps spiky critters!',
        draw(g, o) {
            px(g, '#808080', 4, 14, 36, 26);
            px(g, '#909090', 10, 2, 28, 22);
            const sway = o.run ? (Math.floor(o.t / 6) % 2 ? 1 : -1) : 0;
            px(g, '#808080', 30 + sway, 20, 6, 18); px(g, '#808080', 26 + sway * 2, 34, 10, 4);
            const flap = Math.sin(o.t * 0.15) * 1.5;
            px(g, '#A9A9A9', 0, 4 + flap, 12, 18); px(g, '#A9A9A9', 32, 4 - flap, 12, 18);
            px(g, '#D08080', 2, 7 + flap, 7, 12); px(g, '#D08080', 34, 7 - flap, 7, 12);
            eyes(g, 14, 26, 7, 4, o, '#222');
            if (!o.blink) { px(g, '#FFF', 15, 7, 2, 2); px(g, '#FFF', 27, 7, 2, 2); }
            px(g, '#FFFFF0', 16, 22, 5, 4); px(g, '#FFFFF0', 24, 22, 5, 4);
            let a = 8, b = 8;
            if (o.run && !o.air) { if (Math.floor(o.t / 6) % 2) a = 5; else b = 5; }
            px(g, '#707070', 6, 36, 8, a); px(g, '#707070', 16, 36, 8, b); px(g, '#707070', 26, 36, 8, a);
            px(g, '#808080', 2, 18, 3, 8); px(g, '#808080', 0, 24, 3, 4);
        }
    },
    {
        id: 'bee', name: 'Bee', title: 'The Bumblebee', emoji: '🐝',
        card: ['#FFD700', '#FFF3A0'], border: '#F57F17',
        cx: 12, bottom: 25, scale: 1.75, w: 28, h: 38,
        speed: 4.5, jump: 10.8, hearts: 3,
        ability: 'flutter', power: 'Flutter Wings', powerDesc: 'Tap jump in the air to buzz up (3 times)!',
        draw(g, o) {
            const flap = Math.floor(o.t / (o.air ? 2 : 4)) % 2 ? 2 : 0;
            g.fillStyle = 'rgba(190, 230, 255, 0.8)';
            g.fillRect(2, -flap, 8, 8 + flap);
            g.fillRect(14, -flap, 8, 8 + flap);
            px(g, '#FFD700', 5, 6, 14, 14);
            px(g, '#222', 5, 9, 14, 3); px(g, '#222', 5, 15, 14, 3);
            px(g, '#FFD700', 7, 2, 10, 8);
            eyes(g, 8, 14, 3, 3, o, '#222');
            if (!o.blink) { px(g, '#FFF', 9, 3, 1, 1); px(g, '#FFF', 15, 3, 1, 1); }
            px(g, '#FF8FB0', 10, 8, 4, 1);
            px(g, '#222', 9, -3, 2, 4); px(g, '#222', 14, -3, 2, 4);
            px(g, '#222', 8, -4, 3, 2); px(g, '#222', 14, -4, 3, 2);
            px(g, '#222', 10, 19, 4, 4); px(g, '#222', 11, 23, 2, 2);
        }
    },
    {
        id: 'rickyfish', name: 'Ricky Fish', title: 'The Clownfish', emoji: '🐡',
        card: ['#FF8C00', '#FFC48A'], border: '#FF4500',
        cx: 20, bottom: 42, scale: 1.1, w: 40, h: 40,
        speed: 4.3, jump: 10.2, gravity: 0.4, maxFall: 6, hearts: 3,
        ability: 'floaty', power: 'Bubble Float', powerDesc: 'Swims through the air — super floaty jumps!',
        draw(g, o) {
            const tw = Math.sin(o.t * 0.25) * 2;
            px(g, '#FF4400', -7, 7 + tw, 8, 8); px(g, '#FF4400', -7, 28 - tw, 8, 8); px(g, '#FF4400', -5, 17, 6, 11);
            g.fillStyle = '#FF6600';
            g.beginPath(); g.arc(23, 21, 20, 0, TAU); g.fill();
            px(g, '#FFFFFF', 7, 2, 6, 38); px(g, '#FFFFFF', 21, 2, 5, 38);
            px(g, '#111', 6, 5, 1, 32); px(g, '#111', 13, 5, 1, 32); px(g, '#111', 20, 4, 1, 34); px(g, '#111', 26, 4, 1, 34);
            px(g, '#FF5500', 13, 0, 4, 5); px(g, '#FF5500', 17, -3, 6, 8); px(g, '#FF5500', 23, 0, 4, 5);
            px(g, '#FF5500', 27, 33, 10, 5); px(g, '#FF5500', 29, 38, 7, 4);
            g.fillStyle = '#111';
            if (o.blink) { g.fillRect(29, 16, 11, 2); }
            else { g.beginPath(); g.arc(34, 16, 6, 0, TAU); g.fill(); px(g, '#FFFFFF', 32, 12, 4, 4); }
            px(g, '#CC2200', 40, 21, 5, 3); px(g, '#CC2200', 41, 24, 3, 2);
        }
    },
    {
        id: 'greenfroggy', name: 'Green Froggy', title: 'The Squishmallow', emoji: '🐸',
        card: ['#5DD35D', '#B8EDB8'], border: '#228B22',
        cx: 30, bottom: 66, scale: 0.85, w: 44, h: 48,
        speed: 3.9, jump: 11.6, hearts: 3,
        ability: 'megahop', power: 'Mega Hop', powerDesc: 'Hold ↓ to charge, then jump SUPER high!',
        draw(g, o) {
            g.fillStyle = '#5DD35D';
            g.beginPath(); g.arc(30, 34, 28, 0, TAU); g.fill();
            g.fillStyle = '#D4F5C8';
            g.beginPath(); g.ellipse(30, 41, 19, 16, 0, 0, TAU); g.fill();
            g.fillStyle = '#5DD35D';
            g.beginPath(); g.arc(14, 13, 13, 0, TAU); g.arc(46, 13, 13, 0, TAU); g.fill();
            g.fillStyle = '#FFFFFF';
            g.beginPath(); g.arc(14, 13, 10, 0, TAU); g.arc(46, 13, 10, 0, TAU); g.fill();
            if (o.blink) {
                px(g, '#111', 6, 13, 16, 2); px(g, '#111', 38, 13, 16, 2);
            } else {
                g.fillStyle = '#111';
                g.beginPath(); g.arc(15, 14, 6, 0, TAU); g.arc(47, 14, 6, 0, TAU); g.fill();
                g.fillStyle = '#FFFFFF';
                g.beginPath(); g.arc(12, 11, 2, 0, TAU); g.arc(44, 11, 2, 0, TAU); g.fill();
            }
            g.strokeStyle = '#228B22'; g.lineWidth = 3; g.lineCap = 'round';
            g.beginPath(); g.arc(30, 36, 13, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
            g.lineCap = 'butt';
            g.fillStyle = 'rgba(255,120,150,0.45)';
            g.beginPath(); g.arc(12, 36, 5, 0, TAU); g.arc(48, 36, 5, 0, TAU); g.fill();
            g.fillStyle = '#4BB84B';
            const hop = o.run && !o.air && Math.floor(o.t / 6) % 2 ? 2 : 0;
            g.beginPath(); g.ellipse(14, 61 - hop, 11, 5, 0, 0, TAU); g.ellipse(46, 61 - (2 - hop), 11, 5, 0, 0, TAU); g.fill();
            g.fillStyle = 'rgba(210,255,210,0.35)';
            g.beginPath(); g.arc(21, 25, 10, 0, TAU); g.fill();
        }
    },
    {
        id: 'gramparob', name: 'Grampa Rob', title: 'Very Strong', emoji: '👴',
        card: ['#C4A35A', '#EAD9AE'], border: '#5C4100',
        cx: 19, bottom: 42, scale: 1.4, w: 32, h: 56,
        speed: 4.4, jump: 13.4, hearts: 3,
        ability: 'strong', power: 'Mighty Leap', powerDesc: 'Jumps the highest — and can ground pound (↓)!',
        draw(g, o) {
            px(g, '#7B5B3A', 7, 12, 24, 18);
            px(g, '#7B5B3A', 1, 12, 8, 16); px(g, '#7B5B3A', 29, 12, 8, 16);
            px(g, '#FDBCB4', 1, 22, 8, 8); px(g, '#FDBCB4', 29, 22, 8, 8);
            px(g, '#FDBCB4', 10, 2, 18, 10);
            px(g, '#A0A0A0', 9, 0, 20, 4);
            px(g, '#A0A0A0', 9, 4, 3, 3); px(g, '#A0A0A0', 26, 4, 3, 3);
            eyes(g, 14, 21, 5, 3, o);
            px(g, '#555555', 12, 9, 14, 3); px(g, '#555555', 11, 10, 3, 2); px(g, '#555555', 24, 10, 3, 2);
            legs(g, '#2A2A2A', 10, 20, 30, 8, 12, o);
        }
    },
    {
        id: 'grammab', name: 'Gramma B', title: 'Wise & Loving', emoji: '👵',
        card: ['#FFE135', '#FFF5A0'], border: '#C8A800',
        cx: 17, bottom: 36, scale: 1.4, w: 26, h: 48,
        speed: 4.3, jump: 11.8, hearts: 3,
        ability: 'bubble', power: 'Love Bubble', powerDesc: 'Never falls! A bubble always carries her back.',
        draw(g, o) {
            px(g, '#C0A0C8', 9, 9, 16, 18);
            px(g, '#C0A0C8', 4, 10, 7, 12); px(g, '#C0A0C8', 23, 10, 7, 12);
            px(g, '#FDBCB4', 4, 18, 7, 5); px(g, '#FDBCB4', 23, 18, 7, 5);
            px(g, '#FDBCB4', 9, 1, 16, 8);
            px(g, '#FFE135', 7, -1, 20, 4);
            px(g, '#FFE135', 6, 3, 5, 8); px(g, '#FFE135', 23, 3, 5, 8);
            px(g, '#FFE135', 13, -4, 8, 5);
            eyes(g, 12, 19, 3, 3, o);
            px(g, '#FF69B4', 13, 7, 8, 2);
            px(g, '#FF4F8B', 15, 12, 4, 3);
            legs(g, '#5577AA', 10, 18, 27, 6, 9, o);
        }
    },
    {
        id: 'auntjenni', name: 'Aunt Jenni', title: 'Cool & Fun', emoji: '💜',
        card: ['#B57EDC', '#E3C8F2'], border: '#6A0DAD',
        cx: 16, bottom: 36, scale: 1.4, w: 26, h: 48,
        speed: 4.6, jump: 11.8, hearts: 3,
        ability: 'dash', power: 'Zoom Dash', powerDesc: 'Press jump in the air to ZOOM forward!',
        draw(g, o) {
            px(g, '#8B008B', 8, 9, 16, 18);
            px(g, '#8B008B', 3, 10, 7, 12); px(g, '#8B008B', 22, 10, 7, 12);
            px(g, '#FDBCB4', 3, 18, 7, 5); px(g, '#FDBCB4', 22, 18, 7, 5);
            px(g, '#FDBCB4', 9, 1, 14, 8);
            px(g, '#3D1C00', 7, -1, 18, 4);
            px(g, '#3D1C00', 6, 3, 5, 10); px(g, '#3D1C00', 21, 3, 5, 10);
            px(g, '#111', 10, 2, 12, 3);                       // cool sunglasses
            if (!o.blink) { px(g, '#6FD3FF', 11, 2, 4, 2); px(g, '#6FD3FF', 17, 2, 4, 2); }
            px(g, '#FF69B4', 13, 7, 7, 2);
            legs(g, '#1A1A4A', 10, 17, 27, 6, 9, o);
        }
    }
];

const CHAR_BY_ID = {};
CHARACTERS.forEach(c => { CHAR_BY_ID[c.id] = c; });

// Draw a character standing with feet at (x, y).
// o: { t, facing, run, air, sx, sy, rot, scale, alpha }
function drawChar(g, ch, x, y, o = {}) {
    const t = o.t || 0;
    const opts = { t, run: !!o.run, air: !!o.air, blink: (t % 190) < 7 };
    const s = ch.scale * (o.scale || 1);
    g.save();
    g.translate(x, y);
    if (o.rot) {
        // rotate around the middle of the body
        const mid = ch.h * 0.5 * (o.scale || 1);
        g.translate(0, -mid); g.rotate(o.rot); g.translate(0, mid);
    }
    g.scale((o.facing || 1) * s * (o.sx || 1), s * (o.sy || 1));
    g.translate(-ch.cx, -ch.bottom);
    if (o.alpha != null) g.globalAlpha = o.alpha;
    ch.draw(g, opts);
    g.restore();
}
