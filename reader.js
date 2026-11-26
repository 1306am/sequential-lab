/* Sequential Lab reader — paper-curl renderer powered by MIT-licensed StPageFlip.
   This exact file is also bundled into each standalone HTML export. */
(function(){
  'use strict';

  function numberedPages(project){
    const result=new Map();let number=1;
    for(const page of project.pages){
      if(page.type==='cover'||page.type==='back')continue;
      result.set(page.id,number);
      number+=page.type==='spread'?2:1;
    }
    return result;
  }

  function mediaElement(media,urls){
    if(!media||!urls[media.id])return null;
    const el=document.createElement(media.type==='video'?'video':'img');
    el.src=urls[media.id];el.className='seq-media';
    if(media.type==='video'){
      el.loop=true;el.muted=true;el.playsInline=true;
      el.preload='metadata';el.autoplay=false;el.controls=false;
      el.setAttribute('playsinline','');el.setAttribute('webkit-playsinline','');
    } else el.alt='Ilustración del cómic';
    return el;
  }

  function renderArt(page,project,urls,number,part){
    const art=document.createElement('div');
    art.className='seq-art';art.style.background=page.bg||'#f8f4ea';
    if(page.mode==='panels'){
      for(const panel of (page.panels||[])){
        const el=document.createElement('div');el.className='seq-art-panel';
        Object.assign(el.style,{left:panel.x+'%',top:panel.y+'%',width:panel.w+'%',height:panel.h+'%'});
        const media=project.media?.[panel.mediaId],content=mediaElement(media,urls);
        if(content){content.style.objectFit=panel.fit||'cover';el.appendChild(content);}
        art.appendChild(el);
      }
    } else {
      const el=mediaElement(project.media?.[page.mediaId],urls);
      if(el){el.style.objectFit='contain';art.appendChild(el);}
    }
    if(part==='whole'&&project.numbering!=='none'&&!page.hideNumber&&
       page.type!=='cover'&&page.type!=='back'&&number){
      const label=document.createElement('span');
      label.className='seq-num';label.textContent=String(number);
      art.appendChild(label);
    }
    if(part!=='whole'){
      const clipping=document.createElement('div');
      clipping.className='seq-halfclip '+part;
      clipping.appendChild(art);return clipping;
    }
    return art;
  }

  function createReader(root,project,urls){
    root.textContent='';root.className='seq-reader';
    root.style.setProperty('--page-ratio',String(Number(project.ratio)||.75));
    root.style.setProperty('--book-ratio',String((Number(project.ratio)||.75)*2));
    let disposed=false;
    const head=document.createElement('div');head.className='seq-reader-top';
    const title=document.createElement('div');title.className='seq-reader-title';
    title.textContent=project.title||'Cómic sin título';
    const brand=document.createElement('div');brand.className='seq-reader-brand';
    brand.textContent='SEQUENTIAL LAB';
    head.append(title,brand);
    const main=document.createElement('div');main.className='seq-reader-main';
    const prev=document.createElement('button');prev.className='seq-nav prev';prev.textContent='‹';
    prev.setAttribute('aria-label','Página anterior');
    const next=document.createElement('button');next.className='seq-nav next';next.textContent='›';
    next.setAttribute('aria-label','Página siguiente');
    const book=document.createElement('div');book.className='seq-book seq-curl-book';
    main.append(prev,book,next);
    const footer=document.createElement('div');footer.className='seq-reader-bottom';
    const counter=document.createElement('span'),hint=document.createElement('span');
    hint.textContent='ARRASTRA UNA ESQUINA O USA LAS FLECHAS PARA HOJEAR';
    const fs=document.createElement('button');fs.className='seq-fs';fs.textContent='⛶ Pantalla completa';
    footer.append(counter,hint,fs);
    root.append(head,main,footer);

    if(!window.St||!window.St.PageFlip){
      const message=document.createElement('p');
      message.className='seq-reader-error';
      message.textContent='No se pudo cargar el lector de páginas. Actualiza la página y vuelve a intentarlo.';
      main.replaceChildren(message);
      return{destroy(){root.replaceChildren();},next(){},prev(){}};
    }

    const originalPages=project.pages||[];
    const hasCover=originalPages[0]?.type==='cover';
    const numbers=numberedPages(project);
    const sheets=[],logical=[];
    function addSheet(page=null,part='whole',logicalIndex=-1){
      const sheet=document.createElement('div');
      sheet.className='seq-flip-sheet';
      sheet.dataset.density=(page&&(page.type==='cover'||page.type==='back'))?'hard':'soft';
      sheet.dataset.logical=String(logicalIndex);
      if(page){
        const num=numbers.get(page.id);
        sheet.appendChild(renderArt(page,project,urls,num,part));
        if(part!=='whole'&&project.numbering!=='none'&&!page.hideNumber&&num){
          const label=document.createElement('span');label.className='seq-num';
          label.textContent=String(num+(part==='right'?1:0));
          sheet.appendChild(label);
        }
      }else sheet.classList.add('seq-empty');
      sheets.push(sheet);logical.push(logicalIndex);
    }

    originalPages.forEach((page,i)=>{
      if(page.type==='spread'){
        // Pages in a physical two-page spread must face each other. Insert
        // a white leaf if previous pages put the spread on the wrong side.
        const desiredLeftParity=hasCover?1:0;
        if(sheets.length%2!==desiredLeftParity)addSheet();
        addSheet(page,'left',i);addSheet(page,'right',i);
      }else if(page.type==='back'&&i===originalPages.length-1&&hasCover){
        if(sheets.length%2===0)addSheet();
        addSheet(page,'whole',i);
      }else{
        addSheet(page,'whole',i);
        // The blank reverse of the cover faces the first story page.
        if(i===0&&hasCover)addSheet();
      }
    });
    if(!sheets.length)addSheet();
    if(sheets.length===1)addSheet();
    const ratio=Number(project.ratio)||.75;
    const pageFlip=new window.St.PageFlip(book,{
      width:Math.round(900*ratio),
      height:900,
      size:'stretch',
      minWidth:250,
      maxWidth:1000,
      minHeight:230,
      maxHeight:1400,
      usePortrait:true,
      showCover:hasCover,
      drawShadow:true,
      maxShadowOpacity:.52,
      flippingTime:970,
      mobileScrollSupport:true,
      swipeDistance:35,
      showPageCorners:true,
      useMouseEvents:true,
      disableFlipByClick:false,
      autoSize:false
    });
    pageFlip.loadFromHTML(sheets);
    // Live video layer. StPageFlip composites/transforms HTML page surfaces for
    // realistic curl geometry, and some browsers rasterize <video> during that
    // transformation. Render a fresh, separately composited video exactly over
    // each OPEN page. Hide it while the sheet is physically being turned.
    const liveLayer=document.createElement('div');
    liveLayer.className='seq-live-video-layer';
    liveLayer.setAttribute('aria-hidden','true');
    root.appendChild(liveLayer);
    let turning=false,layerGeneration=0,overlayFrame=null;

    function pauseAll(reset){
      root.querySelectorAll('video').forEach(video=>{
        try{video.pause();if(reset&&video.readyState>0)video.currentTime=0;}catch{}
      });
    }
    function visibleIndices(){
      const i=pageFlip.getCurrentPageIndex();
      if(pageFlip.getOrientation()==='portrait'||(hasCover&&i===0)||
         (hasCover&&i===sheets.length-1))return [i];
      return [i,i+1].filter(index=>index<sheets.length);
    }
    function clearVideoLayer(){
      layerGeneration++;
      if(overlayFrame!==null){cancelAnimationFrame(overlayFrame);overlayFrame=null;}
      liveLayer.querySelectorAll('video').forEach(video=>{try{video.pause();}catch{}});
      liveLayer.replaceChildren();
    }
    function videoContentForSheet(sheet){
      // The source page is never mutated. Only duplicate its video elements
      // and their layout containers, leaving still illustrations beneath.
      const art=sheet.querySelector('.seq-halfclip')||sheet.querySelector('.seq-art');
      if(!art||!art.querySelector('video'))return null;
      const copy=art.cloneNode(true);
      copy.querySelectorAll('img,.seq-num').forEach(node=>node.remove());
      copy.querySelectorAll('.seq-art-panel').forEach(panel=>{
        if(!panel.querySelector('video'))panel.remove();
      });
      if(copy.classList.contains('seq-art'))copy.style.background='transparent';
      copy.querySelectorAll('.seq-art').forEach(a=>a.style.background='transparent');
      return copy;
    }
    function drawVideoLayer(generation){
      if(disposed||turning||generation!==layerGeneration||!root.isConnected)return;
      const rootBox=root.getBoundingClientRect(),bySource=new Map();
      for(const index of visibleIndices()){
        const sheet=sheets[index];if(!sheet)continue;
        const content=videoContentForSheet(sheet);if(!content)continue;
        const rect=sheet.getBoundingClientRect();
        if(rect.width<10||rect.height<10)continue;
        const holder=document.createElement('div');
        holder.className='seq-live-video-page';
        holder.style.left=(rect.left-rootBox.left)+'px';
        holder.style.top=(rect.top-rootBox.top)+'px';
        holder.style.width=rect.width+'px';
        holder.style.height=rect.height+'px';
        holder.appendChild(content);
        liveLayer.appendChild(holder);
        for(const video of holder.querySelectorAll('video')){
          video.muted=true;video.defaultMuted=true;video.loop=true;
          video.playsInline=true;video.autoplay=true;video.controls=false;
          video.preload='auto';video.setAttribute('playsinline','');
          video.setAttribute('webkit-playsinline','');
          video.addEventListener('canplay',()=>{
            if(!disposed&&!turning&&generation===layerGeneration)video.play().catch(()=>{});
          },{once:true});
          video.play().catch(()=>{});
          if(!bySource.has(video.src))bySource.set(video.src,[]);
          bySource.get(video.src).push(video);
        }
      }
      // If a video splash spans both leaves, keep the two clipped copies
      // at the same frame for a seamless double-page animation.
      for(const group of bySource.values()){
        if(group.length<2)continue;
        const leader=group[0];
        leader.addEventListener('timeupdate',()=>{
          if(turning||generation!==layerGeneration)return;
          for(const follower of group.slice(1)){
            if(Math.abs(follower.currentTime-leader.currentTime)>.12){
              try{follower.currentTime=leader.currentTime;}catch{}
            }
          }
        });
      }
    }
    function scheduleVideoLayer(){
      clearVideoLayer();
      if(disposed||turning||document.hidden)return;
      const generation=layerGeneration;
      // Let the flip engine settle positions before measuring the sheet boxes.
      overlayFrame=requestAnimationFrame(()=>{
        overlayFrame=requestAnimationFrame(()=>{
          overlayFrame=null;
          drawVideoLayer(generation);
        });
      });
    }
    function refresh(playVideos=true){
      if(disposed)return;
      const visible=visibleIndices();
      const actual=visible.map(i=>logical[i]).filter(i=>i>=0);
      const current=actual.length?Math.max(...actual)+1:
        Math.max(1,Math.min(originalPages.length,logical[visible[0]]+1));
      counter.textContent=current+' / '+originalPages.length;
      const index=pageFlip.getCurrentPageIndex();
      prev.disabled=index<=0;
      next.disabled=index>=sheets.length-(pageFlip.getOrientation()==='portrait'?1:2);
      if(playVideos)scheduleVideoLayer();
    }

    pageFlip.on('flip',()=>refresh(false));
    pageFlip.on('changeOrientation',()=>{if(!turning)refresh(true);});
    pageFlip.on('changeState',event=>{
      if(event.data==='flipping'){
        turning=true;
        pauseAll(false);
        clearVideoLayer();
      }
      if(event.data==='read'){
        turning=false;
        refresh(true);
      }
    });
    pageFlip.on('init',()=>refresh(true));
    const onResize=()=>{if(!turning)scheduleVideoLayer();};
    const onVisibility=()=>{
      if(document.hidden){pauseAll(false);clearVideoLayer();}
      else if(!turning)refresh(true);
    };
    window.addEventListener('resize',onResize);
    document.addEventListener('visibilitychange',onVisibility);

    function move(delta){
      if(disposed)return;
      if(delta>0)pageFlip.flipNext('bottom');
      else pageFlip.flipPrev('bottom');
    }
    prev.addEventListener('click',()=>move(-1));
    next.addEventListener('click',()=>move(1));
    const onKey=event=>{
      if(!root.isConnected||disposed)return;
      if(event.key==='ArrowRight'){event.preventDefault();move(project.direction==='rtl'?-1:1);}
      if(event.key==='ArrowLeft'){event.preventDefault();move(project.direction==='rtl'?1:-1);}
    };
    document.addEventListener('keydown',onKey);
    fs.addEventListener('click',async()=>{
      try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}
      catch{fs.textContent='Pantalla completa no disponible';}
    });
    refresh();
    return{
      destroy(){
        if(disposed)return;
        disposed=true;pauseAll(true);clearVideoLayer();
        window.removeEventListener('resize',onResize);
        document.removeEventListener('visibilitychange',onVisibility);
        document.removeEventListener('keydown',onKey);
        pageFlip.destroy();root.replaceChildren();
      },
      next:()=>move(1),prev:()=>move(-1)
    };
  }

  window.SequentialReader={mount:createReader};
  document.addEventListener('DOMContentLoaded',()=>{
    const root=document.getElementById('standalone-reader');
    if(root&&window.SEQUENTIAL_COMIC&&window.SEQUENTIAL_MEDIA_URLS)
      createReader(root,window.SEQUENTIAL_COMIC,window.SEQUENTIAL_MEDIA_URLS);
  });
})();
