# Tablova Web kaynak kodu — Portable Python/WebAssembly

Bu klasör GitHub Pages üzerinde `docs/` altında yayımlanan web sürümünün JavaScript kaynak kodunu içerir.

**Asıl dönüştürme motoru:** `web-src/portable-client.js` → `docs/portable-worker.js` → `docs/python/engine.py`. Python tablo motoru portable Tablova kaynak kodundan alınmıştır. Kullanılan `pdfplumber 0.11.10`, `pdfminer.six 20260107`, `openpyxl 3.1.5` sürümleri masaüstüyle aynıdır.

`docs/pyodide`, `docs/wheels` ve `docs/python` statik dosyaları aynı GitHub Pages alan adından indirilir; kullanıcı PDF dosyası yüklenmez. `web-src/excel.js` içinde bulunan eski JavaScript çıkarım kodu aktif birincil motor değildir.

Geliştirme bilgisayarında Node.js 22+:

```powershell
npm ci
node rebuild.mjs
npm audit
```

**Belge Modu:** `docs/python/document_layout.py` modülü resmî belge, alan–değer listeleri ve birden fazla tablosu olan kısa PDF'ler için çalışır. Tam metin `Belge_N`, çizgili tablolar `Tablo_N` çalışma sayfalarına aktarılır. Bu sonuç resmî belgenin fotoğraf, karekod ve sayfa tasarımını birebir kopyalamaz.

**Not:** Yalnızca JavaScript derlemek, Python/WebAssembly veya wheel sürümlerini güncellemez. Yeni bağımlılık sürümlerinde lisans ve regresyon incelemesi gerekir.

Dijital PDF örnek testinde **106.932/106.932 hücre eşitliği** doğrulandı. Taranmış PDF'de portable OCR eşdeğerliği henüz sağlanmadığı için tahmini Excel üretilmez.

[Doğrulama raporu](../docs/PORTABLE_ESDEGERLIK_KABUL_RAPORU.md) · [Gizlilik](../docs/GIZLILIK_VE_SINIRLAR.md)
