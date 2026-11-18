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
function resetDrop(){currentDrop=null;const p=$('mivoRevealPanel');if(!p)return;p.dataset.revealState='idle';$('dropTitle').textContent='Mystery Drop';$('dropDesc').textContent='Stay tuned for the next MIVO reveal.';$('mivoRevealDate').textContent='—';$('mivoRevealTime').textContent='—';$('countdown').textContent='—';$('mivoRevealRarity').classList.add('hide');$('mivoRevealLink').classList.add('hide');$('mivoRevealedImage').classList.add('hide');$('mivoMysteryStage').classList.remove('hide');$('mivoComingHeading')?.classList.add('mivo-inactive');clearInterval(timer)}
// The admin stores reveal duration in details.reveal_duration_hours (default: 24).
// An expired reveal is never displayed as the current Coming Soon feature.
const durationMs=d=>{
  const raw=Number(d.details?.reveal_duration_hours ?? d.details?.display_hours ?? 24);
  return (Number.isFinite(raw)&&raw>0?Math.min(raw,8760):24)*3600000;
};
function chooseDrop(drops,now){
  const valid=drops.filter(d=>Number.isFinite(Date.parse(d.starts_at)));
  const upcoming=valid.filter(d=>Date.parse(d.starts_at)>now).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at))[0];
  const active=valid.filter(d=>Date.parse(d.starts_at)<=now)
    .sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at))[0];
  return active||upcoming||null;
}
function applyDrop(d){
  clearInterval(timer);
  resetDrop();
  if(!d)return;
  currentDrop=d;$('mivoComingHeading')?.classList.remove('mivo-inactive');
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
function renderTextContent(rows,kind,target){const container=$(target);if(!container)return;container.replaceChildren();const items=rows.filter(x=>x.kind===kind&&(!x.starts_at||new Date(x.starts_at)<=new Date())&&(!x.ends_at||new Date(x.ends_at)>new Date())).slice(0,6);
if(!items.length){if(kind==='promotion'){const empty=el('div','empty','No active promotions have been published.');container.append(empty)}return}
for(const item of items){const card=el('article','mivo-managed-card');card.append(el('h4','',item.details?.english_title||'MIVO Update'));const desc=item.details?.english_description||'';if(desc)card.append(el('p','muted',desc));const url=safeUrl(item.target_url);if(url){const a=el('a','pill','VIEW DETAILS ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';card.append(a)}container.append(card)}}

function renderAds(rows){let root=$('mivoAdvertisements');if(!root)return;root.replaceChildren();const now=Date.now();const ads=rows.filter(x=>x.kind==='advertisement'&&(!x.starts_at||Date.parse(x.starts_at)<=now)&&(!x.ends_at||Date.parse(x.ends_at)>now));for(const d of ads){const card=el('article','mivo-ad-card');const img=safeUrl(d.image_url);if(img){const pic=el('img','mivo-ad-image');pic.src=img;pic.alt=d.details?.english_title||'MIVO advertisement';pic.loading='lazy';card.append(pic)}card.append(el('h3','',d.details?.english_title||'MIVO Promotion'));if(d.details?.english_description)card.append(el('p','',d.details.english_description));const url=safeUrl(d.target_url);if(url){const link=el('a','pill',d.details?.button_text||'LEARN MORE ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer sponsored';card.append(link)}root.append(card)}root.closest('section')?.classList.toggle('hide',!ads.length)}
function renderRoadmap(rows){const items=rows.filter(x=>x.kind==='roadmap').sort((a,b)=>a.sort_order-b.sort_order);if(!items.length)return;const root=$('roadmapCards');if(!root)return;root.replaceChildren();for(const item of items){const card=el('article','panel');card.append(el('h3','',item.details?.english_title||'MIVO Update'));card.append(el('p','muted',item.details?.english_description||''));root.append(card)}}
function renderLinks(rows){
 const setting=rows.find(x=>x.key==='official_links')?.value||{};
 const services=[['telegram','Telegram',['t.me','telegram.me'],'telegram'],['twitter','X',['x.com','twitter.com'],'x'],['instagram','Instagram',['instagram.com'],'instagram'],['opensea','OpenSea',['opensea.io'],'opensea'],['youtube','YouTube',['youtube.com','youtu.be'],'youtube'],['discord','Discord',['discord.gg','discord.com'],'discord'],['tiktok','TikTok',['tiktok.com'],'tiktok'],['facebook','Facebook',['facebook.com','fb.com'],'facebook'],['github','GitHub',['github.com'],'github'],['linkedin','LinkedIn',['linkedin.com'],'linkedin'],['twitch','Twitch',['twitch.tv'],'twitch'],['threads','Threads',['threads.net'],'threads'],['reddit','Reddit',['reddit.com'],'reddit'],['pinterest','Pinterest',['pinterest.com'],'pinterest'],['medium','Medium',['medium.com'],'medium'],['website','Website',null,'globe']];
 const root=$('officialLinks');if(!root)return;root.replaceChildren();for(const [key,name,hosts,icon] of services){const u=safeUrl(setting[key],hosts);if(!u)continue;const a=el('a','pill mivo-social-link');a.href=u;a.target='_blank';a.rel='noopener noreferrer';const img=el('img','mivo-social-icon');img.src='/assets/social/'+icon+'.svg';img.alt='';img.loading='lazy';a.append(img,document.createTextNode(name));root.append(a)}if(!root.children.length)root.append(el('span','status','Official links will appear once configured.'));let footer=$('mivoFooterSocial');if(!footer){footer=el('div','mivo-footer-social');footer.id='mivoFooterSocial';document.querySelector('footer')?.append(footer)}footer.replaceChildren();for(const a of root.querySelectorAll('a'))footer.append(a.cloneNode(true))}

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
     renderTextContent(rows,'announcement','announcementsBody');renderAds(rows);
     renderRoadmap(rows);
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
