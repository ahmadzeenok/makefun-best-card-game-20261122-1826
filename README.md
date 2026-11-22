# Ember Duel

A turn-based fantasy card battler for the make.fun "best card game" bounty.
You duel the Ashen Knight on a green felt table: play cards from your hand,
spend mana that grows one crystal every turn, and reduce the rival to 0 HP
before yours runs out.

## How to play

- **Click a card** (or press **1–7**) to play it. Each card costs mana.
- **End Turn** (button or **Enter**) hands the table to the rival, who plays
  its own hand, then a new turn begins with +1 mana and a fresh card.
- **P** pauses, **M** mutes, **R** starts a new duel after victory or defeat.

## The cards

Twelve designs in four elements, thirty cards a deck:

| Element | Cards | Tricks |
| --- | --- | --- |
| Ember | Spark, Lash, Fireball, Bulwark | Raw damage, heavy armor |
| Frost | Shard, Lance, Glacial Wall | Damage plus card draw, armor |
| Storm | Zap, Thunderbolt | Big damage plus card draw |
| Thorn | Whip, Leech Vine, Bloom Mend | Damage that heals, big heals |

Damage eats armor first, then life. When a deck runs out, its discard pile
is shuffled into a new deck. The rival AI heals when hurt, guards when
threatened, and takes lethal damage whenever it sees it.

## Screens

Title, the table itself (your face-up hand below, the rival's face-down hand
above, both life totals, armor and mana always visible), a victory screen and
a defeat screen, each with the duel's stats. Duels won on this browser are
remembered and shown on the title screen.

## Running it

No build step, no network: open `game/index.html` in a desktop browser, or
serve it with `node serve.ts` and open http://localhost:8080.

`?seed=N` fixes the deal; `?shot=start|play|win|lose&seed=N` stages a
screenshot scene (the same seed always gives the same frame).

## Files

- `game/src/state.js` — the duel's rules, no DOM in it
- `game/src/cards.js` — the twelve card designs and the deck
- `game/src/render.js` — canvas drawing of the table and cards
- `game/src/input.js`, `game/src/audio.js` — keyboard/mouse, tiny synth sounds
- `game/src/shots.js` — the screenshot autopilot (real rules, real play)
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes the dossier)
