export async function onRequestGet({env,params}){
  const r=await env.DB.prepare('SELECT p.bytes FROM photos p JOIN listings l ON l.id=p.listing_id WHERE p.id=? AND l.hidden=0').bind(+params.id).first();
  if(!r)return new Response('Not found',{status:404});
  return new Response(new Uint8Array(r.bytes),{headers:{'content-type':'image/jpeg','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'}});
}
