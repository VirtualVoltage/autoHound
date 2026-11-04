import {json,fail} from '../../../../lib/shared.js';
export async function onRequestPost({request,env,params}){
  const id=+params.id;let b;try{b=await request.json()}catch{return fail('Could not read that bid.')}
  const amount=Math.round(Number(b&&b.amount));
  if(!Number.isFinite(amount)||amount<1||amount>10000000)return fail('Enter a real amount.');
  const r=await env.DB.prepare('UPDATE listings SET price=?,bids=bids+1 WHERE id=? AND hidden=0 AND ends>? AND price<?').bind(amount,id,Date.now(),amount).run();
  if(!r.meta.changes)return fail('Someone bid higher, or this auction has ended. Refresh to see the latest.',409);
  return json({price:amount});
}
