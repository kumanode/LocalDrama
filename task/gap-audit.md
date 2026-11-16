# Gap Audit — plan.md vs Kode Saat Ini

**Tanggal:** 2026-11-16
**Basis:** branch `main` (cebb68d + perubahan lokal belum di-commit)
**Cakupan:** `backend-node/` (routes, services, migrations, `src/db/migrate.js`) dan `frontweb/src/` (views, components, composables)

Legenda status:

- ✅ **Ada** — sudah berfungsi, cukup dipoles
- 🟡 **Sebagian** — ada fondasi, perlu diperluas
- ❌ **Belum** — harus dibuat dari nol
- ⏸️ **Tunda** — disarankan tidak dikerjakan sekarang (biaya tinggi / tidak relevan untuk app desktop lokal)

---

## Ringkasan Eksekutif

| # | Bagian plan.md | Status | Catatan inti |
|---|---|---|---|
| 2 | Story Bible & Series | 🟡 | Drama → Episode ada; outline/sinopsis disimpan di `dramas.metadata`. Tidak ada Story Bible terstruktur, season, atau recap lintas episode. |
| 3 | Character Consistency | 🟡 kuat | Identity anchors, four-view sheet, stages, negative prompt, Seedance2 asset/voice sudah ada. Belum ada outfit per-scene, versioning, face similarity. |
| 4 | Scene & Environment | 🟡 | Scene + library + four-view + polished prompt ada. Lighting/time-of-day/weather belum jadi atribut terstruktur. |
| 5 | AI Director | 🟡 kuat | Shot type, angle H/V/S, movement, lighting_style, depth_of_field, first/last frame, tail-frame link, continuity_snapshot antar-shot sudah ada. |
| 6 | Multi-Provider | 🟡 | Banyak provider sudah ada, tapi monolitik (`videoClient.js` ~4.900 baris). Tidak ada multi-key, rotasi, retry/backoff, failover, enkripsi key. |
| 7 | Batch Production | 🟡 lemah | Batch image/video per episode ada, concurrency global ada. **Orkestrasi pipeline jalan di frontend**, task in-process hilang saat restart. |
| 8 | Voice & Audio | 🟡 | TTS (MiniMax, OpenAI-compatible), narasi, split-by-audio, SRT ada. Belum ada BGM/SFX, voice library, lip sync. |
| 9 | Video Editor & Render | 🟡 | Merge FFmpeg + subtitle burn-in + post-process ada. Belum ada timeline editor, render queue, opsi codec/HW accel. |
| 10 | AI Quality Control | ❌ | Tidak ada QC otomatis. |
| 11 | Cost & Analytics | ❌ | Tidak ada pencatatan biaya/usage. |
| 12 | Project & Asset Mgmt | 🟡 kuat | Library karakter/scene/prop, MediaLibrary, export/import drama, contoh drama sudah ada. |
| 13 | UI/UX | 🟡 | Canvas (node-based) + FilmCreate + theme.css. Belum ada dashboard produksi/queue/cost. |
| 14 | Arsitektur | 🟡 | SQLite + migrasi + `ensureColumns` solid. Tidak ada job store persisten, key plaintext. |
| 15 | Testing | 🟡 | `node --test` backend & frontend ada (source-scan, dsb). Belum ada test provider/queue/recovery. |

**Kesimpulan:** fondasi kreatif (karakter, director, storyboard) sudah jauh lebih matang daripada yang diasumsikan plan.md. Celah terbesar justru di **infrastruktur produksi**: job persisten, retry/failover, manajemen key, dan memori cerita lintas episode.

---

## 2. Story Bible & Series Manager

