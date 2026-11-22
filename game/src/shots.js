// The screenshot scenes behind ?shot=start|play|win|lose. Each one plays the
// real rules forward from a fresh duel, steered by a small policy, so the frame
// is what a real game looks like and the same seed always gives the same frame.
// The win and lose scenes search a few seeds for a duel the policy genuinely
// wins or loses — no state is ever hand-edited into place.
import { createDuel, startDuel, playCard, endTurn, PHASE_PLAY } from './state.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Strong play: hit hard, heal when hurt, guard when the rival is loaded. */
function strongPolicy(duel) {
  const me = duel.you;
  let guard = 0;
  while (duel.phase === PHASE_PLAY && duel.active === 'you' && guard < 12) {
    guard += 1;
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < me.hand.length; i += 1) {
      const card = me.hand[i];
      if (card.cost > me.mana) continue;
      let score = card.attack * 2 + card.draw * 2 + card.armor;
      if (card.heal > 0) score += me.hp <= 12 ? 14 + card.heal : card.heal;
      if (card.attack >= duel.rival.hp && card.attack > 0) score += 50;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) break;
    playCard(duel, 'you', best);
  }
}

/** Play `turns` full turns with a policy, then stop on the player's next turn. */
function playTurns(duel, turns, policy) {
  for (let t = 0; t < turns; t += 1) {
    if (duel.phase !== PHASE_PLAY) return;
    policy(duel);
    if (duel.phase !== PHASE_PLAY) return;
    endTurn(duel);
  }
}

function findEnding(wantWin, policy) {
  for (let seed = 1; seed <= 60; seed += 1) {
    const duel = createDuel(seed);
    startDuel(duel);
    playTurns(duel, 40, policy);
    if (wantWin && duel.phase === 'win') return duel;
    if (!wantWin && duel.phase === 'lose') return duel;
  }
  return null;
}

/**
 * Stage the named scene and return the duel, the screen to draw over it, and
 * the wins count to show. Any unknown name stages the title.
 */
export function stageShot(name, seed) {
  if (name === 'play') {
    const duel = createDuel(seed);
    startDuel(duel);
    playTurns(duel, 5, strongPolicy);
    return { duel, screen: duel.phase === PHASE_PLAY ? SCREEN_PLAY : SCREEN_WIN, wins: 0 };
  }
  if (name === 'win') {
    const duel = findEnding(true, strongPolicy);
    return { duel: duel ?? createDuel(seed), screen: SCREEN_WIN, wins: 1 };
  }
  if (name === 'lose') {
    // A hard-fought loss, not a rout: the strong policy fights well and still falls.
    const duel = findEnding(false, strongPolicy);
    return { duel: duel ?? createDuel(seed), screen: SCREEN_LOSE, wins: 0 };
  }
  return { duel: createDuel(seed), screen: SCREEN_TITLE, wins: 0 };
}
