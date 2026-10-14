/* ASCENSION V3 — pure data engine. No network, no DOM. */
(function(root){'use strict';
const KEY='ascension-v3', LEGACY='ascension-v1', BACKUP='ascension-v3-recovery';
const cats=['Sport','Lecture','Méditation','Famille','Travail'];
const dateOK=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const clone=x=>JSON.parse(JSON.stringify(x));
const active=(q,d)=>(!q.created||q.created<=d)&&(!q.archivedOn||d<q.archivedOn);
function validate(s){
 if(!s||typeof s!=='object'||Array.isArray(s)||!Array.isArray(s.quests)||!s.logs||typeof s.logs!=='object'||Array.isArray(s.logs))throw Error('Structure de sauvegarde invalide');
 if(s.version>3)throw Error('Cette sauvegarde provient d’une version plus récente');
 const ids=new Set();for(const q of s.quests){if(!q||typeof q.id!=='string'||!q.id||['__proto__','constructor','prototype'].includes(q.id)||ids.has(q.id)||typeof q.title!=='string'||!cats.includes(q.category)||!Number.isFinite(q.xp)||q.xp<=0||(q.created&&!dateOK(q.created))||(q.archivedOn&&!dateOK(q.archivedOn)))throw Error('Quête invalide ou identifiant en double');ids.add(q.id)}
 for(const [d,log] of Object.entries(s.logs)){if(!dateOK(d)||!log||typeof log!=='object'||Array.isArray(log)||Object.entries(log).some(([id,v])=>['__proto__','constructor','prototype'].includes(id)||typeof v!=='boolean'))throw Error('Historique invalide')}
 if(s.profile?.avatar&&!['guardian','mage','ranger'].includes(s.profile.avatar))throw Error('Classe inconnue');
 if(s.profile&&(typeof s.profile!=='object'||Array.isArray(s.profile)))throw Error('Profil invalide');
 if(s.events!==undefined){if(!s.events||typeof s.events!=='object'||Array.isArray(s.events))throw Error('Événements invalides');for(const [d,events] of Object.entries(s.events)){if(!dateOK(d)||!events||typeof events!=='object'||Array.isArray(events))throw Error('Événements invalides');for(const e of Object.values(events)){if(!e||!Number.isFinite(e.xp)||e.xp<=0||!cats.includes(e.category)||typeof e.title!=='string')throw Error('Événement invalide')}}}
 if(s.dayMeta!==undefined){if(!s.dayMeta||typeof s.dayMeta!=='object'||Array.isArray(s.dayMeta))throw Error('Calendrier invalide');for(const [d,m] of Object.entries(s.dayMeta)){if(!dateOK(d)||!m||!Array.isArray(m.ids)||m.ids.some(id=>typeof id!=='string'||!ids.has(id))||new Set(m.ids).size!==m.ids.length)throw Error('Calendrier invalide')}}
 if(s.restDays!==undefined&&(!Array.isArray(s.restDays)||s.restDays.some(d=>!dateOK(d))))throw Error('Repos invalide');
 if(s.unlocked!==undefined&&(!s.unlocked||typeof s.unlocked!=='object'||Array.isArray(s.unlocked)))throw Error('Succès invalides');
 return s;
}
function migrate(input){validate(input);let s=clone(input);s.version=3;s.profile??={};s.events??={};s.dayMeta??={};s.restDays??=[];s.unlocked??={};
 for(const [d,log] of Object.entries(s.logs)){s.events[d]??={};s.dayMeta[d]??={ids:s.quests.filter(q=>active(q,d)).map(q=>q.id)};for(const q of s.quests){if(log[q.id]&&!s.events[d][q.id])s.events[d][q.id]={xp:q.xp,category:q.category,title:q.title}}}
 return s;
}
const allFor=(s,d)=>s.quests.filter(q=>active(q,d));
const expected=(s,d)=>s.dayMeta[d]?.ids??allFor(s,d).map(q=>q.id);
const complete=(s,d)=>{const ids=expected(s,d);return ids.length>0&&ids.every(id=>s.logs[d]?.[id])};
function totals(s){let xp=0,rp=0,count=0;for(const [d,log] of Object.entries(s.logs)){for(const q of s.quests){if(log[q.id]){xp+=s.events[d]?.[q.id]?.xp??q.xp;count++;if(expected(s,d).includes(q.id))rp+=10}}if(complete(s,d))rp+=25}return {xp,rp,count}}
function toggle(s,id,d){const q=allFor(s,d).find(q=>q.id===id);if(!q)throw Error('Quête inactive');s.logs[d]??={};s.events[d]??={};s.dayMeta[d]??={ids:allFor(s,d).map(q=>q.id)};s.logs[d][id]=!s.logs[d][id];if(s.logs[d][id])s.events[d][id]??={xp:q.xp,category:q.category,title:q.title};return s.logs[d][id]}
function load(storage,initial){const raw=storage.getItem(KEY),old=storage.getItem(LEGACY);if(raw!==null)return migrate(JSON.parse(raw));if(old!==null){const s=migrate(JSON.parse(old));storage.setItem(BACKUP,old);storage.setItem(KEY,JSON.stringify(s));return s}return migrate(initial())}
function commit(storage,s){validate(s);storage.setItem(KEY,JSON.stringify(s))}
function replace(storage,s){const next=migrate(s);const old=storage.getItem(KEY);if(old!==null)storage.setItem(BACKUP,old);commit(storage,next);return next}
const tiers=['Fer','Bronze','Argent','Or','Platine','Émeraude','Diamant','Maître','Grand maître','Challenger'];
function rank(rp){const step=Math.min(33,Math.floor(rp/100)),tier=Math.floor(step/4);return {step,name:tier<7?tiers[tier]+' '+['IV','III','II','I'][step%4]:tiers[Math.min(9,7+Math.floor((step-28)/2))],stage:tier<7?Math.min(5,1+Math.floor(tier/2)):5}}
const api={KEY,LEGACY,BACKUP,cats,dateOK,clone,active,validate,migrate,allFor,expected,complete,totals,toggle,load,commit,replace,rank};if(typeof module!=='undefined')module.exports=api;root.Ascension=api;
})(typeof globalThis!=='undefined'?globalThis:this);