| Item | Status | Bukti / Catatan |
|---|---|---|
| Series/Project manager | ✅ | Tabel `dramas`, route `/dramas` CRUD, `FilmList.vue` |
| Season manager | ❌ | Tidak ada kolom/tabel season. Saran: kolom `season_number` di `episodes` cukup |
| Episode manager, numbering, status | ✅ | `episodes.episode_number`, `episodes.status`, `PUT /dramas/:id/episodes` |
| Bulk episode creation | ✅ | `EpisodeBatchImportDialog.vue` |
| Episode duplication / templates | ❌ | — |
| Episode dependency | ❌ | — |
| Episode regeneration | 🟡 | Bisa regenerate per shot/batch, belum "regenerate seluruh episode" satu tombol |
| Story Bible generation | 🟡 | `POST /generation/story` + `PUT /dramas/:id/outline` (title, summary, genre, style, tags di `metadata`). Belum ada struktur bible (plot, subplot, aturan, timeline) |
| Relasi karakter, backstory | 🟡 | `characters.description/personality` teks bebas; tidak ada graph relasi |
| Previous episode recap | ❌ | Prompt generate episode tidak menyuntikkan ringkasan episode sebelumnya |
| Cliffhanger / future planning | ❌ | — |
| Continuity antar-shot | 🟡 | `storyboards.continuity_snapshot` diekstrak & dipakai shot berikutnya (`imageService.js:1215`). **Hanya dalam satu episode** |
| Continuity antar-episode, contradiction detection | ❌ | — |
| Novel-to-drama | ✅ | `novelImportService.js`, `POST /dramas/import-novel` |
| Script / dialogue / scene & shot breakdown | ✅ | `storyGenerationService.js`, `episodeStoryboardService.js` |
| Script version history | ❌ | `episodes.script_content` ditimpa langsung |
| Custom writing style / multi-language | ✅ | `promptOverrides`, `promptI18n.js`, content-language setting |

## 3. Character Consistency Engine

| Item | Status | Bukti / Catatan |
|---|---|---|
| Character DB, ID, profil, personality | ✅ | Tabel `characters` + `character_libraries` |
| Appearance / facial / hair / eye | 🟡 | `appearance` + `identity_anchors` (JSON, `POST /characters/:id/extract-anchors`) — teks, belum field terstruktur |
| Voice identity | 🟡 | `voice_style`, `seedance2_voice_asset` |
| Portrait + four-view sheet | ✅ | `generate-four-view-image`, `four_view_image_url` |
| Multiple reference images | ✅ | `extra_images`, `ref_image` |
| Expression / multi-pose sheet | ❌ | — |
| Reference versioning | ❌ | Gambar lama ditimpa |
| Identity lock / reference injection | ✅ | Referensi karakter otomatis disuntik ke image & video (`imageClient.js` storyboard ref limits, `applySeedance2CertifiedAssetUrlsToVideoOpts`) |
| Seedance2 certified asset | ✅ | `sd2-certify` routes |
| Face embedding / similarity / mismatch detection | ⏸️ | Butuh model ML lokal (InsightFace, dsb). Tunda |
| Auto-regenerate shot gagal | ❌ | — |
| Outfit library / per-scene outfit | 🟡 | `characters.stages` (JSON) = varian penampilan per tahap cerita. Belum terikat ke scene/storyboard, belum ada riwayat |

## 4. Scene & Environment

| Item | Status | Bukti / Catatan |
|---|---|---|
| Location DB, ID, deskripsi, reuse | ✅ | `scenes`, `scene_libraries`, add-to-library |
| Multi-angle / reference sheet | ✅ | `scenes/:id/generate-four-view-image` |
| Background extraction dari shot | ✅ | `backgroundExtractionService.js` |
| Time-of-day | 🟡 | `scenes.time` teks |
| Lighting / weather sebagai atribut | 🟡 | `storyboards.lighting_style`, `atmosphere` — per shot, bukan per lokasi |
| Scene versioning | ❌ | — |
| Prop DB, generate, assign per shot, library | ✅ | `props`, `storyboard_props`, `propLibraryService.js`, `propExtractionService.js` |
| Prop continuity tracking | 🟡 | Lewat `continuity_snapshot` (dalam episode) |

## 5. AI Director

