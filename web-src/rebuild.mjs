import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"..");
const id=path.basename(repo);
const entry=({"OCR-Chrome-Edge":"ocr.js","PDF-to-Word":"word.js","PDF-to-Excel":"excel.js","PDF-Watermark-Remover":"watermark.js"})[id];
if(!entry)throw new Error("Beklenmeyen depo adı");
const out=path.join(repo,"docs");
await fs.mkdir(out,{recursive:true});
await build({entryPoints:[path.join(here,entry)],bundle:true,minify:true,format:"esm",platform:"browser",target:["chrome116","edge116"],outfile:path.join(out,"app.js"),legalComments:"eof",define:{"process.env.NODE_ENV":'"production"'}});
await fs.copyFile(path.join(here,"app.css"),path.join(out,"style.css"));
await fs.copyFile(path.join(here,"node_modules","pdfjs-dist","build","pdf.worker.min.mjs"),path.join(out,"pdf.worker.min.mjs"));
if(id==="OCR-Chrome-Edge"){
 await fs.cp(path.join(repo,"vendor"),path.join(out,"vendor"),{recursive:true,force:true});
 await fs.copyFile(path.join(repo,"vendor","tesseract.min.js"),path.join(out,"tesseract.min.js"));
}
console.log("Tarayıcı paketi güncellendi:",id);
