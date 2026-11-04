import {json,ipHash,LIMITS} from '../../../../lib/shared.js';
export async function onRequestPost({request,env,params}){
  const id=+params.id,ip=await ipHash(request);
  await env.DB.prepare('INSERT OR IGNORE INTO flags(listing_id,ip) SELECT id,? FROM listings WHERE id=? AND hidden=0').bind(ip,id).run();
  await env.DB.prepare('UPDATE listings SET hidden=1 WHERE id=? AND hidden=0 AND (SELECT COUNT(*) FROM flags WHERE listing_id=?)>=?').bind(id,id,LIMITS.flagsToHide).run();
  return json({ok:true});
}
