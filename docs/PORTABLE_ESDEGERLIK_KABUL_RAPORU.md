# Tablova Web / Portable — Doğrulama ve Kabul Raporu

**Tarih:** 12.10.2026
**Yayıncı:** Demirhan Özdemir
**Çalışma ortamı:** Windows üzerinde gerçek Google Chrome, statik yerel HTTP sunucusu; Pyodide 0.28.3, portable Python motoru

## Sonuç

| Ölçüt | Portable referans | Web (aynı Python motoru) | Durum |
|---|---:|---:|---|
| PDF sayfaları | 1.443 | 1.443 | PASS |
| Kayıt sayısı | 8.910 | 8.910 | PASS |
| Sütun sayısı | 12 | 12 | PASS |
| Excel satırları (başlık dahil) | 8.911 | 8.911 | PASS |
| Karşılaştırılan hücre | 106.932 | 106.932 | PASS |
| Eşit hücre değeri | 106.932 | 106.932 | PASS |
| Hücre veri türü uyuşmazlığı | — | 0 | PASS |
| Okunamayan tutar gösterimi | 116 | 116 | PASS |
| Çıktı çalışma sayfası | 1 | 1 | PASS |
| Yerel Chrome işlem süresi | — | 203,9 saniye | Ölçüldü |
| Test sırasında site dışı HTTP/POST | — | 0 istek | PASS |

**Referans:** Portable Tablova'nın mevcut kalite kabul Excel'i. Belgelerin kimlik/veri içerikleri bu rapora eklenmemiştir.

## Ek testler

- **Çoklu işlem:** İki PDF seçimi → iki geçerli XLSX + bir dönüşüm raporu içeren ZIP. PASS.
- **İptal:** PDF dönüştürme devam ederken durduruluyor; yeni işlem başlatılabiliyor; yanlış Excel indirilmiyor. PASS.
- **Taranmış PDF:** Portable OCR'nin tarayıcıdaki eşdeğerliği doğrulanamadığı için yanılgılı Excel üretilmiyor; Türkçe hata açıklaması sunuluyor. PASS (güvenli başarısızlık).
- **Ağ gizliliği:** Testlerde yalnızca uygulamanın kendi statik kaynağına GET istekleri görüldü; belge yükleyen veya site dışına çıkan istek görülmedi. PASS.
- **Bağımlılıklar:** `pdfplumber 0.11.10`, `pdfminer.six 20260107`, `openpyxl 3.1.5` Python motoru ile kullanıldı. PASS.

## Kabul kapsamı / istisnalar

Bu test, desteklenen **dijital PDF tablosu için %100 hücre eşdeğerliğini** doğrular. Diğer tablolar, taramalar, şifreli PDF'ler, farklı donanım ve tarayıcılar için aynı oran henüz ölçülmemiştir. PDF ile Excel görsel olarak birebir olmak zorunda değildir; kabul kriteri tablo verisi, satır-sütun yapısı ve hücre veri türüdür.

Tarayıcıda kaynak PDF'nin bulunduğu klasöre otomatik yazma yoktur. Kullanıcının açıkça izin verdiği klasöre yazılabilir veya dosya indirilebilir. Windows portable sürümünün yerel OCR davranışının tamamı webde mevcut değildir.

**Üretim kuralı:** Eşdeğerliği doğrulanmamış OCR dönüşümleri başarı olarak raporlanmaz; kullanıcının kendi belgelerinde çıktı kontrolü gerekir.
