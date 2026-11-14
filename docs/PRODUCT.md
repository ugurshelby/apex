# Apex — Proje ve Ürün Tanıtım Dokümanı (Product Overview)

> **Amaç:** Bu dokümanın temel amacı projenin resmi tanıtım (product showcase & overview) belgesi olmaktır.  
> **Bakım Kuralı:** Her `docs refinement` veya `docs freshness sweep` gibi dokümantasyon yenileme/güncelleme prosedürünün ardından bu doküman da güncellenmeli ve güncel tutulmalıdır. Böylece mimari, arayüz veya vizyoner kararlar bu dokümanda daima taze kalır.  
> **Temel Pusula:** Bu projenin temel vizyon ve misyon belgesi [`docs/vision/apex-vision.md`](vision/apex-vision.md) dökümanıdır; tüm çalışmalar bu vizyon çerçevesinde yürütülür.

## Register

product

## Users

Birincil kitle: teknik işe alım uzmanları ve mühendislik ekipleri. Siteyi bir sistem tasarımı örneği olarak inceler; çoğu birkaç dakika ayırır ve canlı yarış ekranına, sistem görünümüne ve kaynak koda bakar.

İkincil kitle: Formula 1 takipçileri ve veri meraklıları. Sezonu, pilot ve takım performansını, pistleri ve sporun tarihini masaüstünde derinlemesine ya da mobilde hızlıca inceler. Vitrin, onların gerçekten kullanabildiği dolu bir ürün üzerinde durur.

## Product Purpose

Apex, Formula 1 verisi üzerine kurulmuş bir sistem tasarımı ve veri orkestrasyonu vitrinidir (engineering showcase). Çoklu dış veri kaynağını (Jolpica, F1DB, OpenF1, Open-Meteo, RSS, Groq/Gemini) kesintisiz, tutarlı ve deterministik yedek kademeleriyle, saat mekanizması gibi birlikte çalıştırır ve bunu kanıtlar: canlı seans yokken bile çalışan Canlı Yarış / Tekrar ekranı, herkese açık sistem sağlığı görünümü ve hata senaryolarını sınayan uçtan uca testler. Resmî olmayan, ticari olmayan, telif konusunda hassas bir projedir; ticari bir son kullanıcı ürünü ya da trafik hedefleyen bir medya portalı değildir.

## Brand Personality

Sakin, teknik, otoriter. Arayüz; yayın grafikleri kadar hızlı okunmalı, yarış
mühendisliği araçları kadar güven vermeli ve gereksiz görsel gürültüden kaçınmalıdır.

## Anti-references

Gösterişli spor bahis panoları, aşırı gradyanlı SaaS dashboard'ları, küçük dokunma
hedefleri, hover'a bağımlı mobil etkileşimler ve bilgi hiyerarşisi olmayan kart duvarları.

## Design Principles

- Veri ilk bakışta taranabilir, detay ikinci bakışta keşfedilebilir olmalıdır.
- Aynı bilgi mimarisi mobil, tablet ve masaüstünde korunmalıdır.
- Performans ve layout stability görsel efektlerden önce gelir.
- Renk yalnızca takım, durum veya seçim bilgisini taşır; dekorasyon değildir.
- Her kritik etkileşim klavye, touch ve reduced-motion koşullarında kullanılabilir olmalıdır.

## Accessibility & Inclusion

WCAG 2.2 AA hedeflenir. Metin ve veri kontrastı korunur, etkileşim hedefleri en az
44px olur, renk tek bilgi taşıyıcısı olarak kullanılmaz ve hareket azaltma tercihi
desteklenir. 320px genişlikten başlayarak responsive davranış doğrulanır.
