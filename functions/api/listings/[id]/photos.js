import {json,fail,authorized,LIMITS} from '../../../../lib/shared.js';
export async function onRequestPost({request,env,params}){
  const id=+params.id,a=await authorized(env,id,request);
  if(!a||a.hidden!==2)return fail('This post can no longer take photos.',403);
  const buf=await request.arrayBuffer(),b=new Uint8Array(buf);
  if(buf.byteLength>LIMITS.photoBytes)return fail('That photo is too large.',413);
  if(buf.byteLength<100||b[0]!==0xFF||b[1]!==0xD8||b[2]!==0xFF)return fail('Photos must be images.',415);
  const n=await env.DB.prepare('SELECT COUNT(*) n FROM photos WHERE listing_id=?').bind(id).first();
  if(n.n>=LIMITS.photos)return fail('Too many photos.',409);
  const r=await env.DB.prepare('INSERT INTO photos(listing_id,bytes) VALUES(?,?)').bind(id,buf).run();
  return json({url:`/api/photos/${r.meta.last_row_id}`});
}
