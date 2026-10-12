# Üçüncü taraf bileşenler ve lisans bildirimi

**Tablova Web** Python/WebAssembly statik dağıtımında aşağıdaki açık kaynak bileşenler bulunur. Derlenmiş paketlerin orijinal lisans ve metadata bilgileri kendi wheel/dağıtım dosyaları içinde de yer alır.

| Paket | Sürüm | Lisans / bilgi |
|---|---|---|
| Pyodide | 0.28.3 | MPL-2.0 — https://github.com/pyodide/pyodide |
| pdfplumber | 0.11.10 | MIT — https://github.com/jsvine/pdfplumber |
| pdfminer.six | 20260107 | MIT — https://github.com/pdfminer/pdfminer.six |
| openpyxl | 3.1.5 | MIT — https://openpyxl.readthedocs.io |
| et_xmlfile | 2.0.0 | MIT — https://pypi.org/project/et-xmlfile/ |
| Pillow | Pyodide 0.28.3 paketli sürüm | HPND — https://python-pillow.org/ |
| cryptography / cffi / six ve Pyodide bağımlılıkları | Pyodide 0.28.3 paketli sürümler | Her paket kendi lisansı altında; paket metadata dosyalarına bakılmalıdır |
| fflate | 0.8.3 | MIT — https://github.com/101arrowz/fflate |

Python motorunun portable Tablova kaynaklarından web sürümü için kopyalanmış üç dosyası `docs/python` konumunda dağıtılır. Kodun veya kitaplıkların web tarayıcısında statik sunulması onların üçüncü taraf lisanslarını değiştirmez.

GitHub Pages, paketleri yalnızca aynı alan adından GET ile iletir; bu bileşenlerin çalışması için kullanıcı PDF'sini herhangi bir API sunucusuna göndermek gerekmez.
