# Integrasi flow2api ke LocalDrama

Status: **Implementasi kode selesai, semua pengujian unit backend dan frontend lulus. Siap diuji manual dengan server flow2api lokal.**
Sumber analisa & verifikasi: kode `C:\Project\flow2api` dan `C:\Project\LocalDrama`.

## 1. Ringkasan

LocalDrama bisa dihubungkan ke flow2api, dan sebagian besar jalurnya sudah ada. flow2api menyediakan API yang meniru format Gemini, dan LocalDrama sudah punya provider **Google Gemini** untuk gambar dan video (Veo). Cukup arahkan Base URL ke flow2api. Namun ada beberapa ketidakcocokan (rasio, durasi, nama model) yang membuat sebagian request gagal atau hasilnya salah.

## 2. Yang disediakan flow2api

- **Hanya gambar dan video**, tidak ada model teks. Naskah, storyboard, dan ekstraksi karakter tetap butuh LLM lain (DeepSeek, Qwen, dll.).
- Model gambar: `Nano Banana Pro`, `Nano Banana 2`, `Imagen 4` (nama internal: `gemini-3.0-pro-image`, `gemini-3.1-flash-image`, `imagen-4.0-generate-preview`).
  - Rasio didukung: `16:9`, `9:16`, `1:1`, `4:3`, `3:4` (Imagen 4 hanya `16:9`/`9:16`).
  - Ukuran: default (1k), `2k`, `4k` (hanya Nano Banana Pro / 2).
- Model video: `Veo 3.1 - Lite`, `Veo 3.1 - Fast`, `Veo 3.1 - Quality`, `Omni 1.1 Flash`, `Omni 1.2 Flash`.
  - Rasio: hanya `16:9` dan `9:16`.
  - Durasi: Veo mengabaikan durasi (8 detik); Omni 1.1 = 4/6/8/10; Omni 1.2 = 3–15.
  - Routing otomatis berdasarkan jumlah gambar: 0 = T2V, 1 = I2V (frame awal), 2 = frame awal + akhir, 3+ = multi-referensi (R2V).
- Endpoint:
  - `POST /v1beta/models/{model}:generateContent` — format Gemini; gambar kembali sebagai base64 `inlineData`, video sebagai `fileData.fileUri`.
  - `POST /v1beta/models/{model}:predictLongRunning` + `GET /v1beta/operations/{id}` — video asinkron. Menerima `instances[0].image`, `instances[0].lastFrame`, `instances[0].referenceImages` (maks 3). Alias: `veo-3.1-generate-preview` → Quality, `veo-3.1-fast-generate-preview` → Fast, `veo-3.1-lite-generate-preview` → Lite.
  - `POST /v1/chat/completions` — format OpenAI chat; hasil berupa markdown `![](url)` + field `url`.
  - `GET /v1/models`, `GET /v1beta/models` — daftar model.
- Autentikasi: `?key=`, header `x-goog-api-key`, atau `Authorization: Bearer`.
- Alamat default: `http://127.0.0.1:8000` (admin: `/manage`, uji: `/test`).

## 3. Kecocokan dengan kode LocalDrama

### Gambar — `backend-node/src/services/imageClient.js` (`callGeminiImageApi`): cocok

- Format request (`contents` + `generationConfig.imageConfig`) dan respons (`inlineData`) sama.
- Gambar referensi (maks 4) dikirim sebagai `inlineData`; flow2api menerimanya.
- Jika nama model `gemini-3.1-flash-image` / `gemini-3.0-pro-image`, LocalDrama otomatis mengirim `imageSize` 2K/1K (`buildGeminiImageConfig`), dan flow2api menormalkan `2K` → `2k`.
- Timeout HTTP gambar 600 detik — cukup.

### Video — `backend-node/src/services/videoClient.js` (`callGeminiVideoApi` + polling): cocok

