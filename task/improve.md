# Perbaikan integrasi flow2api

Status: **Selesai dikerjakan.** Hasil perbaikan implementasi flow2api (lihat `task/flow2api.md`).
Tes saat ini: backend 186 tes (184 lulus, 2 dilewati), frontend 55 lulus. Belum diuji dengan server flow2api yang berjalan.

## 1. Bug utama: kombinasi gambar video ditolak flow2api (error 400)

### Masalah

`callGeminiVideoApi` di `backend-node/src/services/videoClient.js` hanya mencegah `lastFrame` dan `referenceImages` dikirim bersamaan. Batas jumlah gambar per model belum dicek.

flow2api (`predictLongRunning`) menghitung frame awal + frame akhir + referensi sebagai satu kumpulan gambar, lalu memilih model internal:

- Veo public name + ada `referenceImages`:
  - `Veo 3.1 - Fast` → `veo-r2v`
  - `Veo 3.1 - Lite` dengan >1 referensi → `veo-interpolate`
- Veo public name + ada gambar (tanpa kasus di atas) → `veo-i2v` / `veo-i2v-fast` / `veo-i2v-lite`

Hasil yang sudah diverifikasi lewat resolver flow2api (`_resolve_request_model` + `MODEL_CONFIG`):

| Model | Yang dikirim | Model internal | max_images | Hasil |
|---|---|---|---|---|
| `Veo 3.1 - Lite` | frame awal + frame akhir | `veo_3_1_i2v_lite_*` | 1 | **400** |
| `Veo 3.1 - Fast` | frame awal + 3 referensi | `veo_3_1_r2v_fast` | 3 | **400** |
| `Veo 3.1 - Quality` | frame awal + 2 referensi | `veo_3_1_i2v_s_*` | 2 | **400** |
| `Veo 3.1 - Fast` | frame awal + frame akhir | `veo_3_1_i2v_s_fast_fl` | 2 | aman |
| `Veo 3.1 - Quality` | frame awal + frame akhir | `veo_3_1_i2v_s_*` | 2 | aman |

Pesan error flow2api: `Model does not support this number of input images`.

### Perbaikan

1. Tambah helper murni di `backend-node/src/services/flow2apiCompat.js`, misalnya:

   ```js
   /**
    * @param {string} modelName
    * @param {{ hasFirst: boolean, hasLast: boolean, refCount: number }} input
    * @returns {{ useLastFrame: boolean, refLimit: number }}
    */
   function planFlow2ApiVideoImages(modelName, input) { ... }
   ```

   Aturan per model:

   | Model | Frame akhir | Referensi (selain frame awal) |
   |---|---|---|
   | `Veo 3.1 - Lite` | tidak | 0 |
   | `Veo 3.1 - Fast` | ya | ada frame awal: maks 2; tanpa frame awal: maks 3 |
   | `Veo 3.1 - Quality` | ya | ada frame awal: maks 1; tanpa frame awal: 0 |
   | `Omni 1.1 Flash` / `Omni 1.2 Flash` | ya | cek `max_images` model Omni di flow2api (`generation_handler.py`) dan ikuti batasnya |
   | Lainnya | ikuti perilaku sekarang | maks 3 |

   Prioritas tetap: frame akhir lebih diutamakan daripada referensi (sesuai perilaku sekarang).

2. Pakai helper itu di `callGeminiVideoApi` (cabang `if (flow2api)`) sebelum membaca `last_frame_url` dan `reference_urls`, supaya gambar yang tidak dikirim juga tidak perlu dibaca.

3. Log peringatan saat frame akhir atau referensi dibuang karena batas model, supaya pengguna tahu kenapa hasil video tidak memakai semua gambar.

4. (Opsional) Tampilkan petunjuk di UI: `Veo 3.1 - Lite` via flow2api tidak mendukung frame akhir maupun referensi.

### Tes

Di `backend-node/test/flow2apiCompat.test.js`, tambah kasus untuk `planFlow2ApiVideoImages`:

- Lite + frame awal + frame akhir → `useLastFrame: false`, `refLimit: 0`
- Fast + frame awal + 3 referensi → `refLimit: 2`
- Fast tanpa frame awal + 3 referensi → `refLimit: 3`
- Quality + frame awal + 2 referensi → `refLimit: 1`
- Fast / Quality + frame awal + frame akhir → `useLastFrame: true`

Jika memungkinkan, tambah tes `callGeminiVideoApi` dengan `fetch` di-mock untuk memeriksa body `instances[0]` yang dikirim.

## 1b. Tindak lanjut review (selesai)

