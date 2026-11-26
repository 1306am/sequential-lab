(function(){
'use strict';
const $=s=>document.querySelector(s),uid=()=>('id-'+(globalThis.crypto?.randomUUID?.()||Array.from({length:4},()=>Math.random().toString(36).slice(2)).join(''))),newPage=(type='page')=>({id:uid(),type,mode:'full',mediaId:null,panels:[],bg:'#f8f4ea',hideNumber:false});
const fresh=()=>({version:1,title:'Mi primer cómic',ratio:.75,direction:'ltr',numbering:'auto',media:{},pages:[newPage('cover'),newPage('page'),newPage('back')]});
const state={project:fresh(),selectedId:null,selectedPanelId:null,files:new Map(),urls:new Map(),reader:null,toastTimer:null};state.selectedId=state.project.pages[1].id;
const TEMPLATES=[{label:'1 panel',rects:[[2,2,96,96]]},{label:'2 verticales',rects:[[2,2,47,96],[51,2,47,96]]},{label:'3 franjas',rects:[[2,2,96,30],[2,35,96,30],[2,68,96,30]]},{label:'Cuadrícula',rects:[[2,2,47,47],[51,2,47,47],[2,51,47,47],[51,51,47,47]]},{label:'Hero + 2',rects:[[2,2,96,59],[2,64,47,34],[51,64,47,34]]},{label:'Asimétrico',rects:[[2,2,55,96],[60,2,38,47],[60,52,38,46]]}];
const getPage=()=>state.project.pages.find(p=>p.id===state.selectedId),getPanel=()=>getPage()?.panels?.find(p=>p.id===state.selectedPanelId);const basename=s=>(s||'mi-comic').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'mi-comic';
function toast(message,error=false){const t=$('#toast');t.textContent=message;t.classList.toggle('error',error);t.hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>t.hidden=true,error?6200:3500);}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function dirty(){ $('#save-status').textContent='Cambios sin guardar · Local';}
function makeMediaElement(mediaId,fit='contain',preview=true){const meta=state.project.media[mediaId],url=state.urls.get(mediaId);if(!meta||!url)return null;const el=document.createElement(meta.type==='video'?'video':'img');el.src=url;el.style.objectFit=fit;el.className='page-object';if(meta.type==='video'){el.muted=true;el.loop=true;el.playsInline=true;el.preload='metadata';el.autoplay=preview; if(preview)el.play().catch(()=>{});}return el;}
function numbersMap(){const map=new Map();let n=1;for(const p of state.project.pages){if(p.type==='cover'||p.type==='back')continue;map.set(p.id,n);n+=p.type==='spread'?2:1;}return map;}
function renderCanvas(){const page=getPage();if(!page)return;const canvas=$('#editor-page'),region=$('.canvas-region');canvas.textContent='';const aspect=Number(state.project.ratio)*(page.type==='spread'?2:1),maxW=Math.max(200,region.clientWidth-65),maxH=Math.max(200,region.clientHeight-70);let w=Math.min(maxW, maxH*aspect,960),h=w/aspect;canvas.style.width=w+'px';canvas.style.height=h+'px';canvas.style.background=page.bg;
  if(page.mode==='full'){const media=makeMediaElement(page.mediaId);if(media){canvas.appendChild(media);}else{const empty=document.createElement('div');empty.className='panel-empty';empty.style.position='absolute';empty.style.inset='0';empty.style.gap='12px';empty.innerHTML='<span style="font-size:55px">▧</span><strong>Tu página comienza aquí</strong><small>Sube un archivo JPG, PNG o MP4 desde el panel derecho.</small>';canvas.appendChild(empty);}}
  else for(const panel of page.panels){const el=document.createElement('div');el.className='panel-box'+(panel.id===state.selectedPanelId?' selected':'');el.dataset.panel=panel.id;el.style.left=panel.x+'%';el.style.top=panel.y+'%';el.style.width=panel.w+'%';el.style.height=panel.h+'%';el.style.zIndex=String(panel.z||1);const inner=document.createElement('div');inner.className='panel-inner';const media=makeMediaElement(panel.mediaId,panel.fit||'cover');if(media){media.className='';media.style.width='100%';media.style.height='100%';inner.appendChild(media);}else{const empty=document.createElement('div');empty.className='panel-empty';empty.innerHTML='<span>▧</span><small>Panel</small>';inner.appendChild(empty);}el.appendChild(inner);const handle=document.createElement('div');handle.className='resize-handle';el.appendChild(handle);canvas.appendChild(el);wirePanelDrag(el,panel,handle);}
  const number=numbersMap().get(page.id);if(state.project.numbering==='auto'&&!page.hideNumber&&number&&page.type!=='cover'&&page.type!=='back'){if(page.type==='spread'){for(const [klass,n] of [['two',number],['right',number+1]]){const label=document.createElement('div');label.className='page-number '+klass;label.textContent=String(n);canvas.appendChild(label);}}else{const label=document.createElement('div');label.className='page-number';label.textContent=String(number);canvas.appendChild(label);}}
}
function wirePanelDrag(el,panel,handle){el.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();state.selectedPanelId=panel.id;const isResize=e.target===handle;const pageRect=$('#editor-page').getBoundingClientRect(),start={x:e.clientX,y:e.clientY},initial={x:panel.x,y:panel.y,w:panel.w,h:panel.h};document.querySelectorAll('.panel-box').forEach(n=>n.classList.toggle('selected',n===el));renderInspector();el.setPointerCapture(e.pointerId);
    function onMove(ev){const dx=(ev.clientX-start.x)/pageRect.width*100,dy=(ev.clientY-start.y)/pageRect.height*100;if(isResize){panel.w=Math.max(3,Math.min(100-panel.x,initial.w+dx));panel.h=Math.max(3,Math.min(100-panel.y,initial.h+dy));}else{panel.x=Math.max(0,Math.min(100-panel.w,initial.x+dx));panel.y=Math.max(0,Math.min(100-panel.h,initial.y+dy));}Object.assign(el.style,{left:panel.x+'%',top:panel.y+'%',width:panel.w+'%',height:panel.h+'%'});for(const k of ['x','y','w','h'])$('#panel-'+k).value=Math.round(panel[k]);}
    function onEnd(){el.removeEventListener('pointermove',onMove);el.removeEventListener('pointerup',onEnd);el.removeEventListener('pointercancel',onEnd);dirty();}
    el.addEventListener('pointermove',onMove);el.addEventListener('pointerup',onEnd);el.addEventListener('pointercancel',onEnd);
  });}
