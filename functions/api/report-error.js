// Cloudflare Pages Function: restricted, best-effort browser error telemetry.
// Required secret: SUPABASE_SERVICE_ROLE_KEY; variable: SUPABASE_URL.
const EVENTS={content_fetch:'خطا در دریافت محتوای سایت',settings_fetch:'خطا در دریافت تنظیمات عمومی',render:'خطا در نمایش محتوای سایت',runtime:'خطای JavaScript سایت',image:'خطا در بارگذاری تصویر سایت'};
export async function onRequestPost({request,env}){
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 const fail=(status)=>new Response(JSON.stringify({ok:false}),{status,headers});
 const origin=request.headers.get('Origin');
 if(origin && new URL(origin).hostname!==new URL(request.url).hostname)return fail(403);
 if(Number(request.headers.get('content-length')||0)>1024)return fail(413);
 let payload;try{payload=await request.json()}catch{return fail(400)}
 const code=payload?.code;
 if(typeof code!=='string'||!Object.hasOwn(EVENTS,code))return fail(400);
 if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)return fail(503);
 // Limit repeats using Cloudflare edge cache (best effort, not a security boundary).
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 const salt=env.ALERT_RATE_SALT||env.SUPABASE_SERVICE_ROLE_KEY.slice(0,12);
 const hashBytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+salt+code));
 const hash=Array.from(new Uint8Array(hashBytes)).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);
 const cache=globalThis.caches?.default;
 const cacheKey=new Request(new URL('/__mivo_alert_limit/'+hash,request.url).toString());
 if(cache && await cache.match(cacheKey))return new Response(JSON.stringify({ok:true,limited:true}),{headers});
 const page=typeof payload.page==='string'&&/^\/[a-zA-Z0-9/_-]{0,100}$/.test(payload.page)?payload.page:'/';
 try{
  const endpoint=new URL('/rest/v1/mivo_alerts',env.SUPABASE_URL);
  const response=await fetch(endpoint.toString(),{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({source:'سایت عمومی MIVO',severity:'error',message:EVENTS[code],details:{code,page}})});
  if(!response.ok)return fail(502);
  if(cache)await cache.put(cacheKey,new Response('1',{headers:{'Cache-Control':'public,max-age=3600'}}));
  return new Response(JSON.stringify({ok:true}),{headers});
 }catch{return fail(502)}
}
