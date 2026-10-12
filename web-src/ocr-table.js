let tesseractWorker=null;
let loading=null;

async function installLocalOCR() {
  if(window.Tesseract?.createWorker)return;
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src=new URL("./vendor/tesseract.min.js",document.baseURI).href;
    script.onload=()=>window.Tesseract?.createWorker?resolve():reject(new Error("Yerel OCR motoru yüklenemedi."));
    script.onerror=()=>reject(new Error("Türkçe OCR motorunun yerel dosyalarına erişilemiyor."));
    document.head.append(script);
  });
  try{await loading;}finally{loading=null;}
}
async function worker() {
  if(tesseractWorker)return tesseractWorker;
  await installLocalOCR();
  tesseractWorker=await window.Tesseract.createWorker("tur",1,{
    workerPath:new URL("./vendor/worker.min.js",document.baseURI).href,
    corePath:new URL("./vendor/core",document.baseURI).href,
    langPath:new URL("./vendor/lang",document.baseURI).href,
    cacheMethod:"none",workerBlobURL:false,gzip:true
  });
  return tesseractWorker;
}
function median(numbers) {
 const a=[...numbers].sort((x,y)=>x-y);
 return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2:0;
}
function wordsOf(data){
 const list=[];
 function add(word,lineId,blockId){
  const box=word.bbox||word.box;
  const t=String(word.text||"").trim();
  if(!t||!box)return;
  const x=Number(box.x0??box.left), y=Number(box.y0??box.top);
  const x1=Number(box.x1??box.right),y1=Number(box.y1??box.bottom);
  if(![x,y,x1,y1].every(Number.isFinite))return;
  list.push({text:t,x,y,w:x1-x,h:y1-y,line:lineId,block:blockId});
 }
 if(Array.isArray(data.words)&&data.words.length){
  data.words.forEach((w,i)=>add(w,w.line_num??w.lineNum??i,w.block_num??w.blockNum??0));
 }else if(Array.isArray(data.blocks)){
  data.blocks.forEach((block,bi)=>block.paragraphs?.forEach((paragraph,pi)=>
    paragraph.lines?.forEach((line,li)=>line.words?.forEach(w=>add(w,li,bi+"_"+pi)))));
 }
 return list;
}
function ocrTable(words) {
 if(words.length<4)return null;
 const groups=new Map();
 for(const w of words){
  const k=String(w.block)+"_"+String(w.line);
  const group=groups.get(k)||[];
  group.push(w);groups.set(k,group);
 }
 const lines=[...groups.values()].sort((a,b)=>Math.min(...a.map(w=>w.y))-Math.min(...b.map(w=>w.y)));
 const segments=[];
 for(const line of lines){
  const order=[...line].sort((a,b)=>a.x-b.x);
  const threshold=Math.max(25,median(order.map(w=>w.h))*2.3);
  const row=[];let current=[],end=0;
  for(const w of order){
   if(current.length && w.x-end>threshold){
    row.push({x:current[0].x,text:current.map(v=>v.text).join(" ")});
    current=[];
   }
   current.push(w);
   end=Math.max(end,w.x+w.w);
  }
  if(current.length)row.push({x:current[0].x,text:current.map(v=>v.text).join(" ")});
  segments.push(row);
 }
 const freqs=new Map();
 for(const r of segments)if(r.length>=2)freqs.set(r.length,(freqs.get(r.length)||0)+1);
 const best=[...freqs.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0];
 if(!best || best[0]>30 || best[1]<2)return null;
 const columns=best[0],reference=segments.filter(s=>s.length===columns);
 const anchors=Array.from({length:columns},(_,i)=>median(reference.map(r=>r[i].x)));
 if(anchors.some((x,i)=>i>0&&x-anchors[i-1]<16))return null;
 const rows=[];
 for(const cells of segments){
  if(cells.length<2)continue;
  const record=Array(columns).fill("");
  for(const cell of cells){
   let column=0,bestDist=Infinity;
   for(let j=0;j<columns;j++){
    const distance=Math.abs(cell.x-anchors[j]);
    if(distance<bestDist){column=j;bestDist=distance;}
   }
   record[column]+=(record[column]?" ":"")+cell.text;
  }
  if(record.some(v=>v))rows.push(record);
 }
 return rows.length>=2?rows:null;
}

