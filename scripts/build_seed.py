"""Builds the five demo accounts as normal accounts. Run from the repo root: python3 scripts/build_seed.py <folder of source photos> """
import hashlib, json, os, re, secrets, shutil, sys
from PIL import Image
SRC = sys.argv[1]
SEED_DIR = 'site/seed'
shutil.rmtree(SEED_DIR, ignore_errors=True)
MSG_TEMPLATE = ['attachments', 'id', 'sent', 'text']
ACCOUNTS = [
 dict(username='redline_riley', password='boost4life', day='26.09.12', pic='car-gr86', listings=[
  dict(t='Bronze 5 spoke wheels, 18x9.5 +38, set of 4', k='parts', c='Wheels & Tires', city='Blaine', p=1150, mv=1400, cond='Like new', fits='5x114.3 hubs, including 3000GT VR-4 and Evo', d='Takeoff set from my old car. No curb rash, one small touch up on the inner barrel. Can bring them to you if you are close.', img=['wheels-bronze','x-wheels']),
  dict(t='Drop in panel filter, washed and oiled', k='parts', c='Engine', city='Lynden', p=38, mv=55, cond='Good', fits='Universal panel', d='Pulled during an intake swap with about 3k miles of use. Cleaned and oiled last week.', img=['intake-filter']),
  dict(t='Blue spike lug nuts, 20 piece', k='parts', c='Wheels & Tires', city='Lynden', p=38, mv=35, cond='New', fits='M12x1.5', d='Bought the wrong thread pitch for my car. Never installed, still have the key.', img=['lugnuts-spike','x-lugmix']),
  dict(t='Vintage mesh wheels, set of 4', k='parts', c='Wheels & Tires', city='Lynden', p=520, mv=700, cond='Good', fits='Check bolt pattern with me', d='Old school mesh set that cleaned up really well. Normal wear on the lips, center caps included.', img=['mesh-wheel'], auction=True),
  dict(t='2018 Accent SE, hail and high miles', k='cars', c='Beater', city='Lynden', p=5400, mv=6200, cond='Fair', year=2018, miles=164000, title='Clean', d='Great commuter that looks rough up close. Hail on the hood and roof, cold AC, maintenance records in the glovebox.', img=['car-accent'], handoff='Test drive by appointment'),
 ]),
 dict(username='k_turbo_kate', password='spool2fast', day='26.09.18', pic='coilover-red', listings=[
  dict(t='Red adjustable coilover set, rear pair', k='parts', c='Suspension', city='Bellingham', p=410, mv=620, cond='Good', fits='Custom eyelet mounts, measure first', d='About 12k miles of street use. No leaks and the collars still spin freely. Local pickup after the auction ends.', img=['coilover-red'], auction=True),
  dict(t='Orange collar coilovers, front pair', k='parts', c='Suspension', city='Bellingham', p=460, mv=520, cond='Good', fits='Evo VIII and IX', d='Came off my Evo when I went to a bigger setup. Freshly cleaned, spring rates on request.', img=['x-coil','coilover-orange']),
  dict(t='Iridium plugs, 7 heat range, set of 4', k='parts', c='Engine', city='Bellingham', p=34, mv=40, cond='New', fits='Boosted 4G63 and 6G72', d='Extra set from my last tune. Gapped for boost and still in the sleeve.', img=['plugs','plug-black']),
  dict(t='Stainless intake valves, pair', k='parts', c='Engine', city='Bellingham', p=38, mv=48, cond='New', fits='4G63', d='Spares from a head build I finished. Never installed, no marks on the stems.', img=['x-valve2']),
  dict(t='2020 Civic Si Coupe, stage 1', k='cars', c='Weekend', city='Bellingham', p=21900, mv=22500, cond='Excellent', year=2020, miles=41200, title='Clean', d='Stage 1 flash with upgraded intercooler and lowering springs. Daily driven in summer only, never tracked.', img=['car-civic'], handoff='Test drive by appointment'),
 ]),
 dict(username='dsm_dan_everson', password='4g63rocks', day='26.09.27', pic='clutch-disc', listings=[
  dict(t='Heavy duty pressure plate, one owner', k='parts', c='Drivetrain', city='Everson', p=150, mv=175, cond='Good', fits='3000GT VR-4, Stealth TT', d='Pulled during a part-out with about 8k miles on it. Fingers look even and the surface is clean.', img=['pressure-plate']),
  dict(t='Organic street clutch disc, 240mm', k='parts', c='Drivetrain', city='Everson', p=165, mv=190, cond='New', fits='1G and 2G DSM, Evo I to III', d='Unused. Bought for a project that went in a different direction.', img=['clutch-disc','x-disc3']),
  dict(t='Factory 4 channel amplifier', k='parts', c='Audio', city='Everson', p=55, mv=85, cond='Good', fits='Check plug with me', d='Pulled from a part-out and bench tested. Plugs are intact and it still pushes clean sound.', img=['amp']),
  dict(t='Headlight, driver side, clean lens', k='parts', c='Lighting', city='Everson', p=120, mv=140, cond='Good', fits='Toyota Highlander', d='No cracks or fog, all tabs are intact. Bulbs are included if you want them.', img=['headlight-black']),
  dict(t='2020 Kona, engine knock, parts or repair', k='cars', c='Parts Car', city='Everson', p=4100, mv=3900, cond='Parts only', year=2020, miles=72000, title='Clean', d='Rod knock after an oil leak. Body and interior are clean, so it would make a great parts car or engine swap.', img=['car-kona'], handoff='Bring a trailer'),
 ]),
 dict(username='weekend_wrench', password='wrench2026', day='26.10.03', pic='tire-at', listings=[
  dict(t='Chrome open element air cleaner', k='parts', c='Engine', city='Ferndale', p=72, mv=65, cond='Good', fits='V8 carb flange', d='Came off a small block I sold. Chrome is clean and the filter still has plenty of life.', img=['chrome-cleaner']),
  dict(t='Steel ladder rack for a pickup bed', k='parts', c='Exterior', city='Ferndale', p=240, mv=300, cond='Good', fits='Full size pickup', d='Heavy steel rack that I used for lumber. Some scuffs on the paint but no rust through.', img=['truck-rack'], handoff='Pick up only'),
  dict(t='Tan door panel and dash trim set', k='parts', c='Interior', city='Ferndale', p=190, mv=260, cond='Good', fits='Square body trucks', d='Nice original panels with no cracks in the plastic. I switched my truck to a different color.', img=['door-panels'], auction=True),
  dict(t='Chrome center caps, set of 4', k='parts', c='Wheels & Tires', city='Ferndale', p=42, mv=55, cond='Like new', fits='6 lug truck wheels', d='Clean caps with no pitting. Came off wheels I had powder coated.', img=['x-caps']),
  dict(t='2020 CR-V Touring AWD', k='cars', c='Daily', city='Ferndale', p=23800, mv=23500, cond='Good', year=2020, miles=54400, title='Clean', d='Family car that has been dealer serviced since new. Newer tires and no accidents.', img=['car-crv'], handoff='Test drive by appointment'),
 ]),
 dict(username='boost_brandon', password='turbotime1', day='26.10.11', pic='hero-bay', listings=[
  dict(t='Blue and gold track coilovers, 32 way', k='parts', c='Suspension', city='Blaine', p=1180, mv=1050, cond='Like new', fits='Evo and DSM with adapters', d='Fresh rebuild with the sheet included. Priced above market because the rebuild only has 200 miles on it.', img=['coilover-blue']),
  dict(t='Sprung clutch disc, street', k='parts', c='Drivetrain', city='Blaine', p=140, mv=160, cond='New', fits='2G DSM', d='Never installed, still has the alignment tool in the box.', img=['x-disc2']),
  dict(t='LED headlight bulb kit, H11', k='parts', c='Lighting', city='Blaine', p=62, mv=70, cond='New', fits='H11 housings', d='Opened the box and decided to keep my HIDs. Everything is included.', img=['led-kit']),
  dict(t='All terrain tire, 285/70R17, 8/32 left', k='parts', c='Wheels & Tires', city='Blaine', p=135, mv=160, cond='Good', fits='285/70R17', d='One spare tire left from a set of five. Lots of tread and no patches.', img=['tire-at']),
  dict(t='2004 Lancer Evolution VIII, 412 whp', k='cars', c='Built', city='Blaine', p=32500, mv=34000, cond='Excellent', year=2004, miles=88400, title='Clean', d='Forged internals, billet turbo and E85 tune with the dyno sheet in hand. Bronze wheels and track coilovers included.', img=['car-evo'], handoff='Test drive by appointment', auction=True),
 ]),
]
def slug(s, fb='untitled'):
    s = re.sub(r'[^A-Za-z0-9_-]+', '-', s); s = re.sub(r'_{2,}', '_', s); s = re.sub(r'-{2,}', '-', s).strip('-_')
    return (s[:40].rstrip('-_')) or fb
