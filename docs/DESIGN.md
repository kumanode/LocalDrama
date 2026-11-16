# LocalMiniDrama UI — Design System Specification (`DESIGN.md`)

> Bahasa visual terinspirasi Nothing UI dan spesifikasi [`dominikmartn/nothing-design-skill`](https://github.com/dominikmartn/nothing-design-skill): brutalisme industrial, disiplin tipografi Swiss, kontras monokrom, dan kejujuran mekanis.
>
> Dokumen ini adalah **adaptasi untuk LocalMiniDrama** (`frontweb/`), sebuah alat produksi drama pendek berbasis AI. Semua aturan di bawah ditulis untuk stack yang benar-benar dipakai: **Vue 3 + Element Plus + CSS variables** di `frontweb/src/styles/theme.css`. Tidak ada Tailwind.

---

## 0. Ruang Lingkup & Stack

| Hal | Ketentuan |
| :--- | :--- |
| Sumber token | `frontweb/src/styles/theme.css` (satu-satunya tempat nilai warna/radius/font didefinisikan) |
| Library komponen | Element Plus. Gaya diubah lewat variabel `--el-*` dan override kelas, **bukan** dengan mengganti komponennya |
| Pergantian tema | `html.dark` / `html.light`, dikelola `frontweb/src/composables/useTheme.js` (key `lmd-theme`) |
| Bahasa UI | Tionghoa & Inggris (`src/i18n`). Semua aturan tipografi wajib aman untuk teks CJK |
| Komponen `.vue` | Hanya boleh memakai `var(--token)`. **Kode baru dilarang menulis hex/rgba langsung** |

---

## 1. Filosofi & Prinsip Inti

1. **Mechanical Honesty.** Antarmuka terasa seperti meja kontrol produksi: tegas, presisi, tanpa ornamen. Konten pengguna (gambar karakter, storyboard, video) adalah satu-satunya sumber warna yang "ramai"; chrome aplikasi tetap netral agar tidak bersaing dengannya.
2. **Hirarki 3 Lapisan.** Setiap panel/komponen hanya memakai 3 bobot visual:
   * **Display / Heading:** judul halaman, nama proyek, angka metrik utama.
   * **Body:** teks naskah, formulir, deskripsi aset.
   * **Metadata:** label teknis, durasi, resolusi, model AI, timestamp, status task.
3. **Monochrome Canvas with Urgent Interrupts.** ±95% chrome terdiri dari hitam/abu-abu/putih. Merah `#D71921` hanya untuk *structural interrupt* (lihat §3.3), bukan aksen dekoratif atau warna brand.
4. **Pola terlarang di chrome aplikasi:**
   * ❌ Gradien warna (termasuk logo gradien dan header gradien).
   * ❌ Drop-shadow untuk kartu/header; efek "melayang" saat hover (`translateY`).
   * ❌ `backdrop-filter` / glassmorphism.
   * ❌ Animasi pegas/bounce.
   * ❌ Shimmer / `el-skeleton`.
   * ⚠️ Toast dibatasi, lihat §5.F (bukan dilarang total).

   **Pengecualian:** *scrim* hitam→transparan di atas **media** (thumbnail/video) untuk keterbacaan teks overlay diizinkan, karena itu bagian dari konten, bukan chrome.

---

## 2. Tipografi

### 2.1 Font stack

Font **di-bundle lokal** (aplikasi berjalan lokal/offline), misalnya lewat `@fontsource/space-grotesk` dan `@fontsource/space-mono` atau file di `src/assets/fonts/`. Jangan memuat dari Google Fonts CDN.

Space Grotesk/Mono **tidak punya glyph CJK**, jadi setiap stack wajib punya fallback CJK:

```css
:root {
  --font-sans: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'Space Mono', ui-monospace, 'Cascadia Mono', Consolas, 'PingFang SC', 'Microsoft YaHei', monospace;
}
```

| Peran | Font | Contoh di aplikasi |
| :--- | :--- | :--- |
| Display / Heading | `--font-sans`, bold | Judul halaman, nama drama, angka di dasbor task |
| Body | `--font-sans`, regular | Naskah, deskripsi karakter/adegan, isi form |
| Metadata | `--font-mono` | Durasi shot, resolusi, nama model, ID episode, log task, timestamp |

Maksimal **2 family** (sans + mono) dan **2 weight** (400 & 600/700) per layar.

### 2.2 Skala (memetakan ke token yang sudah ada)

| Token | Nilai | Line-height | Pemakaian |
| :--- | :--- | :--- | :--- |
| `--font-xs` | `11px` | 1.4 | Caption/metadata, mono, tracking `+0.05em` |
| `--font-sm` | `13px` | 1.5 | Body padat (tabel, daftar shot, panel samping) |
| `--font-md` | `14px` | 1.5 | Body default |
| `--font-lg` | `16px` | 1.3 | Judul section/kartu |
| `--font-xl` | `24px` | 1.2 | Judul halaman |
| `--font-display` *(baru)* | `48px` | 1.1 | Hanya angka metrik (mis. progres/total task) |

Aturan "maks 3 ukuran" berlaku **per panel/komponen**, bukan per halaman, karena halaman seperti FilmCreate berisi banyak panel.

### 2.3 Uppercase & tracking

`text-transform: uppercase` dan tracking lebar **hanya berlaku untuk teks Latin** (label metadata, tombol berbahasa Inggris). Teks CJK tidak terpengaruh uppercase dan **tidak boleh** diberi letter-spacing lebar. Jangan menulis string i18n dalam huruf kapital; biarkan CSS yang mengatur.

Implementasinya: CSS tidak bisa membedakan Latin dan CJK di dalam satu elemen, jadi tracking dimatikan per locale:

```css
html:lang(zh) .meta-label,
html:lang(zh) .el-button { letter-spacing: 0; }
```

Syarat: `setLocale()` di `src/i18n/index.js` harus memperbarui `document.documentElement.lang`. Saat ini atribut ini statis `zh-CN` di `index.html`, jadi tidak ikut berubah saat bahasa diganti ke Inggris. Konstanta yang selalu Latin (kode status `[DONE]`, nama model, resolusi) tetap boleh memakai tracking di kedua locale.

---

## 3. Warna & Token

### 3.1 Tema gelap (referensi utama)

| Peran | Nilai | Variabel di `theme.css` |
| :--- | :--- | :--- |
| Background halaman | `#000000` | `--bg-page` |
| Surface / kartu | `#0D0D0D` | `--bg-card` |
| Surface dalam (input, blok) | `#121212` | `--bg-inner`, `--surface-2` |
| Hover | `#1A1A1A` | `--bg-hover` |
| Border | `#262626` | `--border-color` |
| Border kuat (input fokus, tombol teknis) | `#3A3A3A` | `--border-muted` |
| Teks utama | `#FFFFFF` | `--text-bright` |
| Teks body | `#E6E6E6` | `--text-primary` |
| Teks sekunder | `#A3A3A3` | `--text-muted`, `--text-secondary` |
| Teks muted / metadata | `#808080` | `--text-subtle`, `--text-faint` |

> Catatan kontras (WCAG AA teks kecil ≥ 4.5:1): spec asli memakai `#525252` untuk muted (2.7:1 di atas `#000`, gagal). `#808080` mencapai 4.9:1 di `--bg-card` dan 4.7:1 di `--bg-inner`. Sekunder dinaikkan dari `#8A8A8A` ke `#A3A3A3` (7.7:1) agar tetap terbedakan dari muted.

### 3.2 Tema terang (paper tone)

| Peran | Nilai | Variabel |
| :--- | :--- | :--- |
| Background halaman | `#F4F4F2` | `--bg-page` |
| Surface / kartu | `#FFFFFF` | `--bg-card` |
| Surface dalam | `#FAFAF8` | `--bg-inner`, `--surface-2` |
| Hover | `#EDEDEA` | `--bg-hover` |
| Border | `#D8D7D3` | `--border-color` |
| Border kuat | `#B5B4B0` | `--border-muted` |
| Teks utama | `#000000` | `--text-bright` |
| Teks body | `#111111` | `--text-primary` |
| Teks sekunder | `#4F4E4B` | `--text-muted`, `--text-secondary` |
| Teks muted | `#6E6D69` | `--text-subtle`, `--text-faint` |

> `#9C9B97` dari spec asli hanya 2.6:1 di atas `#F4F4F2`. `#6E6D69` mencapai 4.7:1. Sekunder digelapkan ke `#4F4E4B` (7.6:1) supaya tetap ada jarak hirarki dengan muted.

Kedua tema didukung penuh. Default awal tetap mengikuti `useTheme.js` (saat ini terang) dan pilihan pengguna disimpan.

### 3.3 Warna semantik → Element Plus

| Peran | Gelap | Terang | Variabel Element Plus |
| :--- | :--- | :--- | :--- |
| Primary (aksi utama) | `#FFFFFF` | `#111111` | `--el-color-primary` (+ semua `-light-*` / `-dark-2` diisi abu-abu, **bukan ungu**) |
| Danger / interrupt (isian, titik, border) | `#D71921` | `#D71921` | `--el-color-danger`, `--danger-soft` |
| Danger sebagai **teks** *(token baru)* | `#FF4D4F` | `#D71921` | `--danger-text` |
| Warning | `#E5A93C` | `#8F6310` | `--el-color-warning` |
| Success | = teks utama | = teks utama | `--el-color-success` (monokrom; sukses ditandai teks `[OK]`/`[SAVED]`, bukan hijau) |
| Info | = teks sekunder | = teks sekunder | `--el-color-info` |

Catatan kontras: `#D71921` hanya 3.8:1 di atas `#0D0D0D`, jadi di tema gelap teks error (pesan validasi, `[ERR]`, judul `ElMessage.error`) memakai `--danger-text` (`#FF4D4F`, 6.0:1). `#D71921` tetap dipakai untuk isian, titik, dan border. Warning terang `#B7801F` (3.1:1) diganti `#8F6310` (4.8:1).

Ungu `#7c3aed` yang sekarang dipakai sebagai primary **dihapus**. Skala turunan Element Plus diisi abu-abu (dipakai untuk tombol `plain`, latar tag, hover menu):

| Variabel | Gelap | Terang |
| :--- | :--- | :--- |
| `--el-color-primary` | `#FFFFFF` | `#111111` |
| `-light-3` | `#B3B3B3` | `#585858` |
| `-light-5` | `#808080` | `#888888` |
| `-light-7` | `#4D4D4D` | `#B8B8B8` |
| `-light-8` | `#333333` | `#D0D0D0` |
| `-light-9` | `#1A1A1A` | `#E8E8E8` |
| `-dark-2` | `#CCCCCC` | `#000000` |

**Penting:** saat ini variabel dasar Element Plus (`--el-bg-color`, `--el-text-color-*`, `--el-border-color*`, `--el-fill-color*`) hanya di-override untuk `html.light`, dan `element-plus/theme-chalk/dark/css-vars.css` tidak di-import. Fase 1 wajib menambahkan blok yang sama untuk `html.dark`, yang memetakan ke token gelap di atas. Tanpa itu, komponen Element Plus di tema gelap tetap memakai nilai bawaan terang.

Karena primary di tema gelap berwarna putih, teks tombol primary harus dibalik:

```css
.el-button--primary {
  --el-button-text-color: var(--bg-page);
  --el-button-hover-text-color: var(--bg-page);
}
```

**Merah `#D71921` hanya untuk:**
* Tombol destruktif (hapus drama/episode/aset) dan dialog konfirmasinya.
* Status gagal task/generasi (`[ERR]`, `[FAILED]`).
* Indikator task yang sedang berjalan (titik `●` kecil, satu per konteks).
* Pesan error validasi.

Dilarang untuk hover, link, tab aktif, logo, atau penanda seleksi. Seleksi/tab aktif memakai inversi (latar terang, teks gelap) atau border `--text-bright`.

---

## 4. Spacing, Radius, Elevasi

* **Spacing:** pakai `--space-1` … `--space-6` (4, 8, 12, 16, 24, 32px), ditambah `--space-7: 48px` dan `--space-8: 64px`. Jarak di luar skala ini tidak boleh.
* **Radius** (mengganti nilai yang ada):

| Token | Nilai | Pemakaian |
| :--- | :--- | :--- |
| `--radius-none` *(baru)* | `0` | Tabel, splitter, segmen progress, thumbnail storyboard dalam grid |
| `--radius-sm` | `4px` | Input, select, tag/badge, tombol teknis, switch |
| `--radius-md` | `8px` | Dropdown, popover, tooltip, blok di dalam kartu |
| `--radius-lg` | `12px` | Kartu, dialog, panel. **Maksimum** untuk container |
| `--radius-pill` *(baru)* | `9999px` | Hanya tombol primary |

* **Elevasi:** `--shadow: none`. Kartu dipisahkan oleh border 1px dan perbedaan surface, bukan bayangan. Overlay (dialog, dropdown, popover, drawer) memakai border `--border-muted`. Mask dialog memakai warna solid semi-transparan (`rgba(0,0,0,.72)` gelap / `rgba(244,244,242,.8)` terang), tanpa blur.

---

## 5. Komponen

### A. Segmented Progress Bar
Mengganti `el-progress` (dipakai di `TaskCenter.vue` dan `MergeExportSection.vue`) dengan komponen `SegmentedProgress.vue`:

```
[██████████░░░░░░░░░░] 50%
```
* 10 segmen (atau 20 untuk lebar > 320px), `gap: 2px`, `radius: 0`, tinggi 6–8px.
* Segmen terisi `--text-bright`, kosong `--border-color`. Saat gagal, segmen terisi berubah `--el-color-danger`.
* Label persentase di kanan memakai `--font-mono`, `--font-xs`.
* Tidak ada animasi gradien atau stripe; perubahan segmen langsung (snap).

### B. Switch / Toggle (`el-switch`)
* Pakai `inline-prompt` dengan teks `ON` / `OFF`.
* Aktif: latar `--text-bright`, knob/teks `--bg-page`. Nonaktif: latar `--bg-inner` dengan border `--border-muted`.
* Tanpa shadow pada knob. Radius `--radius-sm`.

### C. Status Badge (`el-tag` & label status)
* Font mono, `--font-xs`, uppercase, format teks dalam kurung siku: `[IDLE]`, `[QUEUED]`, `[RUNNING ●]`, `[DONE]`, `[ERR: TIMEOUT]`.
* Latar transparan, border `1px solid var(--border-muted)`, radius `--radius-sm`.
* Hanya `[RUNNING ●]` (titik merah) dan `[ERR…]`/`[FAILED]` yang memakai merah.
* Kurung siku dan kode status adalah konstanta tampilan. Kalimat penjelas tetap lewat i18n.

### D. Tombol (`el-button`)
1. **Primary (pill):** `type="primary"`. Latar `--el-color-primary`, teks dibalik (lihat §3.3), radius `--radius-pill`, `--font-sans` 600, 12–13px, uppercase untuk Latin. Hover: latar `#E5E5E5` (gelap) / `#2A2A2A` (terang). **Satu per area aksi.**
2. **Technical (default):** latar transparan, border `1px solid var(--border-muted)`, radius `--radius-sm`, teks `--text-primary`. Hover: `border-color: var(--text-bright)`. Untuk toolbar dan aksi sekunder.
3. **Danger:** seperti technical, tetapi teks dan border `--el-color-danger`. Varian solid merah hanya di dialog konfirmasi hapus.
4. **Text/link:** tanpa border, teks `--text-muted`, hover `--text-bright` dengan underline.

### E. Loading
* Ganti `el-skeleton` dengan teks mono `[LOADING…]` warna `--text-subtle`, atau spinner bersegmen (8 segmen, berputar per langkah, bukan halus).
* `v-loading` Element Plus tetap boleh dipakai, dengan spinner diwarnai `--text-bright` dan mask tanpa blur.

### F. Notifikasi & feedback (aturan toast)
Saat ini ada ±490 panggilan `ElMessage`. Aturannya:

| Jenis | Ketentuan |
| :--- | :--- |
| **Sukses** penyimpanan/edit lokal | Status inline di dekat elemen, mengikuti pola `.script-save-status` yang sudah ada: `[SAVED]`, `[SYNCED]`. Tidak memakai toast |
| **Sukses** aksi panjang (generate gambar/video, merge, export) | Status di kartu terkait + `TaskCenter`. Toast hanya jika pengguna sudah berpindah halaman |
| **Warning** validasi form | Inline di bawah field (`el-form` rules). Toast hanya jika tidak ada field yang relevan |
| **Error** | `ElMessage.error` **tetap diizinkan**, karena error API/AI sering tidak punya lokasi inline |
| **Info** | Inline atau dihapus |

Semua `ElMessage` yang tersisa di-restyle: latar `--bg-card`, border `--border-muted` (merah untuk error), radius `--radius-sm`, tanpa shadow, teks `--font-mono` `--font-sm`, dengan prefiks `[ERR]` / `[WARN]` / `[OK]` lewat `::before`.

### G. Kartu & media
* Kartu (`.card`, `.el-card`, `.project-card`, `.sb-card`): latar `--bg-card`, border `--border-color`, radius `--radius-lg`, tanpa shadow.
* Hover kartu: hanya `border-color: var(--text-muted)`. Tidak ada `translateY`, tidak ada glow berwarna.
* Thumbnail dan video tidak diberi filter/tint. Scrim gradien hitam hanya di bawah teks overlay (lihat §1.4).

### H. Logo & header
* Logo: teks solid `--text-bright`, `--font-sans` bold atau mono. Tanpa gradien.
* Header: latar `--bg-card` (atau `--bg-page`), border bawah 1px, tanpa shadow.

---

## 6. Contoh Implementasi (Vue SFC + token)

```vue
<template>
  <div class="task-card">
    <div class="task-card__meta">
      <span>EP_03 // SHOT_12</span>
      <span class="status status--running">[RUNNING <i class="dot" />]</span>
    </div>

    <div class="task-card__hero">
      62<span class="task-card__unit">%</span>
    </div>
    <div class="task-card__label">{{ t('task.videoGenerating') }}</div>

    <SegmentedProgress :value="62" :segments="10" />

    <div class="task-card__footer">
      <span class="task-card__mode">MODEL: SEEDANCE_2</span>
      <el-button type="primary" size="small">{{ t('common.cancel') }}</el-button>
    </div>
  </div>
</template>

<style scoped>
.task-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  color: var(--text-primary);
  font-family: var(--font-sans);
}
.task-card__meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  font: var(--font-xs) / 1.4 var(--font-mono);
  letter-spacing: .05em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.status--running { color: var(--text-bright); }
.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-danger);
}
.task-card__hero {
  font-size: var(--font-display);
  line-height: 1.1;
  font-weight: 700;
  color: var(--text-bright);
}
.task-card__unit { font-size: var(--font-md); font-weight: 400; color: var(--text-muted); }
.task-card__label { font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-4); }
.task-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-2);
  margin-top: var(--space-4);
  border-top: 1px solid var(--border-color);
}
.task-card__mode { font: var(--font-xs) var(--font-mono); color: var(--text-subtle); }
</style>
```

---

## 7. Motion

```css
:root {
  --ease-mech: cubic-bezier(0, 0, 0.2, 1);
  --dur-fast: 120ms;   /* hover, focus, switch */
  --dur-base: 180ms;   /* dropdown, collapse, tab */
}
```

* Transisi hanya pada `color`, `background-color`, `border-color`, `opacity`. Tanpa `transform` untuk hover.
* Dialog/drawer: fade + geser maksimal 8px, `--dur-base`. Tanpa scale/bounce.
* Hormati `prefers-reduced-motion: reduce`: semua durasi menjadi `0ms`, kecuali spinner.

---

## 8. Rencana Migrasi

1. **Fondasi token** (`theme.css`, `main.js`, `i18n/index.js`): isi ulang nilai di §3–4, tambah font lokal, override `--el-color-*` dan variabel dasar `--el-*` untuk **kedua** tema, sinkronkan `document.documentElement.lang`, set `--shadow: none`, hapus blok "亮色模式增强" (ungu, gradien, shadow, hover lift), restyle global `el-button`, `el-tag`, `el-switch`, `ElMessage`, dan mask dialog.
2. **Pembersihan komponen:** ganti hex/rgba hardcode di file `.vue` dengan token, lalu hapus gradien, `box-shadow`, `backdrop-filter`, dan `translateY` hover. Kerjakan per folder (`components/filmCreate/` dulu).
3. **Komponen khas:** `SegmentedProgress.vue` (TaskCenter, MergeExportSection), badge status, pengganti `el-skeleton`.
4. **Audit feedback:** pindahkan toast sukses/warning ke status inline sesuai §5.F, secara bertahap per alur.

### Checklist review PR (UI)
- [ ] Tidak ada hex/rgba baru di `.vue`; semua lewat `var(--…)`.
- [ ] Tidak ada gradien, `box-shadow`, `backdrop-filter`, atau hover `translateY` di chrome.
- [ ] Merah hanya untuk destruktif, error, atau task berjalan. Teks merah di tema gelap memakai `--danger-text`.
- [ ] Teks baru lolos kontras AA (≥ 4.5:1) di surface tempat ia muncul.
- [ ] Maksimal satu tombol primary (pill) per area aksi.
- [ ] Radius container ≤ 12px.
- [ ] Teks CJK tidak diberi uppercase/tracking lebar; tampilan dicek di locale `zh` dan `en`.
- [ ] Dicek di tema gelap **dan** terang.
