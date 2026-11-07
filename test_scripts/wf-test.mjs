import { hasSlur, hasProfanity } from '/home/claude/autohound/server/wordfilter.js';
const block = ['n i g g e r','N1GG4','sand nigger guy','f@gg0t','faaaggot','you fag','stupid retard','kike','tr4nny','what the fuck','fuuuuck','F U C K','sh1t box','bullshit deal','bitch','asshole','motherfucker','pussy','cunt','dumb ass','jap'];
const allow = ['fire retardant coating','Cocktail shaker','Scunthorpe parts','shiitake','Dickinson','bass speaker','class 3 hitch','assemble','Niger delta','spice rack','raccoon cover','cumulative','hitch','Japanese import','JDM Civic','shift knob','grasshopper','Ek Civic coilovers','redline riley','rusted out Chrysler','boost brandon','weekend wrench','Hancock','Peacock','Cockburn','Essex','passenger seat','dickies jacket','analog gauges','Spokane','title in hand','classic','compass','circumstance','brass fittings','con rod','connecting rods'];
let bad=0;
for (const t of block) if (!hasSlur(t) && !hasProfanity(t)) { bad++; console.log('MISSED', t); }
for (const t of allow) if (hasSlur(t) || hasProfanity(t)) { bad++; console.log('FALSE HIT', t, hasSlur(t)?'slur':'profanity'); }
console.log('problems', bad);
