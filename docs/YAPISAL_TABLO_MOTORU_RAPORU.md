# Tablova — Yerel Yapısal Belge ve Tablo Yorumlama

**Yayıncı:** Demirhan Özdemir
**Dil:** Türkçe

## Hedef ve sınır

Tablova, ChatGPT modelini bünyesinde barındırmaz. Bu sürüm, dijital PDF'lerde insanın tablo okurken yaptığı bazı işlemleri kural tabanlı ve kaynağa izlenebilir biçimde gerçekleştirir. Uygulama Python/WebAssembly üzerinden tarayıcıda, sunucuya kullanıcı belgesi göndermeden çalışır.

## Yeni yetenekler

1. Açık ayraç içeren `Alan: Değer` çiftlerini **yüksek güvenli**, yalnızca görsel sütun hizasına dayananları **orta güvenli** aday olarak gösterir.
2. PDF metninin tamamını `Belge_N` sayfasında tutar. Hiçbir tahmini alan çıkarımı orijinal metni değiştirmez.
3. Her çizgili `Tablo_N` için `Veriler_N` adlı **izlenebilir uzun biçimli** tablo oluşturur: orijinal satır, sütun, olası başlık, hücre değeri ve güven.
4. Tablonun her dolu hücresi aynı değerle aktarılır; boş veya birleşik hücreler uydurulmaz.
5. Belge tanıtıcıları ve tarih benzeri bilgiler Excel'de metin kalır; `=` ile başlayan metinler formül olarak yürütülmez.
6. Çizgisiz metinleri agresif biçimde sahte tabloya çevirmemek için belirsiz sayfalar kaynak metin görünümünde tutulur.

## Yerel kabul testleri

| Kriter | Sonuç |
|---|---|
| Gerçek örnek resmî PDF dosyası | 6/6 dönüştü |
| Ayıklanabilen form alanları | 39 |
| Çizgili tablolardan gelen dolu orijinal hücre | 269 |
| Uzun yapılandırılmış görünümde birebir kaynak hücre | 269/269 |
| Yeniden açılabilen XLSX | 6/6 |
| Gizli formül oluşması | 0 |
| Chrome ile altı PDF toplu dönüşümü | PASS |
| Site dışı istek / JavaScript hata sayısı | 0 / 0 |

Test PDF'leri kullanıcının yerel bilgisayarında işlendi; gerçek belge içerikleri depoya alınmadı.

## Henüz sağlanmayanlar

- ChatGPT'nin eğitilmiş görsel ve dil modellerinin birebir davranışı.
- Taranmış PDF için masaüstü OCR ile eşdeğer doğruluk.
- Tüm çizgisiz tablo türlerinde güvenilir satır/sütun algılama.
- Birleşik hücrelerin veya çok seviyeli başlıkların insan gibi kesin anlamlandırılması.
- PDF görsellerinin, QR kodlarının, resmî belgenin birebir Excel görünümüne dönüştürülmesi.

**Kabul yaklaşımı:** Yanlış tahmin yerine açık kaynak izleme ve düşük güven bildirimi. Kullanıcı sonuçları kaynak PDF ile kontrol etmelidir.
