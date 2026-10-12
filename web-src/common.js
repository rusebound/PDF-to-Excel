import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
GlobalWorkerOptions.workerSrc = new URL("./pdf.worker.min.mjs", import.meta.url).href;

export function element(id) { return document.getElementById(id); }
export function setMessage(text, kind = "") {
  const node = element("status");
  node.textContent = text;
  node.dataset.kind = kind;
}
export function setProgress(pct) {
  const bar = element("progress");
  bar.value = Math.max(0, Math.min(100, Number(pct) || 0));
}
export function safeStem(name) {
  return (name || "belge").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ _.-]/g, "_").slice(0, 100);
}
export function downloadFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
export async function openPdf(file, {maxFileBytes = 52_428_800} = {}) {
  if (!file || !(file.name || "").toLowerCase().endsWith(".pdf")) throw new Error("PDF dosyası seçin.");
  if (file.size > maxFileBytes) throw new Error("Seçilen PDF bu işlem için izin verilen dosya boyutunu aşıyor.");
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (String.fromCharCode(...header).slice(0, 5) !== "%PDF-") throw new Error("Bu dosyada PDF imzası bulunamadı.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = getDocument({data: bytes, isEvalSupported:false, enableXfa:false, useSystemFonts:true});
  return task.promise;
}
export function mount({tool,title,subtitle,description,accept,action,features,limit="50 MB",maxFileBytes=52_428_800,multiple=false}) {
  document.title=title+" | Demirhan Özdemir";
  element("tool-title").textContent=title;
  element("hero-subtitle").textContent=subtitle;
  element("tool-description").textContent=description;
  element("primary").textContent=action;
  element("limit").textContent=limit;
  const choose=element("choose");
  choose.textContent=multiple?"PDF dosyaları seç":accept.includes("pdf")&&accept.includes("image")?"PDF veya görsel seç":accept.includes("image")?"Görsel seç":"PDF seç";
  const featuresList=element("features");
  for(const feature of features){const li=document.createElement("li");li.textContent=feature;featuresList.append(li);}
  const input=element("file");input.accept=accept;input.multiple=multiple;
  const primary=element("primary"),selected=element("selected");
  const app={
    file:null,files:[],busy:false,input,primary,
    valid(file){
      if(!file)return false;
      const name=(file.name||"").toLowerCase(),pdf=name.endsWith(".pdf"),img=/\.(png|jpe?g|webp|bmp)$/.test(name);
      if((pdf&&!accept.includes(".pdf"))||(img&&!accept.includes("image"))||(!pdf&&!img)){
        setMessage("Yalnızca desteklenen dosyaları seçin.","error");return false;
      }
      if(file.size>maxFileBytes){setMessage("Dosya boyutu bu işlemin sınırını aşıyor.","error");return false;}
      return true;
    },
    renderFiles(){
      selected.replaceChildren();
      if(multiple){
        const head=document.createElement("div");head.className="list-head";
        head.textContent=app.files.length+" PDF seçildi";selected.append(head);
        for(const [i,file] of app.files.entries()){
          const row=document.createElement("div");row.className="file-row";
          const label=document.createElement("span");label.textContent=file.name+" · "+(file.size/1_048_576).toFixed(1)+" MB";
          const remove=document.createElement("button");remove.type="button";remove.className="secondary file-remove";
          remove.textContent="Kaldır";remove.disabled=app.busy;
          remove.addEventListener("click",()=>{if(app.busy)return;app.files.splice(i,1);app.file=app.files[0]||null;app.renderFiles();});
          row.append(label,remove);selected.append(row);
        }
      }else if(app.file){
        selected.textContent=app.file.name+" · "+(app.file.size/1_048_576).toFixed(1)+" MB";
      }
      primary.disabled=app.busy||!app.files.length;
      choose.disabled=app.busy;
    },
    addFiles(files){
      if(app.busy)return;
      const list=Array.from(files||[]);
      if(!multiple){app.files=[];app.file=null;}
      for(const file of list){
        if(!app.valid(file))continue;
        if(app.files.some(f=>f.name===file.name&&f.size===file.size&&f.lastModified===file.lastModified))continue;
        app.files.push(file);if(!multiple)break;
      }
      app.file=app.files[0]||null;
      app.renderFiles();
      if(app.file){setMessage("Dosya yalnızca bu tarayıcının belleğinde seçildi.");setProgress(0);
        if(app.onSelected)Promise.resolve(app.onSelected(app.file)).catch(e=>setMessage(e.message||String(e),"error"));
      }
    },
    setFile(file){app.addFiles(file?[file]:[]);}
  };
  choose.addEventListener("click",()=>input.click());
  input.addEventListener("change",()=>{app.addFiles(input.files);input.value="";});
  const drop=element("drop");
  drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("dragging");});
  drop.addEventListener("dragleave",()=>drop.classList.remove("dragging"));
  drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("dragging");app.addFiles(e.dataTransfer?.files);});
  primary.addEventListener("click",async()=>{
    if(!app.files.length||!app.run||app.busy)return;
    app.busy=true;app.renderFiles();setMessage("Dosyalar yerel olarak işleniyor...");
    try{await app.run(multiple?[...app.files]:app.file);}
    catch(e){setMessage(e?.message||"Dönüştürme başarısız.","error");}
    finally{app.busy=false;app.renderFiles();}
  });
  element("source").href="https://github.com/rusebound/"+tool;
  return app;
}
export function rowsFromText(textContent) {
  const tokens = textContent.items.filter(x => x && typeof x.str === "string" && x.str.trim() && x.transform && Number.isFinite(x.transform[5])).map(x => ({
    str:x.str.trim(), x:x.transform[4], y:x.transform[5],
    w:Math.max(0, x.width || 0), size:Math.max(6,Math.hypot(x.transform[2] || 0, x.transform[3] || 0))
  }));
  tokens.sort((a,b)=>b.y-a.y || a.x-b.x);
  const lines=[];
  for(const token of tokens) {
    const line=lines.find(g=>Math.abs(g.y-token.y) < Math.max(3.5,token.size*.33));
    if(line) line.items.push(token); else lines.push({y:token.y,items:[token]});
  }
  return lines.sort((a,b)=>b.y-a.y).map(g=>{
    g.items.sort((a,b)=>a.x-b.x);
    const out=[];
    let last=null;
    for(const item of g.items) {
      if(!last){last={str:item.str, x:item.x, edge:item.x+item.w};continue;}
      const gap=item.x-last.edge;
      if(gap > 9){out.push(last); last={str:item.str,x:item.x,edge:item.x+item.w};}
      else {last.str += gap > 1.5 ? " " + item.str : item.str;last.edge=Math.max(last.edge,item.x+item.w);}
    }
    if(last)out.push(last);
    return out;
  }).filter(r=>r.length);
}
