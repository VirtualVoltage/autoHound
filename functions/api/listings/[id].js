import {json,fail,authorized} from '../../../lib/shared.js';
export async function onRequestDelete({request,env,params}){
  const id=+params.id;if(!await authorized(env,id,request))return fail('Only the person who posted this can delete it.',403);
  await env.DB.batch([env.DB.prepare('DELETE FROM photos WHERE listing_id=?').bind(id),env.DB.prepare('DELETE FROM flags WHERE listing_id=?').bind(id),env.DB.prepare('DELETE FROM listings WHERE id=?').bind(id)]);
  return json({ok:true});
}
