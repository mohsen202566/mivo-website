/* MIVO public content integration. Public publishable key only; RLS enforced by Supabase. */
(()=>{'use strict';
const API='https://asdjxmztjlesrbwazczv.supabase.co/rest/v1/';
const KEY='sb_publishable_sT9ibl-gFG3Fcv98zDliRA_4n_lsYMx';
const $=id=>document.getElementById(id);
const reported=new Map();
function report(code){
  const now=Date.now();if(now-(reported.get(code)||0)<3600000)return;
  reported.set(code,now);
  try{fetch('/api/report-error',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,page:location.pathname}),keepalive:true}).catch(()=>{});}catch{}
}
window.addEventListener('error',e=>{if(e.target&&e.target!==window){if(e.target.tagName==='IMG')report('image');return;}report('runtime')},true);
window.addEventListener('unhandledrejection',()=>report('runtime'));
const safeUrl=(value,allowed)=>{try{const u=new URL(value);return u.protocol==='https:'&&(!allowed||allowed.some(h=>u.hostname===h||u.hostname.endsWith('.'+h)))?u.href:null}catch{return null}};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
async function query(table,params){
 try{const r=await fetch(API+table+'?'+params,{headers:{apikey:KEY,Authorization:'Bearer '+KEY,Accept:'application/json'}});if(!r.ok)throw new Error('Content service '+r.status);return await r.json()}
 catch(e){report(table==='mivo_settings'?'settings_fetch':'content_fetch');throw e}
}
const englishDate=d=>new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'Asia/Tehran'}).format(d);
const englishTime=d=>new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Tehran'}).format(d);
let currentDrop=null, timer=null;
function resetDrop(){currentDrop=null;const p=$('mivoRevealPanel');if(!p)return;p.dataset.revealState='idle';$('dropTitle').textContent='Mystery Drop';$('dropDesc').textContent='Stay tuned for the next MIVO reveal.';$('mivoRevealDate').textContent='—';$('mivoRevealTime').textContent='—';$('countdown').textContent='—';$('mivoRevealRarity').classList.add('hide');$('mivoRevealLink').classList.add('hide');$('mivoRevealedImage').classList.add('hide');$('mivoMysteryStage').classList.remove('hide');clearInterval(timer)}
// The admin stores reveal duration in details.reveal_duration_hours (default: 24).
// An expired reveal is never displayed as the current Coming Soon feature.
const durationMs=d=>{
  const raw=Number(d.details?.reveal_duration_hours ?? d.details?.display_hours ?? 24);
  return (Number.isFinite(raw)&&raw>0?Math.min(raw,8760):24)*3600000;
};
function chooseDrop(drops,now){
  const valid=drops.filter(d=>Number.isFinite(Date.parse(d.starts_at)));
  const upcoming=valid.filter(d=>Date.parse(d.starts_at)>now).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at))[0];
  const active=valid.filter(d=>Date.parse(d.starts_at)<=now&&now<Date.parse(d.starts_at)+durationMs(d))
    .sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at))[0];
  return active||upcoming||null;
}
function applyDrop(d){
  clearInterval(timer);
  resetDrop();
  if(!d)return;
  currentDrop=d;
  const panel=$('mivoRevealPanel'),start=Date.parse(d.starts_at);
  const end=start+durationMs(d);
  const rarity=String(d.details?.rarity||'hidden').toLowerCase();
  if(['common','rare','legendary','mythic'].includes(rarity)){
    const tag=$('mivoRevealRarity');tag.textContent=rarity.toUpperCase();tag.className='mivo-rarity '+rarity;
  }
  $('mivoRevealDate').textContent=englishDate(new Date(start));
  $('mivoRevealTime').textContent=englishTime(new Date(start));
  $('dropDesc').textContent='The next MIVO reveal is approaching.';
  function tick(){
    const now=Date.now(),left=start-now;
    if(now>=end){clearInterval(timer);currentDrop=null;load();return;}
    if(left>0){
      panel.dataset.revealState='scheduled';
      const sec=Math.ceil(left/1000),days=Math.floor(sec/86400),h=Math.floor(sec%86400/3600),m=Math.floor(sec%3600/60),ss=sec%60;
      $('countdown').textContent=`${days}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(ss).padStart(2,'0')}s`;
      return;
    }
    panel.dataset.revealState='revealed';
    $('countdown').textContent='REVEALED';
    $('dropTitle').textContent=d.details?.english_title||'Latest Reveal';
    $('dropDesc').textContent=d.details?.english_description||'Discover the latest MIVO collectible.';
    const img=safeUrl(d.image_url);
    if(img){$('mivoRevealedImage').src=img;$('mivoRevealedImage').classList.remove('hide');$('mivoMysteryStage').classList.add('hide');}
    const link=safeUrl(d.target_url,['opensea.io']);
    if(link){$('mivoRevealLink').href=link;$('mivoRevealLink').classList.remove('hide');}
  }
  tick();
  if(currentDrop)timer=setInterval(tick,1000);
}

