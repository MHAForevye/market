# Forevye Mağaza

Kristal biriktir; Mantar Pano (Pro / Sınırsız), Zamanlayıcı (Plus / Premium, 3 ve 7 gün) kodları ve Astrophoto Cam aktivasyon paketi al. Hava uygulamasından (Mikro-Klima Kontrol Merkezi) ayrı, **statik** bir site: sadece HTML, CSS ve JS. Veri (bakiye, günlük ödül, seri, satın alma, kodlar) mevcut **kristal sunucusundan** gelir (Cloudflare Worker + D1, kodu `MikroKlimaKontrolMerkezi` reposunda `worker/`).

```
Tarayıcı ──► forevye-market (bu repo, GitHub Pages)
   │              │  fetch(API_BASE + /api/...)   Authorization: Bearer ID.ANAHTAR
   │              ▼
   │        Worker + D1  (MikroKlimaKontrolMerkezi reposu)  ◄── Mantar Pano (/api/mantarpano/redeem)
   └─► Mikro-Klima (hava): "Mağazayı aç" ile buraya yönlendirir
```

## Kurulum (sırayla)

1. **Repoyu aç ve yükle:** GitHub'da `forevye-market` adında boş repo aç, bu klasörün içeriğini `main` dalına gönder. Settings → Pages → Source: **GitHub Actions**. `.github/workflows/pages.yml` testleri çalıştırıp yayınlar. Adres: `https://frovye.github.io/forevye-market/`
2. **Sunucuyu hazırla (zorunlu):** önce hava reposunda `npx wrangler d1 execute mikroklima --remote --file=schema.sql` (Zamanlayıcı tablosunu ekler, mevcut verilere dokunmaz). Sonra izin: hava reposundaki `wrangler.toml` içinde `MARKET_ORIGIN = "https://frovye.github.io"` (sadece alan adı, `/forevye-market/` yok, sonunda `/` yok) yazılı olsun, sonra hava reposunda `npx wrangler deploy`. Bu yapılmazsa Mağaza açılır ama bakiye gelmez; tarayıcı konsolunda CORS hatası görünür.
3. **Adresleri düzelt:**
   - Bu repoda `config.js` → `API_BASE`, `WEATHER_URL`, `MANTAR_URL`. `API_BASE` değişirse `index.html` içindeki CSP satırında `connect-src` de aynı olmalı (test uyarır).
   - Hava reposunda `js/magaza.js` → `MARKET_URL` (Mağaza adresi, sonunda `/`).
   - Mantar Pano `config.js` → `STORE_URL` (Mağaza adresi).
4. Her değişiklikten sonra `npm run bump` (sürüm numaralarını günceller), sonra `npm test`.

Yerelde denemek için: `npm run serve` → http://localhost:8080 (bu adresi denemek için `MARKET_ORIGIN`'e geçici olarak `http://localhost:8080` ekle).

## Hesap nasıl taşınır?

Hesap = 8 haneli Site ID + gizli anahtar; anahtar tarayıcıda (`localStorage`, `mk_kristal2`) durur. Mağaza farklı bir alan adında olduğu için hava uygulamasındaki hesabı doğrudan göremez. Üç yol:

- **Otomatik:** hava uygulamasında Ayarlar → *Mağazayı aç*. Eski hesap varsa adrese `#hesap=ID.ANAHTAR` eklenir. Mağaza hesabı yükler ve adres çubuğundan siler (`#` sonrası sunucuya gitmez). Mağaza'da zaten başka hesap varsa sorar; eskisi *Önceki hesabımı geri yükle* ile geri gelir.
- **Yedek metni:** Mağaza → *Hesap yedeği*. Hava uygulamasının yedek metni de kabul edilir.
- Yeni kullanıcı: hiçbir şey yapmaz, Mağaza ilk açılışta hesap açar.

## Kristal ne zaman verilir?

İki site **aynı hesabı** kullanır. Günlük ödül ve seri, hava uygulaması da Mağaza da her açıldığında sunucuya giden `sync` isteğiyle verilir (günde bir kez; hangisi önce açılırsa). Kristal hava uygulamasında kazanılır, Mağaza'da harcanır; bakiye tek yerde, sunucudadır.

Hesabın iki siteyi birleştirmesi için taşıma bağlantısı iki yönde çalışır: hava uygulamasında *Mağazayı aç*, Mağaza'da *Hava uygulaması* / *Hava durumuna dön*. Her ikisi de adrese `#hesap=ID.ANAHTAR` ekler, karşı site hesabı bir kez yükler. İki sitede farklı hesap açılmışsa (ör. önce Mağaza, sonra hava uygulaması yeni açıldıysa) karşı site hangisinin kalacağını sorar, öteki bu cihazda yedeklenir. **En kolay yol:** yeni kullanıcı bağlantıyla bir siteden ötekine bir kez geçsin.

## Yapı

| Dosya | Ne yapar |
|---|---|
| `index.html`, `config.js` | Sayfa ve adresler |
| `js/kristal.js` | Sunucu bağlantısı, satın alma, hediye kodu, yönetici bölümü, hesap taşıma |
| `js/hesap.js` | Hesap taşıma çözümleyicileri (saf, test edilir) |
| `js/seri.js`, `js/core.js` | Seri ateşi ve 12 alev kademesi |
| `js/vitrin.js`, `css/vitrin.css` | Kart ve pencere tasarımı |
| `tests/` | `npm test` (Node 22) |

Yönetici bölümü: Astrophoto Cam ID alanına gizli kelimeyi yazınca açılır (kelimenin özeti `kristal.js` içinde); asıl yetki sunucudaki `ADMIN_TOKEN`'dadır.

Kimlik başlıkla gider, çerez kullanılmaz; bu yüzden CORS yalnızca `MARKET_ORIGIN`'deki adrese açıktır ve başka site kullanıcının hesabına dokunamaz.
