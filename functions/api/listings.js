import {json,fail,ipHash,cleanListing,LIMITS} from '../../lib/shared.js';
export async function onRequestGet({env}){
  const rows=(await env.DB.prepare('SELECT id,data,created,price,ends,bids FROM listings WHERE hidden=0 ORDER BY id DESC LIMIT 200').all()).results;
  const photos=(await env.DB.prepare('SELECT p.id,p.listing_id FROM photos p JOIN listings l ON l.id=p.listing_id WHERE l.hidden=0 ORDER BY p.id').all()).results;
  const byL={};for(const p of photos)(byL[p.listing_id]=byL[p.listing_id]||[]).push(`/api/photos/${p.id}`);
  return json({listings:rows.map(r=>({...JSON.parse(r.data),rid:r.id,created:r.created,price:r.price,ends:r.ends,bids:r.bids,photos:byL[r.id]||[]}))});
}
export async function onRequestPost({request,env}){
  if(+request.headers.get('content-length')>20000)return fail('That post is too long.',413);
  let b;try{b=await request.json()}catch{return fail('Could not read that post.')}
  const c=cleanListing(b||{});if(c.error)return fail(c.error);
  const ip=await ipHash(request),now=Date.now();
  const mine=await env.DB.prepare('SELECT COUNT(*) n FROM listings WHERE ip=? AND created>?').bind(ip,now-3600e3).first();
  if(mine.n>=LIMITS.postsPerHour)return fail(`You can post ${LIMITS.postsPerHour} times an hour. Try again later.`,429);
  const all=await env.DB.prepare('SELECT COUNT(*) n FROM listings WHERE hidden=0').first();
  if(all.n>=LIMITS.totalPosts)return fail('The demo is full right now.',409);
  const token=crypto.randomUUID(),ends=c.listing.auction?now+LIMITS.auctionMs:null;
  const r=await env.DB.prepare('INSERT INTO listings(data,created,price,ends,hidden,token,ip) VALUES(?,?,?,?,2,?,?)').bind(JSON.stringify(c.listing),now,c.price,ends,token,ip).run();
  return json({rid:r.meta.last_row_id,token,ends,created:now});
}
