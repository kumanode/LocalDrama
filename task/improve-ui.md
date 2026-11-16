# Perbaikan UI — penerapan design system Nothing UI

Status: **sebagian selesai.** Empat bagian di bawah (§1–§4) sudah dikerjakan dan lolos
build. §5 berisi temuan audit yang **belum** diperbaiki.

Acuan: [`docs/DESIGN.md`](../docs/DESIGN.md).
Tes frontend: 105 lulus (sebelumnya 95). Build produksi `npm run build` sukses.
Belum ada yang di-commit.

---

## 1. Pembersihan warna hardcode di komponen (selesai)

### Masalah

Commit `f8f8058` menyatakan semua warna ungu sudah dihapus, tapi pemeriksaan ulang
menemukan ratusan hex/rgba mentah masih tersisa di `.vue`. Tes yang ada tidak
menangkapnya karena linter lama hanya mencocokkan daftar kode ungu tertentu
(`#7c3aed`, `#8b5cf6`, dst.) dan `:hover` + `translateY`.

Yang masih ada saat itu:

| Jenis | Jumlah |
| :--- | :--- |
| Hex mentah di luar fallback `var()` | 52 di FilmList, 45 StoryboardCard, 45 FilmHeader, 40 DramaDetail, 35 AIConfigContent, 32 UniversalSegmentOmniAtEditor, 30 ResourceSection |
| `box-shadow` glow berwarna + animasi pulse | node Canvas (`CanvasAssetNode`, `CanvasScriptNode`, `CanvasStoryboardNode`), `FreeCreate`, `MediaLibrary` |
| `<el-skeleton animated>` | `StoryboardCard.vue` |
| Gradien swatch | `StylePickerButton.vue` |
| `border-radius` > 12px | `ConfigTable.vue` (20px), `AIConfigContent.vue` (20px), badge pill 99px |

### Yang dikerjakan

Penggantian dilakukan lewat skrip, memetakan tiap warna ke token berdasarkan jenis
properti (`background` / `border` / `color`) dan tingkat terang-gelapnya:

- Hex dan rgba netral → `--bg-card`, `--bg-inner`, `--bg-hover`, `--border-color`,
  `--border-muted`, `--text-primary`, `--text-muted`, `--text-subtle`, `--text-bright`.
- Indigo, biru, hijau → netral (§3.3: sukses ditandai teks `[OK]`, bukan hijau).
- Merah → `--danger-text` untuk teks, `--el-color-danger` untuk border/isian.
- Kuning dan oranye → `--el-color-warning`.
- `box-shadow` dengan blur dihapus; sisa hanya ring 1–2px tanpa blur.
- `el-skeleton` diganti teks mono `[LOADING…]` sesuai §5.E.
- Radius di atas 12px diturunkan ke 12px atau `--radius-sm`.

37 file `.vue` berubah. Warna di `<script>` sengaja tidak disentuh (swatch gaya di
`StylePickerButton.vue` dan `constants/styleOptions.js` adalah warna konten pilihan
pengguna, bukan chrome aplikasi).

### Regresi yang timbul dari skrip ini

Skrip memetakan warna teks tanpa melihat warna latar di rule yang sama, sehingga tiga
tempat jadi sewarna latarnya. **Belum diperbaiki** — lihat §5 nomor 3.

---

## 2. Linter design system diperketat (selesai)

File baru: [`frontweb/test/design-system-strict-linter.test.js`](../frontweb/test/design-system-strict-linter.test.js).

Memeriksa blok `<style>` dan atribut `style=""` di semua `.vue`, dengan komentar CSS
dibuang lebih dulu. Tujuh aturan:

1. Tidak ada hex mentah — fallback `var(--x, #…)` dikecualikan.
2. Tidak ada `rgb()` / `rgba()` mentah — hitam `rgba(0,0,0,…)` dikecualikan untuk
   scrim dan mask (§1 pengecualian, §4).
3. Tidak ada gradien kecuali scrim hitam.
4. Tidak ada `box-shadow` dengan blur (`--shadow: none`, §4).
5. Tidak ada `<el-skeleton>` (§5.E).
6. `border-radius` maksimal 12px (§4).
7. `theme.css` tetap memberi jarak ikon ke label di tombol (penjaga untuk §4
   di bawah, supaya aturannya tidak terhapus diam-diam).

Sebelum perbaikan §1, lima dari enam aturan pertama gagal. Sesudahnya semuanya lolos.

---

## 3. Logo aplikasi (selesai, satu langkah manual tersisa)

### Kondisi awal

Logo masuk ke dua folder sekaligus dengan isi yang sebagian sama persis, dan tidak
dipakai di mana pun kecuali favicon.

