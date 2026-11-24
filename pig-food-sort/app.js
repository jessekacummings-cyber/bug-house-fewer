const foods = [
  ['bacon','Bacon','pork'],['apple','Apple','other'],['ham','Ham','pork'],['milk','Milk','other'],
  ['sausage','Pork sausage','pork'],['grapes','Grapes','other'],['chop','Pork chop','pork'],['chicken','Chicken drumstick','other'],
  ['loin','Pork loin','pork'],['bread','Bread','other'],['ribs','Pork ribs','pork'],['carrot','Carrots','other'],
  ['pulled','Pulled pork','pork'],['eggs','Eggs','other'],['hotdog','Pork hot dog','pork'],['cheese','Cheese','other']
].map(([id,name,answer],index)=>({id,name,answer,index}));
const $=id=>document.getElementById(id), board=$('board'), status=$('status'), check=$('check'), progress=$('progress'), dialog=$('settings-dialog');
const zones=Object.fromEntries([...board.querySelectorAll('[data-zone]')].map(el=>[el.dataset.zone,el]));
const containers=Object.fromEntries(Object.entries(zones).map(([zone,el])=>[zone,el.querySelector('.cards')]));
const originalNames=['From a pig','From another source'], inputs=[$('first-name'),$('second-name')];
const getFood=id=>foods.find(f=>f.id===id);
let groupNames=[...originalNames], order=[], places={}, selected=null, reviewed=false, drag=null, suppressClickUntil=0, amount=16;

