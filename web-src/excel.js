import {zipSync, strToU8} from "fflate";
import {mount, element, setMessage, setProgress, openPdf, downloadFile, safeStem, rowsFromText} from "./common.js";
import {extractVectorGridPage, detectGrid} from "./grid-extraction.js";
import {extractOCRTable} from "./ocr-table.js";
import {makePortableConverter} from "./portable-client.js";

// Microsoft Excel's format limit applies per worksheet, not per PDF.
const MAX_SHEET_ROWS = 1_048_576;
const MAX_SHEET_COLUMNS = 16_384;
const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const pause = () => new Promise(resolve => setTimeout(resolve, 0));

const app = mount({
  tool: "PDF-to-Excel",
  title: "Tablova — PDF’den Excel’e",
  subtitle: "Tabloları düzenlenebilir Excel hücrelerine dönüştürün. Tamamen yerel ve kurulumsuz.",
  description: "PDF dosyalarını seçin veya buraya sürükleyin. Dijital PDF tabloları, masaüstü Tablova'nın Python motoruyla tarayıcınızda işlenir. Taranmış PDF'ler için eşdeğerlik doğrulanmadığından sonuç üretilmez.",
  accept: ".pdf",
  limit: "Sabit sayfa/dosya sınırı yok · cihaz belleğiyle sınırlı",
  maxFileBytes: Infinity,
  action: "Excel’e Dönüştür",
  multiple: true,
  features: [
    "Tek veya çoklu PDF seçme, listeden kaldırma ve toplu Excel’e dönüştürme.",
    "PDF belgeleri ve metinler hiçbir sunucuya yüklenmez. Tüm işlemler tarayıcı içinde gerçekleşir.",
    "İlerleme, işlem iptali, sonuç ve uyarı raporları.",
    "Excel tarihi, tutar hücre türü, sayfa birleştirme ve okunamayan tutarların sarı işaretlenmesi.",
    "Taranmış PDF belgelerinde masaüstü OCR motoru gerektiği için yanlış Excel üretilmeden açık uyarı verilir."
  ]
});

element("extra").innerHTML =
  '<p class="note">Sayfa adedine yazılımsal limit uygulanmaz. Ancak cihazınızın belleği, tarayıcı kaynakları ve Excel dosya biçiminin sınırları geçerlidir. Taranmış sayfalarda masaüstü OCR ile birebir eşit sonuç garanti edilmediğinden dönüştürme durdurulur.</p>' +
  '<div class="actions"><button id="directory" type="button" class="secondary">Hedef klasör seç (isteğe bağlı)</button><button id="cancel" type="button" class="secondary" disabled>İşlemi durdur</button></div>' +
  '<p class="note" id="folder-note">Klasör seçmezseniz tek dosya XLSX, çoklu dosyalar ZIP olarak indirilir. Tarayıcı güvenliği nedeniyle kaynak PDF klasörüne otomatik yazılamaz.</p>';

const cancelButton = element("cancel");
let cancelled = false;
const portable=makePortableConverter({
  isCancelled:()=>cancelled,
  onProgress:({phase,current,total,message})=>{
    if(phase==="boot"){setMessage(message);setProgress(0);return;}
    setProgress(Math.round((current/Math.max(1,total))*90));
    setMessage(message||"Portable motor PDF sayfalarını inceliyor...");
  }
});
cancelButton.addEventListener("click", () => {
  cancelled = true;
  portable.stop();
  cancelButton.disabled = true;
  setMessage("İşlem durduruluyor...");
});

function ensureActive() {
  if (cancelled) throw new DOMException("İşlem kullanıcı tarafından durduruldu.", "AbortError");
}

