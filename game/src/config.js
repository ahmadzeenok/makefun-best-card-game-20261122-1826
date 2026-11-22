// Ember Duel — tuning numbers, palette and layout in one place.
// The table is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

export const RULES = {
  startHp: 30,
  startMana: 1,
  maxMana: 10,
  handStart: 5,
  handMax: 7,
  deckSize: 30,
};

export const CARD = { width: 132, height: 186, gap: 14, radius: 12 };

export const ELEMENTS = {
  ember: { name: 'Ember', glyph: 'E', color: '#e8632c', dark: '#8f2f10', light: '#ffb37a' },
  frost: { name: 'Frost', glyph: 'F', color: '#3fa7d6', dark: '#14506e', light: '#a8dcf5' },
  storm: { name: 'Storm', glyph: 'S', color: '#b07fe8', dark: '#4d2a86', light: '#d9c2f7' },
  thorn: { name: 'Thorn', glyph: 'T', color: '#5da24a', dark: '#2c5222', light: '#b5e39d' },
};

export const PALETTE = {
  felt: '#1e4d33',
  feltDark: '#143626',
  wood: '#4a2f1d',
  woodLight: '#6b4426',
  gold: '#f2c94c',
  goldDark: '#b98a1d',
  panel: '#20242e',
  panelEdge: '#3a4152',
  text: '#f4efe4',
  muted: '#a9b0bf',
  hp: '#e5534b',
  hpBack: '#3a2020',
  armor: '#7fb3d5',
  mana: '#58b7e8',
  manaEmpty: '#2c3a48',
  rival: '#c94f5e',
  player: '#58b7e8',
  button: '#2e7d4f',
  buttonEdge: '#57b981',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export const BEST_KEY = 'ember-duel.best-wins';
export const WINS_KEY = 'ember-duel.wins';
