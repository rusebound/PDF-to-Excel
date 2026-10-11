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
export function mount({tool,title,subtitle,description,accept,action,features,limit="50 MB",maxFileBytes=52_428_800}) {
  document.title = title + " | Demirhan Özdemir";
  element("tool-title").textContent = title;
  element("hero-subtitle").textContent = subtitle;
  element("tool-description").textContent = description;
  element("primary").textContent = action;
  element("limit").textContent = limit;
  element("choose").textContent = accept.includes("pdf") && accept.includes("image") ? "PDF veya görsel seç" : accept.includes("image") ? "Görsel seç" : "PDF seç";
  const list = element("features");
  for (const feature of features) {
    const li = document.createElement("li"); li.textContent = feature; list.append(li);
  }
  const input = element("file");
  input.accept = accept;
  const primary = element("primary");
  const selected = element("selected");
  const app = {
    file: null,
    input,
    primary,
    setFile(file) {
      app.file = null; primary.disabled = true;
      if (!file) return;
      const ext = (file.name || "").toLowerCase();
      const isPDF = ext.endsWith(".pdf");
      const isImage = /\.(png|jpe?g|webp|bmp)$/.test(ext);
      if ((!accept.includes(".pdf") && isPDF) || (!accept.includes("image") && isImage) || (!isPDF && !isImage)) {
        setMessage("Bu dosya türü desteklenmiyor.", "error"); return;
      }
      if (file.size > maxFileBytes) {setMessage("Dosya boyutu bu işlemin sınırını aşıyor.", "error");return;}
      app.file = file;
      selected.textContent = file.name + " · " + (file.size / 1_048_576).toFixed(1) + " MB";
      setMessage("Dosya yalnızca tarayıcı belleğinde seçildi.");
      setProgress(0);
      primary.disabled = false;
      if (app.onSelected) Promise.resolve(app.onSelected(file)).catch(e => setMessage(e.message || String(e), "error"));
    }
  };
  element("choose").addEventListener("click", () => input.click());
  input.addEventListener("change", () => app.setFile(input.files?.[0]));
  const drop = element("drop");
  drop.addEventListener("dragover", e => {e.preventDefault(); drop.classList.add("dragging");});
  drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
  drop.addEventListener("drop", e => {e.preventDefault(); drop.classList.remove("dragging"); app.setFile(e.dataTransfer?.files?.[0]);});
  primary.addEventListener("click", async () => {
    if (!app.file || !app.run) return;
    primary.disabled = true;
    setMessage("Dosya yerel olarak işleniyor...");
    try { await app.run(app.file); }
    catch(e) { setMessage((e && e.message) || "İşlem başarısız.", "error"); }
    finally { primary.disabled = false; }
  });
  const source = element("source");
  source.href = "https://github.com/rusebound/" + tool;
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
