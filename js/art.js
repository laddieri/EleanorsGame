// ============================================================
//  ART: shared pictures used in every level — stars, tacos,
//  hearts, axolotls, speech bubbles and clouds.
// ============================================================
'use strict';

function rrect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
}

function starPath(g, x, y, r, rot = -Math.PI / 2, inner = 0.48) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : r * inner;
        const a = rot + (i * Math.PI) / 5;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
}

function drawStarShape(g, x, y, r, rot, color) {
    starPath(g, x, y, r, rot - Math.PI / 2);
    g.fillStyle = color;
    g.fill();
}

// The collectible gold star (spins gently and shines)
function drawStar(g, x, y, t, r = 12) {
    const squish = Math.cos(t * 0.06);
    g.save();
    g.translate(x, y + Math.sin(t * 0.08) * 2);
    g.scale(0.35 + 0.65 * Math.abs(squish), 1);
    starPath(g, 0, 0, r + 2);
    g.fillStyle = '#B86B00';
    g.fill();
    starPath(g, 0, 0, r);
    g.fillStyle = squish > 0 ? '#FFD400' : '#FFB800';
    g.fill();
    starPath(g, -1, -2, r * 0.5);
    g.fillStyle = '#FFF3A0';
    g.fill();
    g.restore();
}

// A tasty taco! Eating one gives you a heart.
function drawTaco(g, x, y, t = 0, s = 1) {
    g.save();
    g.translate(x, y + Math.sin(t * 0.07) * 3);
    g.scale(s, s);
    g.translate(-14, -12);
    // glow
    g.fillStyle = 'rgba(255,230,120,0.35)';
    g.beginPath(); g.arc(14, 13, 22 + Math.sin(t * 0.12) * 2, 0, TAU); g.fill();
    // shell
    g.fillStyle = '#F5C518';
    g.fillRect(0, 10, 28, 14);
    g.fillRect(0, 4, 7, 10);
    g.fillRect(21, 4, 7, 10);
    g.fillStyle = '#C8960A';
    g.fillRect(0, 22, 28, 2);
    // filling
    g.fillStyle = '#8B4513'; g.fillRect(5, 7, 18, 7);
    g.fillStyle = '#2ECC40'; g.fillRect(3, 4, 7, 5); g.fillRect(18, 4, 7, 5);
    g.fillStyle = '#FF9500'; g.fillRect(7, 2, 14, 4);
    g.fillStyle = '#E02020'; g.fillRect(9, 5, 4, 3); g.fillRect(15, 5, 4, 3);
    g.fillStyle = '#FFE87A'; g.fillRect(2, 11, 5, 3);
    g.restore();
}

function drawHeart(g, x, y, s, fill, outline = '#5A1030') {
    g.save();
    g.translate(x, y);
    g.scale(s / 20, s / 20);
    g.beginPath();
    g.moveTo(0, 6);
    g.bezierCurveTo(0, 2, -4, -4, -10, -4);
    g.bezierCurveTo(-18, -4, -18, 6, -18, 6);
    g.bezierCurveTo(-18, 12, -10, 18, 0, 24);
    g.bezierCurveTo(10, 18, 18, 12, 18, 6);
    g.bezierCurveTo(18, 6, 18, -4, 10, -4);
    g.bezierCurveTo(4, -4, 0, 2, 0, 6);
    g.closePath();
    g.lineWidth = 4;
    g.strokeStyle = outline;
    g.stroke();
    g.fillStyle = fill;
    g.fill();
    if (fill !== '#3a2a4a') {
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.beginPath(); g.ellipse(-9, 3, 4, 3, -0.6, 0, TAU); g.fill();
    }
    g.restore();
}

