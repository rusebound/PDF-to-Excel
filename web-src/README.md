# Web uygulamasÄ± â€” Kaynak kodu

**YayÄ±ncÄ±:** Demirhan Ã–zdemir Â· **Dil:** TÃ¼rkÃ§e

**YayÄ±n adresi:** https://rusebound.github.io/PDF-to-Excel/

Burada HTML/CSS/JavaScript tabanlÄ±, kullanÄ±cÄ± belgelerini sunucuya yÃ¼klemeyen web sÃ¼rÃ¼mÃ¼nÃ¼n geliÅŸtirici dosyalarÄ± bulunmaktadÄ±r.
Dosyalar tarayÄ±cÄ±nÄ±n yerel belleÄŸinde iÅŸlenir. BaÅŸlangÄ±Ã§ta uygulama kodu ve gerekli motor dosyalarÄ± GitHub Pages'ten indirilir.
KullanÄ±cÄ±larÄ±n hiÃ§bir program, EXE veya tarayÄ±cÄ± eklentisi kurmasÄ± gerekmez.

## Yeniden derleme (yalnÄ±zca geliÅŸtirici iÃ§in)

Node.js 22+ yÃ¼klÃ¼ geliÅŸtirme bilgisayarÄ±nda:

`powershell
npm ci
node rebuild.mjs
npm audit
`

Bu iÅŸlem docs/app.js, docs/style.css ve docs/pdf.worker.min.mjs dosyalarÄ±nÄ± gÃ¼nceller. docs/index.html mevcut statik sitedir.
KullanÄ±cÄ±nÄ±n kurum bilgisayarÄ±nda bu komutlarÄ± Ã§alÄ±ÅŸtÄ±rmasÄ± gerekmez.

## GÃ¼venlik

- Harici belge yÃ¼kleme API'si, kullanÄ±cÄ± oturumu ve telemetri eklenmemiÅŸtir.
- GitHub Pages ziyaretÃ§i baÄŸlantÄ± meta verilerini gÃ¶rebilir.
- Kurumunuzun BT, DLP, WebAssembly, JavaScript ve indirme politikalarÄ±na uyulmalÄ±dÄ±r.
- TarayÄ±cÄ± testleri bir Ã¶rnek belge setinde PASS almÄ±ÅŸtÄ±r; baÄŸÄ±msÄ±z kurumsal gÃ¼venlik sertifikasyonu deÄŸildir.
- Belge dÃ¶nÃ¼ÅŸtÃ¼rme doÄŸruluÄŸunun teknik sÄ±nÄ±rlarÄ± iÃ§in [gizlilik aÃ§Ä±klamasÄ±nÄ±](../docs/GIZLILIK_VE_SINIRLAR.md) okuyun.