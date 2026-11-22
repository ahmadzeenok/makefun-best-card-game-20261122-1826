// Ember Duel — the whole game, with no DOM in it: two fighters, a deck each,
// a hand, mana that grows one crystal a turn, and a rival AI that plays its
// own hand. Pure logic, so it can be driven by the renderer, by the screenshot
// autopilot, or by a Node smoke test.
//
// A turn: the side to move gains mana (one more crystal than last turn, up to
// the cap), refills, draws a card, then plays as many affordable cards as it
// likes, then ends the turn. Damage first eats armor, then life. When a side's
// life reaches zero the duel is over.
import { RULES } from './config.js';
import { buildDeck, cardLine } from './cards.js';
import { createRandom, shuffle } from './random.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_WIN = 'win';
export const PHASE_LOSE = 'lose';

function newFighter(name, deck) {
  return {
    name,
    hp: RULES.startHp,
    maxHp: RULES.startHp,
    armor: 0,
    mana: 0,
    maxMana: 0,
    deck,
    hand: [],
    discard: [],
    played: 0,
  };
}

export function createDuel(seed) {
  const rng = createRandom(seed);
  const duel = {
    seed,
    rng,
    turn: 0,
    phase: PHASE_TITLE,
    you: newFighter('You', shuffle(buildDeck(), rng)),
    rival: newFighter('Ashen Knight', shuffle(buildDeck(), rng)),
    active: 'you',
    log: [],
    floats: [],
    stats: { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, turns: 0 },
    winner: null,
  };
  return duel;
}

export function logLine(duel, text) {
  duel.log.unshift(text);
  if (duel.log.length > 6) duel.log.length = 6;
}

function drawCards(duel, fighter, count) {
  for (let i = 0; i < count; i += 1) {
    if (fighter.deck.length === 0) {
      if (fighter.discard.length === 0) return;
      fighter.deck = shuffle(fighter.discard, duel.rng);
      fighter.discard = [];
      logLine(duel, `${fighter.name} reshuffle the discard into a new deck.`);
    }
    if (fighter.hand.length >= RULES.handMax) return;
    fighter.hand.push(fighter.deck.pop());
  }
}

function dealDamage(duel, target, amount, sourceName) {
  let left = amount;
  if (target.armor > 0) {
    const soaked = Math.min(target.armor, left);
    target.armor -= soaked;
    left -= soaked;
  }
  if (left > 0) target.hp = Math.max(0, target.hp - left);
  duel.floats.push({ side: target === duel.you ? 'you' : 'rival', amount, life: 1 });
  return left;
}

/** Apply a card's whole effect. Returns true when the card was played. */
export function playCard(duel, side, handIndex) {
  const me = side === 'you' ? duel.you : duel.rival;
  const foe = side === 'you' ? duel.rival : duel.you;
  const card = me.hand[handIndex];
  if (!card || duel.phase !== PHASE_PLAY || duel.active !== side) return false;
  if (card.cost > me.mana) return false;
  me.mana -= card.cost;
  me.hand.splice(handIndex, 1);
  me.discard.push(card);
  me.played += 1;
  if (side === 'you') duel.stats.cardsPlayed += 1;
  if (card.attack > 0) {
    const through = dealDamage(duel, foe, card.attack, me.name);
    if (side === 'you') duel.stats.damageDealt += card.attack;
    else duel.stats.damageTaken += card.attack;
    logLine(duel, `${me.name} play ${card.name} — ${card.attack} damage${through < card.attack ? ` (${card.attack - through} soaked by armor)` : ''}.`);
  }
  if (card.armor > 0) {
    me.armor += card.armor;
    logLine(duel, `${me.name} gain ${card.armor} armor from ${card.name}.`);
  }
  if (card.heal > 0) {
    me.hp = Math.min(me.maxHp, me.hp + card.heal);
    logLine(duel, `${me.name} heal ${card.heal} with ${card.name}.`);
  }
  if (card.draw > 0) {
    drawCards(duel, me, card.draw);
    logLine(duel, `${me.name} draw ${card.draw} card${card.draw > 1 ? 's' : ''}.`);
  }
  if (!card.attack && !card.armor && !card.heal && !card.draw) {
    logLine(duel, `${me.name} play ${card.name}.`);
  }
  checkEnd(duel);
  return true;
}

function startTurn(duel, side) {
  const fighter = side === 'you' ? duel.you : duel.rival;
  duel.active = side;
  fighter.maxMana = Math.min(RULES.maxMana, fighter.maxMana + 1);
  fighter.mana = fighter.maxMana;
  drawCards(duel, fighter, 1);
  if (side === 'you') duel.stats.turns += 1;
}

/** The rival's turn: heal when hurt, guard when threatened, otherwise hit as hard as it can afford. */
export function rivalTurn(duel) {
  const rival = duel.rival;
  let guard = 0;
  while (duel.phase === PHASE_PLAY && guard < 12) {
    guard += 1;
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < rival.hand.length; i += 1) {
      const card = rival.hand[i];
      if (card.cost > rival.mana) continue;
      let score = card.attack * 2 + card.draw * 2 + card.armor + card.heal;
      if (card.heal > 0 && rival.hp <= 10) score += 6;
      if (card.attack >= duel.you.hp && card.attack > 0) score += 50;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) break;
    playCard(duel, 'rival', best);
  }
}

export function endTurn(duel) {
  if (duel.phase !== PHASE_PLAY) return false;
  if (duel.active === 'you') {
    startTurn(duel, 'rival');
    rivalTurn(duel);
    if (duel.phase !== PHASE_PLAY) return true;
    duel.turn += 1;
    startTurn(duel, 'you');
    logLine(duel, `Turn ${duel.turn}: your move — ${duel.you.mana} mana.`);
  }
  return true;
}

function checkEnd(duel) {
  if (duel.rival.hp <= 0) {
    duel.phase = PHASE_WIN;
    duel.winner = 'you';
    logLine(duel, 'The Ashen Knight falls. Victory!');
  } else if (duel.you.hp <= 0) {
    duel.phase = PHASE_LOSE;
    duel.winner = 'rival';
    logLine(duel, 'Your flame gutters out. Defeat.');
  }
}

/** Begin a fresh duel from the title screen. */
export function startDuel(duel) {
  duel.turn = 1;
  duel.phase = PHASE_PLAY;
  duel.active = 'you';
  duel.log = [];
  duel.floats = [];
  duel.stats = { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, turns: 0 };
  duel.you.maxMana = RULES.startMana;
  duel.you.mana = RULES.startMana;
  drawCards(duel, duel.you, RULES.handStart);
  drawCards(duel, duel.rival, RULES.handStart);
  logLine(duel, `Turn 1: your move — ${duel.you.mana} mana. Play a card, then End Turn.`);
}

export function cardSummary(card) {
  return cardLine(card);
}
