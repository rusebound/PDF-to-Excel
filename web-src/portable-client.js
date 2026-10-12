import {unzipSync} from "fflate";

let portableWorker=null;
let rejectPortable=null;

function stopPortableWorker(){
 if(portableWorker){portableWorker.terminate();portableWorker=null;}
 if(rejectPortable){
   const reject=rejectPortable;
   rejectPortable=null;
   reject(new DOMException("İşlem kullanıcı tarafından durduruldu.","AbortError"));
 }
}
function extractColumnCount(bytes) {
 try{
   const archive=unzipSync(new Uint8Array(bytes));
   const xml=archive["xl/worksheets/sheet1.xml"];
   if(!xml)return 0;
   const start=new TextDecoder().decode(xml.slice(0,1200));
   const m=/dimension ref="A1:([A-Z]+)\d+"/.exec(start);
   if(!m)return 0;
   let col=0;for(const ch of m[1])col=col*26+ch.charCodeAt(0)-64;
   return col;
 }catch{return 0;}
}
export function makePortableConverter({onProgress,isCancelled}){
 return {
   stop:stopPortableWorker,
   close:stopPortableWorker,
   async convert(file){
     if(isCancelled())throw new DOMException("İşlem iptal edildi.","AbortError");
     if(!portableWorker)portableWorker=new Worker("./portable-worker.js");
     const worker=portableWorker;
     const bytes=await file.arrayBuffer();
     if(isCancelled())throw new DOMException("İşlem iptal edildi.","AbortError");
     return new Promise((resolve,reject)=>{
       let finished=false;
       rejectPortable=error=>{
         if(finished)return;finished=true;reject(error);
       };
       worker.onmessage=event=>{
         if(finished)return;
         const data=event.data||{};
         if(data.type==="progress"){
           onProgress(data);
           return;
         }
         if(data.type==="error"){
           finished=true;rejectPortable=null;
           const raw=String(data.message||"Portable dönüştürme başarısız.");
           const last=raw.trim().split(/\r?\n/).filter(Boolean).at(-1)||raw;
           const message=/Taranmış belge için yerel metin tanıma bileşeni bulunamadı|güvenilir şekilde çıkarılabilen tablo bulunamadı/i.test(raw)
             ?"Bu PDF'de taranmış veya güvenilir biçimde okunamayan tablo var. Web sürümünde portable OCR motoru eşdeğer çalışmadığından Excel oluşturulmadı. Lütfen Windows portable sürümünü kullanın."
             :last.replace(/^[\\w.]+(?:Error|Exception):\\s*/,"").slice(0,280);
           reject(new Error(message));
           return;
         }
         if(data.type==="done"){
           finished=true;rejectPortable=null;
           const buffer=data.buffer;
           const summary=data.summary||{};
           resolve({
             blob:new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),
             fileName:(file.name||"belge").replace(/\.pdf$/i,"")+".xlsx",
             pages:summary.pages||0,tables:summary.tables||0,rows:summary.rows||0,
             columns:extractColumnCount(buffer),masked:0,ocrPages:summary.ocr_pages||0,
             warnings:Array.isArray(summary.warnings)?summary.warnings:[],
             watermarkPages:summary.watermark_pages||0,engine:"Tablova Portable Python (WASM)"
           });
         }
       };
       worker.onerror=error=>{
         if(finished)return;
         finished=true;rejectPortable=null;
         reject(new Error("Yerel portable çalışma ortamı başlatılamadı: "+error.message));
       };
       worker.postMessage({action:"convert",buffer:bytes},[bytes]);
     });
   }
 };
}