def save_photo(name, dest):
    os.makedirs(os.path.join(SEED_DIR, dest), exist_ok=True)
    im = Image.open(os.path.join(SRC, name + '.webp')).convert('RGB')
    a = im.copy(); a.thumbnail((900, 900), Image.LANCZOS); a.save(os.path.join(SEED_DIR, dest, 'original.jpg'), quality=76, optimize=True)
    b = im.copy(); b.thumbnail((420, 420), Image.LANCZOS); b.save(os.path.join(SEED_DIR, dest, 'thumb.jpg'), quality=68, optimize=True)
    return [dict(path=f'{dest}/original.jpg', asset=f'/seed/{dest}/original.jpg'), dict(path=f'{dest}/thumb.jpg', asset=f'/seed/{dest}/thumb.jpg')]
records, assets = [], []
def rec(path, value): records.append(dict(path=path, text=json.dumps(value, indent=2) + '\n'))
counters = {}
def nid(typ, day):
    k = f'{typ}.{day}'; n = counters.get(k, 0); counters[k] = n + 1; return f'{k}.{n:05d}'
AUCTION_ENDS = {'seed': 1794700800000}  # Nov 2026
for i, ac in enumerate(ACCOUNTS):
    aid = nid('A', ac['day']); folder = f"{aid}__{slug(ac['username'], 'user')}"; rp = f'records/accounts/{folder}'; dp = f'data/accounts/{folder}'
    pid = nid('P', ac['day']); pd = f'{dp}/{pid}__profile'; assets += save_photo(ac['pic'], pd)
    joined = f"20{ac['day'].replace('.', '-')}T18:0{i}:00.000Z"
    rec(f'{rp}/account.json', dict(id=aid, username=ac['username'], joined=joined, status='active', profile_photo=pid))
    key = ac['username'].lower(); proof = hashlib.pbkdf2_hmac('sha256', ac['password'].encode(), ('autohound:' + key).encode(), 100000).hex()
    salt = secrets.token_hex(16)
    rec(f'{rp}/private.json', dict(password=dict(method='browser-pbkdf2-sha256-100000+server-sha256', salt=salt, hash=hashlib.sha256((salt + proof).encode()).hexdigest())))
    rec(f'{rp}/favorites.json', [])
    for j, l in enumerate(ac['listings']):
        day = f"26.10.{min(13 + i * 3 + j * 2, 31):02d}"; created = f"20{day.replace('.', '-')}T{16 + j}:{10 + i}:00.000Z"
        lid = nid('L', day); lf = f"{lid}__{slug(l['t'], 'listing')}"; photos = []
        for k, name in enumerate(l['img']):
            ph = nid('P', day); assets += save_photo(name, f'{dp}/listings/{lf}/{ph}__photo-{k + 1}'); photos.append(ph)
        item = dict(id=lid, account=aid, kind=l['k'], title=l['t'], description=l['d'], price=l['p'], category=l['c'], city=l['city'], condition=l['cond'], handoff=l.get('handoff', 'Meet up or pick up'), fits=l.get('fits') if l['k'] == 'parts' else None, market_value=l['mv'], sell_type='auction' if l.get('auction') else 'post', photos=photos, status='live', created=created, auction_ends=AUCTION_ENDS['seed'] + j * 86400000 if l.get('auction') else None)
        if l['k'] == 'cars': item['car'] = dict(year=l['year'], miles=l['miles'], title_status=l['title'])
        if l.get('auction'): item['bid_template'] = ['account', 'amount', 'sent']
        rec(f'{rp}/listings/{lf}/listing.json', item)
open('server/seed-data.js', 'w').write('// Generated by scripts/build_seed.py. Demo accounts stored exactly like real ones.\nexport const SEED_RECORDS = ' + json.dumps(records) + ';\nexport const SEED_ASSETS = ' + json.dumps(assets) + ';\n')
print(len(records), 'records', len(assets), 'assets')
