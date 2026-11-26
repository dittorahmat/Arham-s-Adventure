# ADR-0001: Arsitektur Multiplayer Real-Time dengan Hono, Cloudflare Durable Objects, D1, dan R2

- **Status**: Accepted
- **Date**: 2026-11-26

## Context

**Arham's Adventure** saat ini adalah game edukasi *obstacle-course race* 3D berbasis client-side (React 19, Three.js, Vite) dengan 5 AI classmates dan penyimpanan lokal (`localStorage`). Untuk mengubahnya menjadi game multiplayer real-time tanpa mengorbankan kesederhanaan akses bagi siswa SD (Kelas 1–6), dibutuhkan backend yang mendukung koneksi WebSocket berlatensi rendah, penyimpanan data relasional, dan penyimpanan objek/replay.

## Decision

1. **Backend Framework & Runtime**: Menggunakan **Hono** di atas **Cloudflare Workers** untuk API HTTP, routing, dan manajemen autentikasi *Guest-first* (Nickname + Session Token anonim).
2. **Real-Time Room Server**: Menggunakan **Cloudflare Durable Objects (WebSockets)** di mana 1 Durable Object merepresentasikan 1 **Room** (maksimal 6 slot; slot kosong diisi **AI Classmate**). Mendukung **Private Room** (via Kode Room) dan **Quick Play** publik.
3. **Database Relasional**: Menggunakan **Cloudflare D1** untuk menyimpan profil *Guest*, leaderboard global, dan riwayat **Match**.
4. **Object Storage**: Menggunakan **Cloudflare R2** untuk menyimpan data **Replay** dalam bentuk blob/JSON.
5. **Mekanik Kuis**: **Checkpoint Quiz** berjalan secara individual per **Player** agar tempo balapan tetap cepat.

## Consequences

- **Positif**: Latensi rendah di edge Cloudflare, skalabilitas per-room yang terisolasi via Durable Objects, serta biaya operasional yang efisien (serverless).
- **Negatif / Trade-off**: Membutuhkan pemisahan logic simulasi dari `ThreeEngine.ts` agar state penting (posisi, tabrakan rintangan, hasil kuis, urutan finis) dapat disinkronkan dan divalidasi oleh Durable Object.
