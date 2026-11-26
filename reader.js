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
    function animatedPageContent(index){
      // Never clone a transformed StPageFlip <video>: Safari and Chrome can
      // present only its frozen first frame. Instantiate independent video
      // elements directly from the immutable project media and blob URLs.
      const logicalIndex=logical[index];
      const page=originalPages[logicalIndex];
      if(!page)return null;
      const part=sheets[index]?.querySelector('.seq-halfclip')?.classList.contains('right')
        ?'right':sheets[index]?.querySelector('.seq-halfclip')?'left':'whole';
      const art=document.createElement('div');
      art.className='seq-art';
      art.style.background='transparent';
      let count=0;
      const addVideo=(id,container,fit)=>{
        const media=project.media?.[id],src=media&&urls[media.id];
        if(!media||media.type!=='video'||!src)return;
        const video=document.createElement('video');
        video.className='seq-media';
        video.src=src;video.muted=true;video.defaultMuted=true;
        video.loop=true;video.playsInline=true;video.autoplay=true;
        video.preload='auto';video.controls=false;
        video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
        video.style.objectFit=fit||'contain';
        container.appendChild(video);count++;
      };
      if(page.mode==='panels'){
        for(const panel of(page.panels||[])){
          if(project.media?.[panel.mediaId]?.type!=='video')continue;
          const holder=document.createElement('div');
          holder.className='seq-art-panel';
          Object.assign(holder.style,{
            left:panel.x+'%',top:panel.y+'%',width:panel.w+'%',height:panel.h+'%',
            background:'transparent',border:'0'
          });
          addVideo(panel.mediaId,holder,panel.fit||'cover');
          art.appendChild(holder);
        }
      }else addVideo(page.mediaId,art,'contain');
      if(!count)return null;
      if(part==='whole')return art;
      const clip=document.createElement('div');
      clip.className='seq-halfclip '+part;clip.appendChild(art);
      return clip;
    }
    function sheetPosition(index){
      // Geometry is measured from StPageFlip itself, rather than from
      // .stf__item elements (which are frequently display:none or cloned
      // while the engine prepares a turn).
      const bounds=pageFlip.getBoundsRect();
      const layerBox=root.getBoundingClientRect();
      const stageBox=(book.querySelector('.stf__block')||book).getBoundingClientRect();
      if(!bounds||!bounds.pageWidth||!bounds.height)return null;
      const first=pageFlip.getCurrentPageIndex();
      const orientation=pageFlip.getOrientation();
      let right=orientation==='portrait';
      if(orientation!=='portrait'){
        right=hasCover&&first===0
          ?true
          :hasCover&&index===sheets.length-1
            ?false
            :index!==first;
      }
      return{
        left:stageBox.left-layerBox.left+bounds.left+(right?bounds.pageWidth:0),
        top:stageBox.top-layerBox.top+bounds.top,
        width:bounds.pageWidth,height:bounds.height
      };
    }
    function drawVideoLayer(generation){
      if(disposed||turning||generation!==layerGeneration||!root.isConnected)return;
      const bySource=new Map();
      for(const index of visibleIndices()){
        const content=animatedPageContent(index);
        if(!content)continue;
        const rect=sheetPosition(index);
        if(!rect||rect.width<10||rect.height<10)continue;
        const holder=document.createElement('div');
        holder.className='seq-live-video-page';
        Object.assign(holder.style,{
          left:rect.left+'px',top:rect.top+'px',
          width:rect.width+'px',height:rect.height+'px'
        });
        holder.appendChild(content);
        liveLayer.appendChild(holder);
        for(const video of holder.querySelectorAll('video')){
          video.addEventListener('loadeddata',()=>{
            if(!disposed&&!turning&&generation===layerGeneration)video.play().catch(()=>{});
          },{once:true});
          // The reader button click is a user gesture and video is muted,
          // so browsers can allow silent autoplay. Keep a retry on canplay.
          video.play().catch(()=>{});
          if(!bySource.has(video.src))bySource.set(video.src,[]);
          bySource.get(video.src).push(video);
        }
      }
      // A single video on a double-spread page appears in both halves.
      // Keep those live copies on the same playback clock.
      for(const group of bySource.values()){
        if(group.length<2)continue;
        const master=group[0];
        master.addEventListener('timeupdate',()=>{
          if(turning||generation!==layerGeneration)return;
          for(const follower of group.slice(1)){
            if(Math.abs(follower.currentTime-master.currentTime)>.12){
              try{follower.currentTime=master.currentTime;}catch{}
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
      if(event.data==='flipping'||event.data==='user_fold'){
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