`frontweb/public/` ikut tersalin apa adanya ke `dist/` saat build, jadi file master
di sana menambah ukuran rilis tanpa pernah dipanggil.

### Pembagian folder

Mengikuti README yang sudah ada di masing-masing folder:

| Folder | Isi |
| :--- | :--- |
| `assets/logo/` | File master, tidak ikut build: `Logo.jpg` (2048×2048), `logo-raw.png`, `logo.png` (1727×1726), `logo-1024.png`, `logo-512.png`, `logo.ico` |
| `frontweb/public/logo/` | Hanya ukuran siap pakai web |

### Yang dikerjakan

File web dibuat ulang dari master `assets/logo/logo.png` memakai `sharp`
(sudah ada di `backend-node/node_modules`), latar transparan dipertahankan:

| File | Ukuran | Dipakai untuk |
| :--- | :--- | :--- |
| `logo-64.png` | 64×64, 5 KB | Logo header (tampil 28px, cukup untuk layar retina) |
| `logo-128.png` | 128×128, 16 KB | Cadangan untuk tampilan lebih besar |
| `logo-192.png` | 192×192, 29 KB | Favicon PNG |
| `apple-touch-icon.png` | 180×180, 27 KB | Ikon layar utama iOS |

`frontweb/index.html`:

```html
<link rel="icon" type="image/x-icon" href="/logo/favicon.ico" />
<link rel="icon" type="image/png" sizes="192x192" href="/logo/logo-192.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/logo/apple-touch-icon.png" />
```

Sebelumnya `apple-touch-icon` menunjuk ke `/logo/logo.png` yang berukuran 1,4 MB.

Logo dipasang di lima header yang selama ini hanya berisi wordmark teks
(`FilmList`, `AiConfig`, `DramaCanvas`, `DramaDetail`, `FilmHeader`). Strukturnya
diseragamkan:

```html
<h1 class="logo">
  <img class="logo-mark" src="/logo/logo-64.png" alt="" width="28" height="28" draggable="false" />
  <span class="logo-text">
    <span class="logo-main">…</span>
    <span class="logo-sub">…</span>
  </span>
</h1>
```

`.logo` yang tadinya kolom menjadi baris (`gap: var(--space-2)`), teksnya pindah ke
`.logo-text` dengan `white-space: nowrap` supaya judul tidak terpecah dua baris saat
header sempit. `.logo-mark` 28×28 dengan `--radius-sm`.

Logo cocok dengan bahasa visual yang dipakai: hitam-putih dengan satu titik merah,
sama seperti aturan §1.3 (monokrom dengan interupsi merah). `alt=""` dipakai karena
wordmark di sebelahnya sudah menyebut nama aplikasi.

### Langkah manual yang tersisa

Empat file di `frontweb/public/logo/` adalah salinan byte-identik dari master di
`assets/logo/` (sudah diverifikasi dengan md5) dan tidak dirujuk kode mana pun.
Totalnya 3,4 MB yang ikut tersalin ke `dist/` setiap build. Penghapusannya diblokir
oleh classifier izin, jadi perlu dijalankan sendiri:

```bash
rm frontweb/public/logo/Logo.jpg frontweb/public/logo/logo.png frontweb/public/logo/logo-1024.png frontweb/public/logo/logo.ico
```

`frontweb/public/favicon.ico` juga identik dengan `frontweb/public/logo/favicon.ico`.
Setelah `index.html` menunjuk ke `/logo/favicon.ico`, file di akar `public/` boleh
ikut dihapus.

---

## 4. Tata letak ikon tombol (selesai)

### Masalah

Jarak ikon ke label terukur **0 px** di semua tombol yang punya ikon — ikon menempel
langsung ke huruf pertama. Terjadi di **52 tombol pada 17 file**.

Penyebabnya markup:

```html
<el-button><el-icon><User /></el-icon>{{ $t('header.characterLib') }}</el-button>
```

Ikon dan teks sama-sama masuk ke slot default, dan Element Plus membungkus seluruh
isi slot itu ke dalam satu `<span>`. Aturan bawaannya,
`.el-button [class*=el-icon]+span { margin-left: 6px }`, mensyaratkan ikon sebagai
anak langsung tombol dengan `<span>` sebagai saudara — kondisi yang tidak pernah
terpenuhi di sini, jadi tidak ada jarak sama sekali.

Masalah ini sudah ada sebelum redesign, tapi `text-transform: uppercase` yang
sekarang global di `.el-button` membuatnya jauh lebih terasa.

### Perbaikan

