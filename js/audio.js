// ============================================================
//  SOUND: 8-bit sound effects and background music, all made
//  with the Web Audio API (no sound files needed!)
// ============================================================
'use strict';

const Sound = (() => {
    let ac = null, master, musicGain, sfxGain, noiseBuf;
    let musicOn = Save.data.music !== false;
    let song = null, songName = null, step = 0, nextTime = 0, timer = null;

    // Browsers only allow sound after the player clicks or presses a key.
    function unlock() {
        if (!ac) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            ac = new AC();
            master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
            musicGain = ac.createGain(); musicGain.gain.value = 0.45; musicGain.connect(master);
            sfxGain = ac.createGain(); sfxGain.gain.value = 0.7; sfxGain.connect(master);
            noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
            const d = noiseBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            if (songName) startScheduler();
        }
        if (ac.state === 'suspended') ac.resume();
    }

    // A note name like 'C5' or 'F#4' -> frequency in Hz
    const SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    function freq(name) {
        const m = /^([A-G]#?)(\d)$/.exec(name);
        if (!m) return 0;
        const n = SEMI[m[1]] + (parseInt(m[2], 10) + 1) * 12;
        return 440 * Math.pow(2, (n - 69) / 12);
    }

    function tone(f, dur, o = {}) {
        if (!ac || !f) return;
        const t0 = (o.at != null ? o.at : ac.currentTime) + (o.delay || 0);
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = o.type || 'square';
        osc.frequency.setValueAtTime(f, t0);
        if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
        const v = o.vol != null ? o.vol : 0.2;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g); g.connect(o.dest || sfxGain);
        osc.start(t0); osc.stop(t0 + dur + 0.03);
    }

    function noise(dur, o = {}) {
        if (!ac) return;
        const t0 = (o.at != null ? o.at : ac.currentTime) + (o.delay || 0);
        const src = ac.createBufferSource();
        src.buffer = noiseBuf;
        const filt = ac.createBiquadFilter();
        filt.type = o.filter || 'lowpass';
        filt.frequency.value = o.freq || 2000;
        const g = ac.createGain();
        const v = o.vol != null ? o.vol : 0.2;
        g.gain.setValueAtTime(v, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(filt); filt.connect(g); g.connect(o.dest || sfxGain);
        src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
    }

    function arp(names, gap, o = {}) {
        names.forEach((n, i) => tone(freq(n), o.dur || 0.1, Object.assign({}, o, { delay: i * gap })));
    }

    // ---------- Sound effects ----------
    const SFX = {
        jump:   () => tone(300, 0.14, { slide: 620, vol: 0.12 }),
        jump2:  () => tone(520, 0.14, { slide: 1100, vol: 0.11, type: 'triangle' }),
        flap:   () => tone(700, 0.08, { slide: 1000, vol: 0.08, type: 'triangle' }),
        star:   () => { tone(988, 0.07, { vol: 0.1 }); tone(1319, 0.14, { delay: 0.06, vol: 0.1 }); },
        taco:   () => arp(['E5', 'G5', 'E6', 'C6', 'D6', 'G6'], 0.07, { vol: 0.13, dur: 0.1 }),
        baby:   () => { arp(['C6', 'E6', 'G6', 'C6', 'E6', 'G6', 'C7'], 0.05, { vol: 0.1, type: 'triangle', dur: 0.09 }); },
        hurt:   () => { tone(460, 0.3, { slide: 110, vol: 0.18, type: 'sawtooth' }); noise(0.15, { freq: 900, vol: 0.15 }); },
        stomp:  () => { tone(240, 0.12, { slide: 70, vol: 0.2 }); noise(0.08, { freq: 1500, vol: 0.12 }); },
        pound:  () => { noise(0.35, { freq: 500, vol: 0.45 }); tone(130, 0.25, { slide: 40, vol: 0.25, type: 'sine' }); },
        boing:  () => tone(180, 0.35, { slide: 900, vol: 0.14, type: 'triangle' }),
        dash:   () => { noise(0.18, { freq: 3500, vol: 0.2, filter: 'bandpass' }); tone(400, 0.15, { slide: 900, vol: 0.06 }); },
        box:    () => { tone(523, 0.06, { vol: 0.12 }); tone(784, 0.1, { delay: 0.05, vol: 0.12 }); },
        crash:  () => { noise(0.45, { freq: 1200, vol: 0.4 }); tone(160, 0.3, { slide: 50, vol: 0.18, type: 'sawtooth' }); },
        flip:   () => arp(['G5', 'C6', 'E6', 'G6'], 0.05, { vol: 0.1, type: 'triangle', dur: 0.08 }),
        gate:   () => { tone(1047, 0.08, { type: 'triangle', vol: 0.12 }); tone(1568, 0.14, { delay: 0.07, type: 'triangle', vol: 0.12 }); },
        ring:   () => { tone(784, 0.1, { type: 'sine', vol: 0.2 }); tone(1175, 0.2, { delay: 0.08, type: 'sine', vol: 0.18 }); },
        flag:   () => tone(1400, 0.9, { slide: 250, vol: 0.12, type: 'triangle' }),
        win:    () => arp(['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6', 'G6'], 0.1, { vol: 0.14, dur: 0.16 }),
        click:  () => tone(660, 0.05, { vol: 0.08, type: 'triangle' }),
        move:   () => tone(440, 0.04, { vol: 0.05, type: 'triangle' }),
        rumble: () => { noise(0.8, { freq: 260, vol: 0.3 }); tone(120, 0.5, { slide: 180, vol: 0.08, type: 'triangle' }); },
        splash: () => noise(0.5, { freq: 1800, vol: 0.35 }),
        boost:  () => tone(300, 0.35, { slide: 1300, vol: 0.08, type: 'sawtooth' }),
        land:   () => noise(0.06, { freq: 700, vol: 0.12 }),
        pop:    () => tone(500, 0.12, { slide: 1400, vol: 0.12, type: 'sine' }),
        snow:   () => noise(0.25, { freq: 4000, vol: 0.18, filter: 'highpass' }),
        charge: () => tone(200, 0.12, { slide: 320, vol: 0.05, type: 'triangle' }),
        gameover: () => arp(['G5', 'E5', 'C5', 'G4', 'E4', 'C4'], 0.14, { vol: 0.13, dur: 0.2, type: 'triangle' })
    };

    function play(name) {
        if (!ac || !SFX[name]) return;
        SFX[name]();
    }

    // ---------- Music ----------
    // Each song is a list of 8th-notes. '.' means rest.
    const seq = (s) => s.trim().split(/\s+/).map(n => (n === '.' ? 0 : freq(n)));
    const SONGS = {
        title: {
            bpm: 126, lead: 'square', mv: 0.05, bv: 0.12, drums: true,
            mel: seq(`E5 G5 C6 G5 E5 G5 C6 E6  D6 B5 G5 B5 D6 . . .  C6 A5 F5 A5 C6 A5 F5 A5  B5 G5 D5 G5 C6 . . .`),
            bass: seq(`C3 . G3 . C3 . G3 .  G2 . D3 . G2 . D3 .  F2 . C3 . F2 . C3 .  G2 . D3 . C3 . G2 .`)
        },
        walk: {
            bpm: 150, lead: 'square', mv: 0.05, bv: 0.13, drums: true,
            mel: seq(`C5 E5 G5 C6 . G5 E5 .  D5 F5 A5 G5 . . E5 .  E5 G5 C6 B5 A5 G5 F5 A5  G5 E5 D5 E5 C5 . . .`),
            bass: seq(`C3 . C4 . G2 . C4 .  D3 . D4 . G2 . B3 .  A2 . A3 . F2 . F3 .  G2 . G3 . C3 . G2 .`)
        },
        ski: {
            bpm: 168, lead: 'sawtooth', mv: 0.035, bv: 0.13, drums: true,
            mel: seq(`A5 C6 E6 A6 G6 E6 C6 A5  G5 B5 D6 G6 E6 D6 B5 G5  E5 A5 C6 B5 A5 G5 E5 .  A5 E6 D6 C6 B5 A5 G5 .`),
            bass: seq(`A2 . A3 . A2 . A3 .  G2 . G3 . G2 . G3 .  F2 . F3 . F2 . F3 .  E2 . E3 . E2 . E3 .`)
        },
        bike: {
            bpm: 160, lead: 'square', mv: 0.045, bv: 0.14, drums: true,
            mel: seq(`G4 . G4 . G5 D5 B4 .  G5 A5 G5 E5 D5 . D5 .  B4 D5 G5 B5 A5 G5 F5 E5  D5 G5 B5 D6 B5 G5 D5 .`),
            bass: seq(`G2 . G2 G3 G2 . G2 G3  C3 . C3 C4 C3 . C3 C4  E2 . E2 E3 D2 . D2 D3  G2 . G2 G3 D3 . D3 .`)
        },
        space: {
            bpm: 96, lead: 'triangle', mv: 0.09, bv: 0.12, drums: false, hold: 1.8,
            mel: seq(`C5 . G5 . E5 . A5 .  G5 . . E5 . C5 . .  D6 . C6 . A5 . . G5  E5 . . G5 . A5 . .`),
            bass: seq(`C3 . . . G2 . . .  A2 . . . E2 . . .  F2 . . . C3 . . .  G2 . . . G2 . . .`)
        }
    };

    function schedule() {
        if (!ac || !song) return;
        const stepDur = 60 / song.bpm / 2;
        if (nextTime < ac.currentTime - 0.3) nextTime = ac.currentTime + 0.05; // tab was hidden
        while (nextTime < ac.currentTime + 0.15) {
            const i = step % song.mel.length;
            const m = song.mel[i];
            if (m) tone(m, stepDur * (song.hold || 0.9), { at: nextTime, type: song.lead, vol: song.mv, dest: musicGain });
            const b = song.bass[i % song.bass.length];
            if (b) tone(b, stepDur * 1.6, { at: nextTime, type: 'triangle', vol: song.bv, dest: musicGain });
            if (song.drums) {
                if (i % 4 === 0) tone(150, 0.12, { at: nextTime, slide: 45, type: 'sine', vol: 0.35, dest: musicGain });
                if (i % 4 === 2) noise(0.04, { at: nextTime, freq: 7000, filter: 'highpass', vol: 0.06, dest: musicGain });
            }
            nextTime += stepDur;
            step++;
        }
    }

    function startScheduler() {
        stopScheduler();
        if (!ac || !musicOn || !songName) return;
        song = SONGS[songName];
        step = 0;
        nextTime = ac.currentTime + 0.08;
        timer = setInterval(schedule, 30);
    }

    function stopScheduler() {
        if (timer) clearInterval(timer);
        timer = null;
    }

    function music(name) {
        if (name === songName && timer) return;
        songName = name;
        startScheduler();
    }

    function stopMusic() {
        songName = null;
        stopScheduler();
    }

    function toggleMusic() {
        musicOn = !musicOn;
        Save.data.music = musicOn;
        Save.write();
        if (musicOn) startScheduler(); else stopScheduler();
        return musicOn;
    }

    return { unlock, play, music, stopMusic, toggleMusic, isMusicOn: () => musicOn };
})();
