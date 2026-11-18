/* Cloudflare Pages Function: server-only OpenSea API key, one-hour edge cache. */
const CONTRACT='0x836180e2d9b0a359bbd78381febc57d45d5e857b';
const BASE='https://api.opensea.io/api/v2';
const slug='mivo-nft';
const headers={'Accept':'application/json'};
async function get(path,key){const r=await fetch(BASE+path,{headers:{...headers,'X-API-KEY':key}});if(!r.ok)throw new Error('OpenSea '+r.status);return r.json()}
function compactOrder(order){const p=order?.price?.current||order?.price;return p?{token_id:String(order?.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria??order?.token_id??order?.asset?.token_id??''),price:String(p.value??p),currency:p.currency||'WETH',decimals:Number(p.decimals??18),url:order?.order_hash?`https://opensea.io/collection/${slug}`:null}:null}
export async function onRequestGet({request,env}){
 if(!env.OPENSEA_API_KEY)return Response.json({error:'OpenSea API key is not configured'},{status:503});
 const u=new URL(request.url);const cursor=u.searchParams.get('next')||'';
 if(cursor.length>512)return Response.json({error:'Invalid cursor'},{status:400});
 const cache=caches.default;const cacheKey=new Request(u.origin+u.pathname+'?next='+encodeURIComponent(cursor));
 const cached=await cache.match(cacheKey);if(cached)return cached;
 try{
  const qp=new URLSearchParams({limit:'50'});if(cursor)qp.set('next',cursor);
  const nfts=await get(`/chain/polygon/contract/${CONTRACT}/nfts?${qp}`,env.OPENSEA_API_KEY);
  // These are best-effort enrichment calls. NFT discovery must work even when market endpoints are unavailable.
  const [listingResult,mintResult]=await Promise.allSettled([
   get(`/listings/collection/${slug}/all?limit=100`,env.OPENSEA_API_KEY),
   get(`/events/chain/polygon/contract/${CONTRACT}?event_type=mint&limit=100`,env.OPENSEA_API_KEY)
  ]);
  const listingMap={};if(listingResult.status==='fulfilled')for(const l of listingResult.value.listings||[]){const x=compactOrder(l);if(x?.token_id)listingMap[x.token_id]=x}
  const mintMap={};if(mintResult.status==='fulfilled')for(const e of mintResult.value.asset_events||[]){const id=String(e.nft?.identifier??e.nft?.token_id??'');const ts=e.event_timestamp||e.created_date;if(id&&ts&&(!mintMap[id]||Date.parse(ts)<Date.parse(mintMap[id])))mintMap[id]=ts}
  const items=(nfts.nfts||[]).map(n=>{const id=String(n.identifier??n.token_id??'');return {id,name:n.name||`MIVO #${id.padStart(4,'0')}`,description:n.description||'',image:n.display_image_url||n.image_url||'',traits:n.traits||[],owner:n.owner||null,minted_at:n.minted_at||mintMap[id]||null,listing:listingMap[id]||null,url:`https://opensea.io/assets/matic/${CONTRACT}/${encodeURIComponent(id)}`}}).filter(n=>/^\d+$/.test(n.id));
  const res=Response.json({contract:CONTRACT,updated_at:new Date().toISOString(),items,next:nfts.next||null,market_data_available:listingResult.status==='fulfilled',mint_events_available:mintResult.status==='fulfilled'});
  res.headers.set('Cache-Control','public,max-age=300,s-maxage=3600');await cache.put(cacheKey,res.clone());return res;
 }catch(e){return Response.json({error:'Unable to retrieve OpenSea collection data',detail:String(e.message||e)},{status:502,headers:{'Cache-Control':'no-store'}})}
}