// Friendly grown-up axolotl (pink, with wiggly gills). x,y = feet centre.
function drawAxolotl(g, x, y, t, facing = 1, s = 1, color = '#FFB6D9') {
    const gill = Math.sin(t * 0.1) * 2;
    g.save();
    g.translate(x, y);
    g.scale(facing * s, s);
    g.translate(-20, -24);
    // tail
    g.fillStyle = color;
    g.fillRect(30, 10 + Math.sin(t * 0.08) * 1.5, 10, 7);
    // body
    g.fillRect(8, 8, 26, 12);
    // head
    g.fillRect(2, 2, 16, 18);
    // gills
    g.fillStyle = '#FF69B4';
    g.fillRect(-3, 3 + gill, 5, 3); g.fillRect(-3, 8 + gill, 5, 3); g.fillRect(-3, 13 + gill, 5, 3);
    g.fillRect(18, 3 - gill, 5, 3); g.fillRect(18, 8 - gill, 5, 3);
    // belly
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(10, 15, 22, 4);
    // eyes
    const blink = (t % 180) < 6;
    g.fillStyle = '#1a1a1a';
    if (blink) { g.fillRect(4, 8, 4, 1); g.fillRect(11, 8, 4, 1); }
    else { g.fillRect(4, 6, 4, 4); g.fillRect(11, 6, 4, 4); g.fillStyle = '#fff'; g.fillRect(5, 6, 1, 1); g.fillRect(12, 6, 1, 1); }
    // cheeks + smile
    g.fillStyle = '#FF7FB6'; g.fillRect(3, 12, 3, 2); g.fillRect(13, 12, 3, 2);
    g.fillStyle = '#C2185B'; g.fillRect(7, 14, 6, 2);
    // feet
    g.fillStyle = color;
    g.fillRect(10, 20, 4, 4); g.fillRect(20, 20, 4, 4); g.fillRect(28, 20, 4, 4);
    g.restore();
}

// Lost baby axolotl — the special thing to find in every level!
// extra: 'helmet' | 'scarf' | 'goggles' | null
function drawBaby(g, x, y, t, extra = null, s = 1) {
    const bob = Math.sin(t * 0.1) * 3;
    g.save();
    g.translate(x, y + bob);
    // sparkly aura so it's easy to spot
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.15);
    g.fillStyle = `rgba(255,200,240,${0.25 + pulse * 0.2})`;
    g.beginPath(); g.arc(0, -10 * s, 24 * s, 0, TAU); g.fill();
    for (let i = 0; i < 3; i++) {
        const a = t * 0.05 + i * TAU / 3;
        drawStarShape(g, Math.cos(a) * 22 * s, -10 * s + Math.sin(a) * 22 * s, 3.5, t * 0.1, '#FFFFFF');
    }
    drawAxolotl(g, 0, 0, t * 1.4, 1, 0.75 * s, '#FFC6E4');
    if (extra === 'helmet') {
        g.strokeStyle = 'rgba(200,230,255,0.9)'; g.lineWidth = 2;
        g.fillStyle = 'rgba(180,220,255,0.25)';
        g.beginPath(); g.arc(-6 * s, -13 * s, 12 * s, 0, TAU); g.fill(); g.stroke();
    } else if (extra === 'scarf') {
        g.fillStyle = '#E53935';
        g.fillRect(-12 * s, -6 * s, 12 * s, 3 * s);
        g.fillRect(-4 * s, -6 * s, 3 * s, 8 * s);
    } else if (extra === 'goggles') {
        g.fillStyle = '#333'; g.fillRect(-14 * s, -15 * s, 15 * s, 2 * s);
        g.fillStyle = '#4FC3F7'; g.fillRect(-13 * s, -16 * s, 5 * s, 4 * s); g.fillRect(-7 * s, -16 * s, 5 * s, 4 * s);
    }
    // little heart
    drawHeart(g, 8 * s, -30 * s - pulse * 3, 9, '#FF4F8B', '#8B1040');
    g.restore();
}

