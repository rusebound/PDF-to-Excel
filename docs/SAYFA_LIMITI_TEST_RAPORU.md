# PDF → Excel Web — Sayfa Sınırı Kaldırma / Test Raporu

**Yayıncı:** Demirhan Özdemir · **Dil:** Türkçe

## Değişiklikler

- Web sürümünün `120 sayfa` doğrulama engeli kaldırıldı; PDF sayfaları sırayla incelenir.
- Seçilen PDF için sabit 50 MB giriş reddi kaldırıldı. İşlenebilirlik cihaz ve tarayıcı belleğiyle sınırlıdır.
- Daha önceki 15.000 satır kontrolü kaldırıldı.
- Excel çalışma sayfasının **1.048.576 satır** biçim sınırı dolduğunda bir sonraki çalışma sayfası oluşturulur.
- Sayfa sayacı, ilerleme göstergesi ve işlemi durdurma işlevi eklendi.
- Belgeler tarayıcı içinde işlenir; harici dönüştürme servisi veya belge yükleme isteği kullanılmaz.

## Doğrulanan kabul testleri

| Test | Beklenen | Gözlenen | Sonuç |
|---|---|---|---|
| 405 sayfalık dijital PDF | 120 sayfa sınırında durmamalı | 405 sayfa incelendi | PASS |
| 405 × 40 tablo satırı | 15.000 satır engeline takılmamalı | 16.200 satır XLSX'e aktarıldı | PASS |
| XLSX dosyasını yeniden açma | Geçerli Excel dosyası | Python openpyxl ile 16.200 satır, 3 sütun; ilk ve son satır kontrol edildi | PASS |
| İşlem iptali | Uzun işlem durmalı | İptal sonrasında düğme tekrar kullanılabilir | PASS |
| Dosya girişinde 50 MB sınırı | Giriş reddedilmemeli | 53 MiB örnek giriş kabul edildi; dönüşüm yapılmadı | PASS |
| Çok sayfalı XLSX dalı | Satır limiti dolduğunda yeni sayfa | Test yapısında satır sınırı 3'e indirilerek 3+1 satır iki sayfada oluşturuldu, openpyxl ile yeniden açıldı | PASS |
| Ağ isteği | Belge dışarı gönderilmemeli | Yerel Chrome testinde site dışı HTTP veya GET/HEAD harici istek: 0 | PASS |

## Doğruluk ve teknik sınırlar

**Sınırsız sayfa sayısı**, sınırsız sistem kaynağı demek değildir. PDF'nin büyüklüğüne, metin sayısına, tarayıcı belleğine ve işlem gücüne göre işlem yavaşlayabilir veya başarısız olabilir. Excel biçiminde bir çalışma sayfasında en fazla 1.048.576 satır ve 16.384 sütun bulunabilir. Çıktının toplam boyutu için de pratik belleksel sınırlar geçerlidir.

Web motoru **tarama OCR tablo dönüştürmesi yapmaz** ve karmaşık düzenlerde tablo yapısını kusursuz koruma garantisi sunmaz. En yaygın sütun düzenine uymayan satırlar dışarıda bırakılabilir. Belgelerin sayısal değerleri ve satır tamlığı mutlaka kontrol edilmelidir.

**Not:** Testler kontrollü sentetik PDF'lerle yapılmıştır. Çok büyük gerçek belgelerle üretim kabulü veya kurumsal güvenlik sertifikasyonu değildir.
