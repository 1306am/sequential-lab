/* Reader runtime used by the editor AND the exported website. */
(function(){
  function numberedPages(project){const result=new Map();let count=1;for(const page of project.pages){if(page.type==='cover'||page.type==='back')continue;result.set(page.id,count);count+=page.type==='spread'?2:1;}return result;}
  function viewsFor(project){const views=[];let pending=null;let first=true;function flush(){if(pending){views.push({left:pending,right:null});pending=null;}};
    for(const p of project.pages){if(p.type==='cover'){flush();views.push({left:null,right:p,kind:'cover'});first=true;continue;}
      if(p.type==='spread'){flush();views.push({kind:'spread',page:p});first=false;continue;}
      if(p.type==='back'){flush();views.push({left:p,right:null,kind:'back'});first=false;continue;}
      if(first){views.push({left:null,right:p});first=false;continue;}
      if(!pending)pending=p;else{views.push({left:pending,right:p});pending=null;}
    }flush();return views.length?views:[{left:null,right:null}];
  }
  function mediaElement(media,urls,playing=true){const data=media?.id?media:null;if(!data)return null;const src=urls[data.id];if(!src)return null;const el=document.createElement(data.type==='video'?'video':'img');el.src=src;el.className='seq-media';if(data.type==='video'){el.loop=true;el.muted=true;el.playsInline=true;el.preload='metadata';el.autoplay=false;el.controls=false;el.dataset.activeMedia=playing?'1':'0';}else el.alt='Ilustración del cómic';return el;}
  function renderArt(page,project,urls,number,part='whole',playing=true){const art=document.createElement('div');art.className='seq-art';art.style.background=page.bg||'#f8f4ea';if(page.mode==='panels'){
      for(const panel of (page.panels||[])){const el=document.createElement('div');el.className='seq-art-panel';Object.assign(el.style,{left:panel.x+'%',top:panel.y+'%',width:panel.w+'%',height:panel.h+'%'});const media=project.media?.[panel.mediaId];const content=mediaElement(media,urls,playing);if(content){content.style.objectFit=panel.fit||'cover';el.appendChild(content);}art.appendChild(el);}
    }else{const media=project.media?.[page.mediaId],el=mediaElement(media,urls,playing);if(el){el.style.objectFit='contain';art.appendChild(el);}}
    if(project.numbering!=='none'&&!page.hideNumber&&page.type!=='cover'&&page.type!=='back'&&number){const numberLabel=document.createElement('span');numberLabel.className='seq-num';numberLabel.textContent=page.type==='spread'?`${number}     ·     ${number+1}`:String(number);art.appendChild(numberLabel);}
    if(part!=='whole'){const windowEl=document.createElement('div');windowEl.className='seq-halfclip '+part;windowEl.appendChild(art);return windowEl;}
    return art;
  }
  function renderHalf(page,project,urls,number,half,playing){const wrap=document.createElement('div');wrap.className='seq-half';if(page)wrap.appendChild(renderArt(page,project,urls,number,half,playing));else wrap.classList.add('seq-blank');return wrap;}
  function createReader(root,project,urls,options={}){
    root.textContent='';root.className='seq-reader';root.style.setProperty('--book-ratio',String((Number(project.ratio)||.75)*2));root.style.setProperty('--book-width',`calc(min(76dvh, 760px) * ${(Number(project.ratio)||.75)*2})`);
    const bar=document.createElement('div');bar.className='seq-reader-top';const title=document.createElement('div');title.className='seq-reader-title';title.textContent=project.title||'Cómic sin título';const brand=document.createElement('div');brand.className='seq-reader-brand';brand.textContent='SEQUENTIAL LAB';bar.append(title,brand);
    const main=document.createElement('div');main.className='seq-reader-main';const prev=document.createElement('button');prev.className='seq-nav prev';prev.textContent='‹';prev.setAttribute('aria-label','Página anterior');const next=document.createElement('button');next.className='seq-nav next';next.textContent='›';next.setAttribute('aria-label','Página siguiente');const book=document.createElement('div');book.className='seq-book';main.append(prev,book,next);
    const footer=document.createElement('div');footer.className='seq-reader-bottom';const counter=document.createElement('span');const hint=document.createElement('span');hint.textContent='DESLIZA O USA LAS FLECHAS PARA HOJEAR';const fs=document.createElement('button');fs.textContent='⛶ Pantalla completa';fs.className='seq-fs';footer.append(counter,hint,fs);root.append(bar,main,footer);
    const views=viewsFor(project),numbers=numberedPages(project);let current=0,busy=false,disposed=false;
    function stopVideos(){root.querySelectorAll('video').forEach(v=>{v.pause();v.currentTime=0;});}
    function playVideos(){root.querySelectorAll('.seq-book > .seq-half video, .seq-book > .seq-double video').forEach(v=>{v.muted=true;v.loop=true;v.playsInline=true;v.play().catch(()=>{});});}
    function draw(view){book.textContent='';if(view.kind==='spread'){const spread=document.createElement('div');spread.className='seq-double';spread.appendChild(renderArt(view.page,project,urls,numbers.get(view.page.id),'whole'));book.appendChild(spread);}else{book.append(renderHalf(view.left,project,urls,view.left&&numbers.get(view.left.id),'whole',true),renderHalf(view.right,project,urls,view.right&&numbers.get(view.right.id),'whole',true));}}
    function refresh(){stopVideos();draw(views[current]);counter.textContent=`${current+1} / ${views.length}`;prev.disabled=current===0;next.disabled=current===views.length-1;playVideos();}
    function getHalf(view,side){if(view.kind==='spread')return renderHalf(view.page,project,urls,numbers.get(view.page.id),side,false);return renderHalf(view[side],project,urls,view[side]&&numbers.get(view[side].id),'whole',false);}
    function move(direction){if(busy||disposed)return;const target=current+direction;if(target<0||target>=views.length)return;busy=true;stopVideos();const old=views[current],upcoming=views[target];
      // A real book turn shows two DIFFERENT stationary pages below the moving sheet:
      // forward: old left + next right; backward: previous left + old right.
      // The sheet itself has two opaque faces (outgoing + incoming page).
      const forward=direction>0;
      const stage=document.createElement('div');
      stage.className='seq-turn-stage '+(forward?'forward':'backward');
      const face=document.createElement('div');
      face.className='seq-turn-face';
      const front=getHalf(old,forward?'right':'left');
      const back=getHalf(upcoming,forward?'left':'right');
      front.classList.add('seq-turn-front');
      back.classList.add('seq-turn-back');
      face.append(front,back);stage.appendChild(face);
      const shadow=document.createElement('div');
      shadow.className='seq-turn-under-shadow '+(forward?'forward':'backward');
      book.textContent='';
      book.classList.add('seq-book-turning');
      book.append(
        getHalf(forward?old:upcoming,'left'),
        getHalf(forward?upcoming:old,'right'),
        shadow,
        stage
      );
      // Only the 3-D sheet's own animation may finish the turn. Lighting
      // animations on its children must not end the turn prematurely.
      let completed=false;
      const finish=()=>{
        if(completed||disposed)return;
        completed=true;
        clearTimeout(fallback);
        current=target;
        busy=false;
        book.classList.remove('seq-book-turning');
        refresh();
      };
      face.addEventListener('animationend',e=>{
        if(e.target===face&&(e.animationName==='seq-forward'||e.animationName==='seq-backward'))finish();
      });
      const fallback=setTimeout(finish,1400);
    }
    const onKey=e=>{if(!root.isConnected)return;if(e.key==='ArrowRight'){e.preventDefault();move(project.direction==='rtl'?-1:1);}if(e.key==='ArrowLeft'){e.preventDefault();move(project.direction==='rtl'?1:-1);}};
    prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));document.addEventListener('keydown',onKey);
    let startX=null;book.addEventListener('pointerdown',e=>{startX=e.clientX;});book.addEventListener('pointerup',e=>{if(startX===null)return;const delta=e.clientX-startX;startX=null;if(Math.abs(delta)>60)move(delta<0?1:-1);});book.addEventListener('click',e=>{if(e.target.closest('video')||busy)return;const rect=book.getBoundingClientRect(),x=e.clientX-rect.left;if(x>rect.width*.82)move(1);else if(x<rect.width*.18)move(-1);});
    fs.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}catch{fs.textContent='Pantalla completa no disponible';}});
    refresh();return{destroy(){disposed=true;stopVideos();document.removeEventListener('keydown',onKey);root.textContent='';},next:()=>move(1),prev:()=>move(-1)};
  }
  window.SequentialReader={mount:createReader};
  document.addEventListener('DOMContentLoaded',()=>{const root=document.getElementById('standalone-reader');if(root&&window.SEQUENTIAL_COMIC&&window.SEQUENTIAL_MEDIA_URLS)createReader(root,window.SEQUENTIAL_COMIC,window.SEQUENTIAL_MEDIA_URLS);});
})();
