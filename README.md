# Tablova — PDF → Excel Dönüştürücü

**Sürüm 1.1.0 · Windows x64 · Portable PDF tablo → XLSX**

Dijital PDF sayfalarındaki tabloları ve gerektiğinde OCR ile okunan tarama içeriklerini düzenlenebilir Excel çalışma kitaplarına aktarmayı amaçlayan uygulama.

**[PDF TO EXCEL.zip indir — GitHub Releases](https://github.com/rusebound/PDF-to-Excel/releases)**

## Kurulum ve kullanım

1. ZIP arşivini tamamen çıkarın; içindeki `_internal` klasörünü koruyun.
2. `Tablova/Tablova.exe` dosyasını başlatın.
3. PDF dosyalarını **PDF Seç** ile ekleyin veya pencereye sürükleyin.
4. **Excel'e Dönüştür** ile işlemi başlatın.
5. Kaynak PDF ile aynı klasörde oluşan XLSX çıktısını açıp tablo, satır ve sayı değerlerini doğrulayın.

Paketin kılavuzuna göre kaynak PDF değiştirilmez ve mevcut Excel dosyalarının üzerine yazılmaz.

## Özellikler

- PDF metin, çizgi ve tablo geometrisi üzerinden veri çıkarımı.
- Çok sayfalı devam tablolarını tek mantıksal tablo olarak işleme hedefi.
- Yerel OCR gerektiren sayfalar için Tesseract.
- Metin kaydırma, hücre tipleri ve Türkçe sayı biçimleriyle XLSX çıktı.

## Test kaydı

Dağıtımda `QA_REPORT_1_1.md` yer alır. Geliştirici raporu, **1.443 sayfalık** bir örneğin **tek Excel sayfasında, 8.911 satır ve 12 sütun** olarak işlendiğini bildirir. Bu bir **belirli yerel senaryo raporudur**; tüm PDF türleri için garanti ya da bağımsız sertifika değildir.

**Sınırlar:** Birleşik hücreler, tarama kalitesi, el yazısı, formüller, karışık tablolar ve okunamayan kaynak değerler doğruluğu azaltabilir. Sonuçlar kontrol edilmelidir.

## Teknik ve lisans

Python, PySide6, pdfplumber/pdfminer.six, PDFium, Tesseract ve openpyxl tabanlı portable paket. **Bu depo şimdilik binary dağıtım dokümantasyonu içerir; uygulamanın özgün kaynak kodunun tam deposu değildir.** Üçüncü taraf lisansların yayımlama koşulları ayrıca incelenmelidir.

## SHA-256

`PDF TO EXCEL.zip`:

`1316FDBD4483DB87D29DCD51C5843D6E59E360F167BC696AC612B4436628F34A`

PowerShell: `Get-FileHash '.\PDF TO EXCEL.zip' -Algorithm SHA256`

## Yayın durumu

**Önizleme (pre-release).** ZIP içinde geliştirici kalite raporu bulunmaktadır; GitHub yayımı için ayrıca bağımsız Windows uçtan uca test ve kod imzalama yapılmadı.

**English:** Tablova extracts PDF tables to editable Excel XLSX on Windows. Portable and offline; review results for OCR and complex layouts.

Destek: [Issues](https://github.com/rusebound/PDF-to-Excel/issues).
