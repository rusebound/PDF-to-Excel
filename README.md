# Tablova Web — Portable Python Motoruyla PDF → Excel

**Yayıncı: Demirhan Özdemir** · **Ana dil: Türkçe** · **Web: kurulum gerektirmez**

**[Web uygulamasını aç](https://rusebound.github.io/PDF-to-Excel/)** · [Gizlilik ve kullanım](docs/GIZLILIK_VE_SINIRLAR.md) · [Birebir hücre kabul raporu](docs/PORTABLE_ESDEGERLIK_KABUL_RAPORU.md)

Web sürümünde masaüstü portable uygulamanın **aynı Python tablo motoru** `Pyodide/WebAssembly` üzerinde tarayıcı içinde çalıştırılır. PDF belgeleri ve sonuçları sunucuya gönderilmez. Kurumunuzun JavaScript, WebAssembly ve dosya indirme politikaları geçerlidir.

### Doğrulanan özellikler

- Gerçek dijital PDF testinde **1.443 sayfa, 8.910 kayıt, 12 sütun ve 106.932/106.932 birebir eşleşen Excel hücresi**, **0 veri türü farkı**.
- Çoklu PDF seçimi, listeden kaldırma, toplu ZIP, işlemi durdurma, ilerleme ve Türkçe hata açıklamaları.
- Hedef klasörü yalnızca kullanıcının açık izniyle seçme; aksi halde tarayıcı indirmesi.
- Excel tarih, sayı, metin, uzun açıklama ve uyarı biçimleri için portable motorun çıktı kuralları.

### Belge modu ve teknik sınır

Kısa resmî belgeler, alan–değer formları ve birden fazla bağımsız tablosu bulunan PDF'ler otomatik **Belge Modu** ile işlenir. Seçilebilir metinler belge sırasıyla `Belge_1` gibi çalışma sayfalarına, çizgili tablo bölümleri ayrı `Tablo_1` sayfalarına aktarılır. Bu mod içeriği düzenlenebilir yapar; **PDF görsellerini, karekodları ve birebir sayfa tasarımını yeniden oluşturmaz**.

Gerçek kullanıcı belgeleri GitHub'a gönderilmez. Bu mod kullanıcı tarafından sağlanan altı farklı belge şablonunun yapısına göre geliştirilmiş ve kişisel bilgi içermeyen altı test PDF'siyle tarayıcıda doğrulanmıştır. Gerçek altı belge, yayımlanan GitHub Pages sürümünde Chrome ile yerel dosya seçimi üzerinden test edilmiştir: 6 XLSX, toplam 14 çalışma sayfası, 0 tarayıcı hatası ve 0 site dışı ağ isteği. Belgeler GitHub'a yüklenmemiştir.

### Yerel yapısal belge yorumlama

Dijital resmî belgelerde `Alanlar_N` çalışma sayfaları açık başlık–değer çiftlerini çıkarır. Çizgili tablolardaki her dolu hücre `Veriler_N` uzun biçimli görünümde orijinal satır/sütun konumuyla korunur; olası başlıklar ve güven düzeyi ayrıca gösterilir. Kaynak sayfalar `Belge_N`, özgün tablo hücreleri `Tablo_N` sayfalarında kalır. [Yapısal tablo test raporu](docs/YAPISAL_TABLO_MOTORU_RAPORU.md).

Bu, ChatGPT modelinin uygulamaya gömülmesi değildir. Anlamı belirsiz başlık veya hücreler tahmin edilmez; taranmış PDF ve karmaşık çizgisiz tabloların tamamı henüz desteklenmez.

### Teknik sınır

**Taranmış PDF/OCR için web ve masaüstü eşdeğerliği henüz sağlanmamıştır.** Hatalı veya eksik Excel üretmek yerine web sürümü bu belgelerde uyarı verir; Windows portable sürümü kullanılmalıdır. Diğer PDF türleri için de sonuçları kaynakla doğrulamak gerekir.

[Kaynak kod](web-src/) · [Üçüncü taraf bileşenler](docs/UCUNCU_TARAF_BAGIMLILIKLAR.md)

---

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
