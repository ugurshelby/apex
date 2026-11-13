# Apex — Dokümantasyon Dizini

> **Pusula:** [`docs/vision/apex-vision.md`](vision/apex-vision.md)
> Apex, Formula 1'i yalnızca anlık sonuçlardan ibaret görmeyen; tarihini, teknik dinamiklerini, araçlarını ve insan hikâyelerini bir araya getiren bağımsız, kâr amacı gütmeyen bir arşiv ve canlı veri sitesidir.

---

## 1. Otorite sırası

1. **Kod ve testler:** gerçek kod tabanı ve yeşil testler.
2. **Referans ([`reference/apex-reference.md`](reference/apex-reference.md)):** ölçülmüş, doğrulanmış durum ve sistem envanteri; her bölümde `Last verified` tarihi.
3. **Tasarım ([`design/apex-design.md`](design/apex-design.md)) ve sahibin bileşen kuralları ([`design/apex-component-rules.md`](design/apex-component-rules.md)):** bileşen kuralları bağlayıcıdır.
4. **Vizyon ([`vision/apex-vision.md`](vision/apex-vision.md)):** projenin amacı ve sınırları.

Bir belge kodla çelişirse belge düzeltilir ya da silinir.

---

## 2. Harita

```
docs/
├── README.md                     # Bu dosya
├── PRODUCT.md                    # Ürün tanıtımı (her doküman rafinesinde gözden geçirilir)
├── vision/
│   ├── apex-vision.md            # Vizyon ve misyon
│   └── technical.md              # Kısa teknik özet
├── design/
│   ├── apex-component-rules.md   # Sahibin bağlayıcı bileşen kuralları
│   ├── apex-design.md            # Tasarım sistemi (token'lar, tipografi, boşluk)
│   ├── apex-design-language.md   # Kabuklar ve sayfa şablonları
│   └── tokens.json               # app/globals.css token'larının aynası
├── editorial/
│   └── quotes-pending-source.md  # Kaynağı doğrulanmayı bekleyen alıntılar
├── idea/                         # Duraklatılmış fikirler (yarış simülasyonu araştırması)
└── reference/
    ├── apex-reference.md         # Yaşayan referans ve ölçüm tabanı
    ├── mimari.md                 # Backend mimarisi ve veri akışı
    ├── media-sistemi.md          # Medya sistemi: kaynak, lisans kapısı, API
    ├── medya-kapisi-olcum.md     # Medya kapısı ölçümü
    ├── muhendislik-dersleri.md   # Yaşanmış tuzaklar ve çözümleri
    ├── guvenlik-durum-tespiti.md # Güvenlik durum tespiti
    ├── security-docs/            # Güvenlik standartları
    ├── yaris-hafta-sonu-dogrulama.md      # Yarış hafta sonu canlı doğrulama rehberi
    ├── hikaye-gorselleri-kaynak-listesi.md # Kaynağı doğrulanacak hikâye görselleri (üretilir)
    ├── anthology-image-map.md    # Hikâye–görsel eşlemesi
    ├── glossary-icon-prompts.md  # Sözlük ikonları için istem taslakları
    └── ai-gorsel-istemleri.md    # Yer tutucu görsel istem taslakları
```

---

## 3. Kurallar

- **Kök dizin:** yalnızca `README.md` ve `LICENSE` belge olarak kökte durur; diğer belgeler `docs/` altındadır.
- **Yaşam döngüsü:** bir rapor ya da çalışma listesi işini bitirince silinir; arşiv git geçmişidir.
- **Tazelik:** bir değişiklik bir belgeyi yanlış hâle getiriyorsa belge aynı commit'te düzeltilir; `apex-reference.md`'de dokunulan bölümün `Last verified` satırı güncellenir.
- **Bağlantılar:** iç bağlantılar göreli yazılır ve kırık bağlantı bırakılmaz.
