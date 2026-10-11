import {zipSync, strToU8} from "fflate";
import {mount, element, setMessage, setProgress, openPdf, downloadFile, safeStem, rowsFromText} from "./common.js";

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

// Convert rows to valid XLSX worksheets. Excel itself limits rows to 1,048,576
// per sheet; splitting avoids pretending that the Excel specification is unlimited.
async function createWorkbook(rows) {
  const sheetCount = Math.ceil(rows.length / MAX_SHEET_ROWS);
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
    const from = s * MAX_SHEET_ROWS;
    const until = Math.min(from + MAX_SHEET_ROWS, rows.length);
    let maxColumn = 1;
    const xmlRows = [];
    for (let i = from; i < until; i++) {
      ensureActive();
      const values = rows[i];
      if (values.length > MAX_SHEET_COLUMNS) {
        throw new Error("Excel tek çalışma sayfasında en fazla 16.384 sütunu destekler.");
      }
      maxColumn = Math.max(maxColumn, values.length);
      const r = i - from + 1;
      const cells = values.map((value, c) =>
        '<c r="' + excelColumn(c + 1) + r + '" t="inlineStr"><is><t xml:space="preserve">' +
        xmlEsc(value) + '</t></is></c>'
      ).join("");
      xmlRows.push('<row r="' + r + '">' + cells + '</row>');
      if ((i - from) % 4000 === 3999) {
        setProgress(88 + Math.round(((i + 1) / rows.length) * 8));
        await pause();
      }
    }
    const lastRow = until - from;
    const sheet =
      prefix + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + excelColumn(maxColumn) + lastRow + '"/>' +
      '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/><sheetData>' + xmlRows.join("") +
      '</sheetData></worksheet>';
    const sheetNumber = s + 1;
    packageFiles['xl/worksheets/sheet' + sheetNumber + '.xml'] = strToU8(sheet);
    worksheetList += '<sheet name="Tablo ' + sheetNumber + '" sheetId="' + sheetNumber + '" r:id="rId' + sheetNumber + '"/>';
    relationships += '<Relationship Id="rId' + sheetNumber +
      '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + sheetNumber + '.xml"/>';
    contentTypes += '<Override PartName="/xl/worksheets/sheet' + sheetNumber +
      '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    await pause();
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
    for (let n = 1; n <= pdf.numPages; n++) {
      ensureActive();
      const page = await pdf.getPage(n);
      try {
        const lines = rowsFromText(await page.getTextContent());
        for (const row of lines) {
          const parts = row.map(item => item.str).filter(Boolean);
          if (!parts.length) continue;
          if (parts.length > 1) meaningful++;
          if (rows.length && parts.length === rows[0].length &&
              parts.every((value, index) => value === rows[0][index])) continue;
          rows.push(parts);
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
    const counts = new Map();
    for (const row of rows) if (row.length >= 2) counts.set(row.length, (counts.get(row.length) || 0) + 1);
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0];
    const tableRows = rows.filter(row => row.length === dominant);
    if (tableRows.length < 2) {
      throw new Error("Tutarlı sütun düzenine sahip yeterli tablo satırı bulunamadı.");
    }

    setMessage(tableRows.length.toLocaleString("tr-TR") + " satır için Excel oluşturuluyor...");
    setProgress(88);
    const blob = await createWorkbook(tableRows);
    ensureActive();
    downloadFile(blob, safeStem(file.name) + ".xlsx");
    setProgress(100);
    const excluded = rows.length - tableRows.length;
    setMessage("Excel hazır: " + pdf.numPages.toLocaleString("tr-TR") + " PDF sayfası incelendi; " +
      tableRows.length.toLocaleString("tr-TR") + " tablo satırı aktarıldı. " +
      excluded.toLocaleString("tr-TR") + " farklı sütun düzenindeki satır dışarıda bırakıldı. " +
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
