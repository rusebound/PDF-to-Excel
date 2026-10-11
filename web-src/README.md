# Kurulumsuz tarayici surumu kaynak kodu

Yayinci: Demirhan Ozdemir
Depo: PDF-to-Excel
Yayin: https://rusebound.github.io/PDF-to-Excel/

Kullanici bilgisayarinda calisan, sunucuya belge yukleme kodu bulunmayan statik HTML/CSS/JavaScript surumunun kaynak dosyalari bu klasordedir.
Dosya secimi ve cikti olusturma tarayici icinde gerceklesir. Statik motor dosyalari GitHub Pages uzerinden indirilir.

Yeniden derlemek icin geliÅŸtirici bilgisayarinda Node.js 22+ kurulu olmali:
npm ci
node rebuild.mjs

Bu build docs/app.js ve docs/pdf.worker.min.mjs dosyalarini gunceller. docs/index.html taslak statik site sayfasidir.
Bunlari kurum bilgisayarinda yapmaniz GEREKMEZ. Siteyi ziyaret etmek yeterlidir.

GÃ¼venlik kontrolu: npm audit
Kalite testi: yerel Playwright ile OCR, DOCX, XLSX, filigran incelemesi; gercek belgelerle genis kabul testi ayrica gereklidir.
Ticari ofis kalitesi ve kurum politikalarini asma garantisi yoktur.