// Revealed NFTs appear in the collection even before minting. Mint status is admin-entered,
// not a blockchain verification. Never show unpublished or future artwork.
function renderRevealedCollection(rows){
 const host=$('mivoManagedGallery');if(!host)return;
 host.replaceChildren();const now=Date.now();
 const items=rows.filter(x=>x.kind==='drop'&&Number.isFinite(Date.parse(x.starts_at))&&Date.parse(x.starts_at)<=now&&safeUrl(x.image_url))
  .sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at));
 for(const d of items){
  const tier=String(d.details?.rarity||'common').toLowerCase();const rarity=['common','rare','legendary','mythic'].includes(tier)?tier:'common';
  const card=el('article','mivo-nft-card');card.dataset.tier=rarity;
  const inner=el('div','mivo-nft-card-inner');const img=el('img');img.src=safeUrl(d.image_url);img.alt='MIVO '+rarity+' NFT';img.loading='lazy';inner.append(img);
  const start=Date.parse(d.starts_at);if(now-start<86400000){const mark=el('span','mivo-nft-new','NEW');inner.append(mark)}
  const info=el('div','mivo-nft-card-info');info.append(el('span','mivo-nft-tier',rarity),el('h3','',d.details?.english_title||'MIVO NFT'));
  const minted=d.details?.mint_status==='minted';info.append(el('p','',minted?'Minted (admin-reported)':'Not minted'));
  const desc=d.details?.english_description||d.description;if(desc)info.append(el('p','',desc));
  const link=safeUrl(d.target_url,['opensea.io']);if(link){const a=el('a','pill','VIEW ON OPENSEA ↗');a.href=link;a.target='_blank';a.rel='noopener noreferrer';info.append(a)}
  inner.append(info);card.append(inner);host.append(card);
 }
 if(!items.length)host.append(el('p','muted','Revealed NFTs will appear here after their scheduled reveal.'));
}
function renderTextContent(rows,kind,target){const container=$(target);if(!container)return;container.replaceChildren();const items=rows.filter(x=>x.kind===kind&&(!x.starts_at||new Date(x.starts_at)<=new Date())&&(!x.ends_at||new Date(x.ends_at)>new Date())).slice(0,6);
if(!items.length){if(kind==='promotion'){const empty=el('div','empty','No active promotions have been published.');container.append(empty)}return}
for(const item of items){const card=el('article','mivo-managed-card');card.append(el('h4','',item.details?.english_title||item.title));const desc=item.details?.english_description||item.description;if(desc)card.append(el('p','muted',desc));const url=safeUrl(item.target_url);if(url){const a=el('a','pill','VIEW DETAILS ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';card.append(a)}container.append(card)}}
function renderRoadmap(rows){const items=rows.filter(x=>x.kind==='roadmap').sort((a,b)=>a.sort_order-b.sort_order);if(!items.length)return;const root=$('roadmapCards');if(!root)return;root.replaceChildren();for(const item of items){const card=el('article','panel');card.append(el('h3','',item.details?.english_title||item.title));card.append(el('p','muted',item.details?.english_description||item.description));root.append(card)}}
function renderLinks(rows){const setting=rows.find(x=>x.key==='official_links')?.value||{};const links=[['telegram','Telegram','t.me'],['twitter','X (Twitter)','x.com'],['instagram','Instagram','instagram.com'],['opensea','OpenSea','opensea.io']];const root=$('officialLinks');if(!root)return;root.replaceChildren();for(const [key,name,host] of links){const u=safeUrl(setting[key],[host]);if(!u)continue;const a=el('a','pill',name+' ↗');a.href=u;a.target='_blank';a.rel='noopener noreferrer';root.append(a)}if(!root.children.length)root.append(el('span','status','Official links will appear once configured.'));let footer=document.getElementById('mivoFooterSocial');if(!footer){footer=el('div','mivo-footer-social');footer.id='mivoFooterSocial';document.querySelector('footer')?.append(footer)}footer.replaceChildren();for(const a of root.querySelectorAll('a'))footer.append(a.cloneNode(true))}
async function load(){
 const results=await Promise.allSettled([
   query('mivo_content','select=*&status=eq.published&order=sort_order.asc,created_at.desc'),
   query('mivo_settings','select=key,value&is_public=eq.true')
 ]);
 if(results[0].status==='fulfilled'){
   try{
     const rows=results[0].value;
     const drops=rows.filter(x=>x.kind==='drop'&&x.starts_at);
     const chosen=chooseDrop(drops,Date.now());
     if(chosen?.id!==currentDrop?.id)applyDrop(chosen);
     else if(!chosen&&currentDrop)resetDrop();
     renderTextContent(rows,'promotion','offersBody');
     renderTextContent(rows,'announcement','announcementsBody');
     renderRoadmap(rows);
     renderRevealedCollection(rows);
     const count=rows.filter(x=>x.kind==='promotion').length;
     if($('offersCount'))$('offersCount').textContent=String(count);
   }catch(e){console.warn('MIVO render:',e);report('render')}
 }else console.warn('MIVO content sync:',results[0].reason);
 if(results[1].status==='fulfilled'){
   try{renderLinks(results[1].value)}catch(e){console.warn('MIVO settings render:',e);report('render')}
 }else console.warn('MIVO settings sync:',results[1].reason);
}
window.addEventListener('DOMContentLoaded',()=>{resetDrop();load();setInterval(load,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()})});
})();