function describePage(p,i){return ({cover:'PORTADA',page:`PÁGINA ${numbersMap().get(p.id)||i+1}`,spread:'DOBLE SPLASH',back:'CONTRAPORTADA'})[p.type];}
function pageThumbnail(p){const wrap=document.createElement('div');wrap.className='page-thumb '+(p.type==='spread'?'spread':'');const mediaId=p.mode==='full'?p.mediaId:p.panels[0]?.mediaId;const media=state.project.media[mediaId],src=state.urls.get(mediaId);if(src&&media){const el=document.createElement(media.type==='video'?'video':'img');el.src=src;el.muted=true;el.preload='metadata';el.draggable=false;wrap.appendChild(el);}else wrap.textContent=p.type==='spread'?'↔':'▧';return wrap;}
// A thumbnail is a draggable surface with a real (non-nested) delete button.
// Keep the selected page stable while the source and destination swap positions.
let draggingPageId=null;
function reorderPage(sourceId,targetId,after){
  const pages=state.project.pages;
  if(!sourceId||sourceId===targetId)return;
  const fromIndex=pages.findIndex(p=>p.id===sourceId);
  if(fromIndex<0||!pages.some(p=>p.id===targetId))return;
  const [moving]=pages.splice(fromIndex,1);
  const targetIndex=pages.findIndex(p=>p.id===targetId);
  pages.splice(targetIndex+(after?1:0),0,moving);
  state.selectedId=sourceId;state.selectedPanelId=null;
  dirty();renderAll();
  toast('Orden de páginas actualizado');
}
function deletePageById(id){
  const pages=state.project.pages;
  if(pages.length<2){toast('Debe quedar al menos una página',true);return;}
  const index=pages.findIndex(p=>p.id===id);if(index<0)return;
  const page=pages[index];
  if(!confirm('¿Eliminar '+describePage(page,index).toLowerCase()+' del cómic? Esta acción no se puede deshacer.'))return;
  pages.splice(index,1);
  if(state.selectedId===id){
    state.selectedId=pages[Math.min(index,pages.length-1)].id;
    state.selectedPanelId=null;
  }
  dirty();renderAll();toast('Página eliminada');
}
function clearPageDropHints(){
  document.querySelectorAll('#page-list .page-tile').forEach(el=>el.classList.remove('drag-before','drag-after','dragging'));
}
function renderPageList(){
  const parent=$('#page-list');parent.textContent='';
  state.project.pages.forEach((p,i)=>{
    const tile=document.createElement('div');
    tile.className='page-tile'+(p.id===state.selectedId?' active':'');
    tile.dataset.pageId=p.id;
    tile.tabIndex=0;tile.setAttribute('role','button');
    tile.setAttribute('aria-label',describePage(p,i)+'. Arrastra para reordenar.');
    tile.draggable=true;
    tile.appendChild(pageThumbnail(p));
    const info=document.createElement('span'),name=document.createElement('strong'),small=document.createElement('small');
    name.textContent=describePage(p,i);
    const animated=p.mode==='full'
      ? state.project.media[p.mediaId]?.type==='video'
      : p.panels.some(panel=>state.project.media[panel.mediaId]?.type==='video');
    small.textContent=(p.mode==='full'?'Página completa':p.panels.length+' panel'+(p.panels.length===1?'':'es'))+(animated?' · MP4':'');
    info.append(name,small);tile.appendChild(info);
    const remove=document.createElement('button');
    remove.type='button';remove.className='page-tile-delete';
    remove.textContent='×';remove.title='Eliminar página';remove.draggable=false;
    remove.setAttribute('aria-label','Eliminar '+describePage(p,i));
    remove.addEventListener('click',event=>{event.stopPropagation();deletePageById(p.id);});
    tile.appendChild(remove);
    tile.addEventListener('click',()=>{state.selectedId=p.id;state.selectedPanelId=null;renderAll();});
    tile.addEventListener('keydown',e=>{
      if(e.target!==tile)return;
      if(e.key==='Enter'||e.key===' '){e.preventDefault();state.selectedId=p.id;state.selectedPanelId=null;renderAll();}
      if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deletePageById(p.id);}
    });
    tile.addEventListener('dragstart',e=>{
      if(e.target.closest?.('.page-tile-delete')){e.preventDefault();return;}
      draggingPageId=p.id;
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/x-sequential-page',p.id);
      tile.classList.add('dragging');
    });
    tile.addEventListener('dragover',e=>{
      if(!draggingPageId||draggingPageId===p.id)return;
      e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';
      clearPageDropHints();
      const after=e.clientY>=tile.getBoundingClientRect().top+tile.getBoundingClientRect().height/2;
      tile.classList.add(after?'drag-after':'drag-before');
    });
    tile.addEventListener('drop',e=>{
      if(!draggingPageId)return;
      e.preventDefault();e.stopPropagation();
      const source=draggingPageId;draggingPageId=null;
      const after=e.clientY>=tile.getBoundingClientRect().top+tile.getBoundingClientRect().height/2;
      clearPageDropHints();
      reorderPage(source,p.id,after);
    });
    tile.addEventListener('dragend',()=>{draggingPageId=null;clearPageDropHints();});
    parent.appendChild(tile);
  });
  $('#page-count').textContent=state.project.pages.length;
}
function renderInspector(){const p=getPage();if(!p)return;$('#page-type').value=p.type;$('#page-bg').value=p.bg;$('#numbering').value=state.project.numbering;$('#page-ratio').value=String(state.project.ratio);$('#hide-number').checked=!!p.hideNumber;$('#hide-number').disabled=p.type==='cover'||p.type==='back';$('#mode-full').classList.toggle('active',p.mode==='full');$('#mode-panels').classList.toggle('active',p.mode==='panels');$('#full-editor').hidden=p.mode!=='full';$('#panels-editor').hidden=p.mode!=='panels';$('#inspector-title').textContent=p.type==='spread'?'Doble splash':p.type==='cover'?'Portada':p.type==='back'?'Contraportada':'Página interior';
  const m=state.project.media[p.mediaId];$('#full-file-info').textContent=m?`${m.name} · ${m.type==='video'?'Animación en loop':'Ilustración estática'}`:'Sin archivo. La página quedará en blanco.';$('#remove-full').hidden=!m;
  const panel=getPanel();$('#panel-editor').hidden=p.mode!=='panels'||!panel;if(panel){for(const key of ['x','y','w','h'])$('#panel-'+key).value=Math.round(panel[key]);$('#panel-fit').value=panel.fit||'cover';$('#panel-file-name').textContent=state.project.media[panel.mediaId]?.name||'Ningún archivo';}
}
function renderAll(){const p=getPage();if(!p){state.selectedId=state.project.pages[0]?.id;state.selectedPanelId=null;}const page=getPage();$('#page-label').textContent=page?describePage(page,state.project.pages.indexOf(page)):'';renderPageList();renderCanvas();renderInspector();$('#selected-hint').textContent=page?.mode==='panels'?'Arrastra y redimensiona los paneles libremente':'Página completa · Imagen o video en loop';}
async function attachFile(file,target){if(!file)return;if(!/^image\/(png|jpeg|webp|gif)$|^video\/(mp4|webm)$/.test(file.type)){toast('Formato no compatible. Usa PNG, JPG, WebP, GIF, MP4 o WebM.',true);return;}const id=uid();state.files.set(id,file);state.urls.set(id,URL.createObjectURL(file));state.project.media[id]={id,name:file.name,type:file.type.startsWith('video/')?'video':'image',mime:file.type,size:file.size};target.mediaId=id;dirty();renderAll();toast(file.type.startsWith('video/')?'Video cargado · se repetirá mientras la página sea visible':'Imagen cargada');}
// Import an entire PDF as self-contained images so readers and exports work unchanged.
const pdfImportState={file:null,busy:false,controller:null};
function openPdfImportDialog(file){
  if(!file)return;
  if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'){toast('Selecciona un documento PDF.',true);return;}
  pdfImportState.file=file;
  $('#pdf-import-filename').textContent=file.name+' · '+(file.size/1048576).toFixed(1)+' MB';
  $('#pdf-import-progress').hidden=true;
  $('#pdf-import-progress-bar').value=0;
  const hasContent=state.project.pages.some(p=>p.mediaId||p.panels.some(q=>q.mediaId));
  document.querySelector('input[name="pdf-import-mode"][value="'+(hasContent?'insert':'replace')+'"]').checked=true;
  refreshPdfImportOptions();
  $('#pdf-import-overlay').hidden=false;
}
function refreshPdfImportOptions(){
  const mode=document.querySelector('input[name="pdf-import-mode"]:checked').value;
  $('#pdf-import-cover-options').hidden=mode!=='replace';
}
function closePdfImportDialog(){
  if(pdfImportState.busy){pdfImportState.controller?.abort();$('#pdf-import-progress-text').textContent='Cancelando importación…';return;}
  pdfImportState.file=null;
  $('#pdf-import-overlay').hidden=true;
}
function closestRatio(ratio){
  const values=[.75,.7071,1,1.3333,1.7778];
  return values.reduce((best,v)=>Math.abs(v-ratio)<Math.abs(best-ratio)?v:best,values[0]);
}
async function importPdfDocument(){
  const file=pdfImportState.file;if(!file||pdfImportState.busy)return;
  const mode=document.querySelector('input[name="pdf-import-mode"]:checked').value;
  const makeCover=$('#pdf-import-cover').checked,makeBack=$('#pdf-import-back').checked;
  pdfImportState.busy=true;
  pdfImportState.controller=new AbortController();
  const btn=$('#pdf-import-confirm'),cancel=$('#pdf-import-cancel');
  btn.disabled=true;btn.textContent='Importando…';cancel.textContent='Cancelar importación';
  document.querySelectorAll('input[name="pdf-import-mode"],#pdf-import-cover,#pdf-import-back').forEach(e=>e.disabled=true);
  $('#pdf-import-progress').hidden=false;
  const progress=(completed,total)=>{
    $('#pdf-import-progress-text').textContent='Convirtiendo páginas · '+completed+' de '+total;
    $('#pdf-import-progress-bar').value=Math.round(100*completed/total);
  };
  try{
    // Process all pages before modifying the project, so an error cannot erase existing work.
    const images=await SeqPdfImport.rasterize(file,{onProgress:progress,signal:pdfImportState.controller.signal});
    if(pdfImportState.controller.signal.aborted)throw new DOMException('Importación cancelada','AbortError');
    if(!images.length)throw Error('El archivo PDF está vacío.');
    const portrait=images.find(i=>i.width/i.height<1);
    const baseRatio=portrait?portrait.width/portrait.height:images[0].width/images[0].height;
    const newMedia={},newFiles=new Map(),newPages=[];
    images.forEach((image,i)=>{
      const id=uid(),name=file.name.replace(/\.pdf$/i,'')+'-pagina-'+String(i+1).padStart(3,'0')+'.jpg';
      const blob=new File([image.blob],name,{type:'image/jpeg'});
      newMedia[id]={id,name,type:'image',mime:'image/jpeg',size:blob.size};
      newFiles.set(id,blob);
      let type=(baseRatio<1&&image.width/image.height>Math.max(1.15,baseRatio*1.65))?'spread':'page';
      if(mode==='replace'&&i===0&&makeCover)type='cover';
      if(mode==='replace'&&i===images.length-1&&makeBack&&i!==0)type='back';
      const page=newPage(type);page.mediaId=id;newPages.push(page);
    });
    if(mode==='replace'){
      for(const url of state.urls.values())URL.revokeObjectURL(url);
      state.urls.clear();state.files.clear();imageCache.clear();
      state.project.pages=newPages;
      state.project.media=newMedia;
      state.project.ratio=closestRatio(baseRatio);
      // Most imported PDFs already contain printed page numbers.
      state.project.numbering='none';
      if(state.project.title==='Mi primer cómic')state.project.title=file.name.replace(/\.pdf$/i,'');
      $('#project-title').value=state.project.title;
    }else{
      const idx=state.project.pages.findIndex(p=>p.id===state.selectedId);
      state.project.pages.splice(idx+1,0,...newPages);
      Object.assign(state.project.media,newMedia);
    }
    for(const [id,blob] of newFiles){state.files.set(id,blob);state.urls.set(id,URL.createObjectURL(blob));}
    state.selectedId=(mode==='insert'?newPages[newPages.length-1]:newPages[0]).id;state.selectedPanelId=null;
    pdfImportState.file=null;
    $('#pdf-import-overlay').hidden=true;
    dirty();renderAll();
    toast(newPages.length+' páginas importadas · Puedes sustituir una por MP4');
  }catch(error){
    if(error.name==='AbortError'){toast('Importación cancelada. Tu cómic no cambió.');$('#pdf-import-overlay').hidden=true;pdfImportState.file=null;}
    else{console.error(error);toast('No se pudo importar el PDF: '+(error.message||error),true);$('#pdf-import-progress-text').textContent='No se pudo importar. Comprueba el archivo o vuelve a intentarlo.';}
  }finally{
    pdfImportState.busy=false;pdfImportState.controller=null;
    btn.disabled=false;btn.textContent='Importar páginas';cancel.textContent='Cancelar';
    document.querySelectorAll('input[name="pdf-import-mode"],#pdf-import-cover,#pdf-import-back').forEach(e=>e.disabled=false);
  }
}
function addPage(type='page'){const p=newPage(type),idx=state.project.pages.findIndex(v=>v.id===state.selectedId);state.project.pages.splice(idx+1,0,p);state.selectedId=p.id;state.selectedPanelId=null;dirty();renderAll();}
function applyTemplate(template){const p=getPage();if(!p||!confirmIfReplace(p))return;p.panels=template.rects.map(([x,y,w,h],i)=>({id:uid(),x,y,w,h,mediaId:null,fit:'cover',z:i+1}));state.selectedPanelId=p.panels[0]?.id;dirty();renderAll();}
function confirmIfReplace(p){return !p.panels.some(v=>v.mediaId)||confirm('Este diseño reemplazará los paneles actuales y sus posiciones. Los archivos del proyecto no se borrarán. ¿Continuar?');}
function setupTemplates(){const parent=$('#templates');TEMPLATES.forEach(t=>{const btn=document.createElement('button');btn.className='template-btn';btn.title=t.label;const area=document.createElement('div');area.className='template-preview';area.style.position='relative';t.rects.forEach(([x,y,w,h])=>{const cell=document.createElement('span');cell.style.position='absolute';Object.assign(cell.style,{left:x+'%',top:y+'%',width:w+'%',height:h+'%'});area.appendChild(cell);});const label=document.createElement('small');label.textContent=t.label;btn.append(area,label);btn.addEventListener('click',()=>applyTemplate(t));parent.appendChild(btn);});}
function addPanel(){const p=getPage();if(p.mode!=='panels')return;const n=p.panels.length;const panel={id:uid(),x:8+(n%4)*8,y:10+(n%4)*8,w:45,h:40,mediaId:null,fit:'cover',z:n+1};p.panels.push(panel);state.selectedPanelId=panel.id;dirty();renderAll();}
function saveState(){const p=state.project;return JSON.parse(JSON.stringify(p));}
function referencedMedia(){const ids=new Set();for(const p of state.project.pages){if(p.mode==='full'&&p.mediaId)ids.add(p.mediaId);if(p.mode==='panels')for(const item of p.panels)if(item.mediaId)ids.add(item.mediaId);}return [...ids].filter(id=>state.files.has(id));}
function mediaPath(id){const meta=state.project.media[id],ext=meta?.mime==='video/mp4'?'.mp4':meta?.mime==='video/webm'?'.webm':meta?.mime==='image/png'?'.png':meta?.mime==='image/jpeg'?'.jpg':meta?.mime==='image/gif'?'.gif':'.webp';return `assets/${id}${ext}`;}
function projectManifest(){const p=saveState();p.media={};for(const id of referencedMedia())p.media[id]={...state.project.media[id],path:mediaPath(id)};return p;}
async function exportProject(){const manifest=projectManifest();const entries=[{name:'project.json',data:SeqZip.encoder.encode(JSON.stringify(manifest,null,2))}];for(const id of Object.keys(manifest.media))entries.push({name:manifest.media[id].path,data:state.files.get(id)});download(await SeqZip.make(entries),basename(state.project.title)+'.seqlab');$('#save-status').textContent='Proyecto guardado en archivo .seqlab';toast('Proyecto editable descargado');}
async function openProject(file){try{const files=await SeqZip.read(file),manifestRaw=files.get('project.json');if(!manifestRaw)throw Error('Falta project.json');const project=JSON.parse(new TextDecoder().decode(manifestRaw));if(project.version!==1||!Array.isArray(project.pages)||!project.media)throw Error('Versión de proyecto incompatible');for(const url of state.urls.values())URL.revokeObjectURL(url);state.urls.clear();state.files.clear();for(const [id,meta] of Object.entries(project.media)){const bytes=files.get(meta.path);if(!bytes)throw Error(`Falta archivo: ${meta.path}`);const blob=new Blob([bytes],{type:meta.mime});state.files.set(id,blob);state.urls.set(id,URL.createObjectURL(blob));}
    state.project=project;state.selectedId=project.pages[0]?.id;state.selectedPanelId=null;$('#project-title').value=project.title;renderAll();$('#save-status').textContent='Proyecto cargado · Guardado en tu equipo';toast('Proyecto editable abierto');}catch(e){toast('No se pudo abrir el proyecto: '+e.message,true);}}
