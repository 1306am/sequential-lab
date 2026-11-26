/* PDF import adapter. PDF.js is loaded only on demand; imported pages become regular JPG media. */
(function(){
  'use strict';
  const PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  let libraryPromise;
  function ensureLibrary(){
    if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
    if(!libraryPromise){
      libraryPromise=new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src=PDFJS_BASE+'pdf.min.js';
        script.async=true;
        script.onload=()=>window.pdfjsLib?resolve(window.pdfjsLib):reject(Error('PDF.js no se inicializó.'));
        script.onerror=()=>reject(Error('No se pudo descargar el lector PDF. Revisa tu conexión a Internet.'));
        document.head.appendChild(script);
      }).catch(error=>{libraryPromise=null;throw error;});
    }
    return libraryPromise;
  }
  function asBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('No se pudo generar la imagen de una página.')),'image/jpeg',.92));}
  async function rasterize(file,{onProgress=()=>{},signal}={}){
    if(!file||(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'))throw Error('Selecciona un archivo PDF.');
    if(file.size>100*1024*1024)throw Error('El PDF supera 100 MB. Divide el archivo en partes más pequeñas.');
    const lib=await ensureLibrary();
    lib.GlobalWorkerOptions.workerSrc=PDFJS_BASE+'pdf.worker.min.js';
    if(signal?.aborted)throw new DOMException('Importación cancelada','AbortError');
    const task=lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
    let pdfDocument;
    try{
      pdfDocument=await task.promise;
      if(pdfDocument.numPages>120)throw Error('Este PDF tiene más de 120 páginas. Importa un volumen más pequeño.');
      const pages=[];
      for(let i=1;i<=pdfDocument.numPages;i++){
        if(signal?.aborted)throw new DOMException('Importación cancelada','AbortError');
        onProgress(i-1,pdfDocument.numPages);
        const page=await pdfDocument.getPage(i);
        const source=page.getViewport({scale:1});
        // Limit the largest edge to 1900 pixels; enough for most digital comics without enormous ZIPs.
        const scale=Math.min(3,1900/Math.max(source.width,source.height));
        const viewport=page.getViewport({scale});
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(viewport.width));
        canvas.height=Math.max(1,Math.round(viewport.height));
        const ctx=canvas.getContext('2d',{alpha:false});
        if(!ctx)throw Error('El navegador no pudo crear el lienzo de la página.');
        ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
        await page.render({canvasContext:ctx,viewport,background:'#ffffff'}).promise;
        const blob=await asBlob(canvas);
        pages.push({blob,width:source.width,height:source.height});
        canvas.width=0;canvas.height=0;page.cleanup();
        onProgress(i,pdfDocument.numPages);
      }
      return pages;
    }finally{
      if(pdfDocument)await pdfDocument.destroy();else await task.destroy();
    }
  }
  window.SeqPdfImport={rasterize};
})();