Element Plus sudah menetapkan `.el-button > span { display: inline-flex }`. Di dalam
flex container, simpul teks menjadi *anonymous flex item*, jadi `gap` bekerja di
antara ikon dan teks tanpa perlu mengubah satu pun template:

```css
.el-button > span { gap: var(--space-2); }
.el-button [class*="el-icon"] + span { margin-left: var(--space-2); }
.el-button > span > [class*="el-icon"],
.el-button > [class*="el-icon"] { flex: none; font-size: 1em; }
```

- `gap` hanya berlaku kalau ada lebih dari satu item, jadi tombol yang isinya hanya
  ikon tidak ikut terdorong.
- Baris kedua menyamakan kasus ikon lewat prop `icon` ke skala spacing yang sama
  (bawaan Element Plus 6px, di luar skala §4).
- `flex: none` mencegah ikon gepeng saat labelnya panjang, `font-size: 1em` membuat
  ikon ikut ukuran teks tombolnya.

Diverifikasi di browser: jarak kini 8px (`--space-2`) dan simpangan vertikal ikon
terhadap sumbu tombol 0 px, di semua tombol pada halaman Projects dan FilmCreate.

---

## 5. Temuan audit yang belum diperbaiki

Hasil audit visual tujuh halaman di tema gelap dan terang, kontras diukur lewat
script (bukan perkiraan dari screenshot). Diurutkan dari yang paling parah.

### Tidak terbaca

**1. Tombol `type="success"` padat tidak terlihat sama sekali — 1.00:1 (tema gelap)**

§3.3 menetapkan sukses monokrom, jadi `--el-color-success` diisi `#FFFFFF`. Tapi
Element Plus memakai token itu sebagai **warna latar** tombol padat sekaligus,
dengan teks putih di atasnya. Hasilnya putih di atas putih.

Terbukti di `Sd2AssetManagement.vue:114` dan `:140`. Terdampak: 8 tombol
`type="success"` padat dan 8 `type="warning"` padat.

Usul: jangan samakan `--el-color-success` dengan `--text-bright`. Isi dengan warna
permukaan yang kontras terhadap teks tombolnya, atau ubah tombol-tombol itu menjadi
varian *technical* (§5.D nomor 2) dan tandai statusnya lewat teks `[OK]`.

**2. Skala `-light-*` untuk success/warning/info/danger tidak pernah di-override**

Hanya `--el-color-primary-light-*` yang diisi abu-abu di `theme.css`. Sisanya memakai
nilai bawaan Element Plus yang dirancang untuk tema terang, dan nilai pastel itu
bocor ke tema gelap. Terukur di halaman AI Settings:

| Tombol | Kontras | Warna |
| :--- | :--- | :--- |
| Quick Setup Volcengine | **1.08:1** | putih di atas `rgb(240,249,235)` |
| Quick Setup Agnes | **1.08:1** | putih di atas hijau pastel |
| Quick Setup Cheap Seedance2 | **1.94:1** | amber di atas krem |
| Quick Setup Tongyi | **2.29:1** | abu di atas `rgb(244,244,245)` |

Hal yang sama kena di FilmCreate (Batch Generate Images 1.08:1, Batch Generate
Videos 1.94:1, SD2 Certify 1.94:1, Upload Voice 2.29:1, Add Storyboard 2.29:1) dan
Canvas (tombol Script 1.94:1).

Cakupan: 11 tombol `plain` dan 79 `el-tag` bertipe semantik.

Usul: isi `--el-color-{success,warning,info,danger}-light-{3,5,7,8,9}` dan `-dark-2`
untuk kedua tema, seperti yang sudah dilakukan untuk `primary` di §3.3.

**3. Nomor shot dan badge langkah tidak terlihat — 1.00:1 gelap, 1.11:1 terang**

```css
background: var(--el-color-primary);
color: var(--text-bright);
```

Karena primary putih di tema gelap dan hitam di tema terang, teksnya selalu sewarna
latarnya. Tiga tempat:

- `StoryboardCard.vue:726` — `.sb-ctrl-num` (nomor shot 1–6)
- `PipelinePanel.vue:248` — `.pipeline-step-badge`
- `StylePickerButton.vue:379` — `.spd-check`

Tema gelap sudah rusak sejak primary diubah jadi putih. Tema terang rusak oleh skrip
di §1 (`color: #fff` → `var(--text-bright)`, yang di tema terang bernilai `#000000`).

Token yang benar untuk teks di atas permukaan primary adalah `--bg-page`, sama
seperti aturan tombol primary di §3.3.

### Tipografi

