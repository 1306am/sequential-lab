/* Minimal JPEG-in-PDF writer: every page is rendered to canvas by the editor,
   then embedded as a standard DCTDecode JPEG XObject. No external CDN needed. */
(function(){
const text=(s)=>new TextEncoder().encode(s);
function join(parts){const n=parts.reduce((a,p)=>a+p.length,0),out=new Uint8Array(n);let x=0;for(const p of parts){out.set(p,x);x+=p.length;}return out;}
function dataBytes(url){const b64=url.split(',')[1],raw=atob(b64),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
function makePdf(pages){const parts=[text('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')],offsets=[0];let cursor=parts[0].length;const objs=[];function add(bytes){objs.push(bytes);}function push(part){parts.push(part);cursor+=part.length;}
  add(text('<< /Type /Catalog /Pages 2 0 R >>'));
  add(text('<< /Type /Pages /Kids ['+pages.map((_,i)=>`${3+i*3} 0 R`).join(' ') + '] /Count '+pages.length+' >>'));
  pages.forEach((p,i)=>{const pg=3+i*3,im=pg+1,cs=pg+2,w=p.width,h=p.height,img=dataBytes(p.jpeg),ptw=(w/h)*720,pth=720;
    add(text(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptw.toFixed(2)} ${pth}] /Resources << /XObject << /Im${i} ${im} 0 R >> >> /Contents ${cs} 0 R >>`));
    add(join([text(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`),img,text('\nendstream')]));
    const draw=text(`q\n${ptw.toFixed(2)} 0 0 ${pth} 0 0 cm\n/Im${i} Do\nQ\n`);add(join([text(`<< /Length ${draw.length} >>\nstream\n`),draw,text('endstream')]));
  });
  objs.forEach((b,i)=>{offsets.push(cursor);push(text(`${i+1} 0 obj\n`));push(b);push(text('\nendobj\n'));});
  const xref=cursor;push(text(`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`));for(const off of offsets.slice(1))push(text(String(off).padStart(10,'0')+' 00000 n \n'));push(text(`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));return new Blob(parts,{type:'application/pdf'});
}
window.SeqPdf={make:makePdf};
})();
