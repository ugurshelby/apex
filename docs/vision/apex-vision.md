# Apex Vizyon & Misyon Belgesi

> **Temel Otorite:** Bu döküman Apex projesinin varoluş amacını, önceliklerini ve sınırlarını belirleyen kurucu metindir. Projedeki tüm mimari, tasarım, veri ve editoryal çalışmalar bu çerçevede yürütülür.
> **Güncelleme (2026-11-13):** konumlandırma "mühendislik vitrini" olarak netleştirildi. §1–§6 ve §8 bu kararı taşır; §7 mevcut ürün yüzeyini özetler.

---

## 1. Konumlandırma

Apex, Formula 1 verisi üzerine kurulmuş bir **Sistem Tasarımı ve Veri Orkestrasyonu vitrinidir (Engineering Showcase)**. Hedef kitlesi teknik işe alım uzmanları ve mühendislik ekipleridir.

- Ticari bir son kullanıcı ürünü değildir; reklam, gelir ya da üyelik yoktur.
- Trafik hedefleyen bir medya portalı değildir; içerik hacmi ve arama trafiği başarı ölçütü sayılmaz.
- Formula 1 konunun kendisidir, amacın değil: site, zor bir veri probleminin (çok kaynak, farklı gecikmeler, kesintiler, canlı akış) nasıl çözüldüğünü çalışan bir ürün üzerinden gösterir.

## 2. Ana vaat

Çoklu dış veri kaynakları (Jolpica, F1DB, OpenF1, Open-Meteo, RSS akışları, Groq/Gemini) tek bir sistemde **mekanik bir saat gibi** birlikte çalışır:

- **Kesintisizlik:** bir kaynak yanıt vermediğinde ya da bozuk veri döndürdüğünde sayfa hata göstermez; sistem son doğrulanmış snapshot'a düşer.
- **Tutarlılık:** şemadan geçmeyen dış veri yazılmaz; geçici ve gecikmiş veri etiketlenir; aynı girdi her zaman aynı çıktıyı üretir.
- **Deterministik yedek:** her okuma yolunun sıralı ve test edilmiş bir yedek kademesi vardır; hangi kademenin ne zaman devreye girdiği önceden bellidir.
- **Kanıt:** bu iddiaların her biri ya sitede görünür (sistem görünümü) ya da tekrarlanabilir bir testle doğrulanır. Kanıtı olmayan iddia yazılmaz.

## 3. Öncelik sırası

Her mimari öneri ve kod kararı şu dört prensibi sırayla esas alır:

1. **Kusursuz veri çarkı.** Mevcut veri akışlarının hatasız, tutarlı ve izlenebilir çalışması her şeyden önce gelir. Hatalı veri, bayat snapshot ya da sessizce çöken bir zamanlanmış iş kabul edilemez.
2. **Canlı Yarış ve Tekrar motoru.** Projenin amiral gemisi; en yüksek görsel ve teknik kalitede (§4).
3. **Kanıtlanabilir dayanıklılık.** Gözlemlenebilirlik ve uçtan uca test: sistemin sağlığı dışarıdan görülür, hata senaryoları otomatik sınanır (§5).
4. **Hız, akıcılık ve özgün arayüz.** Sayfalar hızlı ve takılmasız çalışır; görsel dil şablon değil, tasarlanmış ve tutarlıdır.

**Özellik şişkinliği yok.** Öncelik yeni özellik eklemek değil, var olanı kusursuzlaştırmaktır. Bu dört prensibe hizmet etmeyen yeni sayfa, veri kaynağı ya da içerik türü kapsam dışıdır.

## 4. Amiral gemisi: Canlı Yarış Ekranı ve Tekrar Motoru

Canlı veri anahtarı yokken ya da o an bir seans koşmuyorken ana sayfada pasif bir "canlı veri kilitli" uyarısı göstermek bu vizyona aykırıdır. Yarış modülü her zaman çalışır:

- **Çift mod.** Gerçek bir seans varken ve erişim açıkken canlı OpenF1 akışı; seans yokken ya da erişim yokken geçmiş bir yarışın gerçek zamanlama ve konum verisini o an akıyormuş gibi oynatan **deterministik tekrar motoru**.
- **Dürüstlük.** Tekrar her zaman tekrar olarak etiketlenir (yarış adı, yılı ve veri kaynağıyla); canlı diye sunulmaz. Gösterilen her sayı kayıtlı veriden gelir, uydurulmaz.
- **Determinizm.** Tekrarın herhangi bir anındaki durum, yalnız kayıt paketinin ve zamanın saf bir fonksiyonudur: aynı an her ziyaretçide ve her sunucuda aynı ekranı üretir ve testle doğrulanır.
- **Görsel ve teknik bileşenler.**
  - Pist vektör haritası üzerinde araçların gerçek ya da tekrar edilen konumlarının akıcı, interpolasyonlu hareketi (hedef 60 fps).
  - Canlı sıralama kulesi: sektör süreleri, lastik bileşiği (S/M/H/I/W) ve tur yaşı, DRS durumu (verisi olan seanslarda), pit sayısı ve süresi, lidere ve öndekine fark ile farkın yönü.
  - Pist durumu (bayrak, güvenlik aracı) ve yarış yönetimi iletileri.
