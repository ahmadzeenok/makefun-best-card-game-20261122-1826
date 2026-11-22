// The card catalogue: twelve designs, four elements. A card is a plain object:
// { id, name, element, cost, attack, heal, armor, draw, text }.
// attack hits the enemy, armor soaks incoming damage, heal restores your own
// life, draw pulls extra cards. A deck holds two of each design plus one extra
// of the six workhorse cards, thirty cards in all.
export const DESIGNS = [
  { id: 'spark', name: 'Ember Spark', element: 'ember', cost: 1, attack: 2, heal: 0, armor: 0, draw: 0, text: 'A quick lick of flame.' },
  { id: 'lash', name: 'Flame Lash', element: 'ember', cost: 2, attack: 4, heal: 0, armor: 0, draw: 0, text: 'A whip of living fire.' },
  { id: 'fireball', name: 'Fireball', element: 'ember', cost: 4, attack: 8, heal: 0, armor: 0, draw: 0, text: 'A roaring ball of fire.' },
  { id: 'shard', name: 'Frost Shard', element: 'frost', cost: 1, attack: 1, heal: 0, armor: 0, draw: 1, text: 'Sharp ice. Draw a card.' },
  { id: 'lance', name: 'Ice Lance', element: 'frost', cost: 3, attack: 5, heal: 0, armor: 0, draw: 0, text: 'A spear of frozen air.' },
  { id: 'wall', name: 'Glacial Wall', element: 'frost', cost: 2, attack: 0, heal: 0, armor: 6, draw: 0, text: 'Gain 6 armor.' },
  { id: 'zap', name: 'Storm Zap', element: 'storm', cost: 2, attack: 3, heal: 0, armor: 0, draw: 1, text: 'Crackling bolt. Draw a card.' },
  { id: 'bolt', name: 'Thunderbolt', element: 'storm', cost: 5, attack: 9, heal: 0, armor: 0, draw: 0, text: 'The sky itself strikes.' },
  { id: 'whip', name: 'Thorn Whip', element: 'thorn', cost: 1, attack: 2, heal: 0, armor: 0, draw: 0, text: 'Barbed vines lash out.' },
  { id: 'leech', name: 'Leech Vine', element: 'thorn', cost: 2, attack: 3, heal: 3, draw: 0, armor: 0, text: 'Drains life. Heal 3.' },
  { id: 'bloom', name: 'Bloom Mend', element: 'thorn', cost: 2, attack: 0, heal: 7, armor: 0, draw: 0, text: 'Petals knit wounds. Heal 7.' },
  { id: 'bulwark', name: 'Stone Bulwark', element: 'ember', cost: 3, attack: 1, heal: 0, armor: 8, draw: 0, text: 'Gain 8 armor.' },
];

const EXTRA_COPIES = ['spark', 'lash', 'shard', 'zap', 'leech', 'wall'];

/** A fresh 30-card deck: two of every design plus the six extra workhorses. */
export function buildDeck() {
  const deck = [];
  for (const design of DESIGNS) {
    deck.push({ ...design });
    deck.push({ ...design });
  }
  for (const id of EXTRA_COPIES) {
    const design = DESIGNS.find((d) => d.id === id);
    deck.push({ ...design });
  }
  return deck;
}

/** One-line summary of what a card does, for the card face. */
export function cardLine(card) {
  const parts = [];
  if (card.attack > 0) parts.push(`Deal ${card.attack}`);
  if (card.armor > 0) parts.push(`Gain ${card.armor} armor`);
  if (card.heal > 0) parts.push(`Heal ${card.heal}`);
  if (card.draw > 0) parts.push(`Draw ${card.draw}`);
  return parts.join('. ') + '.';
}
