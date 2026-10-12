# Gizlilik, kurumsal kullanım ve teknik sınırlar

**Uygulama:** Tablova — PDF’den Excel’e (GitHub Pages web sürümü)
**Yayıncı:** Demirhan Özdemir
**Dil:** Türkçe

## Belge güvenliği

- Kullanıcının seçtiği PDF, tarayıcının dosya seçme arayüzü üzerinden yerel olarak okunur. Dönüşüm tarayıcı içindeki bir **Web Worker + Pyodide (Python/WebAssembly)** çalışma ortamında gerçekleştirilir.
- `pdfplumber 0.11.10`, `pdfminer.six 20260107` ve `openpyxl 3.1.5` portable sürümün kendi Python motoruyla birlikte tarayıcıda çalışır.
- Uygulama kodunda belge yükleyen sunucu API'si, hesap gereksinimi, telemetri veya belge saklama hizmeti bulunmaz. XLSX çıktı yerel indirme ya da kullanıcının açıkça izin verdiği klasöre yazma ile oluşturulur.
- Python, WebAssembly, motor ve üçüncü taraf paket dosyaları GitHub Pages'in **aynı kaynağından (same-origin)** indirilen statik dosyalardır. Bu, kullanıcının belgeyi GitHub'a yüklediği anlamına gelmez.
- Test edilen Chrome oturumlarında sitenin kendi kaynağı dışına ağ isteği ve belge yükleme HTTP isteği görülmedi. Bu, tüm cihazlarda sınırsız güvenlik garantisi değildir.

## Bilinmesi gerekenler

- GitHub Pages ve kurumsal ağ/proxy, siteye yapılan statik GET istekleri ile bağlantı meta verilerini kaydedebilir.
- Tarayıcı, işletim sistemi ve kurumsal DLP/EDR yazılımları yerel dosya etkinliğini kaydedebilir. Bellekten diske geçici yazma yapılmayacağı garanti edilemez.
- JavaScript, WebAssembly ve dosya indirmeye kurum politikası izin vermiyorsa web sürümü çalışmayabilir. Kısıtlamaları aşmaya yönelik bir mekanizma yoktur.
- Çalışma ortamı ilk yüklemede yaklaşık onlarca MB statik dosya indirir; belge dışarı çıkmaz.
- Dönüştürme RAM/CPU tüketir; sayfa sayısı için yapay sınır yoktur fakat sınırsız bellek yoktur. Excel çalışma sayfası başına en fazla 1.048.576 satır ve 16.384 sütun destekler.

## Yeni Belge Modu

Kısa, metin ağırlıklı resmî belgeler ile birleşik/muhtelif tabloları bulunan formlar belge modu ile XLSX çıktısına aktarılır. Belgede seçilebilir metin varsa `Belge_N` sayfalarında tüm okunabilir metin satırları ve konumları; çizgili tablolar varsa `Tablo_N` sayfalarında düzenlenebilir hücreler oluşturulur. Bu mod karekod, fotoğraf, logo gibi görsel nesneleri ve PDF'nin piksel düzeyinde sayfa görünümünü taşımaz. Taranmış ve seçilebilir metni olmayan belge için eşdeğer OCR desteği sağlanmamıştır.

## Birebir eşdeğerlik kapsamı

12 Ekim 2026'da gerçek **1.443 sayfalık dijital PDF** üzerinde tarayıcı içindeki Python motoru ile masaüstü portable motoru karşılaştırılmıştır:

- 8.910 veri kaydı, 12 sütun ve 116 okunamayan tutar uyarısı
- 106.932 / 106.932 Excel hücresi **aynı değer**
- 0 Excel hücre türü uyuşmazlığı
- 0 dış ağ isteği/harici belge aktarımı (test oturumu)
- Chrome üzerinden yaklaşık 203,9 saniyede işlem

Bu, **test edilen dijital belgedeki** değer ve hücre türü eşdeğerliğinin kanıtıdır; her PDF ve her bilgisayar için koşulsuz garanti değildir. XLSX ZIP meta verileri ve dosya baytları farklı olabilir.

### Taranmış PDF / OCR sınırı

Portable masaüstü OCR, yerel Tesseract/PDFium bileşenlerine bağımlıdır ve tarayıcıda eşdeğerliği henüz doğrulanmamıştır. **Taranmış ya da güvenilir tablo çıkarılamayan PDF için web sürümü tahmini Excel üretmez; açık uyarı gösterir.** Bunun için Windows portable sürümü kullanılmalıdır. OCR motorunun farklı bir sonuç üretmesine sessizce izin verilmez.

## Üçüncü taraf ve kaynak kodu

Dağıtılan kütüphaneler ve lisans bilgileri için [üçüncü taraf bildirimi](UCUNCU_TARAF_BAGIMLILIKLAR.md) belgesine bakın. Web uygulamasının kaynakları [web-src](../web-src/) içindedir; Python motorunun kaynakları webde statik olarak erişilebilir olduğundan kapalı kaynak/sır niteliğinde kabul edilmemelidir.

**Kurumsal veya kişisel hassas belgeler:** Kurum bilgi güvenliği politikasının açık onayı olmadan işlem yapılmamalıdır.