- **Performans mimarisi.** Yüksek frekanslı veri React render döngüsünden geçmez: konumlar ayrı bir store'da durur ve `requestAnimationFrame` ile canvas'a çizilir; React yalnız seyrek değişen kuleyi yeniler.

## 5. Sistem sağlığı, dayanıklılık ve test disiplini

- **Gözlemlenebilirlik.** Zamanlanmış işlerin son koşuları, dış kaynakların gecikme süreleri ve snapshot/yedek mekanizmasının ne sıklıkta devreye girdiği herkese açık bir **Sistem Sağlığı / Mimari** görünümünde yayımlanır. Görünüm gerçek ölçümleri gösterir; ölçüm yoksa "ölçüm yok" yazar.
- **Uçtan uca test.** Playwright altyapısı etkindir. Kritik senaryolar dış kaynakların hata verdiği durumları (500, zaman aşımı, bozuk yanıt) sınar ve sistemin snapshot'a sorunsuz düştüğünü doğrular. Bu testler birleştirme kapısıdır.
- **Sıfır hata toleransı.** Hedef, hatanın hiç olmaması değil, kullanıcıya hiç yansımamasıdır: her hata durumunun tasarlanmış bir görünümü vardır.

## 6. Görsel varlık stratejisi

Görsel kalite ve otantiklik vitrin değeri için kritiktir. İki katman vardır:

- **Gerçek varlıklar.** Takım logoları, pilot portreleri ve gerçek araç görselleri yapay zekâ ile üretilmez. Wikimedia Commons'taki CC lisanslı ya da kamu malı dosyalardan ve yeniden kullanıma yazılı olarak izin veren açık kaynaklardan alınır, yerel olarak ya da depolama katmanında önbelleklenir (doğrudan bağlama yok) ve her biri lisans kaydı taşır (kaynak, yazar, lisans, tarih). Logolar yalnız ilgili takımı tanıtmak için, betimleyici biçimde kullanılır; serbest telif lisansı marka hakkını kaldırmaz. Uygun lisanslı dosyası olmayan varlık tasarlanmış yer tutucusuyla kalır.
- **Yapay zekâ destekli özgün varlıklar.** Antoloji hikâyelerinin illüstrasyonları, soyut arka planlar, pist atmosfer görselleri ve arayüz illüstrasyonları Google Flow ile üretilir, optimize edilir ve "yapay zekâ illüstrasyonu" olarak etiketlenir. Gerçek bir kişinin yüzü, takım renk düzeni, logo, sponsor, numara ya da yazı içermez; gerçek bir olayın fotoğrafı gibi sunulmaz.

Lisans kaydı olmayan görsel yayımlanmaz.

## 7. Ürün yüzeyi (vitrinin zemini)

Vitrin, çalışan ve dolu bir ürün üzerinde durur. Mevcut yüzeyler korunur ve kusursuzlaştırılır; derinleştirmek öncelik değildir.

- **Ana sayfa:** hafta sonu durumu, yarış modülü (canlı ya da tekrar), şampiyona nabzı, tarihte bugün, haberler.
- **Sezon ve puan durumu:** 1950'den bugüne takvim, sonuçlar, şampiyona gidişatı.
- **Pilotlar ve takımlar:** kariyer, dönem renkleri, takım soyağacı.
- **Pistler:** yerleşim, ölçülmüş referans tur telemetrisi, karakter.
- **Haberler:** RSS kaynaklarından kümelenen, olgu korumasından geçen, kaynağı bağlantılı özgün özetler.
- **Antoloji, teknik sözlük, ikonik araçlar:** tarihî anlatılar ve kavramlar; Türkçe ve İngilizce eksiksiz.

## 8. Kapsam dışı

- Ticari ve hukuki bürokrasiye odaklanan ayrı statik sayfalar (sorumluluk reddi, gizlilik, koşullar, telif bildirimi). Gerekli asgari bildirimler tek bir "Hakkında" sayfasında toplanır.
- Son kullanıcı destek ve iletişim modülleri.
- Arama trafiği büyütmeye yönelik çalışmalar ve içerik hacmi hedefleri.
- Reklam, gelir, üyelik.
- Resmî Formula 1, FIA ya da sponsor logoları; lisans kaydı olmayan her görsel.
