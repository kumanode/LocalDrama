# Roadmap Update — LocalDrama (v1.3.x)

> Dibuat: 2026-11-15 · Basis: analisa kode `main` @ `c29d968`
> Cakupan: (1) kebocoran bahasa Mandarin di mode English, (2) memaksimalkan fitur, (3) perbaikan UI.

---

## Ringkasan Temuan

| Area | Kondisi sekarang | Dampak |
|---|---|---|
| i18n frontend | Sekitar 2.186 baris kode berisi teks Mandarin di 63 file. Sekitar 305 di antaranya sudah ternary `locale==='en'`, jadi **sekitar 1.880 baris benar-benar bocor** | Pengguna English masih melihat teks Mandarin |
| Tes anti-leak | `frontweb/test/anti-leak.test.js` hanya memeriksa `en.js`/`zh.js`, tidak memindai `.vue`/`.js` | Tes lulus walaupun teks masih bocor |
| i18n backend | Sekitar 169 pesan error Mandarin di `backend-node/src/routes/*` dan langsung ditampilkan oleh frontend | Toast error tampil dalam bahasa Mandarin |
| Prompt AI | Bagian penyusun prompt (`framePromptService`, `episodeStoryboardService`, `angleService`, `routes/storyboards.js`) menyisipkan label Mandarin langsung di kode | Hasil AI bercampur bahasa (`Action: 道格拉斯…`) |
| Arsitektur | `FilmCreate.vue` sepanjang 10.773 baris, `AIConfigContent.vue` 2.850 baris | Sulit dikembangkan, risiko regresi tinggi |
| Rute bayangan | `backend-node/src/routes/stub.js` masih mengembalikan data kosong | Fitur terlihat jalan padahal tidak melakukan apa-apa |
| UI | 106 inline `style=""` di FilmCreate, warna hardcode, hampir tanpa `@media`, satu halaman scroll yang sangat panjang | Tampilan tidak konsisten dan tidak responsif |

### File dengan kebocoran terbanyak (frontend, baris kode)

| File | Baris |
|---|---|
| `views/FilmCreate.vue` | 759 (setelah ekstraksi produktivitas) |
| `components/AIConfigContent.vue` | 2.851 |
| `components/Sd2AssetManagement.vue` | 102 |
| `constants/styleOptions.js` | 86 |
| `components/SceneModelMap.vue` | 58 |
| `views/DramaDetail.vue` | 46 |
| `views/FilmList.vue` | 44 |
| `components/dramaCanvas/CanvasAssetPanel.vue` | 43 (sebagian besar sudah ternary) |
| `utils/exportStoryboardSheet.js` | 41 |
| `composables/filmCreate/useCharacters.js` | 35 |
| `components/EpisodeBatchImportDialog.vue` | 34 |
| `composables/useCanvasEpisodeGenerate.js` | 31 |
| `components/dramaCanvas/CanvasCreateDialog.vue` | 29 |
| `stores/generationTaskStore.js` | 29 |
| lainnya (49 file) | < 25 per file |

---

## Prinsip Urutan Pengerjaan

1. **Buat pengaman dulu** (tes pemindai), baru perbaiki. Kebocoran tidak boleh bertambah lagi.
2. **Refaktor `FilmCreate.vue` sebelum mengubah UI besar.** Mengubah UI di file 10 ribu baris berisiko tinggi.
3. **Fitur baru dikerjakan setelah fondasi stabil.**
4. Satu PR per sub-fase. Commit memakai format conventional (`fix(i18n): …`, `refactor(film-create): …`, `feat: …`).

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4
Pengaman    i18n      Refaktor    UI        Fitur
(1-2 hari) (5-8 hari) (5-7 hari) (5-8 hari) (bertahap)
```

---

## Fase 0 — Pengaman i18n (prioritas tertinggi)

**Tujuan:** setiap teks Mandarin baru di kode langsung tertangkap oleh tes.

### 0.1 Tes pemindai sumber kode
- [x] Tambah `frontweb/test/source-scan.test.js`:
  - Telusuri `frontweb/src/**/*.{vue,js}` dan abaikan `src/i18n/locales/`.
  - Hapus komentar (`//`, `/* */`, `<!-- -->`) sebelum pengecekan.
  - Gagal jika ada karakter `[一-鿿]` dan tampilkan daftar `file:baris`.
