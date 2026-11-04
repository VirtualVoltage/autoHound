import {json,fail,authorized} from '../../../../lib/shared.js';
export async function onRequestPost({request,env,params}){
  const id=+params.id,a=await authorized(env,id,request);
  if(!a||a.hidden!==2)return fail('This post cannot be published.',403);
  const n=await env.DB.prepare('SELECT COUNT(*) n FROM photos WHERE listing_id=?').bind(id).first();
  if(!n.n)return fail('Add at least one photo.');
  await env.DB.prepare('UPDATE listings SET hidden=0 WHERE id=?').bind(id).run();
  return json({ok:true});
}