**4. Skala tipografi §2.2 praktis tidak dipakai.** Hanya **33 dari 361** deklarasi
`font-size` (9%) memakai `var(--font-*)`. Sisanya px/rem mentah dan banyak yang di
luar skala: 12px (66×), 10px (27×), 15px, 9px, `0.85rem`, `0.72rem`, `0.68rem`.
**50 deklarasi di 19 file berada di bawah lantai 11px** — badge kartu proyek 10.08px,
`project-meta` 10.5px, `logo-sub` 9.1px.

**5. Skala spacing §4 juga belum dipakai.** 74 dari 777 deklarasi (10%) memakai
`var(--space-*)`. Ada **295 nilai px di luar skala**, paling sering 6px (80×),
10px (56×), 20px (25×), 14px (15×).

**6. Uppercase dan tracking kena ke teks Tionghoa.** Penjaganya `html:lang(zh)`,
jadi hanya aktif saat locale zh. Waktu UI berbahasa Inggris tapi isinya Tionghoa,
CJK tetap mendapat letter-spacing dan bagian Latinnya ikut dikapitalkan:
`衣服设计天才302 (Sample (Chinese))` tampil sebagai `衣服设计天才302 (SAMPLE (CHINESE))`.
Melanggar §2.3.

### Disiplin warna

**7. Amber dipakai dekoratif, bukan semantik.** Badge rasio aspek `9:16` di kartu
proyek, badge `📜 Script` dan ikon `+` di Canvas. §3.3 membatasi warning untuk makna.

**8. Teks merah di tema gelap masih `--el-color-danger` → 3.75:1, gagal AA.**
§3.3 mewajibkan `--danger-text` (`#FF4D4F`) untuk teks. Tiga tempat:
`StoryboardSection.vue:448`, `StylePickerButton.vue:290`, `TaskCenter.vue:154`.

**9. `--text-subtle` gagal AA di permukaan hover.** `#808080` memang 4.85:1 di
`--bg-card`, tapi hanya **4.32:1 di `--bg-hover`** (`#1A1A1A`). Catatan kontras §3.1
hanya memverifikasi `--bg-card` dan `--bg-inner`. Terukur 4.41:1 di `episode-num`,
`ep-stat`, `episode-enter`, `toolbar-label`, dan `hint`.

**10. 26 emoji berwarna di dalam UI monokrom:** 🚀 💰 🌐 📜 🖼 👤 🏞 🎭 📦 🎵 ✓.
Emoji dirender dengan font warna bawaan sistem, jadi kebal terhadap token warna dan
bertabrakan dengan ikon garis Element Plus. Sebaiknya diganti ikon Element Plus atau
kode teks dalam kurung siku.

### Tata letak

**11. Header kolom `Default` terpotong di tengah kata** menjadi `Defa / ult`.
Kolomnya `width="60"` dikurangi padding 24px menyisakan 36px, sedangkan katanya
butuh sekitar 48px. `aiConfig/ConfigTable.vue:34`.

**12. Label sidebar `Storyboard Images` kena ellipsis** di FilmCreate
(butuh 119px, tersedia 110px).

**13. Tag di dalam `el-select` terpotong parah.** `磨损的铅笔` butuh 60px tapi
kotaknya 12px; `手机（显示报名界面）` butuh 120px dengan 53px tersedia.

**14. `.sb-config-divider` hampir tak terlihat** pada 1.28:1 — dekoratif,
prioritas rendah.

---

## Verifikasi

- `cd frontweb && node --test test/*.test.js` → 105 lulus, 0 gagal.
- `cd frontweb && npm run build` → sukses.
- Diperiksa di browser pada 1440×900: halaman Projects, AI Settings, FilmCreate,
  DramaDetail, Canvas, Media Library, Free Create; tema gelap dan terang.
- Tidak ada overflow horizontal di 1440px.

Catatan metode: pengukuran pertama di tema terang sempat menunjukkan belasan
kegagalan kontras, ternyata artefak karena script berjalan bersamaan dengan
pergantian class tema. Semua angka di dokumen ini diambil setelah reload bersih.

## Catatan

- Proyek contoh `衣服设计天才302` diimpor lewat tombol di aplikasi supaya halaman
  FilmCreate, DramaDetail, dan Canvas ada isinya saat audit. Hapus dari daftar
  proyek kalau tidak diperlukan.
- `backend-node/configs/config.yaml` berubah di working tree karena backend yang
  dijalankan untuk preview menulis ulang file itu dan menghilangkan komentarnya.
  Perubahan itu bukan bagian dari pekerjaan UI dan sebaiknya tidak ikut di-commit:
  `git checkout -- backend-node/configs/config.yaml`.
