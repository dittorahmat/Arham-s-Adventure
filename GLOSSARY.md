# Glossary — Arham's Adventure

Istilah domain utama yang digunakan di seluruh kodebase dan dokumentasi **Arham's Adventure**.

## Room
Sesi lobi dan pertandingan multiplayer yang dikelola oleh satu instance **Cloudflare Durable Object** dan diidentifikasi oleh kode room unik (untuk Private Room) atau antrean **Quick Play**. Maksimal menampung 6 peserta.

## Match
Satu ronde balapan dari hitung mundur mulai hingga seluruh peserta finis atau waktu habis.

## Player
Peserta manusia yang terhubung ke **Room** melalui WebSocket menggunakan identitas **Guest** (Nickname + Session Token anonim).

## Host
**Player** yang membuat **Room** dan berwenang menentukan **Game Mode**, **Difficulty**, serta opsi penguncian **Grade** sebelum **Match** dimulai.

## AI Classmate
Peserta bot yang otomatis mengisi slot kosong di dalam **Room** agar setiap **Match** selalu memiliki 6 peserta.

## Checkpoint Quiz
Pertanyaan kuis SD (Kelas 1–6) yang muncul secara individual ketika **Player** melewati titik trigger tertentu di lintasan; jawaban benar memberikan *speed boost*, sedangkan jawaban salah memberikan penalti singkat.

## Replay
Rekaman data pergerakan dan event selama satu **Match** yang dapat disimpan ke **R2** dan diputar ulang di client.