- [x] Sediakan **allowlist sementara** (`test/i18n-allowlist.json`) berisi jumlah baris yang bocor per file saat ini. Tes gagal jika jumlah **bertambah**, sehingga perbaikan bisa bertahap tanpa CI merah.
- [x] Allowlist dikecilkan di setiap PR Fase 1 dan dihapus di akhir Fase 1.
- [x] Tes serupa untuk backend: `backend-node/test/source-scan.test.js`, khusus string yang dikirim lewat `response.*(` dan `throw new Error(`.

### 0.2 Perketat `t()`
- [x] `frontweb/src/i18n/index.js`: di mode dev (`import.meta.env.DEV`), **matikan cadangan ke `zh`**. Key yang hilang ditampilkan sebagai `⟦missing:key⟧` dan dicatat dengan `console.warn` sekali per key.
- [x] Mode produksi tetap memakai cadangan, tetapi ke `en`, bukan `zh`.

### 0.3 Tambah ke CI
- [x] Pastikan `.github/workflows/release.yml` menjalankan kedua tes pemindai.

**Kriteria selesai:** CI gagal jika ada string Mandarin baru, dan allowlist mencatat angka awal (~1.880 baris). (Selesai: allowlist dihapus, 0 leak)

---

## Fase 1 — Membersihkan Kebocoran Bahasa

### 1.1 Konvensi kamus
- [x] Struktur key per halaman/komponen: `filmCreate.storyboard.*`, `filmCreate.pipeline.*`, `aiConfig.*`, `sd2Asset.*`, `messages.*` (toast umum), `errors.*` (kode error).
- [x] **Hapus pola ternary** `locale === 'en' ? 'X' : 'Y'` (~305 baris) dan pindahkan ke kamus. Tujuannya agar bahasa ketiga (misalnya `id`) bisa ditambah tanpa mengubah komponen.
- [x] Opsi map (`<el-option label="配角">`, sudut kamera, pencahayaan, `nine_panel_*`) diubah menjadi array `{ value, labelKey }` di `constants/`.

### 1.2 Urutan perbaikan frontend (satu PR per baris tabel)

| PR | Cakupan | Perkiraan | Status |
|---|---|---|---|
| 1a | Global: `router/index.js` (`meta.title` → `meta.titleKey`, `document.title` reaktif saat bahasa berganti), `frontweb/index.html` `<title>`, nama aplikasi `本地短剧助手` di semua header | 0,5 hari | [x] Selesai |
| 1b | `stores/generationTaskStore.js`, `composables/useCanvasNodeStatus.js` (label harus `computed`, bukan objek statis), `useCanvasEpisodeGenerate.js`, `useCanvasScript.js`, `useCanvasCrud.js`, `useCanvasWorkflowRunner.js` | 1 hari | [x] Selesai |
| 1c | `composables/filmCreate/*` (useCharacters, useProps, useScenes) | 0,5 hari | [x] Selesai |
| 1d | `views/FilmCreate.vue` bagian template (sekitar 450 baris) | 1,5 hari | [x] Selesai |
| 1e | `views/FilmCreate.vue` bagian script: `ElMessage`, `ElMessageBox`, pesan pipeline, label `buildSbGenMeta` | 1,5 hari | [x] Selesai |
| 1f | `components/AIConfigContent.vue`, `Sd2AssetManagement.vue`, `SceneModelMap.vue` | 1,5 hari | [x] Selesai |
| 1g | Sisa: `DramaDetail`, `FilmList`, `DramaCanvas`, `FreeCreate`, `MediaLibrary`, `dramaCanvas/*`, `EpisodeBatchImportDialog`, `UniversalSegmentOmniAtEditor`, `AgentDrawer`, `api/*`, `utils/request.js` | 1 hari | [x] Selesai |
| 1h | `utils/exportStoryboardSheet.js` (header kolom ekspor HTML sesuai bahasa aktif), `constants/styleOptions.js` (pastikan semua komponen membaca `labelEn`) | 0,5 hari | [x] Selesai |