| Item | Status | Bukti / Catatan |
|---|---|---|
| Scene interpretation / shot breakdown | ✅ | `episodeStoryboardService.js` |
| Shot duration | ✅ | `storyboards.duration`, `universalSegmentDurationNormalize.js` |
| Dialogue-to-shot | ✅ | `dialogue`, `narration`, `split-by-audio` |
| Camera angle / distance | ✅ | `shot_type`, `angle_h/v/s` (`angleService.js`) |
| Camera movement | ✅ | `movement` |
| Lens / DoF / lighting | 🟡 | `depth_of_field`, `lighting_style` ada; focal length & color temp belum |
| Film style presets | ✅ | `StylePickerButton.vue`, `dramas.style` |
| Auto camera prompt | ✅ | `polish-prompt`, `rebuild-video-prompt`, `framePromptService.js` |
| Batch infer params | ✅ | `POST /storyboards/batch-infer-params` |
| First / last frame + linking | ✅ | `first_frame_image_id`, `last_frame_*`, `link-tail-frame` |
| Insert / reorder shot | 🟡 | `insert-before` ada; drag-and-drop belum |
| Shot approval | ❌ | Tidak ada status approved/rejected |
| AI Director agent | 🟡 | Mastra agent `dramaAssistant` (`src/mastra/`) — asisten chat dengan tool, bukan director otomatis |

## 6. Multi-Provider AI Manager

| Item | Status | Bukti / Catatan |
|---|---|---|
| Video: Seedance/Volcengine | ✅ | `callVolcengineOmniVideoApi`, cheap Seedance2 |
| Video: Kling | ✅ | `callKlingVideoApi`, `callKlingOmniVideoApi`, `klingJwt.js` |
| Video: Veo / Gemini | ✅ | `callVeo3VideoApi`, `callGeminiVideoApi` |
| Video: MiniMax | ✅ | `callMinimaxH3VideoApi` |
| Video: Vidu | ✅ | `callViduVideoApi` |
| Video: WAN (DashScope) | ✅ | `callDashScopeVideoApi` |
| Video: Sora, xAI Grok, Jimeng, Agnes | ✅ | ada |
| Video: Runway, LTX | ❌ | — |
| Image: Gemini / Nano Banana, Seedream, Kling, DashScope/Qwen, OpenAI-compatible | ✅ | `imageClient.js` |
| Image: FLUX, SD, ComfyUI | 🟡/❌ | FLUX mungkin via OpenAI-compatible endpoint; ComfyUI belum |
| Custom endpoint / model / protocol | ✅ | `base_url`, `endpoint`, `query_endpoint`, `api_protocol` |
| Provider enable/disable, priority | ✅ | `is_active`, `priority`, `is_default` |
| Model routing per kebutuhan | ✅ | `ai_model_map` + `SceneModelMap.vue` |
| Connection test | ✅ | `POST /ai-configs/test` |
| **Adapter interface modular** | ❌ | Semua provider di 1 file per media; dispatch via `if/else` |
| **Multiple keys per provider / rotasi / round-robin** | ❌ | 1 `api_key` per config (bisa buat beberapa config, tapi tidak dirotasi) |
| **Encryption key** | ❌ | `ai_service_configs.api_key` plaintext |
| Quota / rate-limit detection, key health | ❌ | — |
| **Retry + exponential backoff (429/5xx)** | ❌ | Satu-satunya retry: `retryTextAfterMaxTokensError` di `aiClient.js` |
| **Failover ke provider lain** | ❌ | — |
| Timeout | 🟡 | `video_generation_timeout_minutes` global |
| Failed request logging | 🟡 | `error_msg` di `image_generations` / `video_generations`, log file |

## 7. Batch Production Engine