function drawSpeech(g, x, y, text, alpha = 1, border = '#FF69B4') {
    g.save();
    g.globalAlpha = alpha;
    g.font = `600 14px ${FONT}`;
    const tw = g.measureText(text).width;
    const bw = tw + 20, bh = 26;
    const bx = x - bw / 2, by = y - bh - 10;
    g.fillStyle = '#FFFFFF';
    rrect(g, bx, by, bw, bh, 10);
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = border;
    g.stroke();
    g.beginPath();
    g.moveTo(x - 6, by + bh - 1); g.lineTo(x, by + bh + 8); g.lineTo(x + 6, by + bh - 1);
    g.fillStyle = '#FFFFFF'; g.fill();
    g.beginPath();
    g.moveTo(x - 6, by + bh); g.lineTo(x, by + bh + 8); g.lineTo(x + 6, by + bh);
    g.stroke();
    g.fillStyle = '#3a2a5a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, x, by + bh / 2 + 1);
    g.textBaseline = 'alphabetic';
    g.restore();
}

// Puffy cloud with a happy face (a favourite from the original game!)
function drawCloud(g, x, y, s, color = '#FFFFFF', face = true) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = color;
    g.beginPath();
    g.arc(0, 10, 22, 0, TAU);
    g.arc(26, 0, 28, 0, TAU);
    g.arc(54, 8, 22, 0, TAU);
    g.arc(30, 18, 22, 0, TAU);
    g.fill();
    if (face) {
        g.fillStyle = 'rgba(80,70,110,0.7)';
        g.beginPath(); g.arc(19, 6, 3, 0, TAU); g.arc(37, 6, 3, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(80,70,110,0.7)';
        g.lineWidth = 2.5;
        g.beginPath(); g.arc(28, 10, 7, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
        g.fillStyle = 'rgba(255,150,180,0.5)';
        g.beginPath(); g.arc(13, 13, 4, 0, TAU); g.arc(43, 13, 4, 0, TAU); g.fill();
    }
    g.restore();
}

// Big text with a fat outline, used for titles and HUD
function outlinedText(g, str, x, y, size, fill = '#FFFFFF', stroke = '#3a1d6e', align = 'center', weight = 700) {
    g.font = `${weight} ${size}px ${FONT}`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = Math.max(3, size * 0.22);
    g.strokeStyle = stroke;
    g.strokeText(str, x, y);
    g.fillStyle = fill;
    g.fillText(str, x, y);
    g.textBaseline = 'alphabetic';
}

// All the silly things the axolotls say (from the original game!)
const AXOLOTL_QUIPS = [
    "I am also a gamer!", "Have you tried turning it off and on?", "I forgot what I was gonna say",
    "You look like a hero to me!", "I never learned to read", "My fins are VERY stylish",
    "Is it snack time yet?", "I can regenerate limbs. NBD.", "I live underwater but I'm not a fish!",
    "Have you seen my keys?", "I am LITERALLY 10% water", "That star looks sus", "Go go go!!!",
    "Don't touch the fire!!! 🔥", "I have 1000 cousins", "We axolotls invented jumping", "Boop!",
    "You're my hero!", "Almost there!!!", "I saw a ghost back there", "My birthday was yesterday",
    "I am legally a vegetable", "Have you tried the tacos?", "I once jumped over a mountain",
    "Watch out for that thing!!", "I haven't slept in 3 days", "You dropped something... just kidding",
    "I wrote a book once. It was blank.", "My tail does NOT look weird", "I believe in you!!",
    "That was SO impressive", "Did you hear that noise??", "I am VERY fast when I want to be",
    "I know a shortcut. It's wrong.", "Stars are just spicy air", "I am a little scared honestly",
    "Please collect all the stars", "What's your wifi password?", "I just learned to whistle!",
    "My cousin does this way faster", "Don't look down", "I have no idea what I'm doing",
    "You're going the right way. Probably.", "I am rooting for you SO hard", "Left! No wait, right!",
    "I had a dream about this", "Wow you are really good at this", "Fire is just angry light",
    "I am not a lizard. Please.", "Honk if you love stars ⭐"
];
