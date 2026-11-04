export const CITIES=['Lynden','Everson','Sumas','Ferndale','Blaine','Bellingham','Burlington','Mount Vernon','Anacortes','Arlington','Marysville','Everett'];
const CATS=['Audio','Brakes','Drivetrain','Electrical','Engine','Exterior','Interior','Lighting','Maintenance','Suspension','Wheels & Tires','Parts Car','Beater','Daily','Weekend','Built'];
const CONDS=['New','Like new','Good','Fair','Parts only'];
const HANDOFFS=['Meet up or pick up','Pick up only','Test drive by appointment','Bring a trailer'];
export const LIMITS={postsPerHour:5,totalPosts:500,photos:8,photoBytes:600*1024,flagsToHide:3,auctionMs:72*3600e3};
export const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export const fail=(m,status=400)=>json({error:m},status);
export async function ipHash(request){
  const ip=request.headers.get('cf-connecting-ip')||'local';
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('autohound:'+ip));
  return [...new Uint8Array(b)].slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('');
}
const str=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const int=(v,lo,hi)=>{const n=Math.round(Number(v));return Number.isFinite(n)&&n>=lo&&n<=hi?n:null};
/* Returns {listing} with only known fields, or {error}. */
export function cleanListing(b){
  const kind=b.kind==='cars'?'cars':'parts',title=str(b.title,70),d=str(b.d,1500),sellerName=str(b.sellerName,24);
  const price=int(b.price,1,10000000),emv=int(b.emv,1,20000000)||price;
  if(title.length<4)return{error:'Add a title.'};
  if(d.length<10)return{error:'Add a short description.'};
  if(sellerName.length<2)return{error:'Add your name or handle.'};
  if(!price)return{error:'Add a price between $1 and $10,000,000.'};
  if(!CATS.includes(b.cat)||!CITIES.includes(b.city)||!CONDS.includes(b.cond)||!HANDOFFS.includes(b.meetup))return{error:'Pick a category, city, condition and handoff from the lists.'};
  const l={kind,title,d,sellerName,emv,noEmv:!!b.noEmv,cat:b.cat,city:b.city,cond:b.cond,meetup:b.meetup,fit:str(b.fit,60)||'Universal',auction:b.auction?72:0};
  if(kind==='cars'){
    const year=int(b.year,1900,2100),miles=int(b.miles,0,5000000);
    if(!year||miles===null)return{error:'Add the year and miles.'};
    Object.assign(l,{year,miles,titleS:['Clean','Rebuilt','Salvage'].includes(b.titleS)?b.titleS:'Clean'});
  }
  return{listing:l,price};
}
export async function authorized(env,id,request){
  const t=request.headers.get('x-post-token')||'';
  const r=await env.DB.prepare('SELECT id,hidden FROM listings WHERE id=? AND token=?').bind(id,t).first();
  return r;
}
