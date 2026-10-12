# Tablova Web — Belge Modu test ve kabul raporu

**Tarih:** 12.10.2026
**Yayıncı:** Demirhan Özdemir

## Problem

Önceki PDF → Excel motoru tek, düzenli tablo çıkarımı için tasarlanmıştı. Resmî yazılar, alan–değer içeren belgeler, aynı sayfadaki farklı tablolar ve birleşik başlıklar bu varsayıma uymuyor. Bu durumda motor Excel üretmiyor veya yalnızca tablonun bir bölümünü aktarabiliyordu.

## Çözüm

- Üç sayfaya kadar kısa PDF'lerde tablo düzeni/metin kapsamı analizi yapılarak uygun görülen belgeler **Belge Modu**'na yönlendirilir.
- Her kaynak PDF sayfası için `Belge_N` çalışma sayfası oluşturulur. Seçilebilir metnin satırları, dikey/yatay başlangıç konumlarıyla birlikte **düzenlenebilir metin hücreleri** olarak tutulur.
- Algılanan çizgili tablolar ayrıca `Tablo_N` çalışma sayfalarına yazılır; birden çok tablo birbirine zorla birleştirilmez.
- Kimlik/numara/tarih alanları metin olarak tutulur, sayısal dönüştürme ve lider sıfır kaybı yapılmaz. Formül olarak çalışabilecek metinlere de yürütülebilir formül muamelesi yapılmaz.
- **Gerçek PDF'nin görsel düzeni, fotoğraf, QR kod ve logo birebir kopyalanmaz.** Seçilebilir metni olmayan taranmış PDF'de OCR eşdeğerliği hâlâ yoktur.
- 1.443 sayfalık önceki büyük dijital tablo senaryosu, yeni belge moduna yönlendirilmez ve önceki tablo motorunda kalır.

## Testler

| Kabul testi | Sonuç |
|---|---|
| Tablosuz resmî yazı, sentetik PDF | PASS |
| Alan–değer biçiminde sentetik form | PASS |
| Tek çizgili tablo ve uzun açıklamalar | PASS |
| İki sayfa ve birden fazla bağımsız tablo | PASS |
| Çok bölümlü sonuç tablosu | PASS |
| İki ayrı tablo içeren yerleştirme formu | PASS |
| Altı sentetik PDF'nin Chrome toplu dönüşümü | 6/6 PASS |
| Oluşturulan Excel çalışma sayfaları | 17 |
| Sentetik belge metin başlığının Excel'de bulunması | 6/6 PASS |
| Test esnasında site dışı HTTP isteği | 0 |
| Mevcut dijital tablo senaryolarında regresyon | PASS |

## Kullanıcının altı gerçek PDF dosyası

Gönderilen altı belge, ayrı ve hassas test dosyaları olarak **ChatGPT çalışma alanında** yapısal olarak incelendi. Belgelerin toplam **202 seçilebilir metin satırı** ve **7 algılanabilir çizgili tablo bölümü** tespit edildi. Bu metin satırlarının tamamı ayrı üretilen XLSX dosyalarında bulunabildi.

**Gerçek altı belge için canlı GitHub Pages testi:** Chrome üzerinden kullanıcı bilgisayarındaki yerel PDF'ler seçilerek 6/6 XLSX, toplam 14 Excel çalışma sayfası üretildi. Tarayıcı hatası 0, site dışı ağ isteği 0 olarak gözlendi. Kişisel bilgi taşıyan belgeler **GitHub deposuna veya bir dönüştürme API sunucusuna yüklenmedi**. Çıktıların birebir görsel eşdeğerliği hedeflenmez. Özgün karekod veya görsellerin Excel çıktısında yer aldığı iddia edilmez. Tabloların anlamsal birleşimleri manuel olarak kontrol edilmelidir.

## PASS/FAIL ölçütü

Belge Modu, seçilebilir kaynak metin satırlarının Excel'e eksiksiz çıkarılmasını hedefler. Tüm belgelerde piksel düzeyinde PDF/Excel görünüm eşitliği veya tüm birleşik hücrelerin aynı geometrisi **kabul kriteri değildir**. Bu belgelerin görsel ve resmî bütünlüğü için PDF dosyaları esas alınmalıdır.
