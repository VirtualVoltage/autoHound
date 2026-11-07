// Word filter for public text: usernames and listings (and any future comments). Private chats are never filtered.
// The owner decided only one word is blocked: the hard-R slur. Everything else is allowed.
// It still catches look-alike letters (n1gg3r), stretched letters (niiigger) and spaced-out letters (n i g g e r).
import { fail } from './http.js';

const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g' };
const plain = text => String(text).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[0-9!|@$+]/g, c => LEET[c] || c);
const BLOCKED = /n+i+g{2,}e+r+/;

const ALLOWED = /sn+i+g{2,}e+r+/g; // "snigger" is a real word
const check = w => BLOCKED.test(w.replace(ALLOWED, ''));
export const hasBlockedWord = text => {
  const words = plain(text).split(/[^a-z]+/).filter(Boolean);
  // Whole words, then runs of single letters written apart (n i g g e r, n.i.g.g.e.r).
  const spaced = words.map(w => w.length === 1 ? w : ' ').join('').split(' ');
  return words.some(check) || spaced.some(check);
};

// what: 'username' or 'listing'. Never use this on private chats.
export function checkWords(what, ...texts) {
  if (hasBlockedWord(texts.filter(Boolean).join(' '))) fail(400, what === 'username' ? 'That username isn\'t allowed. Pick a different one.' : 'That word isn\'t allowed on Autohound.');
}
