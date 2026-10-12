/* Portable Tablova 1.1.0 Python engine running entirely in a self-hosted
   Pyodide 0.28.3 worker. No document/network API calls are implemented. */
"use strict";
let runtimePromise=null;
let python=null;
let occupied=false;
const send=(type,details={})=>self.postMessage({type,...details});
const base=new URL("./",self.location.href);

async function initialize(){
 if(runtimePromise)return runtimePromise;
 runtimePromise=(async()=>{
   send("progress",{phase:"boot",current:0,total:1,message:"Portable dönüştürme motoru yükleniyor..."});
   importScripts(new URL("./pyodide/pyodide.js",base).href);
   python=await loadPyodide({indexURL:new URL("./pyodide/",base).href});
   await python.loadPackage(["micropip","pillow","cryptography","charset-normalizer"]);
   const files=[
      "pdfminer_six-20260107-py3-none-any.whl",
      "pdfplumber-0.11.10-py3-none-any.whl",
      "openpyxl-3.1.5-py2.py3-none-any.whl",
      "et_xmlfile-2.0.0-py3-none-any.whl"
   ];
   for(const [i,name] of files.entries()){
      const url=new URL("./wheels/"+name,base).href;
      python.globals.set("install_url",url);
      await python.runPythonAsync("import micropip\nawait micropip.install(install_url,deps=False)");
      send("progress",{phase:"boot",current:i+1,total:files.length,message:"Portable motor hazırlanıyor ("+(i+1)+"/"+files.length+")"});
   }
   python.FS.mkdirTree("/app/tablova");
   for(const filename of ["__init__.py","table_geometry.py","semantic_fields.py","semantic_tables.py","document_layout.py","engine.py"]){
     const response=await fetch(new URL("./python/"+filename,base),{cache:"force-cache"});
     if(!response.ok)throw new Error("Yerel Python kaynakları okunamadı: "+filename);
     const bytes=new Uint8Array(await response.arrayBuffer());
     python.FS.writeFile("/app/tablova/"+filename,bytes);
   }
   python.globals.set("report_progress",(current,total,message)=>{
      send("progress",{phase:"convert",current,total,message:String(message||"PDF işleniyor...")});
   });
   python.runPython(`
import sys,os
sys.path.insert(0,"/app")
from tablova.engine import convert_pdf
import tablova.engine as engine
if not hasattr(os,"link"):
    # Only moves a staged file inside the browser's private virtual filesystem.
    # The host document and host destination are never opened by Python.
    def publish_virtual(staging,wanted):
        return staging.replace(wanted)
    engine._publish_no_clobber=publish_virtual
`);
   const verified=python.runPython(`
import pdfplumber,pdfminer,openpyxl
(pdfplumber.__version__,pdfminer.__version__,openpyxl.__version__)
`).toJs();
   if(verified.join("|")!=="0.11.10|20260107|3.1.5")
     throw new Error("Portable motor bağımlılık sürümü uyuşmuyor.");
   send("ready",{versions:verified});
 })().catch(error=>{
    runtimePromise=null;
    throw error;
 });
 return runtimePromise;
}
async function convert(bytes){
 if(occupied)throw new Error("Dönüştürme devam ediyor.");
 occupied=true;
 try{
   await initialize();
   for(const name of ["/tmp/input.pdf","/tmp/portable.xlsx"]){
     try{python.FS.unlink(name)}catch{}
   }
   python.FS.writeFile("/tmp/input.pdf",new Uint8Array(bytes));
   python.runPython(`
result = convert_pdf("/tmp/input.pdf",output="/tmp/portable.xlsx",progress=report_progress)
summary = {
  "pages":result.pages,"tables":result.tables,"rows":result.rows,
  "ocr_pages":result.ocr_pages,"warnings":result.warnings,
  "watermark_pages":result.watermark_pages
}
`);
   const stats=python.runPython("summary").toJs({dict_converter:Object.fromEntries});
   const data=python.FS.readFile("/tmp/portable.xlsx");
   const payload=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
   self.postMessage({type:"done",summary:stats,buffer:payload},[payload]);
 }finally{
   if(python)for(const name of ["/tmp/input.pdf","/tmp/portable.xlsx"]){
     try{python.FS.unlink(name)}catch{}
   }
   occupied=false;
 }
}
self.addEventListener("message",event=>{
 const {action,buffer}=event.data||{};
 if(action==="initialize"){
   initialize().catch(error=>send("error",{message:error?.message||String(error)}));
 }else if(action==="convert"){
   convert(buffer).catch(error=>send("error",{message:error?.message||String(error)}));
 }
});
