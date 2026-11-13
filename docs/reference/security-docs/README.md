# Güvenlik ve Kriptografi Referans Dokümanları İndeksi

Bu dizin, kurumsal parola güvenliği, durağan veri şifreleme (data at rest), kriptografik anahtar yaşam döngüsü ve Hizmet/Maliyet Engelleme (DoS / Denial of Wallet) korumaları için temel mühendislik standartlarını ve uygulama rehberlerini içerir.

---

## Doküman Kılavuzu

| Doküman | Odak Alanı & Kapsam | Birincil Standartlar |
| :--- | :--- | :--- |
| [**Kurumsal Sistemler İçin Mimari Güvenlik Standardı**](./kurumsal-guvenlik-standardi.md) | Kimlik doğrulama mimarisi, Zarf Şifreleme (Envelope Encryption), DEK/KEK hiyerarşisi, CSPRNG, DoS/DoW koruması ve denetim kontrol listesi (Checklist). | RFC 9106, RFC 7914, RFC 3394, NIST SP 800-38D, OWASP LLM 2025 |
| [**Argon2id ve scrypt Kavram Karşılaştırma Rehberi**](./argon2id-scrypt-rehberi.md) | Bellek-zorlu (memory-hard) algoritmaların GPU/ASIC direnci, OWASP bellek farkı analizi (~19 MiB vs ~128 MiB), sunucu RAM bütçelemesi ve karar ağacı. | RFC 9106, RFC 7914, OWASP |
| [**Yazılım Geliştiriciler İçin Temel Kriptografi ve Veri Güvenliği Kılavuzu**](./kriptografi-ve-veri-guvenligi-kilavuzu.md) | Simetrik/asimetrik şifreleme (AES-GCM, HPKE, RSAES-OAEP), PRNG vs CSPRNG fonksiyon haritası, UUID v1/v4 farkı, yaygın geliştirici tuzakları. | RFC 9180 (HPKE), RFC 8017 (OAEP), FIPS 203 (ML-KEM) |

---

## Projedeki Uygulama Bağlantısı
Apex projesinin mevcut kod ve veritabanı seviyesindeki güvenlik tespiti için ayrıca bakınız:  
👉 [`docs/reference/guvenlik-durum-tespiti.md`](../guvenlik-durum-tespiti.md)
