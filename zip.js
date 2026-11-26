/* Small dependency-free ZIP writer/reader. Files are stored without compression.
   This intentionally avoids losing student videos or relying on a hosted service. */
(function () {
  const encoder = new TextEncoder();
  const table = new Uint32Array(256);
  for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}
  function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
  function u16(view,pos,value){view.setUint16(pos,value,true);}
  function u32(view,pos,value){view.setUint32(pos,value>>>0,true);}
  function concat(chunks){const out=new Uint8Array(chunks.reduce((n,b)=>n+b.length,0));let p=0;for(const b of chunks){out.set(b,p);p+=b.length;}return out;}
  async function make(entries){const chunks=[],central=[];let offset=0;
    for(const entry of entries){const name=encoder.encode(entry.name),data=entry.data instanceof Uint8Array?entry.data:new Uint8Array(await entry.data.arrayBuffer());if(name.length>65535||data.length>0xffffffff)throw Error('Archivo ZIP demasiado grande');
      const crc=crc32(data),head=new Uint8Array(30+name.length),v=new DataView(head.buffer);
      u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x0800);u16(v,8,0);u32(v,14,crc);u32(v,18,data.length);u32(v,22,data.length);u16(v,26,name.length);head.set(name,30);
      chunks.push(head,data);
      const cent=new Uint8Array(46+name.length),cv=new DataView(cent.buffer);u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x0800);u32(cv,16,crc);u32(cv,20,data.length);u32(cv,24,data.length);u16(cv,28,name.length);u32(cv,42,offset);cent.set(name,46);central.push(cent);offset+=head.length+data.length;
    }
    const centralSize=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);u32(v,0,0x06054b50);u16(v,8,entries.length);u16(v,10,entries.length);u32(v,12,centralSize);u32(v,16,offset);
    return new Blob([...chunks,...central,end],{type:'application/zip'});
  }
  async function read(file){const bytes=new Uint8Array(await file.arrayBuffer()),dv=new DataView(bytes.buffer);let pos=bytes.length-22;while(pos>=0&&dv.getUint32(pos,true)!==0x06054b50)pos--;if(pos<0)throw Error('No es un ZIP válido');let cent=dv.getUint32(pos+16,true);const count=dv.getUint16(pos+10,true),result=new Map();
    for(let i=0;i<count;i++){if(dv.getUint32(cent,true)!==0x02014b50)throw Error('ZIP dañado');const method=dv.getUint16(cent+10,true),size=dv.getUint32(cent+20,true),nameSize=dv.getUint16(cent+28,true),extraSize=dv.getUint16(cent+30,true),commentSize=dv.getUint16(cent+32,true),local=dv.getUint32(cent+42,true),name=new TextDecoder().decode(bytes.slice(cent+46,cent+46+nameSize));if(method!==0)throw Error('Este archivo usa compresión no admitida. Abre un .seqlab guardado en Sequential Lab.');if(dv.getUint32(local,true)!==0x04034b50)throw Error('ZIP dañado');const start=local+30+dv.getUint16(local+26,true)+dv.getUint16(local+28,true);result.set(name,bytes.slice(start,start+size));cent+=46+nameSize+extraSize+commentSize;}
    return result;
  }
  window.SeqZip={make,read,encoder};
})();
