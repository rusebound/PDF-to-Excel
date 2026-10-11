<!-- TARAYICIDA_CEVRIMDISI_SURUM -->
**[KURULUMSUZ WEB UYGULAMASINI AÃ‡](https://rusebound.github.io/PDF-to-Excel/)** â€” DosyanÄ±zÄ± sunucuya yÃ¼klemeden tarayÄ±cÄ±nÄ±zda kullanÄ±n. YÃ¶netici yetkisi veya EXE kurulumu gerekmez; kurumunuzun tarayÄ±cÄ± ve aÄŸ politikalarÄ± yine de geÃ§erlidir.

**Ã–nemli:** Web sÃ¼rÃ¼mÃ¼nÃ¼n Ã¶zellikleri Windows masaÃ¼stÃ¼ motoruyla birebir aynÄ± deÄŸildir. [Gizlilik ve teknik sÄ±nÄ±rlar](docs/GIZLILIK_VE_SINIRLAR.md) Â· [Denetlenebilir web kaynak kodu](web-src/).
<!-- /TARAYICIDA_CEVRIMDISI_SURUM -->

### Web sürümü — tablo hücresi algılama ve sayfa limiti

Çizgili PDF tabloları artık vektörel hücre sınırlarına göre çözülmeye çalışılır. Önceden görülen 12 sütunun 2 sütuna düşmesi ve filigran karakterlerinin araya karışması sorunları için özel iyileştirme yapıldı. Bu yöntem sentetik belgelerle test edilmiştir; gerçek belge türlerinde tam doğruluk garantisi yoktur. [Tablo motoru test raporu](docs/CIZGILI_TABLO_QA.md).

- **PDF sayfa sayısı için 120 sayfa sınırı artık bulunmuyor.** Bütün sayfalar sırayla incelenir.
- Uzun belgelerde işlenen sayfa sayısı gösterilir; **İşlemi durdur** düğmesi bulunur.
- Önceki 15.000 satırlık yapay sınır kaldırılmıştır. Excel'in çalışma sayfası başına 1.048.576 satır sınırında yeni sayfa oluşturulur.
- **Gerçek sınırlar:** Tarayıcının belleği, cihaz performansı, PDF'nin işlenebilirliği ve Excel'in teknik özellikleri. Çok büyük PDF dosyaları başarısız olabilir.
- Taranmış veya karmaşık tabloların kusursuz ayrıştırılması garanti edilmez; tablo satırları ve sayılar kaynakla kontrol edilmelidir.

Bu geliştirme **GitHub Pages web sürümüne** uygulanmıştır; Windows portable dağıtımının motoru değiştirilmemiştir.


# Tablova — PDF → Excel Dönüştürücü

**Yayıncı: DEMİRHAN ÖZDEMİR** · **Ana dil: Türkçe** · **Sürüm: 1.1.0** · **Platform: Windows x64 · Portable**

![Türkçe](https://img.shields.io/badge/Dil-Türkçe-blue) ![Excel](https://img.shields.io/badge/Çıktı-XLSX-informational) ![Önizleme](https://img.shields.io/badge/Yayın-Önizleme-orange)

PDF dosyalarındaki **tabloları düzenlenebilir Excel çalışma kitaplarına (XLSX)** dönüştürmek için geliştirilmiş bağımsız masaüstü uygulaması. Çok sayfalı tabloların mümkün olduğunda aynı çalışma sayfasında birleştirilmesi hedeflenir.

**[⬇ Tablova 1.1.0 — Portable Sürümü İndir](https://github.com/rusebound/PDF-to-Excel/releases/tag/v1.1.0)**

## Kullanım kolaylığı ve faydalar

| İhtiyaç | Sağladığı fayda |
|---|---|
| PDF tablosunu Excel'e aktarmak | Hücreleri tek tek kopyalama ihtiyacını azaltmak |
| Uzun rapor ve çizelgeler | Sayfalar boyunca devam eden tabloları birleştirmeye çalışmak |
| Sayılar üzerinde hesap yapmak | Düzenlenebilir XLSX hücreleriyle analiz yapmak |
| Sütun/satır düzenini korumak | Okunabilir tablo başlıkları ve biçimlendirme üretmek |
| Özgün PDF'yi arşivlemek | Kaynağa dokunmadan ayrı bir Excel çıktısı oluşturmak |

## Özellikler

- **Basit kullanım:** PDF seç → Excel'e dönüştür → XLSX dosyasını aç.
- **PDF tablo algılama:** Dijital metin, çizgi ve tablo geometrisiyle hücre çıkarımı.
- **Çok sayfalı tablo birleştirme:** Tek mantıksal tablonun devamını tanımaya yönelik işleme.
- **Yerel OCR:** Tarama sayfalarında gerektiğinde Tesseract metin tanıma.
- **Türkçe sayı ve tarih işleme:** Uygun değerleri Excel'de kullanılabilir hücre tiplerine aktarmayı hedefler.
- **Metin kaydırma ve sütun genişliği:** Okunabilir Excel çıktısı amaçlanır.
- **Çıktı koruması:** Paket kılavuzuna göre PDF değiştirilmez ve aynı isimli XLSX üzerine yazılmaz.

## 3 adımda dönüştürme

1. [Releases](https://github.com/rusebound/PDF-to-Excel/releases/tag/v1.1.0) bölümünden `PDF.TO.EXCEL.zip` indirin; arşivi tamamen çıkarın.
2. `Tablova/Tablova.exe` dosyasını çalıştırın; `_internal` klasörünü yanında tutun. **PDF Seç** düğmesiyle dosyanızı ekleyin veya sürükleyin.
3. **Excel'e Dönüştür** düğmesine basın. Çıktıyı PDF'nin bulunduğu klasörde açın ve kontrol edin.

> **Sistem:** Windows x64 üzerinde `.exe` çalıştırma izni gerekir. Program Chrome/Edge eklentisi değildir.

## Büyük dosyalar ve kalite hakkında

ZIP içindeki `QA_REPORT_1_1.md` adlı geliştirici raporu, **1.443 sayfalık bir örnek PDF'nin 8.911 satır ve 12 sütun içeren tek bir Excel çalışma sayfasına** aktarıldığını bildirir. **Bu, belirli bir dosyayla yapılmış yerel test kaydıdır**; tüm PDF belgelerinde aynı performansı veya eksiksiz doğruluğu garanti etmez.

OCR kalitesi düşük taramalarda, el yazısında, iç içe/geçişli tablolarda ve birleşik hücrelerde doğruluk azalabilir. Kaynak belgede okunamayan sayılar otomatik olarak tahmin edilmemelidir. Excel'deki tüm tutarları ve sayı biçimlerini kaynak PDF ile karşılaştırın.

## Sık sorulan sorular

**Bir PDF, çok Excel sayfası mı oluşturur?** Motor, aynı tablonun devamını mümkünse tek çalışma sayfasında birleştirmeyi hedefler; birden fazla tablo veya Excel satır sınırı gibi durumlarda farklı sayfalar gerekebilir.

**Excel kurulumu gerekiyor mu?** Dönüştürme motoru için zorunlu değildir; `.xlsx` dosyasını açmak için Excel veya uyumlu yazılım gerekir.

**PDF üzerinde değişiklik yapar mı?** Paket kılavuzuna göre hayır.

**Hatasız dönüştürme garanti mi?** Hayır; özellikle taranmış ve düzensiz tablolar kontrol gerektirir.

## Teknoloji ve dağıtım

Python, PySide6, pdfplumber/pdfminer.six, PDFium, Tesseract ve openpyxl bileşenleri. **Bu depo portable dağıtım ve dokümantasyon deposudur; özgün uygulama kaynak kodunun tamamını içerdiği iddia edilmez.** Üçüncü taraf lisanslar ayrıca denetlenmelidir.

## SHA-256 bütünlük kontrolü

`PDF.TO.EXCEL.zip`:

`1316FDBD4483DB87D29DCD51C5843D6E59E360F167BC696AC612B4436628F34A`

PowerShell: `Get-FileHash '.\PDF.TO.EXCEL.zip' -Algorithm SHA256`

**Yayın durumu:** Önizleme. Dosya yüklemesi ve SHA-256 eşleşmesi doğrulandı; bağımsız farklı belge/Windows uyumluluk testi ve kod imzası doğrulanmadı.

**Destek:** [GitHub Issues](https://github.com/rusebound/PDF-to-Excel/issues) — özel verilerinizi yüklemeyin.

---

**Yayıncı: DEMİRHAN ÖZDEMİR** · [GitHub profili](https://github.com/rusebound)

**English (short summary):** Portable Windows PDF-table-to-Excel converter with support for multi-page tables. Output accuracy depends on document structure and scan quality.