function shuffleArray(values){const copy=[...values];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
function createCard(food){
  const card=document.createElement('button');card.type='button';card.className='card';card.dataset.id=food.id;
  card.setAttribute('aria-label',food.name);card.setAttribute('aria-pressed','false');
  const image=document.createElement('img');image.src=`food-${food.index+1}.jpg`;image.alt='';image.className='art';image.draggable=false;
  const name=document.createElement('span');name.textContent=food.name;name.className='name';card.append(image,name);return card;
}
const cards=Object.fromEntries(foods.map(f=>[f.id,createCard(f)]));

function render(){
  for(const card of Object.values(cards))if(!order.includes(card.dataset.id))card.remove();
  for(const id of order){const card=cards[id];containers[places[id]].append(card);card.classList.toggle('selected',selected===id);card.setAttribute('aria-pressed',String(selected===id));const show=reviewed&&places[id]!=='tray',match=getFood(id).answer===places[id];card.classList.toggle('correct',show&&match);card.classList.toggle('incorrect',show&&!match)}
  const n=order.filter(id=>places[id]!=='tray').length;progress.textContent=`${n} of ${order.length} sorted`;
  check.disabled=groupNames.some((n,i)=>n!==originalNames[i]);check.textContent=reviewed?'Hide check':'Check';
  requestAnimationFrame(fit);
}
function select(id){selected=selected===id?null:id;render();status.textContent=selected?`Choose a group for this picture.`:'Drag a food or tap it, then tap a group.'}
function move(id,zone){if(!order.includes(id)||!zones[zone])return;places[id]=zone;selected=null;reviewed=false;render();status.textContent=zone==='tray'?'Picture returned. Choose another.':'Why does your food belong there?'}
function newRound(random=true){
  if(random||!order.length){const first=shuffleArray(foods.filter(f=>f.answer==='pork')).slice(0,amount/2);const second=shuffleArray(foods.filter(f=>f.answer==='other')).slice(0,amount/2);order=shuffleArray([...first,...second]).map(f=>f.id)}
  places=Object.fromEntries(order.map(id=>[id,'tray']));selected=null;reviewed=false;render();status.textContent='Drag a food or tap it, then tap a group.';
}
function fit(){
  const narrow=innerWidth<=840, cols=amount===8?3:4, rows=Math.ceil(amount/cols), gap=innerWidth<450?3:Math.max(6,Math.min(10,innerWidth/170));
  const trayCols=cols*2;
  const getWidth=(zone,c)=>(zone.clientWidth-gap*(c-1))/c;
  let cap=Math.min(...Object.entries(containers).map(([key,zone])=>getWidth(zone,narrow&&key==='tray'?trayCols:cols)));
  if(!narrow){const height=Math.min(...Object.values(containers).map(zone=>(zone.clientHeight-parseFloat(getComputedStyle(zone).paddingTop)-gap*(rows-1))/rows));cap=Math.min(cap,height)}
  const tile=Math.max(22,Math.floor(Math.min(cap,narrow?115:172)));
  const st=document.documentElement.style;st.setProperty('--tile',`${tile}px`);st.setProperty('--gap',`${gap}px`);st.setProperty('--columns',String(cols));st.setProperty('--tray-columns',String(trayCols));st.setProperty('--mobile-rows',String(rows));st.setProperty('--label-size',`${Math.max(10,Math.min(17,Math.floor(tile*.15)))}px`);
}

function clearTargets(){for(const zone of Object.values(zones))zone.classList.remove('target')}
function targetAt(event){return document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-zone]')}
board.addEventListener('pointerdown',e=>{
  const card=e.target.closest('.card');if(!card||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0)||drag)return;
  drag={id:card.dataset.id,card,pid:e.pointerId,x:e.clientX,y:e.clientY,ghost:null};card.setPointerCapture(e.pointerId);
});
board.addEventListener('pointermove',e=>{
  if(!drag||drag.pid!==e.pointerId)return;if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7)return;
  if(!drag.ghost){drag.ghost=drag.card.cloneNode(true);drag.ghost.classList.remove('selected','correct','incorrect');drag.ghost.classList.add('ghost');drag.ghost.setAttribute('aria-hidden','true');drag.ghost.tabIndex=-1;document.body.append(drag.ghost);drag.card.classList.add('dragging')}
  e.preventDefault();drag.ghost.style.left=`${e.clientX-drag.card.offsetWidth/2}px`;drag.ghost.style.top=`${e.clientY-drag.card.offsetHeight/2}px`;clearTargets();targetAt(e)?.classList.add('target');
});
function finish(e,cancel=false){
  if(!drag||drag.pid!==e.pointerId)return;const active=drag;drag=null;
  const target=!cancel&&active.ghost?targetAt(e):null;
  if(active.card.hasPointerCapture(e.pointerId))active.card.releasePointerCapture(e.pointerId);
  if(!active.ghost)return;active.ghost.remove();active.card.classList.remove('dragging');clearTargets();suppressClickUntil=Date.now()+180;
  if(target)move(active.id,target.dataset.zone);
}
board.addEventListener('pointerup',e=>finish(e));board.addEventListener('pointercancel',e=>finish(e,true));board.addEventListener('lostpointercapture',e=>finish(e,true));
board.addEventListener('click',e=>{if(Date.now()<suppressClickUntil)return;const card=e.target.closest('.card');if(card){select(card.dataset.id);return}const zone=e.target.closest('[data-zone]');if(zone&&selected)move(selected,zone.dataset.zone)});
$('shuffle').addEventListener('click',()=>newRound(true));$('reset').addEventListener('click',()=>newRound(false));
check.addEventListener('click',()=>{reviewed=!reviewed;render();if(!reviewed){status.textContent='Keep sorting and explaining your choices.';return}const sorted=order.filter(id=>places[id]!=='tray'), correct=sorted.filter(id=>places[id]===getFood(id).answer).length;status.textContent=!sorted.length?'Sort some foods first.':correct===order.length?'All foods match! Great explaining!':`${correct} of ${sorted.length} sorted foods match. Talk about the question marks.`});
$('settings').addEventListener('click',()=>dialog.showModal());
function rename(){groupNames=inputs.map((f,i)=>f.value.trim()||originalNames[i]);['pork','other'].forEach((z,i)=>{$(`${z}-title`).textContent=groupNames[i];zones[z].setAttribute('aria-label',groupNames[i])});reviewed=false;render()}
inputs.forEach(i=>i.addEventListener('input',rename));$('restore-names').addEventListener('click',()=>{inputs.forEach((f,i)=>f.value=originalNames[i]);rename()});
$('show-names').addEventListener('change',e=>document.body.classList.toggle('show-names',e.target.checked));
$('amount').addEventListener('change',e=>{amount=Number(e.target.value);newRound(true)});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{status.textContent='Use your browser’s full screen option.'}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'Exit full screen':'Full screen';requestAnimationFrame(fit)});
window.addEventListener('resize',fit);new ResizeObserver(fit).observe(board);newRound(true);fit();
