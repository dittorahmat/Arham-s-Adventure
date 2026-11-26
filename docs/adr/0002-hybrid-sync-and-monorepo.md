# ADR-0002: Sinkronisasi Simulasi Hybrid dan Struktur Monorepo

- **Status**: Accepted
- **Date**: 2026-11-26

## Context

Menjalankan fisika 3D penuh di server (Durable Object) untuk banyak room secara bersamaan akan membebani CPU Worker dan meningkatkan latensi input pemain. Sebaliknya, mempercayai client sepenuhnya rentan terhadap desinkronisasi rintangan (terutama `tile_fall`) dan manipulasi skor.

## Decision

1. **Hybrid Deterministic Sync**:
   - Posisi rintangan bergerak dihitung secara deterministik di client dan server menggunakan `matchStartTime` dan `seed` yang sama.
   - Client menjalankan *client-side prediction* untuk karakter sendiri (60fps) dan *interpolation* untuk peserta lain.
   - Client mengirim update posisi/input ke Durable Object (~20Hz); server memvalidasi batas kecepatan, urutan finis, hasil **Checkpoint Quiz**, serta memegang *shared state* untuk rintangan dinamis seperti `tile_fall`.
2. **Pengaturan Room**: **Host** menentukan `GameMode` dan `Difficulty`, sedangkan **Grade** (Kelas 1–6) dipilih masing-masing **Player** (dengan opsi lock oleh **Host**).
3. **Monorepo**: Backend **Hono** (`worker/`) diletakkan di dalam repository yang sama agar dapat langsung meng-import pure logic dari `src/game/` (`types.ts`, `physics.ts`, `tileFall.ts`, `questions.ts`, `courseData.ts`).

## Consequences

- **Positif**: Tidak ada duplikasi logic fisika/kuis antara client dan server; performa 60fps di client tetap terjaga; hemat biaya CPU Durable Objects.
- **Negatif / Trade-off**: `ThreeEngine.ts` harus direfactor agar menerima state eksternal (remote players & shared tile state) dan tidak lagi menganggap pemain lokal sebagai satu-satunya sumber kebenaran.