| Item | Status | Bukti / Catatan |
|---|---|---|
| Task table | 🟡 | `async_tasks` (status, progress, result) — tapi eksekusi via `setImmediate` in-process |
| Image / video batch per episode | ✅ | `POST /images/episode/:id/batch`, `/videos/episode/:id/batch`, `/characters/batch-generate-images`, `/audio/extract/batch` |
| Multi-episode batch | ❌ | — |
| Pipeline end-to-end | 🟡 | `useCanvasWorkflowRunner.js` — **berjalan di browser**; tutup tab = pipeline berhenti |
| Concurrency | 🟡 | `pipeline_concurrency`, `pipeline_video_concurrency` global (1–20). Belum per-provider |
| Cancel | ✅ | `POST /tasks/:id/cancel` (hanya menandai, tidak membatalkan panggilan AI) |
| Pause / resume / priority / dependency | ❌ | — |
| **Recovery setelah restart** | ❌ | `failOrphanedAsyncTasksOnStartup` justru menandai semua task gagal |
| Resume polling video | 🟡 | `POST /videos/:id/resume-poll` — manual, per video |
| Skip shot yang sudah sukses | 🟡 | Tergantung pemanggil di frontend |
| Idempotency / duplicate prevention | ❌ | — |
| Distributed workers | ⏸️ | Tidak relevan untuk desktop |
| Production dashboard / ETA | ❌ | `PipelinePanel.vue` + `CanvasNodeStatusOverlay.vue` = status per node, bukan dashboard |

## 8. Voice & Audio

| Item | Status | Bukti / Catatan |
|---|---|---|
| TTS multi-provider | 🟡 | `ttsService.js`: MiniMax + OpenAI-compatible |
| Bahasa ID / ZH / EN | 🟡 | Tergantung voice provider; belum diverifikasi untuk ID |
| Voice per karakter | 🟡 | `voice_style`; Seedance2 voice asset |
| Speed / pitch / emotion | 🟡 | `storyboards.emotion`, `emotion_intensity` ada; mapping ke TTS perlu dicek |
| Voice library / cloning | ❌ | — |
| Narasi + SRT | ✅ | `narrationVideoPostProcess.js`, `mergedEpisodePostProcess.js` |
| BGM / SFX / ambient / mixing / normalisasi | ❌ | — |
| Lip sync | ⏸️ | Sebagian provider video (Seedance2, Veo3) sudah menghasilkan audio/lip sync bawaan. Adapter khusus ditunda |

## 9. Video Editor & Rendering

| Item | Status | Bukti / Catatan |
|---|---|---|
| FFmpeg merge | ✅ | `videoMergeService.js`, `POST /video-merges` |
| Subtitle burn-in | ✅ | `subtitles=` filter di `mergedEpisodePostProcess.js` |
| Transition | 🟡 | Ada referensi, terbatas |
| Download episode | ✅ | `GET /episodes/:id/download`, `finalize` |
| Timeline editor multi-track | ⏸️ | Sangat mahal; ekspor ke CapCut/Premiere lebih realistis |
| Resolution / fps / bitrate / H.265 / HW accel | ❌ | `crf` hardcoded |
| Render queue / batch render / recovery | ❌ | — |
| Subtitle file terpisah (.srt) | 🟡 | SRT dibuat secara internal; perlu endpoint ekspor |
| Intro / outro, BGM mixing | ❌ | — |

## 10. AI Quality Control — ❌ seluruhnya

Rekomendasi bertahap: mulai dari pengecekan murah berbasis FFmpeg/ffprobe (durasi, resolusi, stream audio ada, black frame `blackdetect`, freeze `freezedetect`, silence `silencedetect`). Face/outfit mismatch ⏸️.

## 11. Cost & Analytics — ❌ seluruhnya

Belum ada tabel usage. Rekomendasi: kolom `cost_estimate`, `duration_ms`, `attempt` di `image_generations` / `video_generations` + tabel tarif per model yang bisa diedit user. Itu sudah cukup untuk cost per shot/episode/drama.

Storage: `storageLayout.js` mengatur folder; tidak ada dashboard atau cleanup otomatis.

## 12. Project & Asset Management

