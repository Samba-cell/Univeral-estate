const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
let currentUser = null;
let authMode = 'login';
const money = (amount, currency) => {
  try { return new Intl.NumberFormat('fr-FR',{style:'currency',currency,maximumFractionDigits:0}).format(amount); }
  catch { return `${Number(amount).toLocaleString('fr-FR')} ${currency}`; }
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){ const t=$('#toast'); t.textContent=message; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3200); }
async function api(url, options={}) {
  const response = await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  const data = await response.json().catch(()=>({error:'Réponse invalide du serveur.'}));
  if(!response.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}
function openModal(id){ $('#'+id).hidden=false; document.body.style.overflow='hidden'; }
function closeModal(id){ $('#'+id).hidden=true; document.body.style.overflow=''; }
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
$$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
document.addEventListener('keydown',e=>{if(e.key==='Escape') $$('.modal-backdrop').forEach(m=>closeModal(m.id));});
function setAuthMode(mode){authMode=mode;$('#authTitle').textContent=mode==='login'?'Connectez-vous':'Créez votre compte';$('#authSubmit').textContent=mode==='login'?'Se connecter':'Créer mon compte';$('#tabLogin').classList.toggle('active',mode==='login');$('#tabRegister').classList.toggle('active',mode==='register');$('#nameField').hidden=mode==='login';$('#authForm [name="name"]').required=mode==='register';$('#authForm [name="password"]').autocomplete=mode==='login'?'current-password':'new-password';$('#authMessage').textContent='';}
$('#loginOpen').addEventListener('click',()=>{setAuthMode('login');openModal('authModal')});
$('#postOpen').addEventListener('click',startListing);$('#postOpen2').addEventListener('click',startListing);
$('#tabLogin').addEventListener('click',()=>setAuthMode('login'));$('#tabRegister').addEventListener('click',()=>setAuthMode('register'));
async function refreshUser(){try{currentUser=(await api('/api/me')).user;}catch{currentUser=null} updateAuthButton();}
function updateAuthButton(){const b=$('#loginOpen');if(currentUser){b.textContent=currentUser.name.split(' ')[0];b.title=`Connecté : ${currentUser.email}`;}else{b.textContent='Connexion';b.title='Se connecter';}}
async function startListing(){if(!currentUser){setAuthMode('register');openModal('authModal');toast('Créez un compte ou connectez-vous pour publier.');return;}openModal('listingModal');}
$('#authForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());const message=$('#authMessage');message.textContent='';try{const result=await api(authMode==='login'?'/api/login':'/api/register',{method:'POST',body:JSON.stringify(body)});currentUser=result.user;updateAuthButton();closeModal('authModal');e.currentTarget.reset();toast(`Bienvenue, ${currentUser.name} !`);}catch(err){message.textContent=err.message;}});
$('#loginOpen').addEventListener('contextmenu',async e=>{if(!currentUser)return;e.preventDefault();if(confirm('Voulez-vous vous déconnecter ?')){try{await api('/api/logout',{method:'POST',body:'{}'});currentUser=null;updateAuthButton();toast('Vous êtes déconnecté.');}catch(err){toast(err.message)}}});
function propertyCard(p){const verified=p.verification_status==='verified';const img=p.image_path || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80';const image=String(img).startsWith('https://')?esc(img):'/'+esc(img).replace(/^\//,'');return `<article class="property-card"><div class="property-photo"><img loading="lazy" src="${image}" alt="Photo du bien : ${esc(p.title)}" onerror="this.src='https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80'"><span class="badge ${verified?'':'pending'}">${verified?'✓ Bien vérifié':'◷ En cours de vérification'}</span></div><div class="property-info"><div class="property-place">${esc(p.city)}, ${esc(p.country)} · ${esc(p.listing_type||'Vente')}</div><h3>${esc(p.title)}</h3><div class="property-meta"><span>⌂ ${esc(p.property_type)}</span><span>▧ ${Number(p.area||0)>0?esc(p.area)+' m²':'Surface non précisée'}</span><span>▦ ${Number(p.bedrooms||0)} ch.</span></div><div class="property-price"><strong>${money(Number(p.price),p.currency||'EUR')}</strong><span>Publié par ${esc(p.seller_name||'membre')}</span></div></div></article>`;}
async function loadProperties(){const q=$('#searchQ').value.trim();const type=$('#searchType').value;const max=$('#searchMax').value;const params=new URLSearchParams();if(q)params.set('q',q);if(type)params.set('type',type);if(max)params.set('max',max);const grid=$('#propertyGrid');grid.innerHTML='<div class="loading-card">Recherche des propriétés…</div>';try{const {properties}=await api('/api/properties?'+params.toString());$('#listingCount').textContent=`${properties.length} bien${properties.length>1?'s':''} trouvé${properties.length>1?'s':''}`;grid.innerHTML=properties.length?properties.map(propertyCard).join(''):'<div class="empty-state">Aucun bien ne correspond à ces critères. Essayez une autre recherche.</div>'; }catch(err){grid.innerHTML=`<div class="empty-state">Impossible de charger les annonces : ${esc(err.message)}</div>`;}}
$('#searchForm').addEventListener('submit',e=>{e.preventDefault();loadProperties();$('#annonces').scrollIntoView({behavior:'smooth'});});
$('#resetSearch').addEventListener('click',()=>{$('#searchQ').value='';$('#searchType').value='';$('#searchMax').value='';loadProperties();});
$('#listingForm').addEventListener('submit',async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget).entries());body.price=Number(body.price);body.area=Number(body.area);body.bedrooms=Number(body.bedrooms);const msg=$('#listingMessage');msg.textContent='Envoi en cours…';try{const result=await api('/api/properties',{method:'POST',body:JSON.stringify(body)});msg.textContent=result.message;e.currentTarget.reset();toast('Annonce envoyée pour modération.');setTimeout(()=>{closeModal('listingModal');loadProperties();},1500);}catch(err){msg.textContent=err.message;}});
$('#menuToggle').addEventListener('click',()=>$('.topbar nav').classList.toggle('open'));
refreshUser();loadProperties();
