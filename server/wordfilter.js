// Basic word filter for public text: usernames, listings, and later anything else other people see.
// Private chats are never filtered. It catches common tricks like l33t letters, stretched letters and spaced-out words.
import { fail } from './http.js';

const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g' };
const plain = text => String(text).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[0-9!|@$+]/g, c => LEET[c] || c);
const squeeze = w => w.replace(/(.)\1+/g, '$1');

// Whole words only, so ordinary words that contain them (like "retardant" or "cocktail") are fine.
const SLUR_WORDS = ['nig', 'nigs', 'fag', 'fags', 'fagot', 'fagots', 'dyke', 'dykes', 'trany', 'tranies', 'tranys', 'retard', 'retards', 'retarded', 'tard', 'tards',
  'kike', 'kikes', 'spic', 'spics', 'spick', 'chink', 'chinks', 'gok', 'goks', 'wetback', 'wetbacks', 'beaner', 'beaners', 'jigaboo', 'jigabo',
  'raghead', 'ragheads', 'towelhead', 'towelheads', 'paki', 'pakis', 'jap', 'japs', 'sambo', 'darkie', 'darky', 'negro', 'negros', 'negroes', 'halfbreed'];
// These are caught inside other words and with spaces or dots between the letters.
const SLUR_INSIDE = [/n+i+g{2,}(e+r+|a+h*|u+h+|r+|e+|ah)/, /f+a+g{2,}o+t+/, /f+a+g+o+t+s?/, /t+r+a+n{2,}(y+|i+e+)/, /k+i+k+e+s?$/];
const PROFANE_WORDS = ['ass', 'asses', 'arse', 'dick', 'dicks', 'dickhead', 'cock', 'cocks', 'cum', 'cunt', 'cunts', 'tit', 'tits', 'twat', 'prick', 'pricks', 'slut', 'sluts',
  'whore', 'whores', 'hoe', 'hoes', 'bastard', 'bastards', 'piss', 'pised', 'pises', 'porn', 'pusy', 'pusies', 'wank', 'wanker', 'dildo', 'shit', 'shits', 'shity', 'bulshit', 'horseshit'];
const PROFANE_INSIDE = [/f+u+c+k+/, /f+u+k+i+n+/, /m+o+t+h+e+r+f+/, /b+i+t+c+h+/, /a+s{2,}h+o+l+e+/, /s+h+i+t+h+e+a+d+/, /c+o+c+k+s+u+c+k+/, /d+i+c+k+h+e+a+d+/, /p+u+s{2,}y+/, /c+u+n+t+s?$/];

const wordsOf = text => plain(text).split(/[^a-z]+/).filter(Boolean).map(squeeze);
const joinedOf = text => plain(text).replace(/[^a-z]/g, '');
const hasWord = (words, list) => words.some(w => list.includes(w));
const hasInside = (text, list) => { const j = joinedOf(text), parts = plain(text).split(/[^a-z]+/).filter(Boolean); return list.some(re => re.test(j) || parts.some(p => re.test(p))); };

export const hasSlur = text => hasWord(wordsOf(text), SLUR_WORDS.map(squeeze)) || hasInside(text, SLUR_INSIDE);
export const hasProfanity = text => hasWord(wordsOf(text), PROFANE_WORDS.map(squeeze)) || hasInside(text, PROFANE_INSIDE);

// what: 'username' or 'listing'. Never use this on private chats.
export function checkWords(what, ...texts) {
  const all = texts.filter(Boolean).join(' \n ');
  if (hasSlur(all)) fail(400, what === 'username' ? 'That username isn\'t allowed. Pick a different one.' : 'Slurs aren\'t allowed on Autohound. Please change your wording.');
  if (hasProfanity(all)) fail(400, what === 'username' ? 'Usernames can\'t have profanity. Pick a different one.' : 'Listings can\'t have profanity. Please clean up the wording.');
}
