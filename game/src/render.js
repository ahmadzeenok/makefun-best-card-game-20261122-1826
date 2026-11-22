// Drawing only: the duel's state and the current screen in, pixels out. The
// 1280x720 table is scaled to fit the window and centred; the margin is filled
// with the backdrop colour. Everything is flat canvas shapes and text: no
// images, no network, so the game renders the same offline anywhere.
//
// Layout: the rival sits at the top with face-down cards, the player at the
// bottom with a face-up hand, the log on the left, and the End Turn button at
// the lower right. Life totals, armor and mana crystals are always visible.
import { CARD, ELEMENTS, FIELD, FONT, PALETTE } from './config.js';
import { cardLine } from './cards.js';
import { PHASE_PLAY } from './state.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

const HAND_Y = 486;
const RIVAL_HAND_Y = 96;
export const END_TURN_RECT = { x: 1062, y: 596, w: 188, h: 56 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The on-table rectangles of a hand of `count` cards, centred on the table. */
export function handRects(count, y) {
  const total = count * CARD.width + (count - 1) * CARD.gap;
  const startX = (FIELD.width - total) / 2;
  const rects = [];
  for (let i = 0; i < count; i += 1) {
    rects.push({ x: startX + i * (CARD.width + CARD.gap), y, w: CARD.width, h: CARD.height });
  }
  return rects;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function font(size, bold) {
    const key = `${bold ? 'b' : ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? 'bold ' : ''}${size}px ${FONT}`);
    return fonts.get(key);
  }

  function text(value, x, y, size, color, align, bold) {
    ctx.font = font(size, bold);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  /** Convert device pixels back into 1280x720 table coordinates. */
  function toTable(px, py) {
    return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
  }

  function drawTable() {
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.felt;
    roundRect(ctx, 14, 14, FIELD.width - 28, FIELD.height - 28, 26);
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldDark;
    ctx.lineWidth = 2;
    roundRect(ctx, 22, 22, FIELD.width - 44, FIELD.height - 44, 20);
    ctx.stroke();
    // Faint centre emblem.
    ctx.strokeStyle = 'rgba(242, 201, 76, 0.16)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(FIELD.width / 2, 356, 74, 0, Math.PI * 2);
    ctx.stroke();
    text('EMBER DUEL', FIELD.width / 2, 366, 20, 'rgba(242, 201, 76, 0.20)', 'center', true);
  }

  function drawHpBar(x, y, w, fighter, color) {
    ctx.fillStyle = PALETTE.hpBack;
    roundRect(ctx, x, y, w, 26, 8);
    ctx.fill();
    const frac = Math.max(0, fighter.hp / fighter.maxHp);
    if (frac > 0) {
      ctx.fillStyle = color;
      roundRect(ctx, x + 2, y + 2, (w - 4) * frac, 22, 6);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = font(17, true);
    ctx.textAlign = 'center';
    ctx.fillText(`HP ${fighter.hp} / ${fighter.maxHp}`, x + w / 2, y + 19);
    if (fighter.armor > 0) {
      ctx.fillStyle = PALETTE.armor;
      roundRect(ctx, x + w + 10, y, 92, 26, 8);
      ctx.fill();
      ctx.fillStyle = '#10202e';
      ctx.font = font(15, true);
      ctx.fillText(`ARMOR ${fighter.armor}`, x + w + 56, y + 19);
    }
  }

  // Mana as a compact two-column grid in the left margin: it never reaches
  // the hands, however many cards they hold. Filled crystals are current mana.
  function drawMana(x, y, fighter) {
    text(`MANA ${fighter.mana}/${fighter.maxMana}`, x, y, 14, PALETTE.muted, 'left', true);
    for (let i = 0; i < fighter.maxMana; i += 1) {
      const cx = x + 10 + (i % 2) * 24;
      const cy = y + 14 + Math.floor(i / 2) * 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = i < fighter.mana ? PALETTE.mana : PALETTE.manaEmpty;
      ctx.fill();
      ctx.strokeStyle = '#9fd8f5';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawCardBack(x, y, w, h, label) {
    ctx.fillStyle = '#3a2a18';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldDark;
    ctx.lineWidth = 2;
    roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 8);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = font(30, true);
    ctx.textAlign = 'center';
    ctx.fillText('E', x + w / 2, y + h / 2 + 10);
    if (label) text(label, x + w / 2, y + h - 12, 12, PALETTE.muted, 'center');
  }

  function drawCard(card, rect, opts) {
    const el = ELEMENTS[card.element];
    const hover = opts.hover ? -18 : 0;
    const y = rect.y + hover;
    const x = rect.x;
    const affordable = opts.affordable !== false;
    ctx.save();
    if (!affordable) ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#f7f1de';
    roundRect(ctx, x, y, rect.w, rect.h, CARD.radius);
    ctx.fill();
    ctx.strokeStyle = opts.hover ? PALETTE.gold : el.dark;
    ctx.lineWidth = opts.hover ? 4 : 2;
    roundRect(ctx, x, y, rect.w, rect.h, CARD.radius);
    ctx.stroke();
    // Element band with glyph.
    ctx.fillStyle = el.color;
    roundRect(ctx, x, y, rect.w, 46, CARD.radius);
    ctx.fill();
    ctx.fillRect(x, y + 34, rect.w, 12);
    ctx.beginPath();
    ctx.arc(x + 22, y + 23, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#fff8ea';
    ctx.fill();
    ctx.fillStyle = el.dark;
    ctx.font = font(17, true);
    ctx.textAlign = 'center';
    ctx.fillText(el.glyph, x + 22, y + 29);
    text(el.name.toUpperCase(), x + 42, y + 28, 13, '#fff8ea', 'left', true);
    // Mana cost badge.
    ctx.beginPath();
    ctx.arc(x + rect.w - 20, y + 23, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#1c4a6b';
    ctx.fill();
    ctx.strokeStyle = '#fff8ea';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff8ea';
    ctx.font = font(19, true);
    ctx.fillText(String(card.cost), x + rect.w - 20, y + 30);
    // Card name.
    ctx.fillStyle = '#241a10';
    ctx.font = font(17, true);
    ctx.textAlign = 'center';
    ctx.fillText(card.name, x + rect.w / 2, y + 72);
    // Big glyph art.
    ctx.fillStyle = el.light;
    ctx.beginPath();
    ctx.arc(x + rect.w / 2, y + 112, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = el.dark;
    ctx.font = font(34, true);
    ctx.fillText(el.glyph, x + rect.w / 2, y + 124);
    // Effect text, kept clear of the attack value at the foot of the card.
    ctx.fillStyle = '#4a3a22';
    ctx.font = font(13, false);
    const lines = wrapText(ctx, cardLine(card), rect.w - 18);
    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, x + rect.w / 2, y + 148 + i * 13);
    });
    // Attack value, bottom left.
    if (card.attack > 0) {
      ctx.fillStyle = '#a33327';
      ctx.font = font(20, true);
      ctx.textAlign = 'left';
      ctx.fillText(`ATK ${card.attack}`, x + 10, y + rect.h - 8);
    }
    if (opts.keyHint) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = font(12, true);
      ctx.textAlign = 'right';
      ctx.fillText(opts.keyHint, x + rect.w - 8, y + rect.h - 8);
    }
    ctx.restore();
  }

  function drawDeckPile(x, y, count, label) {
    ctx.fillStyle = '#2c2113';
    roundRect(ctx, x, y, 54, 74, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldDark;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, 54, 74, 8);
    ctx.stroke();
    text(String(count), x + 27, y + 46, 22, PALETTE.gold, 'center', true);
    text(label, x + 27, y + 92, 12, PALETTE.muted, 'center');
  }

  // The log lives on the right of the table, clear of both hands. Each entry
  // wraps to at most two lines; entries stop when the panel runs out of room.
  function drawLog(duel) {
    ctx.fillStyle = 'rgba(16, 20, 26, 0.72)';
    roundRect(ctx, 998, 250, 252, 168, 10);
    ctx.fill();
    text('DUEL LOG', 1012, 274, 14, PALETTE.gold, 'left', true);
    ctx.font = font(13, false);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    let lineY = 296;
    for (const entry of duel.log) {
      const wrapped = wrapText(ctx, entry, 226).slice(0, 2);
      // Never start an entry that cannot finish inside the panel.
      if (lineY + (wrapped.length - 1) * 17 > 404) break;
      for (const line of wrapped) {
        ctx.fillText(line, 1012, lineY);
        lineY += 17;
      }
    }
  }

  function drawEndTurn(enabled) {
    ctx.fillStyle = enabled ? PALETTE.button : '#3a414d';
    roundRect(ctx, END_TURN_RECT.x, END_TURN_RECT.y, END_TURN_RECT.w, END_TURN_RECT.h, 12);
    ctx.fill();
    ctx.strokeStyle = enabled ? PALETTE.buttonEdge : PALETTE.muted;
    ctx.lineWidth = 2;
    roundRect(ctx, END_TURN_RECT.x, END_TURN_RECT.y, END_TURN_RECT.w, END_TURN_RECT.h, 12);
    ctx.stroke();
    text('END TURN', END_TURN_RECT.x + END_TURN_RECT.w / 2, END_TURN_RECT.y + 25, 19, PALETTE.text, 'center', true);
    text('Enter', END_TURN_RECT.x + END_TURN_RECT.w / 2, END_TURN_RECT.y + 45, 13, PALETTE.muted, 'center');
  }

  function drawFloats(duel) {
    const shown = duel.floats.slice(-3);
    shown.forEach((f, i) => {
      const anchor = f.side === 'you'
        ? { x: FIELD.width / 2, y: 470 }
        : { x: FIELD.width / 2, y: 210 };
      const offset = (i - (shown.length - 1) / 2) * 64;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      text(`-${f.amount}`, anchor.x + offset, anchor.y - (1 - f.life) * 46, 34, '#ff6b5e', 'center', true);
      ctx.globalAlpha = 1;
    });
  }

  function drawPanel(title, lines, prompt, accent) {
    ctx.fillStyle = 'rgba(10, 12, 16, 0.66)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 640;
    const h = 150 + lines.length * 32;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = accent || PALETTE.gold;
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, w, h, 16);
    ctx.stroke();
    text(title, FIELD.width / 2, y + 66, 46, accent || PALETTE.gold, 'center', true);
    lines.forEach((line, i) => {
      text(line, FIELD.width / 2, y + 112 + i * 32, 20, PALETTE.text, 'center');
    });
    text(prompt, FIELD.width / 2, y + h - 26, 18, PALETTE.muted, 'center');
  }

  function drawPlay(duel, hoverIndex) {
    drawTable();
    // Rival row: name, life, mana grid on the left; hand face-down, centred.
    text('ASHEN KNIGHT  —  RIVAL', 40, 52, 20, PALETTE.rival, 'left', true);
    drawHpBar(40, 62, 320, duel.rival, PALETTE.rival);
    drawMana(40, 112, duel.rival);
    const rivalRects = handRects(duel.rival.hand.length, RIVAL_HAND_Y);
    rivalRects.forEach((r) => {
      drawCardBack(r.x, r.y, 56, 78, '');
    });
    drawDeckPile(1190, 60, duel.rival.deck.length, 'DECK');
    // Turn banner.
    const banner = duel.phase === PHASE_PLAY
      ? (duel.active === 'you' ? `TURN ${duel.turn} — YOUR MOVE` : 'RIVAL IS PLAYING…')
      : '';
    if (banner) text(banner, FIELD.width / 2, 250, 22, PALETTE.gold, 'center', true);
    drawLog(duel);
    drawFloats(duel);
    // Player row: hand face-up, life, mana, deck.
    const rects = handRects(duel.you.hand.length, HAND_Y);
    duel.you.hand.forEach((card, i) => {
      drawCard(card, rects[i], {
        hover: hoverIndex === i,
        affordable: card.cost <= duel.you.mana && duel.active === 'you',
        keyHint: String(i + 1),
      });
    });
    // Player plate sits just above the hand row: the hand can fan out to seven
    // cards, so nothing in this column may reach into the hand's top edge.
    text('YOU', 40, 452, 20, PALETTE.player, 'left', true);
    drawHpBar(40, 458, 300, duel.you, PALETTE.hp);
    drawMana(40, 498, duel.you);
    drawDeckPile(1190, 470, duel.you.deck.length, 'DECK');
    text(`DISCARD ${duel.you.discard.length}`, 1190, 580, 12, PALETTE.muted, 'center');
    drawEndTurn(duel.active === 'you' && duel.phase === PHASE_PLAY);
    text('Click a card or press 1–7 to play it. P pauses. M mutes.', FIELD.width / 2, 700, 14, PALETTE.muted, 'center');
  }

  function draw(duel, screen, wins, hoverIndex) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0d0f13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_TITLE) {
      drawTable();
      // A dressed table behind the title: both hands as card backs.
      handRects(5, RIVAL_HAND_Y).forEach((r) => drawCardBack(r.x, r.y, 56, 78, ''));
      handRects(5, HAND_Y).forEach((r) => drawCardBack(r.x, r.y, 56, 78, ''));
      drawPanel('EMBER DUEL', [
        'A turn-based card battler. Outplay the Ashen Knight.',
        'Play cards with mouse or keys 1–7. Each costs mana.',
        'Mana grows every turn. Reduce the rival to 0 HP to win.',
        wins > 0 ? `Duels won here: ${wins}` : 'Your first duel awaits.',
      ], 'Press Enter or click to begin', PALETTE.gold);
      return;
    }
    drawPlay(duel, hoverIndex);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The embers wait for you.'], 'Press P or Enter to resume', PALETTE.muted);
    } else if (screen === SCREEN_WIN) {
      drawPanel('VICTORY!', [
        `The Ashen Knight falls in ${duel.stats.turns} turns.`,
        `Damage dealt: ${duel.stats.damageDealt}   •   Cards played: ${duel.stats.cardsPlayed}`,
        `Duels won here: ${wins}`,
      ], 'Press Enter or click to duel again', PALETTE.gold);
    } else if (screen === SCREEN_LOSE) {
      drawPanel('DEFEAT', [
        `The Ashen Knight wins in ${duel.stats.turns} turns.`,
        `Damage dealt: ${duel.stats.damageDealt}   •   Cards played: ${duel.stats.cardsPlayed}`,
        'Sharpen your deck and try again.',
      ], 'Press Enter or click to duel again', PALETTE.rival);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toTable, toLogical };
}