async function exportHtml(){const manifest=projectManifest();const entries=[];const urls={};for(const id of Object.keys(manifest.media)){const path=manifest.media[id].path;urls[id]=path;entries.push({name:path,data:state.files.get(id)});}let readerJS,readerCSS,curlJS,curlLicense;
  try{
    const read=async path=>{const response=await fetch(path);if(!response.ok)throw Error('No se pudo cargar '+path);return response.text();};
    [readerJS,readerCSS,curlJS,curlLicense]=await Promise.all([
      read('./reader.js?v=1.6'),read('./reader.css?v=1.6'),
      read('./vendor/page-flip.browser.js?v=1.6'),read('./vendor/STPAGEFLIP-LICENSE.txt')
    ]);
  }catch(e){throw Error('No se pudieron incluir los archivos del lector. Abre Sequential Lab desde GitHub Pages y actualiza la página. '+e.message);}
  // Guard against accidental embedded script closure from user-controlled titles.
  const json=JSON.stringify(manifest).replace(/</g,'\\u003c'),urlJson=JSON.stringify(urls).replace(/</g,'\\u003c');
  const html=`<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#10141b"><title>${(manifest.title||'Mi cómic').replace(/[&<>"']/g,'')}</title><link rel="stylesheet" href="reader.css"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#10141b}#standalone-reader{position:fixed;inset:0}</style></head><body><div id="standalone-reader"></div><script>window.SEQUENTIAL_COMIC=${json};window.SEQUENTIAL_MEDIA_URLS=${urlJson};<\/script><script src="page-flip.browser.js"><\/script><script src="reader.js"><\/script></body></html>`;
  entries.push({name:'index.html',data:SeqZip.encoder.encode(html)},{name:'reader.js',data:SeqZip.encoder.encode(readerJS)},{name:'reader.css',data:SeqZip.encoder.encode(readerCSS)},{name:'page-flip.browser.js',data:SeqZip.encoder.encode(curlJS)},{name:'STPAGEFLIP-LICENSE.txt',data:SeqZip.encoder.encode(curlLicense)});download(await SeqZip.make(entries),basename(state.project.title)+'-web.zip');toast('Cómic HTML descargado · listo para GitHub Pages');}
