import {zipSync, strToU8} from "fflate";
import {mount, element, setMessage, setProgress, openPdf, downloadFile, safeStem, rowsFromText} from "./common.js";
import {extractVectorGridPage} from "./grid-extraction.js";

// Microsoft Excel's format limit applies per worksheet, not per PDF.
const MAX_SHEET_ROWS = 1_048_576;
const MAX_SHEET_COLUMNS = 16_384;
const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const pause = () => new Promise(resolve => setTimeout(resolve, 0));

const app = mount({
  tool: "PDF-to-Excel",
  title: "PDF → Excel",
  subtitle: "Sayfa sayısı kısıtlaması olmadan dijital PDF tablolarını Excel'e aktarın.",
  description: "PDF kaç sayfa olursa olsun sayfalar sırasıyla incelenir. Belgeler sunucuya yüklenmez. Tamamlama süresi ve işlenebilir boyut tarayıcınızın belleğine bağlıdır.",
  accept: ".pdf",
  limit: "Sabit sayfa/dosya sınırı yok · cihaz belleğiyle sınırlı",
  maxFileBytes: Infinity,
  action: "Excel dosyasını oluştur",
  features: [
    "120 sayfa kısıtlaması kaldırıldı; tüm PDF sayfaları sırasıyla okunur.",
    "Dosya veya içeriği sunucuya gönderilmez; işlem tarayıcı içinde yapılır.",
    "İşlenen sayfa sayısı gösterilir; uzun işlem durdurulabilir.",
    "Excel'in 1.048.576 satırlık sayfa sınırı aşılırsa yeni çalışma sayfasına geçilir.",
    "Dijital, hizalı tablolarda çalışır; OCR ve karmaşık tablolar için kalite garantisi yoktur."
  ]
});

element("extra").innerHTML =
  '<p class="note">Sayfa adedine yazılımsal limit uygulanmaz. Ancak cihazınızın belleği, tarayıcı kaynakları ve Excel dosya biçiminin sınırları geçerlidir. Taranmış PDF tablolarında bu sürüm OCR yapmaz; kaynak ile sonuçları mutlaka kontrol edin.</p>' +
  '<div class="actions"><button id="cancel" type="button" class="secondary" disabled>İşlemi durdur</button></div>';

const cancelButton = element("cancel");
let cancelled = false;
cancelButton.addEventListener("click", () => {
  cancelled = true;
  cancelButton.disabled = true;
  setMessage("İşlem durduruluyor; mevcut PDF sayfası tamamlanıyor...");
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
        }
        return '<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xmlEsc(value)+'</t></is></c>';
      }).join("");
      xmlRows.push('<row r="' + r + '"' + (structured?' ht="38" customHeight="1"':'') + '>' + cells + '</row>');
      if (i % 4000 === 3999) {
        setProgress(88 + Math.round(((from+i+1) / data.length) * 8));
        await pause();
      }
    }
    const lastRow = chunk.length;
    const widths=[15,24,23,36,17,17,17,16,30,49,52,32];
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
    worksheetList += '<sheet name="Tablo ' + sheetNumber + '" sheetId="' + sheetNumber + '" r:id="rId' + sheetNumber + '"/>';
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
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123453"/><bgColor indexed="64"/></patternFill></fill></fills>'+
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
      '<cellXfs count="4">'+
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"><alignment vertical="center" wrapText="1"/></xf>'+
      '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"><alignment vertical="center"/></xf>'+
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"><alignment vertical="center"/></xf>'+
      '<xf numFmtId="0" fontId="1" fillId="1" borderId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'+
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

app.run = async file => {
  cancelled = false;
  cancelButton.disabled = false;
  let pdf;
  try {
    pdf = await openPdf(file, {maxFileBytes: Infinity});
    if (!pdf.numPages) throw new Error("PDF sayfası bulunamadı.");

    const rows = [];
    let meaningful = 0;
    let extractionMode = null;
    for (let n = 1; n <= pdf.numPages; n++) {
      ensureActive();
      const page = await pdf.getPage(n);
      try {
        const structured = await extractVectorGridPage(page);
        if (structured) {
          if (extractionMode === "text") throw new Error("PDF içinde karışık tablo düzenleri tespit edildi; yanlış kayıt üretmemek için işlem durduruldu.");
          extractionMode = "grid";
          if (structured.columns !== 12) throw new Error("PDF'de 12 yerine " + structured.columns + " tablo sütunu bulundu. Bu şablon için güvenilir eşleşme sağlanamadı.");
          for (const row of structured.rows) {
            if (row.length !== 12) throw new Error("Tablo satırı 12 hücre içermiyor.");
            rows.push(row);
            meaningful++;
          }
        } else {
          if (extractionMode === "grid") throw new Error("PDF'nin " + n + ". sayfasında tablo çizgileri okunamadı. Veri kaybetmemek için işlem durduruldu.");
          extractionMode = "text";
          const lines = rowsFromText(await page.getTextContent());
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
      throw new Error("Güvenilir dijital tablo sütunları bulunamadı. Bu sürüm taranmış tablolar için OCR yapmaz.");
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
    if (tableRows.length < 2) {
      throw new Error("Tutarlı sütun düzenine sahip yeterli tablo satırı bulunamadı.");
    }

    setMessage(tableRows.length.toLocaleString("tr-TR") + " satır ve " + (tableRows[0]?.length || 0) + " sütun için Excel oluşturuluyor...");
    setProgress(88);
    const spreadsheetRows=extractionMode==="grid"?[REPORT_HEADERS,...tableRows]:tableRows;
    const blob = await createWorkbook(spreadsheetRows,extractionMode==="grid");
    ensureActive();
    downloadFile(blob, safeStem(file.name) + ".xlsx");
    setProgress(100);
    const excluded = rows.length - tableRows.length;
    setMessage("Excel hazır: " + pdf.numPages.toLocaleString("tr-TR") + " PDF sayfası incelendi; " +
      tableRows.length.toLocaleString("tr-TR") + " tablo satırı ve " +
      (tableRows[0]?.length || 0) + " sütun aktarıldı. " +
      (excluded ? excluded.toLocaleString("tr-TR") + " farklı sütun düzenindeki satır dışarıda bırakıldı. " : "") +
      "Kaynak PDF ile mutlaka karşılaştırın.", "ok");
  } catch (error) {
    if (error?.name === "AbortError") {
      setProgress(0);
      setMessage("İşlem durduruldu. Dosya sunucuya yüklenmedi.");
      return;
    }
    throw error;
  } finally {
    cancelButton.disabled = true;
    if (pdf) await pdf.destroy().catch(() => {});
  }
};