- Sudah memakai `predictLongRunning`, mengambil `name` sebagai task_id.
- Polling ke `{base}/v1beta/{operationName}` = `/v1beta/operations/{id}` — didukung flow2api.
- Membaca `response.generateVideoResponse.generatedSamples[0].video.uri` — sama dengan respons flow2api.
- Video hasil diunduh ke penyimpanan lokal (`videoService.downloadVideoToLocal`), jadi link CDN Google yang kedaluwarsa tidak masalah.

## 4. Masalah yang akan muncul

| # | Masalah | Lokasi | Dampak |
|---|---|---|---|
| 1 | **Rasio video**: LocalDrama memakai `clampToGeminiImageAspectRatio` (bisa `1:1`, `4:3`, `21:9`, dst.), flow2api hanya menerima `16:9`/`9:16`. | `videoClient.js` `callGeminiVideoApi`, `mediaAspectRatioSpec.js` | Error 400 "Unsupported video aspectRatio" |
| 2 | **Durasi video**: LocalDrama membatasi 5–8 detik (default 8); `Omni 1.1 Flash` hanya 4/6/8/10. | `videoClient.js` `callGeminiVideoApi` | Error 400 untuk 5 dan 7 detik; Omni 1.2 tidak bisa > 8 detik |
| 3 | **Rasio gambar**: `2:3`, `3:2`, `4:5`, `5:4`, `21:9` tidak didukung flow2api dan diam-diam diganti ke **landscape**. | `imageClient.js` `geminiAspectRatio` | Gambar vertikal bisa jadi horizontal |
| 4 | **Nama model preset di UI** (`gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`, `veo-3.0-*`) tidak dikenali flow2api (resolver tidak menangani akhiran `-preview`). | `frontweb/src/components/AIConfigContent.vue` (preset provider) | Error model tidak ditemukan; nama model harus diketik manual |
| 5 | **Video hanya mengirim frame pertama**; `lastFrame` dan `referenceImages` tidak dikirim walau flow2api mendukung. | `videoClient.js` `callGeminiVideoApi` (dipanggil di dispatcher ~baris 4199 tanpa `last_frame_url`/`reference_urls`) | Fitur frame awal/akhir & multi-referensi tidak terpakai |
| 6 | **Fallback respons gambar**: jika flow2api gagal mengambil gambar, ia mengembalikan `fileData.fileUri` (URL); LocalDrama hanya membaca `inlineData`. | `imageClient.js` akhir `callGeminiImageApi` | Jarang; tampil "Gemini 未返回图片内容" |
| 7 | **Tidak ada model teks** di flow2api. | — | Fitur LLM tetap pakai provider lain |

## 5. Cara memakai sekarang (tanpa ubah kode)

Di halaman **AI 配置**:

1. **Gambar** (service `image` dan `storyboard_image`)
   - Protokol: `gemini`
   - Base URL: `http://127.0.0.1:8000`
   - API key: API Key dari admin flow2api (`/manage`)
   - Model (ketik manual): `gemini-3.1-flash-image` atau `gemini-3.0-pro-image`