function clusterDarkLines(counts, minCount) {
  const result=[];
  let first=-1,last=-1;
  const push=()=>{
    if(first>=0)result.push((first+last)/2);
    first=-1;last=-1;
  };
  for(let i=0;i<counts.length;i++){
    if(counts[i]>=minCount){
      if(first<0)first=i;
      last=i;
    }else if(first>=0 && i-last>3)push();
  }
  push();
  return result;
}
function bin(edges,v) {
  if(!edges||v<edges[0]||v>edges[edges.length-1])return -1;
  for(let i=0;i<edges.length-1;i++)if(v>=edges[i]&&v<edges[i+1])return i;
  return -1;
}
function rasterTable(canvas,words) {
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  const {width,height}=canvas;
  if(width*height>12_000_000)return null;
  const rgba=ctx.getImageData(0,0,width,height).data;
  const xCount=new Uint32Array(width),yCount=new Uint32Array(height);
  for(let y=0;y<height;y++){
    const offset=y*width*4;
    for(let x=0;x<width;x++){
      const p=offset+x*4;
      if(rgba[p]<110&&rgba[p+1]<110&&rgba[p+2]<110){
        xCount[x]++;yCount[y]++;
      }
    }
  }
  const xs=clusterDarkLines(xCount,Math.floor(height*.36));
  const ys=clusterDarkLines(yCount,Math.floor(width*.36));
  if(xs.length<3||xs.length>65||ys.length<2||ys.length>200)return null;
  if(xs.at(-1)-xs[0]<width*.35||ys.at(-1)-ys[0]<height*.15)return null;
  const rows=Array.from({length:ys.length-1},()=>Array.from({length:xs.length-1},()=>[]));
  for(const word of words){
    const cx=word.x+word.w/2,cy=word.y+word.h/2;
    const r=bin(ys,cy),c=bin(xs,cx);
    if(r>=0&&c>=0)rows[r][c].push(word);
  }
  let out=rows.map((cells,colIdx)=>cells.map((tokens,c)=>{
    if(!tokens.length)return "";
    const ordered=tokens.sort((a,b)=>a.y-b.y||a.x-b.x);
    const lines=[];
    for(const w of ordered){
      const prev=lines.at(-1);
      if(prev&&Math.abs(prev.y-w.y)<Math.max(3,w.h*.34))prev.words.push(w);
      else lines.push({y:w.y,words:[w]});
    }
    const chunks=lines.map(l=>l.words.sort((a,b)=>a.x-b.x).map(w=>w.text).join(" ").trim()).filter(Boolean);
    if(c===0&&chunks.length<=3&&chunks.every(x=>/^[A-Za-z0-9]+$/.test(x)))return chunks.join("");
    return chunks.join("\n");
  })).filter(row=>row.some(x=>x.trim()));
  if(out.length && xs.length-1===13 && out.every(row=>!row[12]))out=out.map(r=>r.slice(0,12));
  if(out.length&&/takip\s*no/i.test(out[0][0]))out.shift();
  if(out.length < 2 || !out.some(row=>row.filter(Boolean).length>=2))return null;
  return {rows:out,estimatedRows:ys.length-1};
}

export async function extractOCRTable(page,{cancel=()=>false,progress=()=>{}}={}) {
 if(cancel())throw new DOMException("İşlem durduruldu.","AbortError");
 const viewport0=page.getViewport({scale:1});
 const scale=Math.max(1.5,Math.min(3,2400/Math.max(viewport0.width,viewport0.height)));
 const viewport=page.getViewport({scale});
 const canvas=document.createElement("canvas");
 canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 const ctx=canvas.getContext("2d",{willReadFrequently:false});
 await page.render({canvasContext:ctx,viewport}).promise;
 if(cancel())throw new DOMException("İşlem durduruldu.","AbortError");
 const blob=await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error("PDF görüntüsü oluşturulamadı.")),"image/png"));
 progress("Türkçe metin tanınıyor...");
 const engine=await worker();
 const result=await engine.recognize(blob,{}, {text:true,blocks:true,words:true});
 const words=wordsOf(result.data||{});
 const grid=rasterTable(canvas,words);
 const table=grid?.rows||ocrTable(words);
 return {rows:table||[],wordCount:words.length,method:grid?"ocr/raster-grid":"ocr/lines",estimatedRows:grid?.estimatedRows||null};
}
export async function terminateOCR() {
 if(tesseractWorker){await tesseractWorker.terminate();tesseractWorker=null;}
}
