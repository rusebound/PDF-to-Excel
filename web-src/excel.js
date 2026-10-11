import {zipSync,strToU8} from "fflate";
import {mount,element,setMessage,setProgress,openPdf,downloadFile,safeStem,rowsFromText} from "./common.js";
const app=mount({tool:"PDF-to-Excel",title:"PDF → Excel",subtitle:"PDF'deki dijital tabloları yerel olarak XLSX dosyasına aktarın.",description:"Basit ve hizalı PDF tablolarındaki dijital yazıları hücrelere ayırır. Karmaşık düzenler ve taranmış tablolar için Windows motoruyla aynı kaliteyi vaat etmez.",accept:".pdf",action:"Excel dosyasını oluştur",features:["Sunucuya dosya gönderilmeden tarayıcıda PDF metni okunur.","Sütun boşlukları ve satır hizası üzerinden temel tablo ayırma.","Sayfa devamındaki satırlar tek XLSX sayfasına eklenebilir.","Sayılar varsayılan olarak metin tutulur; hatalı sayı dönüşümü yapılmaz.","Taranmış veya karmaşık tablolar bu başlangıç sürümünde güvenilir değildir."]});
element("extra").innerHTML='<p class="note">Dikkat: PDF tablo yapısı bir Excel tablosu gibi saklanmaz. Bu başlangıç sürümü temel satır ve sütun aralığı algılar. Kaynak sayı/tarih değerlerini doğrulayın.</p>';
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
function xlsx(rows){
 const cells=rows.map((r,i)=>'<row r="'+(i+1)+'">'+r.slice(0,50).map((v,j)=>{
  let num=j+1,col="";while(num){num--;col=String.fromCharCode(65+num%26)+col;num=Math.floor(num/26);}
  return '<c r="'+col+(i+1)+'" t="inlineStr"><is><t xml:space="preserve">'+esc(v)+'</t></is></c>';
 }).join("")+'</row>').join("");
 const xl='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const maxCols=Math.max(...rows.map(r=>Math.min(50,r.length)));
 let cIndex=Math.max(1,maxCols),lastCol="";
 while(cIndex){cIndex--;lastCol=String.fromCharCode(65+cIndex%26)+lastCol;cIndex=Math.floor(cIndex/26);}
 const lastCell=lastCol+Math.max(1,rows.length);
 const sheet=xl+'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:'+lastCell+'"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>'+cells+'</sheetData></worksheet>';
 const wb=xl+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tablo" sheetId="1" r:id="rId1"/></sheets></workbook>';
 const rels=xl+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
 const rootrels=xl+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
 const types=xl+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
 return new Blob([zipSync({"[Content_Types].xml":strToU8(types),"_rels/.rels":strToU8(rootrels),"xl/workbook.xml":strToU8(wb),"xl/_rels/workbook.xml.rels":strToU8(rels),"xl/worksheets/sheet1.xml":strToU8(sheet)},{level:6})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
app.run=async file=>{
 const pdf=await openPdf(file);
 try{
  if(pdf.numPages>120)throw new Error("Web sürümünde en fazla 120 PDF sayfası desteklenir.");
  const rows=[];
  let meaningful=0;
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n);
   const lines=rowsFromText(await page.getTextContent());
   const startCount=rows.length;
   for(const row of lines){
    const parts=row.map(x=>x.str).filter(Boolean);
    if(parts.length===0)continue;
    if(parts.length>1)meaningful++;
    if(rows.length>0&&parts.length===rows[0].length&&parts.every((v,i)=>v===rows[0][i]))continue;
    rows.push(parts);
   }
   page.cleanup();setProgress(Math.round(n/pdf.numPages*88));
  }
  if(rows.length===0||meaningful===0)throw new Error("Güvenilir dijital tablo sütunları bulunamadı. PDF taranmış olabilir; bu sürüm OCR tablo dönüştürme yapmaz.");
  const counts=new Map();for(const row of rows){if(row.length>=2)counts.set(row.length,(counts.get(row.length)||0)+1);}
  const dominant=[...counts.entries()].sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0]?.[0];
  const tableRows=rows.filter(row=>row.length===dominant);
  if(tableRows.length<2)throw new Error("Tutarlı sütun düzenine sahip yeterli tablo satırı bulunamadı.");
  if(tableRows.length>15000)throw new Error("15.000 satır web sınırı aşıldı.");
  setMessage("XLSX dosyası tarayıcı içinde hazırlanıyor...");
  downloadFile(xlsx(tableRows),safeStem(file.name)+".xlsx");
  setProgress(100);setMessage("Excel indirildi: "+tableRows.length+" tablo satırı. "+(rows.length-tableRows.length)+" düzensiz/başlık satırı dışarıda bırakıldı. Kaynak PDF ile mutlaka karşılaştırın.","ok");
 }finally{await pdf.destroy().catch(()=>{});}
};
