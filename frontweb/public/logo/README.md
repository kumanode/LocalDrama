# Folder Logo Frontend (Web)

Folder ini digunakan untuk menyimpan aset logo dan ikon yang akan langsung diakses oleh antarmuka web (Vite / Vue 3).

### File yang Disarankan:
- `logo.svg` / `logo.png` — Logo utama untuk header aplikasi (misal di `FilmHeader.vue`, `AiConfig.vue`, dll.)
- `logo-white.png` / `logo-dark.png` — Varian logo untuk mode terang (*light*) atau gelap (*dark*)
- `favicon.svg` / `favicon.ico` — Ikon tab browser (dapat menggantikan favicon di `frontweb/public/favicon.svg`)

### Cara Penggunaan di Frontend:
Semua file di folder `public/logo/` dapat diakses langsung via URL path:
```html
<!-- Contoh di komponen Vue / HTML -->
<img src="/logo/logo.png" alt="Logo Aplikasi" class="app-logo" />
```
Atau untuk favicon di `frontweb/index.html`:
```html
<link rel="icon" type="image/svg+xml" href="/logo/logo.svg" />
```
