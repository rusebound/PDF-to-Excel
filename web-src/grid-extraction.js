import {OPS} from "pdfjs-dist";

function multiply(a,b){
  return [
    a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
    a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
    a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]
  ];
}
function point(t,x,y){return [t[0]*x+t[2]*y+t[4],t[1]*x+t[3]*y+t[5]];}
function cluster(items,tolerance=1.1){
  const groups=[];
  for(const n of items.sort((a,b)=>a-b)){
    if(!Number.isFinite(n))continue;
    if(!groups.length || n-groups[groups.length-1][groups[groups.length-1].length-1]>tolerance){
      groups.push([n]);
    }else groups[groups.length-1].push(n);
  }
  return groups.map(g=>g.reduce((a,b)=>a+b,0)/g.length);
}
function intervalIndex(edges,v) {
  if(v<edges[0]||v>edges[edges.length-1])return -1;
  let low=0, high=edges.length-2;
  while(low<=high){
    const mid=(low+high)>>1;
    if(v<edges[mid])high=mid-1;
    else if(v>=edges[mid+1])low=mid+1;
    else return mid;
  }
  return -1;
}
async function detectGrid(page){
  const ops=await page.getOperatorList();
  let current=[1,0,0,1,0,0],stack=[];
  const vertical=[],horizontal=[];
  for(let i=0;i<ops.fnArray.length;i++){
    const op=ops.fnArray[i],args=ops.argsArray[i];
    if(op===OPS.save){stack.push(current.slice());continue;}
    if(op===OPS.restore){current=stack.pop()||[1,0,0,1,0,0];continue;}
    if(op===OPS.transform){current=multiply(current,args);continue;}
    if(op!==OPS.constructPath || !args || !args[2])continue;
    const b=args[2],x0=Number(b[0]),y0=Number(b[1]),x1=Number(b[2]),y1=Number(b[3]);
    if(![x0,y0,x1,y1].every(Number.isFinite))continue;
    const points=[
      point(current,x0,y0),point(current,x1,y0),
      point(current,x1,y1),point(current,x0,y1)
    ];
    const xx=points.map(p=>p[0]),yy=points.map(p=>p[1]);
    const w=Math.max(...xx)-Math.min(...xx),h=Math.max(...yy)-Math.min(...yy);
    if(w<2.2 && h>12)vertical.push({pos:(Math.max(...xx)+Math.min(...xx))/2,size:h});
    if(h<2.2 && w>90)horizontal.push({pos:(Math.max(...yy)+Math.min(...yy))/2,size:w});
  }
  const maxV=Math.max(0,...vertical.map(v=>v.size));
  const maxH=Math.max(0,...horizontal.map(v=>v.size));
  if(maxV<20 || maxH<200)return null;
  const xs=cluster(vertical.filter(v=>v.size>=maxV*.75).map(v=>v.pos));
  const ys=cluster(horizontal.filter(v=>v.size>=maxH*.75).map(v=>v.pos));
  if(xs.length<3||xs.length>25||ys.length<2||ys.length>200)return null;
  return {xs,ys};
}
function wordsFromItem(item,measure){
  const raw=String(item.str||"").trim();
  if(!raw)return [];
  if(Math.abs(Math.atan2(item.transform[1],item.transform[0]))>.08)return [];
  const parts=[];
  const iterator=/\S+/gu;
  for(const m of raw.matchAll(iterator))parts.push({text:m[0],start:m.index,end:m.index+m[0].length});
  if(parts.length===0)return [];
  const x=item.transform[4],y=item.transform[5],width=Number(item.width)||0;
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(width)||width<0)return [];
  const style=measure.styles[item.fontName];
  const family=style?.fontFamily||"sans-serif";
  const size=Math.max(4,Math.hypot(item.transform[0],item.transform[1]));
  const canvas=measure.context;
  canvas.font=size+"px "+family;
  const total=canvas.measureText(raw).width||raw.length;
  const result=[];
  for(const p of parts){
    const prefix=raw.slice(0,p.start);
    const upto=raw.slice(0,p.end);
    const a=canvas.measureText(prefix).width/total;
    const b=canvas.measureText(upto).width/total;
    result.push({text:p.text,x:x+(a+b)*width*.5,y});
  }
  return result;
}

export async function extractVectorGridPage(page){
  const grid=await detectGrid(page);
  if(!grid)return null;
  const {xs,ys}=grid;
  const nrows=ys.length-1,ncols=xs.length-1;
  const tokens=Array.from({length:nrows},()=>Array.from({length:ncols},()=>[]));
  const text=await page.getTextContent({disableCombineTextItems:false});
  const measure={context:document.createElement("canvas").getContext("2d"),styles:text.styles};
  let rotated=0;
  for(const item of text.items){
    if(!item.str||!item.transform)continue;
    if(Math.abs(Math.atan2(item.transform[1],item.transform[0]))>.08){rotated++;continue;}
    for(const word of wordsFromItem(item,measure)){
      const col=intervalIndex(xs,word.x);
      const ascendingRow=intervalIndex(ys,word.y);
      if(col<0||ascendingRow<0)continue;
      const row=nrows-1-ascendingRow;
      tokens[row][col].push(word);
    }
  }
  let rows=tokens.map(cells=>cells.map((contents,col)=>{
    const lines=[];
    for(const word of contents.sort((a,b)=>b.y-a.y||a.x-b.x)){
      const last=lines[lines.length-1];
      if(last&&Math.abs(last.y-word.y)<2.5)last.words.push(word);
      else lines.push({y:word.y,words:[word]});
    }
    const items=lines.map(line=>line.words.sort((a,b)=>a.x-b.x).map(word=>word.text).join(" "));
    return (col===0?items.join("").replace(/\s+/g,""):items.join(" ")).trim();
  })).filter(row=>row.some(x=>x));
  // Some source PDFs contain an extra blank bordered column on the right.
  if(rows.length && rows[0].length===13 && rows.every(row=>!row[12])){
    rows=rows.map(row=>row.slice(0,12));
  }
  if(rows.length&&/^takip\s*no$/i.test(rows[0][0].replace(/([a-z])([A-Z])/g,"$1 $2").trim())){
    rows.shift();
  }else if(rows.length&&rows[0][0].toLocaleLowerCase("tr").includes("takip")){
    rows.shift();
  }
  return {rows,columns:rows[0]?.length||ncols,ignoredRotated:rotated};
}