function xmlEsc(value) {
  return String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function excelColumn(number) {
  let result = "";
  for (let n = number; n > 0; n = Math.floor((n - 1) / 26)) {
    result = String.fromCharCode(65 + (n - 1) % 26) + result;
  }
  return result;
}

const REPORT_HEADERS = ["Takip No", "Ad Soyad", "Hizmet Türü", "İşlem", "İşlem Tarihi", "İşlem Tutarı", "Kesinti Tutarı", "Grup Türü", "Grup Adı", "Kesinti Nedeni", "DEĞERLENDİRME", "SONUÇ"];

function parseAmount(value) {
  const cleaned = String(value).replace(/\s+/gu, "");
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/u.test(cleaned)) return null;
  const numeric = Number(cleaned.replace(/\./gu, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}
function parseExcelDate(value) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/u.exec(String(value).trim());
  if (!m) return null;
  const [,day,month,year] = m.map(Number);
  const ms = Date.UTC(year,month-1,day);
  const check = new Date(ms);
  if (check.getUTCDate()!==day || check.getUTCMonth()+1!==month || check.getUTCFullYear()!==year) return null;
  return Math.round((ms-Date.UTC(1899,11,30))/86_400_000);
}

// Excel limits rows to 1,048,576 per worksheet; add a header to each new sheet.
async function createWorkbook(rows, structured=false) {
  const headers = structured ? rows[0] : null;
  const data = structured ? rows.slice(1) : rows;
  const perSheet = structured ? MAX_SHEET_ROWS-1 : MAX_SHEET_ROWS;
  const sheetCount = Math.ceil(data.length / perSheet);
  const prefix = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const packageFiles = {};
  let worksheetList = "";
  let relationships = "";
  let contentTypes =
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>';

  for (let s = 0; s < sheetCount; s++) {
    ensureActive();
    const from = s * perSheet;
    const until = Math.min(from + perSheet, data.length);
    const chunk = structured ? [headers,...data.slice(from,until)] : data.slice(from,until);
    const widths=[17,25,24,39,18,18,19,15,27,67,73,35];
    let maxColumn = 1;
    const xmlRows = [];
    for (let i = 0; i < chunk.length; i++) {
      ensureActive();
      const values = chunk[i];
      if (values.length > MAX_SHEET_COLUMNS) {
        throw new Error("Excel tek çalışma sayfasında en fazla 16.384 sütunu destekler.");
      }
      maxColumn = Math.max(maxColumn, values.length);
      const r = i + 1;
      const cells = values.map((value, c) => {
        const ref=excelColumn(c+1)+r;
        if (structured && i===0) {
          return '<c r="'+ref+'" s="3" t="inlineStr"><is><t xml:space="preserve">'+xmlEsc(value)+'</t></is></c>';
        }
        if (structured && c===4) {
          const serial=parseExcelDate(value);
          if (serial!==null) return '<c r="'+ref+'" s="2"><v>'+serial+'</v></c>';
        }
        if (structured && (c===5||c===6)) {
          const amount=parseAmount(value);
          if (amount!==null) return '<c r="'+ref+'" s="1"><v>'+amount+'</v></c>';
          if (String(value).includes("#")) return '<c r="'+ref+'" s="4" t="inlineStr"><is><t xml:space="preserve">'+xmlEsc(value)+'</t></is></c>';
        }
        return '<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xmlEsc(value)+'</t></is></c>';
      }).join("");
      const maxLines=structured?Math.max(1,...values.map((v,c)=>{
        const width=widths[c]||24;
        return String(v??"").split("\n").reduce((s,line)=>s+Math.max(1,Math.ceil(line.length/Math.max(8,width-4))),0);
      })):1;
      const height=structured?Math.min(405,Math.max(i===0?26:19,maxLines*15+7)):null;
      xmlRows.push('<row r="'+r+'"'+(structured?' ht="'+height+'" customHeight="1"':'')+'>'+cells+'</row>');
      if (i % 4000 === 3999) {
        setProgress(88 + Math.round(((from+i+1) / data.length) * 8));
        await pause();
      }
    }
    const lastRow = chunk.length;
    const cols=structured?'<cols>'+widths.map((w,c)=>'<col min="'+(c+1)+'" max="'+(c+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols>':"";
    const sheetView=structured?
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>':
      '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    const autoFilter=structured?'<autoFilter ref="A1:'+excelColumn(maxColumn)+lastRow+'"/>':"";
    const sheet=
      prefix+'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:'+excelColumn(maxColumn)+lastRow+'"/>'+sheetView+
      '<sheetFormatPr defaultRowHeight="15"/>'+cols+'<sheetData>'+xmlRows.join("")+
      '</sheetData>'+autoFilter+'</worksheet>';
    const sheetNumber = s + 1;
    packageFiles['xl/worksheets/sheet' + sheetNumber + '.xml'] = strToU8(sheet);
    worksheetList += '<sheet name="Tablo_' + sheetNumber + '" sheetId="' + sheetNumber + '" r:id="rId' + sheetNumber + '"/>';
    relationships += '<Relationship Id="rId' + sheetNumber +
      '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + sheetNumber + '.xml"/>';
    contentTypes += '<Override PartName="/xl/worksheets/sheet' + sheetNumber +
      '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    await pause();
  }

  if (structured) {
    contentTypes += '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    packageFiles["xl/styles.xml"] = strToU8(
      prefix+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
      '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd.mm.yyyy"/></numFmts>'+
      '<fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'+
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1A3550"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF1C2"/><bgColor indexed="64"/></patternFill></fill></fills>'+
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
      '<cellXfs count="5">'+
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"><alignment vertical="center" wrapText="1"/></xf>'+
      '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"><alignment vertical="center"/></xf>'+
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"><alignment vertical="center"/></xf>'+
      '<xf numFmtId="0" fontId="1" fillId="1" borderId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'+
      '<xf numFmtId="0" fontId="0" fillId="2" borderId="0" applyFill="1"><alignment vertical="top" wrapText="1"/></xf>'+
      '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
    );
    relationships += '<Relationship Id="rId'+(sheetCount+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
  }
  packageFiles["[Content_Types].xml"] = strToU8(
    prefix + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    contentTypes + '</Types>'
  );
  packageFiles["_rels/.rels"] = strToU8(
    prefix + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>'
  );
  packageFiles["xl/workbook.xml"] = strToU8(
    prefix + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    worksheetList + '</sheets></workbook>'
  );
  packageFiles["xl/_rels/workbook.xml.rels"] = strToU8(
    prefix + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    relationships + '</Relationships>'
  );

  ensureActive();
  setMessage("Excel dosyası sıkıştırılıyor ve indirilmeye hazırlanıyor...");
  setProgress(97);
  await pause();
  const zipped = zipSync(packageFiles, {level: 6});
  return new Blob([zipped], {type: MIME});
}

async function convertFile(file) {
  let pdf;
  try {
    pdf = await openPdf(file, {maxFileBytes: Infinity});
    if (!pdf.numPages) throw new Error("PDF sayfası bulunamadı.");

    const rows = [];
    let meaningful = 0;
    let extractionMode = null;
    let referenceAxes = null;
    let reportSchema = null;
    let repairedPages = 0;
    let maskedValues = 0;
    let ocrPages = 0;
    const warnings=[];
    function missingSeparator(axes, reference) {
      return axes?.length === 12 && reference?.length === 13 &&
        axes.every((x,i)=>Math.abs(x-reference[i===11?12:i])<1.7);
    }
    for (let n = 1; n <= pdf.numPages; n++) {
      ensureActive();
      const page = await pdf.getPage(n);
      try {
        let geometry = await detectGrid(page);
        // Some pages omit the last separator of a 12-column table and draw
        // an additional empty right border. Use the preceding matching grid.
        if (geometry?.xs?.length === 13 && referenceAxes?.length === 13 &&
            geometry.xs.slice(0,11).every((x,i)=>Math.abs(x-referenceAxes[i])<1.7) &&
            Math.abs(geometry.xs[11]-referenceAxes[12])<1.7 &&
            geometry.xs[12]-referenceAxes[12]>15) {
          geometry={...geometry,xs:referenceAxes};
          repairedPages++;
        }
        if (geometry?.xs?.length === 12 && (extractionMode === "grid" || n === 1 || pdf.numPages > 30)) {
          let reference = missingSeparator(geometry.xs, referenceAxes) ? referenceAxes : null;
          if (!reference) {
            for (let ahead = n+1; ahead <= Math.min(pdf.numPages,n+4);ahead++){
              ensureActive();
              const next=await pdf.getPage(ahead);
              const nextGrid=await detectGrid(next);
              next.cleanup();
              if(missingSeparator(geometry.xs,nextGrid?.xs)){reference=nextGrid.xs;break;}
            }
          }
          if (reference){geometry={...geometry,xs:reference};repairedPages++;}
        }
        const structured = geometry ? await extractVectorGridPage(page, geometry) : null;
        if (structured?.rows?.length) {
          if (extractionMode === "text") throw new Error("PDF içinde karışık tablo düzenleri tespit edildi; yanlış kayıt üretmemek için işlem durduruldu.");
          extractionMode = "grid";
          if (referenceAxes && structured.columns !== referenceAxes.length-1) {
            throw new Error("Sayfa "+n+": sütun sayısı önceki sayfalarla uyuşmuyor. Veri kaybını önlemek için dönüştürme durduruldu.");
          }
          if(reportSchema===null)reportSchema=structured.columns===12&&structured.headerDetected;
          referenceAxes=structured.axes;
          for (const row of structured.rows) {
            if (row.length !== structured.columns) throw new Error("Tablo satırı sütun sayısı açısından tutarsız.");
            rows.push(row);
            meaningful++;
            if(reportSchema)for (const amount of row.slice(5,7)) if (amount.includes("#")) maskedValues++;
          }
        } else {
          const content=await page.getTextContent();
          const charCount=content.items.reduce((sum,item)=>sum+String(item.str||"").trim().length,0);
          if(charCount<12){
            setMessage("Sayfa "+n+" / "+pdf.numPages+": Yerel Türkçe OCR uygulanıyor...");
            const recognized=await extractOCRTable(page,{cancel:()=>cancelled,
              progress:text=>setMessage("Sayfa "+n+": "+text)});
            ocrPages++;
            if(recognized.estimatedRows && recognized.rows.length<recognized.estimatedRows*.85){
              warnings.push("Sayfa "+n+": OCR "+recognized.rows.length+"/"+recognized.estimatedRows+" satır tanıdı. Belgeyle karşılaştırın.");
            }
            if(!recognized.rows.length)warnings.push("Sayfa "+n+": OCR güvenilir tablo tanıyamadı.");
            if(recognized.rows.length){
              const ocrCols=recognized.rows[0].length;
              if(extractionMode==="grid"&&referenceAxes&&ocrCols!==referenceAxes.length-1){
                throw new Error("Sayfa "+n+": tarama tablosunun sütun sayısı dijital tabloyla uyumsuz. Yanlış Excel üretmemek için durduruldu.");
              }
              if(extractionMode==="text")throw new Error("Dijital ve taranmış tablo sütun düzenleri uyumsuz olabilir; güvenli birleştirme sağlanamadı.");
              if(!extractionMode)extractionMode="ocr";
              rows.push(...recognized.rows);
              meaningful+=recognized.rows.filter(r=>r.filter(Boolean).length>=2).length;
            }
            continue;
          }
          if(extractionMode === "grid") throw new Error("PDF'nin " + n + ". sayfasında tablo çizgileri okunamadı. Veri kaybetmemek için işlem durduruldu.");
          if(extractionMode==="ocr")throw new Error("OCR ve dijital metin tablosu karışık; yapı doğrulanamadı.");
          extractionMode = "text";
          const lines = rowsFromText(content);
          for (const row of lines) {
            const parts = row.map(item => item.str).filter(Boolean);
            if (!parts.length) continue;
            if (parts.length > 1) meaningful++;
            if (rows.length && parts.length === rows[0].length &&
                parts.every((value, index) => value === rows[0][index])) continue;
            rows.push(parts);
          }
        }
      } finally {
        page.cleanup();
      }
      setProgress(Math.round((n / pdf.numPages) * 87));
      if (n === 1 || n % 5 === 0 || n === pdf.numPages) {
        setMessage("PDF sayfaları inceleniyor: " + n.toLocaleString("tr-TR") +
          " / " + pdf.numPages.toLocaleString("tr-TR"));
        await pause();
      }
    }
    ensureActive();
    if (!rows.length || !meaningful) {
      throw new Error("Güvenilir bir tablo çıkarılamadı. Tarama/OCR kalitesini ve kaynak belgenin okunabilirliğini kontrol edin.");
    }

    // Retain the original extraction heuristic: pick the most common column count.
    let tableRows;
    if (extractionMode === "grid") {
      tableRows = rows;
    } else {
      const counts = new Map();
      for (const row of rows) if (row.length >= 2) counts.set(row.length, (counts.get(row.length) || 0) + 1);
      const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0];
      tableRows = rows.filter(row => row.length === dominant);
    }
    if (tableRows.length < (extractionMode === "grid" ? 1 : 2)) {
      throw new Error("Tutarlı sütun düzenine sahip yeterli tablo satırı bulunamadı.");
    }

    setMessage(tableRows.length.toLocaleString("tr-TR") + " satır ve " + (tableRows[0]?.length || 0) + " sütun için Excel oluşturuluyor...");
    setProgress(88);
    const useReportLayout=extractionMode==="grid"&&reportSchema===true;
    const spreadsheetRows=useReportLayout?[REPORT_HEADERS,...tableRows]:tableRows;
    const blob = await createWorkbook(spreadsheetRows,useReportLayout);
    ensureActive();
    const fileName=safeStem(file.name)+".xlsx";
    setProgress(100);
    const excluded = rows.length - tableRows.length;
    setMessage("Excel hazır: " + pdf.numPages.toLocaleString("tr-TR") + " PDF sayfası incelendi; " +
      tableRows.length.toLocaleString("tr-TR") + " tablo satırı ve " +
      (tableRows[0]?.length || 0) + " sütun aktarıldı. " +
      (excluded ? excluded.toLocaleString("tr-TR") + " farklı sütun düzenindeki satır dışarıda bırakıldı. " : "") +
      (repairedPages ? repairedPages+" sayfada eksik çizgi komşu sayfadan tamamlandı. " : "") +
      (maskedValues ? maskedValues+" okunamayan tutar uyarılı işaretlendi. " : "") +
      "Kaynak PDF ile mutlaka karşılaştırın.", "ok");
    return {blob,fileName,pages:pdf.numPages,rows:tableRows.length,columns:tableRows[0]?.length||0,masked:maskedValues,ocrPages,warnings};
  } catch (error) {
    if (error?.name === "AbortError") {
      setProgress(0);
      setMessage("İşlem durduruldu. Dosya sunucuya yüklenmedi.");
      return;
    }
    throw error;
  } finally {
    if (pdf) await pdf.destroy().catch(() => {});
  }
}

const directoryButton=element("directory");
const folderNote=element("folder-note");
let selectedDirectory=null;
if(typeof window.showDirectoryPicker!=="function"){
  directoryButton.disabled=true;
  directoryButton.title="Bu tarayıcı klasör erişimine izin vermiyor. Sonuç İndirilenler'e kaydedilir.";
}
directoryButton.addEventListener("click",async()=>{
  try{
    selectedDirectory=await window.showDirectoryPicker({mode:"readwrite"});
    folderNote.textContent="Hedef klasör seçildi: "+selectedDirectory.name+". Mevcut dosyaların üzerine yazılmayacak.";
    setMessage("Excel çıktıları seçilen yerel klasöre kaydedilecek.","ok");
  }catch(e){
    if(e?.name!=="AbortError")setMessage("Hedef klasör açılamadı: "+(e?.message||e),"error");
  }
});
function uniqueDownloadName(name,used){
  const normalized=safeStem(name.replace(/\.xlsx$/i,""));
  let candidate=normalized+".xlsx",index=2;
  while(used.has(candidate.toLocaleLowerCase("tr"))){
    candidate=normalized+" ("+(index++)+").xlsx";
  }
  used.add(candidate.toLocaleLowerCase("tr"));
  return candidate;
}
async function saveWithoutOverwriting(folder,blob,wanted){
  const base=wanted.replace(/\.xlsx$/i,"");
  for(let number=1;number<=1000;number++){
    const name=number===1?wanted:base+" ("+number+").xlsx";
    try{await folder.getFileHandle(name,{create:false});continue;}
    catch(e){if(e.name!=="NotFoundError")throw e;}
    const file=await folder.getFileHandle(name,{create:true});
    const writable=await file.createWritable({keepExistingData:false});
    try{await writable.write(blob);await writable.close();}
    catch(e){await writable.abort().catch(()=>{});throw e;}
    return name;
  }
  throw new Error("Çıktı dosyası için boş bir ad bulunamadı.");
}
app.run=async files=>{
  const selections=Array.isArray(files)?files:[files];
  if(!selections.length)return;
  cancelled=false;cancelButton.disabled=false;directoryButton.disabled=true;
  const usedNames=new Set();
  const zipFiles={},summaries=[],errors=[];
  let count=0,warningCount=0;
  try{
    for(let i=0;i<selections.length;i++){
      ensureActive();
      const file=selections[i];
      setMessage((i+1)+" / "+selections.length+" — "+file.name+" işleniyor...");
      try{
        // Strict fidelity mode: only the unchanged portable Python engine may
        // produce downloaded XLSX. Never substitute heuristic browser OCR.
        const result=await portable.convert(file);
        if(result.warnings.some(w=>/OCR|taranmış|güvenilir tablo bulunamadı/i.test(String(w)))){
          throw new Error("Taranmış PDF için portable OCR motoru web ortamında eşdeğer değil. Eksik ya da tahmini Excel oluşturulmadı; masaüstü portable sürümü kullanın.");
        }
        if(cancelled)break;
        if(!result)continue;
        warningCount+=result.warnings.length;
        const name=uniqueDownloadName(result.fileName,usedNames);
        if(selectedDirectory){
          const saved=await saveWithoutOverwriting(selectedDirectory,result.blob,name);
          summaries.push(saved+": "+result.pages+" sayfa, "+result.rows+" satır, "+result.columns+" sütun"+(result.warnings.length?" — İnceleme uyarısı: "+result.warnings.join("; "):""));
        }else if(selections.length===1){
          downloadFile(result.blob,name);
          summaries.push(name+": "+result.rows+" veri satırı, "+result.columns+" sütun");
        }else{
          zipFiles[name]=new Uint8Array(await result.blob.arrayBuffer());
          summaries.push(name+": "+result.rows+" veri satırı, "+result.columns+" sütun");
        }
        count++;
      }catch(error){
        if(error?.name==="AbortError"||cancelled)break;
        errors.push(file.name+": "+(error?.message||String(error)));
      }
    }
    if(cancelled){
      setMessage("İşlem kullanıcı tarafından durduruldu. "+count+" dosyanın çıktısı hazırlandı.","error");
    }
    if(!selectedDirectory&&selections.length>1){
      if(summaries.length||errors.length){
        const lines=[
          "TABLOVA — DÖNÜŞTÜRME RAPORU","Yayıncı: Demirhan Özdemir",
          "Başarılı: "+count+" / "+selections.length,
          ...summaries,
          ...(errors.length?["Başarısız dosyalar:",...errors]:[]),
          ...(cancelled?["İşlem durduruldu."]:[])
        ];
        zipFiles["DONUSTURME_RAPORU.txt"]=strToU8(lines.join("\r\n"));
        setMessage("Çoklu çıktı yerel ZIP arşivine dönüştürülüyor...");
        await pause();
        downloadFile(new Blob([zipSync(zipFiles,{level:0})],{type:"application/zip"}),"Tablova-Excel-Sonuclari.zip");
      }
    }
    const resultText=(cancelled?"İşlem durduruldu. ":"")+count+" / "+selections.length+" PDF dönüştürüldü."+
      (errors.length?" "+errors.length+" hata oluştu.":"")+
      (warningCount?" "+warningCount+" OCR/kalite uyarısı sonuç raporunda.":"")+
      (count>0?(selectedDirectory?" Çıktılar seçilen klasöre kaydedildi.":" Dosyalar tarayıcıdan indirildi."):" Excel çıktısı oluşturulmadı.");
    setMessage(resultText,errors.length||cancelled?"error":warningCount?"warning":"ok");
    element("report").textContent=[...summaries,...errors].join("\n");
  }finally{
    cancelButton.disabled=true;
    directoryButton.disabled=typeof window.showDirectoryPicker!=="function";
  }
};