- Omni: dengan frame awal, referensi harus tepat 2 (total 3 gambar = batas `max_images` Omni); 1 referensi akan dibaca flow2api sebagai frame akhir, jadi dibuang.
- Veo Quality: tidak ada mode referensi, referensi selalu dibuang (hanya frame awal + frame akhir).
- Keputusan referensi diambil setelah frame akhir benar-benar terbaca (jika gagal, referensi tetap terkirim).
- `planFlow2ApiVideoImages` kini mengembalikan `refMin`; tes ditambah (34 tes di `flow2apiCompat.test.js`).
- Fallback `fileData.fileUri` gambar: alur penyimpanan (`createAndGenerateImage` → `uploadService.downloadImageToLocal`) sudah mengunduh URL ke penyimpanan lokal dengan retry; URL relatif (`/tmp/...`) kini diberi Base URL flow2api.

## 2. Catatan kecil

### 2.1 `isOmni12` tidak mengenali `omni-1.2-flash`

- File: `backend-node/src/services/flow2apiCompat.js`
- Regex `omni\s*1[._]2` tidak cocok dengan tanda hubung (`omni-1.2-flash`).
- Tes `normalizeFlow2ApiVideoDuration(5, 'omni-1.2-flash')` lulus hanya karena model tak dikenal juga di-clamp 3–15.
- Perbaikan: ubah ke `omni[\s\-_]*1[._]2`, dan samakan pola untuk `isOmni11` (`omni[\s\-_]*1[._]1`).
- Tes: tambah kasus `isOmni12('omni-1.2-flash') === true` (ekspor fungsi atau uji lewat hasil yang berbeda dari jalur default, misalnya durasi 20 → 15 dan pastikan jalur Omni 1.2 yang dipakai).

### 2.2 Deteksi otomatis `isFlow2ApiConfig` terbatas

- Saat ini fallback hanya jika `api_protocol === 'gemini'` **dan** Base URL `localhost`/`127.0.0.1`.
- Tidak terdeteksi:
  - provider `gemini` dengan `api_protocol` kosong (auto)
  - flow2api di IP LAN (mis. `http://192.168.1.10:8000`)
- Perbaikan yang disarankan:
  - Terima juga `api_protocol` kosong jika provider `gemini`/`google`.
  - Atau, lebih sederhana: jangan perluas deteksi otomatis, tapi tampilkan peringatan di UI jika provider `gemini` dengan Base URL bukan Google, sarankan pilih provider `flow2api`.

### 2.3 Fallback `fileData.fileUri` untuk gambar perlu dicek

- File: `backend-node/src/services/imageClient.js`, akhir `callGeminiImageApi`.
- Fallback mengembalikan URL (bukan data URL). Pastikan alur penyimpanan gambar (`imageService` / `createAndGenerateImage`) mengunduh URL tersebut ke penyimpanan lokal, dan URL flow2api (`http://127.0.0.1:8000/tmp/...`) bisa diakses dari backend.
- Uji manual sekali; jika tidak tersimpan lokal, unduh lalu ubah ke data URL di dalam fallback.

### 2.4 Komentar Mandarin rusak (`???`) di `videoClient.js`

- Bagian `callGeminiVideoApi` sudah diperbaiki, tapi bagian lain (mis. `inferVideoProtocol`, polling Vidu/Gemini/DashScope) masih rusak, termasuk beberapa **pesan error yang dilihat pengguna**.
- Perbaikan: pulihkan teks dari riwayat git sebelum kerusakan (cari commit terakhir yang file-nya masih utuh) atau tulis ulang pesannya; pertimbangkan memindahkan pesan error ke `backend-node/src/i18n/errors.js`.
- Kerjakan di commit terpisah.

## 3. Kebersihan commit

Working tree berisi perubahan lain yang tidak terkait flow2api (bahasa konten Indonesia, TaskCenter, pemilihan storyboard, tema). Commit terpisah, misalnya:

1. `feat(ai): add flow2api provider with gemini compat layer` — `flow2apiCompat.js`, tesnya, `imageClient.js`, `videoClient.js`, `AIConfigContent.vue` (bagian flow2api), i18n `flow2api*`
2. `fix(flow2api): cap video input images per model` — perbaikan bagian 1
3. Perubahan lain sesuai fiturnya masing-masing

## 4. Verifikasi

- `cd backend-node && node --test test/*.test.js`
- `cd frontweb && node --test test/*.test.js`
- Uji langsung dengan flow2api berjalan + ekstensi Chrome:
  - Gambar: karakter (9:16), storyboard dengan referensi, rasio 2:3 → harus jadi 3:4 (bukan landscape)
  - Video: T2V, I2V, frame awal+akhir dengan `Veo 3.1 - Fast`, frame awal+akhir dengan `Veo 3.1 - Lite` (harus tetap jalan sebagai I2V, tanpa 400), referensi dengan `Veo 3.1 - Fast`
  - Omni 1.1 dengan durasi 5 → 4 detik; Omni 1.2 dengan durasi 12 → 12 detik