| Item | Status |
|---|---|
| Library karakter / scene / prop + dedup | ✅ (`libraryDedup.js`) |
| Asset library / media library | ✅ (`assets`, `MediaLibrary.vue`) |
| Export / import project | ✅ (`dramaExportService.js`, `dramaImportService.js`) |
| Material hub (Jimeng) | ✅ |
| Asset search / tag | 🟡 (`tags`, `category`) |
| Voice library | ❌ |
| Project duplication / template | ❌ (bisa via export + import) |
| Asset versioning | ❌ |

## 13. UI/UX

| Item | Status |
|---|---|
| Canvas node-based workspace | ✅ `DramaCanvas.vue` |
| Film create (form-based) | ✅ `FilmCreate.vue` |
| Theme | 🟡 `styles/theme.css` (perlu cek dark mode penuh) |
| Agent drawer | ✅ `AgentDrawer.vue` |
| Story Bible panel, queue dashboard, cost dashboard, provider health | ❌ |

## 14. Arsitektur Teknis

| Item | Status | Catatan |
|---|---|---|
| Migrasi DB | ✅ | SQL berurutan + `ensureColumns` saat startup |
| Struktur service | 🟡 | Rapi per domain, tapi beberapa file raksasa (`videoClient.js`, `imageClient.js`, `episodeStoryboardService.js`, `imageService.js`) |
| Persistent job orchestration | ❌ | Inti masalah |
| Structured logging | 🟡 | `logger.js` dengan objek konteks |
| Error standardization | ✅ | `response.js`, `src/i18n/errors.js` |
| PostgreSQL / Redis / BullMQ / MinIO | ⏸️ | Overkill untuk desktop; SQLite + worker loop sendiri cukup |
| Key encryption | ❌ | Bisa pakai Electron `safeStorage` (desktop) atau AES dengan key lokal |

## 15. Testing

- ✅ `backend-node/test/*.test.js`, `frontweb/test/*.test.js` (node --test), termasuk `source-scan.test.js`
- ❌ Test adapter provider (dengan HTTP mock), retry/rate-limit, recovery job, migrasi, render

---

## Rekomendasi Urutan Kerja (berdasarkan gap nyata)

### Fase A — Production Reliability (paling berdampak)

1. **Job queue persisten di SQLite**: tabel `jobs` (type, payload, status, attempt, max_attempts, next_run_at, provider_task_id, idempotency_key, parent_id). Worker loop di backend, bukan di browser.
2. **Recovery saat startup**: ganti `failOrphanedAsyncTasksOnStartup` dengan re-queue. Untuk video yang sudah punya `task_id` di provider, lanjutkan polling otomatis (generalisasi `resumePollForVideoGeneration`).
3. **Retry + backoff + klasifikasi error** (400/401/403 = jangan retry; 429/5xx/timeout = retry).
4. **Pindahkan orkestrasi pipeline** dari `useCanvasWorkflowRunner.js` ke backend (endpoint "jalankan pipeline episode X"), frontend hanya memantau.
5. **Enkripsi API key** + dukungan multi-key per config dengan rotasi sederhana.

### Fase B — Long Drama Memory

1. Tabel `story_bible` per drama (premise, plot utama, subplot, aturan dunia, relasi karakter dalam JSON).
2. Ringkasan episode otomatis (`episodes.summary`) yang disuntikkan ke generate episode berikutnya.
3. Perluas `continuity_snapshot` → state akhir episode, dibawa ke shot pertama episode berikutnya.
4. Outfit: bind `characters.stages` ke episode/scene.

### Fase C — Batch & Visibility

1. Batch multi-episode di atas job queue.
2. Dashboard antrian (progress, gagal, retry manual).
3. Usage & cost logging minimal.
4. QC murah berbasis ffprobe/FFmpeg filters.

### Fase D — Refactor Provider (bisa paralel / bertahap)

1. Ekstrak `videoClient.js` jadi `providers/video/<nama>.js` dengan interface `{ submit, poll, capabilities }`. Lakukan bertahap, satu provider per PR, dengan test.
2. Baru setelah itu tambah Runway / LTX / ComfyUI.

### Ditunda

Face embedding & similarity, timeline editor, lip sync adapter, distributed workers, PostgreSQL/Redis/MinIO.
