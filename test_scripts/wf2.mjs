import { hasBlockedWord } from '/home/claude/autohound/server/wordfilter.js';
const block = ['nigger', 'N1GG3R', 'n i g g e r', 'niiiggerrr', 'sand nigger guy', 'n.i.g.g.e.r'];
const allow = ['n i g g a','sniggering at that price','nigga', 'fuck', 'shit box', 'bitch', 'faggot', 'retard', 'Niger delta', 'snigger', 'fire retardant', 'Ek Civic coilovers', 'cocktail', 'asshole'];
let bad = 0;
for (const t of block) if (!hasBlockedWord(t)) { bad++; console.log('MISSED', t); }
for (const t of allow) if (hasBlockedWord(t)) { bad++; console.log('BLOCKED', t); }
console.log('problems', bad);
