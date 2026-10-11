# PDF → Excel Web Motoru — Çizgili Tablo Testleri

**Yayıncı:** Demirhan Özdemir

## Yapılan değişiklik

Çizgili PDF tablolarında metinler arasındaki yatay boşlukları esas alan eski yöntem yerine, PDF'nin vektörel çizgilerinden satır/sütun sınırları çıkarılarak metin parçaları ilgili hücrelere atanır. Böylece tabloda 12 sütun varken yalnızca 2 sütun oluşturulması ve kayıtların yanlış satırlara dağılması gibi sorunlar hedeflenmiştir.

- Tekrarlanan başlık satırları ayıklanır.
- PDF'de fazladan boş sağ sütun bulunduğunda bu sütun alınmaz.
- Eğik filigran metni tablo verisine eklenmez.
- Tarihler Excel tarihi, uygun tutarlar Excel sayısal hücresi olarak yazılır.
- Kaynakta ##### veya ###### biçiminde okunamayan değerler tahmin edilmez.
- Tek kayıt içeren çizgili tablolar da desteklenir.
- Çizgisiz PDF tablolarında önceki yöntem korunur. Karmaşık çizgisiz tablolar, taranmış görüntüler ve biçimsel olarak tutarsız belgeler için doğruluk garantisi verilmez.
- Dokümanlar tarayıcıda işlenir; yükleme/telemetri API'si eklenmez.

## Sentetik belge kabul testleri

| Test | Sonuç |
|---|---|
| 2 sayfalık, 12 sütunlu çizgili tablo (11 kayıt) | PASS — 12 sütun; filigran atlandı |
| Ekstra boş 13. sütun içeren tablo (4 kayıt) | PASS — 12 veri sütunu |
| Aynı metin satırında yer alan tarih ve tutar; 1 kayıt | PASS — tarih ve para hücreleri ayrıldı |
| XLSX başlık satırı ve sayısal hücre biçimleri | PASS — ZIP/XML yapısı incelendi |
| 405 sayfa, 16.200 satırlı çizgisiz regresyon testi | PASS |
| Durdurma düğmesi ve 50 MB üstü dosya seçimi | PASS |
| Testlerde sunucuya belge aktarma isteği | 0 |

**Sınır:** Kullanıcının özel/orijinal belgesi GitHub'a veya harici test hizmetine aktarılmamıştır. Gizli dosya üzerinde tarayıcı sürümünün 1.443 sayfalık gerçek uçtan uca kabul testi yapılmadığından üretim için mutlak doğruluk iddiası yoktur.

Kritik belgelerde satır sayısı, sütun sayısı, tarih ve para alanları mutlaka kontrol edilmelidir.