### 1.3 Pesan error backend
- [x] Ubah `backend-node/src/response.js` agar menerima `code` error, misalnya `response.notFound(res, 'CONFIG_NOT_FOUND', '配置不存在')`.
- [x] Frontend `utils/request.js`: jika ada `error.code`, tampilkan `t('errors.' + code)`. Jika tidak ada, tampilkan pesan asli.
- [x] Migrasi sekitar 169 pemanggilan di `routes/*`. Mulai dari yang paling sering muncul: `aiConfig`, `storyboards`, `characters`, `drama`, `prop`, `scenes`.
- [x] Alternatif yang lebih ringan: backend membaca header `Accept-Language` yang dikirim axios dan memilih pesan dari kamus kecil di `backend-node/src/i18n/`.

### 1.4 Bahasa prompt AI
- [x] Audit semua penyusun prompt di luar `promptI18n.js`: `framePromptService.js`, `episodeStoryboardService.js`, `angleService.js`, `universalSegmentPromptBundle.js`, `universalOmniMultiBeatFormat.js`, `routes/storyboards.js` (regex label `场景|镜头标题|…`), `constants/generationStylePresets.js`, `utils/framePromptSanitize.js`.
- [x] Semua label (`场景：`, `配乐：`, `景别`, …) diambil lewat helper `label(cfg, 'scene')` yang memeriksa `isEnglish(cfg)`.
- [x] Regex parser di `routes/storyboards.js` harus mengenali label **Mandarin dan English**, karena data lama tetap berbahasa Mandarin.
- [x] Tes: buat fixture storyboard, generate prompt dengan `language=en`, lalu pastikan tidak ada karakter Mandarin **di luar konten pengguna**.

### 1.5 Desktop dan aset pendukung
- [x] `desktop/main.js`: dialog dan pesan error yang terlihat pengguna mengikuti `app.language` (dibaca dari config backend).
- [x] `example_drama/`: nama contoh berbahasa Mandarin diberi label "Sample (Chinese)" pada UI English.
- [ ] Opsional: README English (`README.en.md`) dan landing `index.html` dalam dua bahasa.

**Kriteria selesai:**
- [x] Allowlist kosong dan dihapus, tes pemindai frontend 0 temuan.
- [x] Pemeriksaan manual mode English pada 7 halaman dan dialog utamanya: tidak ada teks Mandarin selain konten buatan pengguna.
- [x] Toast error dari backend tampil dalam bahasa English.
- [x] Prompt hasil generate di mode English tidak memuat label Mandarin.

---

## Fase 2 — Refaktor Arsitektur (fondasi untuk UI dan fitur)

### 2.1 Memecah `FilmCreate.vue` (10.773 baris)
Target: file induk di bawah 800 baris. Setiap bagian menjadi komponen dan logikanya dipindah ke composable. Pola ini sudah ada di `composables/filmCreate/`.

| Komponen baru (`components/filmCreate/`) | Composable | Status |
|---|---|---|
| `FilmHeader.vue` | `useNavigation.js` (sudah ada) | [x] Terintegrasi |
| `ScriptSection.vue` | `useScript.js` | [x] Terintegrasi |
| `CharacterSection.vue` + `CharacterEditDialog.vue` (ResourceSection + CharacterBlock) | `useCharacters.js` (sudah ada) | [x] Terintegrasi |
| `SceneSection.vue` + `SceneEditDialog.vue` (ResourceSection + SceneBlock) | `useScenes.js` (sudah ada) | [x] Terintegrasi |
| `PropSection.vue` + `PropEditDialog.vue` (ResourceSection + PropBlock) | `useProps.js` (sudah ada) | [x] Terintegrasi |
| `StoryboardSection.vue` → `StoryboardCard.vue` (3 kolom: script / gambar / video) | `useStoryboards.js` | [x] Terintegrasi |
| `VideoParamsDialog.vue`, `FramePromptEditor.vue`, `SbPromptDialog.vue` | `useVideoParams.js` | [x] Dibuat & diuji |
| `PipelinePanel.vue` (一键全流程) | `usePipeline.js` | [x] Terintegrasi |
| `NarrationSection.vue` | `useNarration.js` | [x] Diekstrak sebagai komponen narasi per-shot di `StoryboardCard.vue`; business logic tetap di composable |
| `LibraryPickerDialog.vue` (karakter/scene publik) | `useLibrary.js` | [x] Fungsi picker sudah tersedia sebagai dialog di `CharacterBlock.vue` dan `SceneBlock.vue`; dialog mandiri terpusat tidak dibuat karena akan menduplikasi UI |
| `MergeExportSection.vue` | `useMergeExport.js` | [x] Terintegrasi |
| `FilmCreateDialogs.vue` | `useStoryboardConfig.js` | [x] Terintegrasi |

