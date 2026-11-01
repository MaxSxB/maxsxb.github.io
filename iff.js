// Decode the original ILBM resources, including their indexed mission zones.
async function readIFF(url){
  const bytes = Uint8Array.from(atob(RESOURCES[url]),c=>c.charCodeAt(0)), view = new DataView(bytes.buffer);
  const tag = offset => String.fromCharCode(...bytes.slice(offset,offset+4));
  if(tag(0)!=='FORM' || tag(8)!=='ILBM') throw new Error('Expected an ILBM resource');
  const chunks = {};
  for(let p=12;p<bytes.length;){const size=view.getUint32(p+4);chunks[tag(p)]=bytes.slice(p+8,p+8+size);p+=8+size+(size&1);}
  const header = new DataView(chunks.BMHD.buffer), width=header.getUint16(0), height=header.getUint16(2), planes=header.getUint8(8), compression=header.getUint8(10);
  if(header.getUint8(9)!==0 || planes>8) throw new Error('Unexpected ILBM plane layout');
  const stride = Math.ceil(width/16)*2, raw = new Uint8Array(stride*height*planes), body=chunks.BODY;
  if(compression===0) raw.set(body);
  else if(compression===1){
    let input=0,output=0;
    while(output<raw.length){const n=body[input++];if(n<128){raw.set(body.subarray(input,input+n+1),output);input+=n+1;output+=n+1;}else if(n>128){raw.fill(body[input++],output,output+257-n);output+=257-n;}}
  }else throw new Error('Unknown ILBM compression');
  const pixels = new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let plane=0;plane<planes;plane++)for(let x=0;x<width;x++)pixels[y*width+x]|=((raw[(y*planes+plane)*stride+(x>>3)]>>(7-(x&7)))&1)<<plane;
  return {width,height,pixels,palette:chunks.CMAP};
}
function paintIFF(canvas, resource){
  canvas.width=resource.width;canvas.height=resource.height;
  const ctx=canvas.getContext('2d'),img=ctx.createImageData(resource.width,resource.height);
  resource.pixels.forEach((color,i)=>{img.data.set(resource.palette.subarray(color*3,color*3+3),i*4);img.data[i*4+3]=255;});ctx.putImageData(img,0,0);
}

// Fond de briefing : capture aérienne orthographique de la carte (PNG).
async function paintAerial(canvas, url){
  const image = new Image(); image.src = url; await image.decode();
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  canvas.getContext('2d').drawImage(image, 0, 0);
}