const imageCache=new Map();async function sourceFor(id){const meta=state.project.media[id],url=state.urls.get(id);if(!meta||!url)return null;if(imageCache.has(id))return imageCache.get(id);
  let source;if(meta.type==='video'){source=document.createElement('video');source.muted=true;source.playsInline=true;source.preload='auto';source.src=url;await new Promise((resolve,reject)=>{if(source.readyState>=2)return resolve();let timer=setTimeout(()=>reject(Error('No se pudo extraer el primer fotograma de '+meta.name)),12000);source.addEventListener('loadeddata',()=>{clearTimeout(timer);resolve();},{once:true});source.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Video incompatible con este navegador: '+meta.name));},{once:true});source.load();});}
  else {source=new Image();source.src=url;await source.decode();}
  imageCache.set(id,source);return source;
}
function imageDraw(ctx,source,x,y,w,h,fit){const sw=source.videoWidth||source.naturalWidth,sh=source.videoHeight||source.naturalHeight;if(!sw||!sh)return;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();const scale=fit==='contain'?Math.min(w/sw,h/sh):Math.max(w/sw,h/sh),dw=sw*scale,dh=sh*scale;ctx.drawImage(source,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore();}
async function renderPageToCanvas(page){const ratio=Number(state.project.ratio)*(page.type==='spread'?2:1),h=1400,w=Math.round(h*ratio),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle=page.bg||'#f8f4ea';ctx.fillRect(0,0,w,h);
  if(page.mode==='full'){const source=await sourceFor(page.mediaId);if(source)imageDraw(ctx,source,0,0,w,h,'contain');}
  else for(const panel of page.panels){const x=panel.x/100*w,y=panel.y/100*h,pw=panel.w/100*w,ph=panel.h/100*h;ctx.fillStyle='#e4dfd6';ctx.fillRect(x,y,pw,ph);const source=await sourceFor(panel.mediaId);if(source)imageDraw(ctx,source,x,y,pw,ph,panel.fit||'cover');ctx.strokeStyle='#19191b';ctx.lineWidth=3;ctx.strokeRect(x,y,pw,ph);}
  const n=numbersMap().get(page.id);if(state.project.numbering==='auto'&&!page.hideNumber&&n&&page.type!=='cover'&&page.type!=='back'){ctx.fillStyle='#30302c';ctx.font='22px Georgia,serif';ctx.textAlign='center';if(page.type==='spread'){ctx.fillText(String(n),w*.25,h-20);ctx.fillText(String(n+1),w*.75,h-20);}else ctx.fillText(String(n),w/2,h-20);}
  return canvas;
}
async function exportPdf(){const pages=[];for(let i=0;i<state.project.pages.length;i++){const page=state.project.pages[i];const canvas=await renderPageToCanvas(page);pages.push({width:canvas.width,height:canvas.height,jpeg:canvas.toDataURL('image/jpeg',.89)});toast(`Preparando PDF · ${i+1}/${state.project.pages.length}`);}download(SeqPdf.make(pages),basename(state.project.title)+'.pdf');toast('PDF descargado · videos convertidos a primer fotograma');}
function setupHandlers(){ $('#project-title').addEventListener('input',e=>{state.project.title=e.target.value;dirty();});$('#add-page').onclick=()=>addPage();$('#add-cover').onclick=()=>addPage('cover');$('#add-back').onclick=()=>addPage('back');$('#add-spread').onclick=()=>addPage('spread');$('#page-type').onchange=e=>{getPage().type=e.target.value;dirty();renderAll();};
  $('#mode-full').onclick=()=>{getPage().mode='full';state.selectedPanelId=null;dirty();renderAll();};$('#mode-panels').onclick=()=>{const p=getPage();p.mode='panels';if(!p.panels.length)p.panels=[{id:uid(),x:2,y:2,w:96,h:96,mediaId:null,fit:'cover',z:1}];state.selectedPanelId=p.panels[0].id;dirty();renderAll();};
  $('#upload-full').onchange=e=>{attachFile(e.target.files?.[0],getPage());e.target.value='';};$('#remove-full').onclick=()=>{getPage().mediaId=null;dirty();renderAll();};$('#upload-panel').onchange=e=>{const panel=getPanel();if(panel)attachFile(e.target.files?.[0],panel);e.target.value='';};
  $('#add-panel').onclick=addPanel;$('#remove-panel').onclick=()=>{const p=getPage();p.panels=p.panels.filter(x=>x.id!==state.selectedPanelId);state.selectedPanelId=null;dirty();renderAll();};$('#panel-front').onclick=()=>{const panel=getPanel();if(!panel)return;panel.z=Math.max(0,...getPage().panels.map(v=>v.z||0))+1;dirty();renderCanvas();};$('#panel-fit').onchange=e=>{const panel=getPanel();if(panel){panel.fit=e.target.value;dirty();renderCanvas();}};
  for(const key of ['x','y','w','h'])$('#panel-'+key).addEventListener('change',e=>{const p=getPanel();if(!p)return;let v=Number(e.target.value);if(!Number.isFinite(v))return;v=Math.max(key==='x'||key==='y'?0:2,Math.min(v,key==='x'?100-p.w:key==='y'?100-p.h:key==='w'?100-p.x:100-p.y));p[key]=v;dirty();renderCanvas();renderInspector();});
  $('#page-bg').oninput=e=>{getPage().bg=e.target.value;dirty();renderCanvas();};$('#numbering').onchange=e=>{state.project.numbering=e.target.value;dirty();renderCanvas();};$('#hide-number').onchange=e=>{getPage().hideNumber=e.target.checked;dirty();renderCanvas();};$('#page-ratio').onchange=e=>{state.project.ratio=Number(e.target.value);dirty();renderCanvas();};
  $('#move-up').onclick=()=>shiftPage(-1);$('#move-down').onclick=()=>shiftPage(1);$('#duplicate-page').onclick=()=>{const p=getPage(),clone=JSON.parse(JSON.stringify(p));clone.id=uid();clone.panels.forEach(v=>v.id=uid());const i=state.project.pages.indexOf(p);state.project.pages.splice(i+1,0,clone);state.selectedId=clone.id;state.selectedPanelId=null;dirty();renderAll();};$('#delete-page').onclick=()=>deletePageById(state.selectedId);
  $('#new-project').onclick=()=>{if(!confirm('¿Empezar un cómic nuevo? Guarda primero tu proyecto .seqlab si deseas conservarlo.'))return;state.project=fresh();state.selectedId=state.project.pages[1].id;state.selectedPanelId=null;for(const url of state.urls.values())URL.revokeObjectURL(url);state.files.clear();state.urls.clear();imageCache.clear();$('#project-title').value=state.project.title;dirty();renderAll();};
  $('#import-pdf-file').addEventListener('change',e=>{openPdfImportDialog(e.target.files?.[0]);e.target.value='';});
  document.querySelectorAll('input[name="pdf-import-mode"]').forEach(input=>input.addEventListener('change',refreshPdfImportOptions));
  $('#pdf-import-confirm').onclick=importPdfDocument;
  $('#pdf-import-cancel').onclick=closePdfImportDialog;
  $('#pdf-import-overlay').addEventListener('click',e=>{if(e.target===$('#pdf-import-overlay'))closePdfImportDialog();});
  $('#save-project').onclick=()=>runExport(exportProject);$('#open-project').onchange=e=>{if(e.target.files?.[0])openProject(e.target.files[0]);e.target.value='';};
  $('#export-menu').onclick=()=>{$('#export-popover').hidden=!$('#export-popover').hidden;};for(const [id,fn] of [['export-project',exportProject],['export-html',exportHtml],['export-pdf',exportPdf]])$(('#'+id)).onclick=()=>{$('#export-popover').hidden=true;runExport(fn);};
  $('#preview-reader').onclick=()=>{const overlay=$('#reader-overlay');overlay.hidden=false;state.reader=SequentialReader.mount($('#reader-root'),state.project,Object.fromEntries(state.urls));};$('#close-reader').onclick=()=>{state.reader?.destroy();state.reader=null;$('#reader-overlay').hidden=true;};
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#reader-overlay').hidden)$('#close-reader').click();});window.addEventListener('resize',()=>{if($('#reader-overlay').hidden)renderCanvas();});
  $('#page-drop').addEventListener('dragover',e=>{e.preventDefault();e.currentTarget.classList.add('dragover');});$('#page-drop').addEventListener('dragleave',e=>e.currentTarget.classList.remove('dragover'));$('#page-drop').addEventListener('drop',e=>{e.preventDefault();e.currentTarget.classList.remove('dragover');if(e.dataTransfer.files[0])attachFile(e.dataTransfer.files[0],getPage());});
  $('#editor-page').addEventListener('click',e=>{if(e.target===$('#editor-page')){state.selectedPanelId=null;renderAll();}});
}
function shiftPage(step){const i=state.project.pages.findIndex(p=>p.id===state.selectedId),j=i+step;if(j<0||j>=state.project.pages.length)return;[state.project.pages[i],state.project.pages[j]]=[state.project.pages[j],state.project.pages[i]];dirty();renderAll();}
async function runExport(fn){const btn=$('#export-menu');btn.disabled=true;const old=btn.textContent;btn.textContent='Preparando…';try{await fn();}catch(e){console.error(e);toast('No se pudo exportar: '+(e?.message||e),true);}finally{btn.disabled=false;btn.textContent=old;}}
setupTemplates();setupHandlers();renderAll();
})();
