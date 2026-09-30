# 🌟 Eleanor's Family Adventure 🌟

A colorful 8-bit style adventure starring the whole family! Run through meadows,
zoom down snowy mountains, race bikes through town and blast off into space —
and rescue the lost baby axolotls along the way.

## How to play

Open `index.html` in any web browser (double-click it). No installing needed!

1. Press **Play**.
2. Pick who's playing — everyone has their own **special power**.
3. Pick a level on the map. Beat a level to unlock the next one.

### Controls

| | Keyboard | Touch | Gamepad |
|---|---|---|---|
| Move | ← → (or A D) | ◀ ▶ | Stick / D-pad |
| Jump / fly / hop | SPACE or ↑ | ⬆ | A |
| Special (pound, charge, tuck) | ↓ | ▼ | Stick down |
| Pause | ESC or P | ⏸ | Start |

## The goal: ★★★ on every level

Every level has three stars to earn:

- ★ Finish the level
- ★ Collect at least 70% of the gold stars
- ★ Find all **3 lost baby axolotls** (they're hidden in tricky spots!)

You get 3 hearts per level (Harry gets 5). Eat 🌮 **tacos** for extra hearts.
Your progress and best scores are saved in your browser.

## The 4 kinds of levels (3 worlds × 4 = 12 levels)

- 🌸 **Meadow** – a real platformer! Bop grumpy purple blobs on the head (but not
  the red spiky ones!), jump over fire and pits, hit ⭐ boxes from below, bounce
  on pink & orange flowers, and grab the flagpole as high as you can. The babies
  you find follow you home to Mama Axolotl's house.
- ⛷️ **Ski** – steer down the mountain, hold ↓ to go faster, ski between the
  flags for combos, hop rocks, jump ramps and press SPACE in the air to SPIN.
  Halfway down, a **giant snowball** starts rolling after you — stay ahead of it!
- 🚲 **Bike** – hold → to pedal faster, ← to brake, SPACE to hop hurdles.
  Ramps launch you over the river; press SPACE right at the top for BIG AIR,
  and hold ← or → in the air to do flips (land straight or you'll wipe out!).
- 🚀 **Space** – hold SPACE to fly up with your jetpack, dodge asteroids and
  comets (watch for the red ❗), fly through golden rings, and dock at the
  space station.

World 1 is sunny, World 2 is at sunset and World 3 is at night — and each world
is a bit harder than the last.

## The family and their powers

| Character | Power |
|---|---|
| 👑 Eleanor | **Double Jump** – jump again in the air |
| 🧢 William | **Super Speedy** – fastest runner |
| 👩 Mom | **Graceful Glide** – hold jump while falling to float |
| 💪 Dad | **Ground Pound** – press ↓ in the air to smash down |
| 🐶 Mila | **Super Sniffer** – stars fly to her |
| 🐘 Harry | **Big & Tough** – 5 hearts, can stomp spiky critters |
| 🐝 Bee | **Flutter Wings** – buzz up 3 times in the air |
| 🐡 Ricky Fish | **Bubble Float** – super floaty jumps |
| 🐸 Green Froggy | **Mega Hop** – hold ↓ to charge a giant jump |
| 👴 Grampa Rob | **Mighty Leap** – highest jump, plus ground pound |
| 👵 Gramma B | **Love Bubble** – never falls! A bubble carries her back |
| 💜 Aunt Jenni | **Zoom Dash** – press jump in the air to dash forward |

## For young creators: how it's built

Everything is plain **HTML**, **CSS** and **JavaScript** — no downloads, no
image or sound files. All the pictures are drawn with code, and all the music
and sound effects are made with code too!

```
index.html          the page and the menus
css/style.css       colors and layout of the menus
js/engine.js        math helpers, sparkles & confetti, saving
js/audio.js         8-bit music and sound effects
js/input.js         keyboard, touch and gamepad
js/art.js           stars, tacos, hearts, axolotls, clouds
js/characters.js    the family! looks, speed, jump and powers
js/modes/walk.js    meadow levels
js/modes/ski.js     ski levels
js/modes/bike.js    bike levels
js/modes/space.js   space levels
js/game.js          level list, hearts & score, menus, main loop
```

### Things to try changing

- **Make someone jump higher:** in `js/characters.js`, change a character's `jump`.
- **Make someone faster:** change their `speed`.
- **Add a new level:** add a line to the `LEVELS` list at the top of `js/game.js`
  (`d` is how hard it is, from `0` to `1`).
- **New axolotl jokes:** add to `AXOLOTL_QUIPS` in `js/art.js`.
- **Change the music:** the songs are at the bottom of `js/audio.js` — each word
  like `C5` or `G4` is a note, and `.` is a rest.

Remember: if you can imagine it, you can create it! Made with ❤️ to inspire young
creators everywhere.