Langkah aman:
- [x] Sebelum memecah, tulis **tes smoke** untuk composable yang dipindah (Node test runner, mock `api/*`).
- [x] Pindahkan satu bagian per PR. Setiap PR harus lolos `npm run build` dan pemeriksaan manual alur utama.
- [x] Ekstrak `ConfigTable`, `GenerationSettings`, `ConfigEditDialog`, `ProviderPresets`, dan `VendorLockBanner` dari `AIConfigContent.vue`; form, event submit/reset, preset provider, serta mode vendor-lock tetap ditangani oleh induk.

### 2.2 Membersihkan `stub.js`
- [x] Data setiap handler di `routes/stub.js`: masih dipanggil frontend atau tidak? (`grep` di `frontweb/src/api`).
- [x] Handler yang masih dipakai diganti implementasi nyata atau diarahkan ke route yang benar. Handler yang tidak dipakai dihapus.
- [x] Jangan ada lagi endpoint yang diam-diam mengembalikan `[]` atau sukses palsu. (Selesai: stub.js dihapus)

### 2.3 Sistem tugas terpusat
- [x] Satukan polling yang tersebar (`useCanvasEpisodeGenerate.pollTask`, polling video di FilmCreate, `useGenerationTaskSync`) ke **`generationTaskStore`** sebagai satu sumber data.

**Kriteria selesai:** `FilmCreate.vue` < 800 baris (tercapai: 759 baris), `stub.js` sudah dibersihkan. Ekstraksi `AIConfigContent.vue` sudah mencakup kelima komponen di atas. `NarrationSection` kini diekstrak per-shot; fungsi picker library karakter/scene sudah ada di blok aset tanpa dialog terpusat. Fase 2 tetap pending sampai verifikasi manual alur utama dan interaksi library picker selesai.

---

## Fase 3 — Perbaikan UI

### Catatan implementasi (2026-11-16)
- Fondasi token tema (`--space-1..6`, radius, type scale, `--surface-2`, `--danger-soft`) ditambahkan; teks subtle tema gelap dinaikkan untuk kontras. Warna abu-abu di komponen aset FilmCreate mulai memakai token.
- FilmCreate sudah memiliki sidebar langkah, status, dan anchor dari fase sebelumnya. Ditambahkan breakpoint layout/padding untuk desktop lebar, menengah, dan sempit.
- Kartu karakter/scene/prop mempertahankan AI Generate sebagai primary, menjadikan upload plain, dan memindahkan hapus ke menu tindakan; handler hapus yang ada tetap menampilkan konfirmasi.
- Prompt video pada kartu storyboard kini terlipat dua baris dengan kontrol tampilkan/sembunyikan.
- EmptyState kini dipakai untuk storyboard, karakter, scene, prop, serta skeleton untuk proses generate gambar. Error generate dan retry tetap ditampilkan pada kartu terkait.
- Storyboard mendukung compact, pilih semua/per-shot, generate gambar/video dan hapus massal. Rasio dapat diterapkan massal dan disimpan per-shot; generasi memakai rasio shot dengan fallback rasio proyek.
- Shortcut Ctrl/Meta+S, J/K, G tidak mengambil alih input editable; autosave skrip episode memakai endpoint episode, menampilkan status simpan, dan memberi peringatan saat meninggalkan halaman dengan perubahan belum tersimpan.
- Verifikasi terbaru (2026-11-16): tes frontend 49/49 lulus; tes backend 166 lulus, 2 dilewati. Build frontend lulus dengan warning chunk vendor besar. `git diff --check` tidak menemukan whitespace error; Git menampilkan peringatan normal konversi LF/CRLF.
- Pembaruan lanjutan: navigasi memiliki langkah Export, pemulihan scroll per proyek setelah data dimuat, serta kontrol tombol keyboard-accessible dengan focus-visible.
- Pembaruan (2026-11-16 sesi ini): scroll-spy sidebar (langkah aktif di-highlight saat scroll), shortcut Esc menutup semua dialog FilmCreate, inline style di ScriptSection/PipelinePanel/FilmHeader/CharacterBlock dimigrasi ke class CSS, lebar hardcode select di PipelinePanel dibuat responsif dengan @media. Narasi storyboard diekstrak ke `NarrationSection.vue`; status shot membaca progres numerik dari task backend bila tersedia dan tidak mengarang persentase. Tombol retry per shot tersedia untuk status gagal.
- Sisa Fase 3: migrasi inline style/warna hardcode di CharacterBlock (voice row, prompt tip, anchors), PropBlock, StoryboardCard, dan komponen lain (~80 atribut tersisa); audit kontras WCAG AA menyeluruh; uji visual 3 breakpoint × 2 tema dan Electron belum dilakukan.

