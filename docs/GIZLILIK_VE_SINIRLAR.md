# Gizlilik, veri güvenliği ve kullanım sınırları

**Yayıncı:** Demirhan Özdemir · **Dil:** Türkçe

## İşlenen belgeler nerede kalır?

- Kullanıcı dosyası `input[type=file]` / tarayıcı dosya seçicisi üzerinden **yerel belleğe** alınır.
- PDF metni, görüntü, OCR ve dışa aktarım işlemleri istemcide JavaScript/WebAssembly ile gerçekleştirilir.
- Uygulama dosya yükleyen POST isteği, harici OCR/dönüştürme API'si, analiz/telemetri, kullanıcı kaydı, reklam ve sunucu saklama mekanizması içermez.
- Çıktı `Blob` ve cihazın yerel indirme işlemiyle oluşturulur.
- Tesseract OCR motoru ve dil modeli de dahil olmak üzere JavaScript/WASM çalışma dosyaları GitHub Pages üzerinden indirilir. **Bu indirme, kullanıcının belgesinin GitHub'a yüklendiği anlamına gelmez.**

## Gizlilik güvencesinin gerçek sınırları

- GitHub Pages sunucusu, HTTP isteklerinde IP adresi, tarayıcı bilgisi ve istenen statik dosyaların yolunu görebilir. Sıfır ağ trafiği veya sıfır bağlantı meta verisi iddiası yoktur.
- Kurumsal proxy, güvenlik duvarı, yönetilen tarayıcı/eklenti, DLP veya EDR sistemleri trafiği ve yerel dosya etkinliğini ayrıca kaydedebilir.
- Tarayıcı belleği ve geçici verilerin işletim sistemi tarafından diske yazılmaması garanti edilemez.
- Üçüncü taraf PDF ve OCR bileşenlerinin güvenlik açıklarına karşı tarayıcı güncel tutulmalıdır.
- Yerel tarayıcı testinde **belge yükleyen POST** ve site dışına ağ isteği gözlenmedi; bu test başka cihazlarda kapsamlı bağımsız güvenlik denetimi yerine geçmez.
- Web sitelerini kullanmak yönetici yetkisi gerektirmez, ancak kurumunuzun GitHub Pages, JS, WASM, dosya seçimi veya indirmeler üzerindeki engellerini aşamaz. İzin gerekiyorsa BT biriminden onay alın.

## İşlev sınırları

- **OCR:** Türkçe görsel/PDF sayfası tanıma ve alan seçimi; sonuç OCR kalite sınırlarına tabidir.
- **PDF → Word:** Düzenlenebilir dijital metin ya da görsel sayfa modu. Aynı anda bütün grafiklerin birebir korunması ve kusursuz düzenlenebilirlik garanti değildir.
- **PDF → Excel:** Sabit 120 sayfa ve 15.000 satır kontrolleri kaldırılmıştır. Sayfalar sırasıyla incelenir, Excel çalışma sayfasındaki 1.048.576 satırlık teknik sınır dolarsa ek sayfa açılır. Kullanılabilir tarayıcı belleği ve cihaz performansı pratik sınırdır. Temel hizalı dijital tablolarda, en yaygın sütun dizilimindeki satırlar çıkartılır; düzensiz satırlar raporlanarak atlanabilir. Tarama ve karmaşık tablo için uygun değildir.
- **Filigran İnceleme:** Yalnızca metin bazlı filigran aday raporu; **filigran kaldırma yoktur**. İnceleme PDF'yi değiştirmez.

## Yerel kalite kontrolleri

- Gerçek Chrome ile yerel HTTP sunucusunda dört web sayfası açılarak test edildi.
- İki sayfalı örnek PDF üzerinde: düzenlenebilir DOCX, görsel DOCX, XLSX, filigran adayı; örnek Türkçe görüntüde OCR sonucu üretildi.
- XLSX ayrıca openpyxl ile yeniden açıldı: tek çalışma sayfasında 4 satır, 3 sütun.
- Test gözleminde site dışı istek ve GET/HEAD harici HTTP yöntemi sayısı: **0**.
- Bağımlılıkları kurarken `npm audit`: **0 bilinen güvenlik uyarısı** (test anında).
- Bu bir örnek setidir; gerçek kurumsal uyumluluk, erişilebilirlik ve tüm dosya türleri için üretim kabulü yapılmadı.

## Üçüncü taraf

PDF.js / pdfjs-dist 5.4.624 (Apache-2.0), docx 9.10.0 (MIT), fflate 0.8.3 (MIT). OCR projesinde ayrıca Tesseract.js, Tesseract Core ve Türkçe OCR modelini içeren yerel paket vardır; paketli üçüncü taraf lisansları ayrıca incelenmelidir. Bunların tamamı istemci tarafına gönderilen statik dosyalardır.

**Kritik belge işleme:** Kurumsal bilgi güvenliği politikasının onayını almadan gizli kişisel/kurumsal belge işlemeyin.
