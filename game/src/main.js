// Boot and the one loop: input is read every frame, floating damage numbers
// age out, and the renderer paints what is there. The game moves between five
// screens: title, play, paused, victory and defeat.
//
// ?seed=N fixes the deal. ?shot=start|play|win|lose (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, WINS_KEY } from './config.js';
import { createDuel, startDuel, playCard, endTurn, PHASE_PLAY } from './state.js';
import { createAudio } from './audio.js';
import { createInput, EV_CONFIRM, EV_MUTE, EV_PAUSE, EV_RESTART } from './input.js';
import {
  createRenderer, handRects, END_TURN_RECT,
  SCREEN_LOSE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();

function readCount(key) {
  try {
    return Number.parseInt(window.localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveCount(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be off (private windows): the count then lasts this visit only.
  }
}

function runShot(name) {
  const renderer = createRenderer(canvas);
  const scene = stageShot(name, seed);
  // Floating damage numbers are mid-animation state; a still frame reads
  // better without them.
  scene.duel.floats.length = 0;
  let painted = 0;
  function paint() {
    renderer.draw(scene.duel, scene.screen, scene.wins, -1);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const renderer = createRenderer(canvas);
  let duel = createDuel(seed);
  let screen = SCREEN_TITLE;
  let wins = readCount(WINS_KEY);
  let hoverIndex = -1;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen
  // changes and the big moments of the duel.
  function announce(message) {
    status.textContent = message;
  }

  function beginDuel() {
    duel = createDuel(Math.floor(Math.random() * 4294967296));
    startDuel(duel);
    screen = SCREEN_PLAY;
    announce(`Duel started. Turn 1, ${duel.you.mana} mana. Play a card, then end your turn.`);
  }

  function finishDuel() {
    if (duel.phase === 'win') {
      screen = SCREEN_WIN;
      wins += 1;
      saveCount(WINS_KEY, wins);
      saveCount(BEST_KEY, wins);
      audio.win();
      announce(`Victory in ${duel.stats.turns} turns. Total duels won: ${wins}.`);
    } else if (duel.phase === 'lose') {
      screen = SCREEN_LOSE;
      audio.lose();
      announce(`Defeat in ${duel.stats.turns} turns. Press Enter to duel again.`);
    }
  }

  function tryPlay(index) {
    if (screen !== SCREEN_PLAY || duel.active !== 'you') return;
    const card = duel.you.hand[index];
    if (!card) return;
    if (card.cost > duel.you.mana) {
      announce(`Not enough mana for ${card.name}. It costs ${card.cost}.`);
      return;
    }
    audio.unlock();
    const rivalHpBefore = duel.rival.hp;
    if (playCard(duel, 'you', index)) {
      audio.playCard();
      if (card.heal > 0) audio.heal();
      if (duel.rival.hp < rivalHpBefore) audio.damage();
      announce(`${card.name} played. Rival HP ${duel.rival.hp}. Your HP ${duel.you.hp}.`);
      if (duel.phase !== PHASE_PLAY) finishDuel();
    }
  }

  function tryEndTurn() {
    if (screen !== SCREEN_PLAY || duel.active !== 'you') return;
    endTurn(duel);
    if (duel.phase !== PHASE_PLAY) finishDuel();
    else announce(`Turn ${duel.turn}. ${duel.you.mana} mana. Your move.`);
  }

  function pointIn(rect, p) {
    return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;
  }

  function handleClick(clientX, clientY) {
    audio.unlock();
    const logical = renderer.toLogical(clientX, clientY);
    const p = renderer.toTable(logical.x, logical.y);
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE) {
      beginDuel();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    // Cards lift 18px when hovered: the hit box reaches that high too.
    const rects = handRects(duel.you.hand.length, 486);
    for (let i = 0; i < rects.length; i += 1) {
      const r = { x: rects[i].x, y: rects[i].y - 18, w: rects[i].w, h: rects[i].h + 18 };
      if (pointIn(r, p)) {
        tryPlay(i);
        return;
      }
    }
    if (pointIn(END_TURN_RECT, p)) tryEndTurn();
  }

  function handleEvents() {
    for (const event of input.takeEvents()) {
      if (event.type === EV_MUTE) {
        const muted = audio.toggleMute();
        announce(muted ? 'Sound off.' : 'Sound on.');
      } else if (event.type === EV_RESTART) {
        if (screen === SCREEN_WIN || screen === SCREEN_LOSE) beginDuel();
      } else if (event.type === EV_PAUSE) {
        if (screen === SCREEN_PLAY) {
          screen = SCREEN_PAUSED;
          announce('Paused.');
        } else if (screen === SCREEN_PAUSED) {
          screen = SCREEN_PLAY;
          announce('Playing.');
        }
      } else if (event.type === EV_CONFIRM) {
        if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE) beginDuel();
        else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
        else if (screen === SCREEN_PLAY) tryEndTurn();
      } else if (event.type === 'play') {
        tryPlay(event.index);
      } else if (event.type === 'click') {
        handleClick(event.x, event.y);
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    handleEvents();
    // Hovered card: the pointer in table coordinates, over the hand row.
    const hover = input.hover();
    hoverIndex = -1;
    if (screen === SCREEN_PLAY && hover.x >= 0) {
      const logical = renderer.toLogical(hover.x, hover.y);
      const p = renderer.toTable(logical.x, logical.y);
      const rects = handRects(duel.you.hand.length, 486);
      for (let i = 0; i < rects.length; i += 1) {
        const r = { x: rects[i].x, y: rects[i].y - 18, w: rects[i].w, h: rects[i].h + 18 };
        if (pointIn(r, p)) {
          hoverIndex = i;
          break;
        }
      }
    }
    // Floating damage numbers rise and fade.
    for (let i = duel.floats.length - 1; i >= 0; i -= 1) {
      duel.floats[i].life -= dt * 0.9;
      if (duel.floats[i].life <= 0) duel.floats.splice(i, 1);
    }
    renderer.draw(duel, screen, wins, hoverIndex);
  }

  // Leaving the tab pauses a running duel rather than letting it sit unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ember Duel. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