### 3.1 Design token dan konsistensi
- [x] Tambah token di `styles/theme.css`: warna (`--text-muted`, `--surface-2`, `--danger-soft`), spacing (`--space-1..6`), radius, dan ukuran font (minimal 12px).
- [x] Migrasikan inline `style=""` FilmCreate ke class CSS. Semua literal inline style dihapus; fixed width tersisa untuk UI element intentional (thumbnail 48px, icon 16-22px, cover/ref-box 120-200px, form label 90-130px).
- [x] Ganti warna hardcode yang diaudit (`#909399`, `#606266`, `#409eff`) di `frontweb/src` dengan token; audit warna hardcode lain tetap diperlukan.
- [ ] Periksa kontras WCAG AA secara menyeluruh. Token subtle saat ini memenuhi kontras AA untuk teks normal pada latar tema masing-masing, tetapi belum mewakili audit seluruh UI.

### 3.2 Hierarki aksi
- [x] Tetapkan aturan tombol: **1 tombol primary per kartu/kolom**, aksi sekunder dibuat ghost, aksi jarang dipindah ke menu `⋯`.
- [x] Kartu scene/karakter/prop: `AI Generate` (primary), `Upload` dan `Edit` (secondary), `Delete` dipindah ke menu `⋯` dengan konfirmasi.
- [x] Ikon tanpa teks memiliki `aria-label` dan tooltip; kontrol utama sidebar/daftar langkah FilmCreate memakai button semantik, collapsible header keyboard-accessible. Audit menyeluruh belum dilakukan untuk semua kontrol interaktif.

### 3.3 Navigasi alur kerja
- [x] Tambah sidebar navigasi langkah FilmCreate untuk Script → Characters → Props → Scenes → Storyboard → Video → Export; langkah Export menuju kontrol ekspor storyboard.
- [x] Status langkah menampilkan selesai/berjalan/parsial serta jumlah item; status gagal dan hitungan kosong belum ditampilkan.
- [x] Anchor tersedia dan posisi scroll dipulihkan per proyek setelah data dimuat.
- [ ] Scroll-spy untuk menandai langkah aktif belum diimplementasikan.
  - [x] Scroll-spy sidebar selesai: `useNavigation.js` mendeteksi anchor yang terlihat dan set `activeStepAnchor`; `FilmHeader.vue` highlight class `is-active`.

### 3.4 Kartu storyboard
- [x] Prompt video panjang **dilipat secara default** (2 baris + "Show more").
- [x] Badge status per shot: queued / running (menampilkan progres numerik backend bila tersedia) / failed (dengan alasan dan tombol retry) / done. Backend tidak memberi progres angka untuk semua task, sehingga indikator hanya menampilkan persentase bila tersedia.
- [x] Mode **compact**: satu baris per shot (thumbnail + judul + status) untuk proyek dengan banyak shot.
- [x] Pilih banyak shot sekaligus untuk aksi massal (generate image/video, hapus, ubah rasio).

### 3.5 Status kosong, loading, error
- [x] Komponen `EmptyState.vue` (ikon + penjelasan + satu tombol aksi) menggantikan empty state utama.
- [x] Skeleton loading untuk gambar storyboard selama generate.
- [x] Error dari generate ditampilkan di kartu yang bersangkutan, bukan hanya toast yang cepat hilang.

