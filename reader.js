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
    let playbackIndex=-1;

    function pauseAll(reset){
      // Pause original media, and also Safari's temporary cloned video pages.
      book.querySelectorAll('video').forEach(video=>{
        try{video.pause();if(reset&&video.readyState)video.currentTime=0;}catch{}
      });
    }
    function visibleIndices(){
      const i=pageFlip.getCurrentPageIndex();
      if(pageFlip.getOrientation()==='portrait'||(hasCover&&i===0)||
         (hasCover&&i===sheets.length-1))return [i];
      return [i,i+1].filter(x=>x<sheets.length);
    }
    function syncActiveVideos(){
      if(disposed)return;
      const visible=visibleIndices();
      const id=visible.join(':');
      if(id===playbackIndex)return;
      playbackIndex=id;
      pauseAll(true);
      const bySrc=new Map();
      for(const idx of visible){
        for(const video of sheets[idx].querySelectorAll('video')){
          const group=bySrc.get(video.src)||[];
          group.push(video);bySrc.set(video.src,group);
          video.muted=true;video.loop=true;video.playsInline=true;
          video.play().catch(()=>{});
        }
      }
      // A video spanning two pages is rendered into two clipped sheets.
      // Synchronize their playback whenever the browser supplies a new frame.
      for(const pair of bySrc.values()){
        if(pair.length<2)continue;
        const mainVideo=pair[0],followers=pair.slice(1);
        mainVideo.addEventListener('timeupdate',()=>{
          if(!visible.includes(Number(mainVideo.closest('.seq-flip-sheet')?.dataset.index)))return;
          for(const second of followers){
            if(Math.abs(second.currentTime-mainVideo.currentTime)>.09){
              try{second.currentTime=mainVideo.currentTime;}catch{}
            }
          }
        },{signal:videoAbort.signal});
      }
    }

    // Shared page index data makes sync possible without binding events to
    // cloned sheets generated by the page-curl engine in portrait mode.
    sheets.forEach((sheet,i)=>sheet.dataset.index=String(i));
    const videoAbort=new AbortController();

    function refresh(){
      if(disposed)return;
      const visible=visibleIndices();
      const actual=visible.map(i=>logical[i]).filter(i=>i>=0);
      const current=actual.length?Math.max(...actual)+1:Math.max(1,Math.min(originalPages.length,logical[visible[0]]+1));
      counter.textContent=current+' / '+originalPages.length;
      const idx=pageFlip.getCurrentPageIndex();
      prev.disabled=idx<=0;
      next.disabled=idx>=sheets.length-(pageFlip.getOrientation()==='portrait'?1:2);
      syncActiveVideos();
    }

    pageFlip.on('flip',()=>refresh());
    pageFlip.on('changeOrientation',()=>{playbackIndex=-1;refresh();});
    pageFlip.on('changeState',event=>{
      if(event.data==='flipping'){pauseAll(false);playbackIndex=-1;}
      if(event.data==='read')refresh();
    });
    pageFlip.on('init',()=>refresh());

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
        disposed=true;videoAbort.abort();pauseAll(true);
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