2. **Video**
   - Protokol: `gemini`, Base URL & API key sama
   - Model: `Veo 3.1 - Fast` atau `Veo 3.1 - Lite` (hindari `Omni 1.1 Flash` karena masalah durasi #2)
   - Rasio proyek: `16:9` atau `9:16` saja
3. **Teks / LLM**: tetap pakai provider yang sudah ada.

Prasyarat flow2api: server berjalan, ekstensi Chrome terpasang dan terhubung (`ws://127.0.0.1:8000/captcha_ws`), akun Google Flow sudah diimpor, mode captcha `extension` (atau 2Captcha).

## 6. Rencana implementasi

### Langkah 1 — Provider `flow2api` di UI

- File: `frontweb/src/components/AIConfigContent.vue` (+ `frontweb/src/i18n/locales/zh.js`, `en.js`)
- Tambah provider `flow2api` untuk service `image`, `storyboard_image`, `video`:
  - Base URL default `http://127.0.0.1:8000`
  - Model gambar: `gemini-3.1-flash-image`, `gemini-3.0-pro-image`, `Imagen 4`
  - Model video: `Veo 3.1 - Fast`, `Veo 3.1 - Lite`, `Veo 3.1 - Quality`, `Omni 1.1 Flash`, `Omni 1.2 Flash`
- Petakan `flow2api` → protokol `gemini` di peta protokol frontend dan pratinjau endpoint.
- Tambah teks bantuan singkat (prasyarat ekstensi Chrome, hanya gambar/video).

### Langkah 2 — Pemetaan protokol di backend

- `imageClient.js` `inferProtocol` dan `videoClient.js` `inferVideoProtocol`: `flow2api` → `gemini`.
- Sediakan helper `isFlow2ApiConfig(config)` (berdasarkan provider `flow2api`) untuk aturan khusus di langkah 3–5.

### Langkah 3 — Normalisasi rasio dan durasi untuk flow2api

- Video: rasio → `9:16` jika tinggi > lebar, selain itu `16:9`.
- Video: durasi per model:
  - `Veo 3.1 *`: jangan kirim `durationSeconds`
  - `Omni 1.1 Flash`: bulatkan ke nilai terdekat dari 4/6/8/10
  - `Omni 1.2 Flash`: clamp 3–15
- Gambar: petakan rasio ke yang terdekat dari `16:9`, `9:16`, `1:1`, `4:3`, `3:4` (Imagen 4: hanya `16:9`/`9:16`), alih-alih membiarkan fallback ke landscape.

### Langkah 4 — Frame akhir dan referensi untuk video

- Teruskan `last_frame_url` dan `reference_urls` dari dispatcher ke `callGeminiVideoApi`.
- Kirim sebagai `instances[0].lastFrame` dan `instances[0].referenceImages[] = { image: { bytesBase64Encoded, mimeType } }` (maks 3).
- Pakai ulang logika pembacaan gambar lokal/URL → base64 yang sudah ada (ekstrak jadi helper).
- Aturan: `lastFrame` hanya jika ada frame pertama; jangan campur frame awal/akhir dengan referensi dalam satu request.

### Langkah 5 — Fallback respons gambar

- Di akhir `callGeminiImageApi`, jika tidak ada `inlineData`, cek `part.fileData.fileUri` dan kembalikan sebagai `image_url`.

### Langkah 6 — Tes

- Backend (`backend-node/test/`): unit test untuk normalisasi rasio/durasi flow2api dan pembentukan body `predictLongRunning` (frame awal, frame awal+akhir, referensi).
- Frontend (`frontweb/test/`): jika ada helper peta protokol yang dapat diuji, tambahkan kasus `flow2api`.
- Jalankan:
  - `cd backend-node && node --test test/*.test.js`
  - `cd frontweb && node --test test/*.test.js`

### Langkah 7 — Uji langsung

- Jalankan flow2api (`python main.py`) + ekstensi Chrome, lalu LocalDrama (`backend-node`: `npm run dev`, `frontweb`: `npm run dev`).
- Uji: gambar karakter, gambar storyboard dengan referensi, video T2V, video I2V, video frame awal+akhir, rasio 9:16.

## 7. Catatan dan risiko

- flow2api bergantung pada akun Google Flow lewat ekstensi Chrome dan reCAPTCHA: server flow2api dan Chrome harus tetap berjalan. Ada risiko akun sesuai Syarat Layanan Google (README flow2api menyebut ini).
- Video via flow2api memakai kredit akun Flow (lihat tabel poin di README flow2api); gambar tidak memakai poin.
- Temuan terpisah (tidak terkait flow2api): banyak komentar dan pesan error berbahasa Mandarin di `backend-node/src/services/videoClient.js` sudah rusak menjadi `???` di commit yang ada, sehingga beberapa pesan error video tidak terbaca pengguna. Sebaiknya diperbaiki terpisah.