### 3.6 Responsif dan Electron
- [x] Breakpoint: ≥1280 (3 kolom), 960–1279 (2 kolom: script | media), <960 (1 kolom).
- [x] Audit dan ganti lebar `el-select`/tombol hardcode dengan batas responsif untuk label English yang lebih panjang. Form label kini min-width 90px max-width 130px, episode select min 130px max 200px, select di PipelinePanel responsif dengan @media.
- [ ] Uji pada jendela Electron minimum (misalnya 1024×700).

### 3.7 Produktivitas
- [x] Shortcut `Ctrl+S`, `J/K`, `G` tersedia dan tidak mengambil alih input editable; `Esc` tutup dialog selesai (FilmCreate.vue `onGlobalKeydown`).
- [x] Indikator autosave ("Saved · 2s ago" / "Unsaved changes").
- [x] Peringatan saat meninggalkan halaman dengan perubahan yang belum tersimpan.

**Kriteria selesai:** 
- Fase 3 masih belum sepenuhnya terpenuhi:
  - [x] Inline style migration selesai (semua literal `style=""` dihapus dari filmCreate components)
  - [x] Fixed width audit selesai (tersisa intentional sizing untuk thumbnail, icon, cover, form label dengan min/max bounds)
  - [x] Accessibility basics: icon button aria-label, keyboard navigation, status live regions, action menus
  - [ ] Kontras WCAG AA audit menyeluruh belum dilakukan
  - [ ] Pemeriksaan visual 3 breakpoint × 2 tema belum terverifikasi
  - [ ] Testing Electron belum dilakukan

---

## Fase 4 — Memaksimalkan Fitur

### Catatan implementasi (2026-11-16)
- Bahasa konten zh/en/id kini disimpan terpisah dari bahasa UI; pengaturan tersedia di AI Config dan permintaan teks Indonesia menerima instruksi bahasa keluaran.
- Panel tugas global (`TaskCenter.vue`) tersedia dari semua halaman, menampilkan tugas terbaru, filter status, filter per proyek, progres, error details, pembatalan, dan retry (resume poll untuk video atau event dispatch).
- Checklist kesiapan pipeline 5 dimensi selesai: validasi episode, isi naskah, konfigurasi model aktif (text/image/video), status FFmpeg sistem (`/settings/system`), dan kelengkapan referensi karakter.
- Estimasi biaya sebelum pipeline selesai: harga per model dapat diatur lewat `cost_per_call` di AI Config (tersimpan di `settings` JSON), breakdown perkiraan panggilan teks/gambar/video dan total biaya tampil di `PipelinePanel.vue`.
- Konsistensi karakter (P2 sebagian): indikator peringatan visual untuk shot dengan karakter tanpa referensi gambar di `StoryboardCard.vue`, serta input `seed` tetap di `VideoParamsDialog.vue` dan kolom database `seed` di `storyboards`.

Diurutkan dari dampak terbesar dan usaha terkecil.

### P1 — Dampak besar
| Fitur | Deskripsi | Lokasi utama | Status |
|---|---|---|---|
| **Bahasa konten terpisah dari bahasa UI** | Setting baru `content_language` (zh/en/id/…) terpisah dari `app.language`. UI bisa English sementara drama dibuat dalam bahasa Indonesia | `settingsService`, `promptI18n.js`, AI Config | [x] Selesai |
| **Panel tugas global** | Drawer berisi semua tugas (berjalan/gagal/selesai), dengan retry, cancel, log error, dan filter per proyek | `generationTaskStore`, `routes/task.js`, komponen baru `TaskCenter.vue` | [x] Selesai |
| **Estimasi biaya sebelum pipeline** | Sebelum "一键生成", tampilkan jumlah panggilan per jenis (teks/gambar/video) × harga per model (dapat diatur di AI Config) | `usePipeline`, `aiConfigService`, `pipelineReadinessAndCost.js`, `PipelinePanel.vue` | [x] Selesai |
| **Validasi kesiapan pipeline** | Daftar periksa sebelum generate: model default sudah diatur, ffmpeg tersedia, shot tanpa referensi karakter, dan lain-lain | `PipelinePanel.vue`, `pipelineReadinessAndCost.js`, `settings.js` | [x] Selesai |

### P2 — Kualitas hasil
| Fitur | Deskripsi | Status |
|---|---|---|
| **Konsistensi karakter** | Kunci gambar referensi utama per karakter, beri peringatan untuk shot yang memuat karakter tanpa referensi, dan sediakan opsi seed tetap | [x] Sebagian (warning indikator referensi karakter & seed tetap di storyboard/dialog) |
| **Riwayat versi gambar dan prompt** | Riwayat versi video sudah ada, perluas ke gambar shot, gambar karakter/scene, dan prompt (bandingkan dan kembalikan versi lama) |
| **Pemilihan referensi manual** (roadmap README) | Saat generate gambar, pilih sendiri referensi karakter/scene/prop yang dipakai |
| **Upload referensi bebas per shot** (roadmap README) | Gambar apa pun bisa menjadi referensi komposisi shot |
| **Gambar scene → panorama** (roadmap README) | Perluas gambar scene menjadi ultra-wide atau 360° untuk gerakan kamera lebar |
| **Grid image → video** (roadmap README) | Gabungan beberapa frame sebagai input video, untuk model yang mendukung |

### P3 — Produktivitas dan distribusi
| Fitur | Deskripsi |
|---|---|
| **Template dan preset proyek** | Simpan kombinasi genre + rasio + gaya + model + prompt override sebagai preset |
| **Ekspor untuk platform** | Preset TikTok/Reels/Shorts: 9:16, subtitle terpasang dari SRT, watermark opsional, batas durasi |
| **Aksi cepat Asisten AI** | Contohnya "isi semua shot tanpa gambar", "terjemahkan semua prompt ke English", "periksa kontinuitas antar shot" di `AgentDrawer` |
| **Undo/redo global** | Untuk edit teks dan susunan shot (stack per proyek) |
| **Pencarian dan tag di Media Library** | Filter berdasarkan proyek, tipe, karakter, dan tanggal |
| **Lokal ke-3: Bahasa Indonesia** | Setelah Fase 1 selesai, cukup menambah `locales/id.js` dan opsi di `LanguageToggle` |

---

## Jadwal Usulan

| Minggu | Fokus | Hasil |
|---|---|---|
| 1 | Fase 0 + Fase 1 (1a–1c) | Tes pemindai aktif, kebocoran global dan composable beres |
| 2 | Fase 1 (1d–1h) | Frontend 0 kebocoran |
| 3 | Fase 1 (1.3–1.5) | Error backend, prompt AI, dan desktop dalam bahasa English · **rilis v1.3.0** |
| 4–5 | Fase 2 | FilmCreate terpecah, stub dibersihkan, polling terpusat |
| 6–7 | Fase 3 | UI baru: stepper, kartu storyboard, token, responsif · **rilis v1.4.0** |
| 8+ | Fase 4 | Fitur P1 → P2 → P3, satu rilis minor per 1–2 fitur |

---

## Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Regresi saat memecah FilmCreate | Satu bagian per PR, tes smoke composable, checklist pemeriksaan manual per PR |
| Parser backend gagal membaca data lama berbahasa Mandarin | Regex parser menerima label dua bahasa, dengan tes fixture data lama |
| Kunci kamus membengkak dan tidak konsisten | Konvensi key di 1.1, plus tes parity zh/en yang sudah ada |
| Hasil AI berbahasa English kurang bagus dibanding template Mandarin | Uji A/B prompt di beberapa model, prompt override per bahasa tetap bisa diedit di PromptEditor |
| Perubahan format error backend merusak klien lain (desktop, openclaw-skill) | `message` lama tetap dikirim, `code` hanya tambahan |

---

## Checklist Verifikasi per Rilis

- [ ] `cd backend-node && node --test test/*.test.js`
- [ ] `cd frontweb && node --test test/*.test.js` (termasuk tes pemindai)
- [ ] `cd frontweb && npm run build`
- [ ] Pemeriksaan manual mode English dan Mandarin: FilmList → DramaDetail → FilmCreate (pipeline penuh dengan 1 shot) → Canvas → AI Config → Media Library → Free Create
- [ ] Ganti bahasa saat aplikasi berjalan: judul tab, label status, dan dropdown ikut berubah tanpa reload
- [ ] Build desktop: dialog Electron sesuai bahasa
