# Arham's Adventure

**Arham's Adventure** adalah game balap halang rintang 3D bergaya *Stumble Guys* berbasis **Three.js + React + TypeScript** yang dirancang untuk siswa **Kelas 5 SD** di Indonesia. Pemain berperan sebagai **Arham** yang berlomba bersama 5 teman kelas AI melewati rintangan seru sambil menjawab soal pelajaran **Matematika, IPA, IPS & PPKn, dan Bahasa Indonesia**.

---

## Fitur Utama

### 1. Enam Pilihan Mode Balapan (Default: Mode Acak!)
- **Mode Acak (`random` — Default)**: Memilih salah satu dari 5 arena secara otomatis setiap kali mulai/mengulang lomba (dan menghindari pengulangan langsung) sehingga setiap ronde selalu terasa segar dan penuh kejutan.
- **Balap Klasik (`classic`)**: Lintasan halang rintang lengkap dengan *Eraser Bumper* memantul, *Pencil Sweeper* berputar, jembatan penggaris kayu bergerak, *speed pad*, bintang emas, dan **5 Gerbang Kuis**.
- **Lantai Jebakan / Tile Fall (`tile_fall`)**: Mode ala *Stumble Guys Tile Fall / Tip Toe* dengan **120 ubin melayang** (3 arena grid: 6×5, 8×5, dan 10×5) yang dipisahkan oleh **3 Gerbang Cekpoin Kuis**. Ubin aman menyala **hijau**, ubin palsu bergetar merah lalu jatuh.
- **Seluncur Es (`ice_slide`)**: Terinspirasi *Icy Heights / Super Slide* — trek es kristal berfriksi super rendah sehingga Arham meluncur dan *drift* licin melewati bumper es, jembatan gletser bergerak, *speed pad*, dan **4 Gerbang Kuis**.
- **Lari Laser (`laser_dash`)**: Terinspirasi *Laser Dash / Block Dash* — arena neon gelap dengan **9 sinar laser menyapu** yang harus dilompati tepat waktu (disertai AI yang melompati laser, efek percikan listrik, dan **4 Gerbang Kuis**).
- **Jatuh Madu (`honey_drop`)**: Terinspirasi *Honey Drop / Hex-A-Gone* — **3 arena heksagon sarang madu emas** yang setiap ubinnya mulai bergetar oranye → merah dan **runtuh 0,48 detik setelah diinjak** oleh pemain maupun bot, dipisahkan oleh **3 Gerbang Cekpoin Kuis**.

### 2. Edukasi Kelas 5 SD & Review Materi
- Filter mata pelajaran di layar awal: **Semua Mapel**, **Matematika**, **IPA**, **IPS & PPKn**, atau **Bahasa Indonesia**.
- Papan tulis kuis interaktif di bagian atas layar menampilkan soal saat mendekati gerbang; tabrak pintu **A**, **B**, atau **C** sesuai jawaban benar.
- Ringkasan pembahasan soal tampil di layar akhir (*Game Over / Victory*) sebagai bahan belajar.

### 3. Visual 3D, Partikel & Audio 100% Prosedural
- Seluruh model karakter, rintangan, tekstur kanvas, dan efek suara dibuat secara prosedural di kode (tanpa aset eksternal).
- **Sistem Partikel 3D (`InstancedMesh`)**: Pita konfeti berkibar, serpihan kilau (*spark shards*), puing memantul, dan cincin gelombang kejut 3D (*shockwave rings*) saat menembus gerbang kuis maupun saat terbentur rintangan.
- **Musik Latar Dinamis (Web Audio API)**: Musik latar *looping* yang tempo (BPM) dan intensitas perkusinya meningkat otomatis saat sisa waktu lomba semakin menipis.
- **Animasi Sprite Karakter**: Ekspresi Arham di layar awal dan HUD bereaksi secara dinamis (*idle*, *run*, *celebrate*, *bonk*) menggunakan animasi frame CSS.

### 4. Progres & Replayability (`localStorage`)
- **Lencana Pencapaian (*Achievements*)**: Melacak tonggak seperti *10 Benar Beruntun*, *Lap Tercepat*, *Juara 1*, *Sempurna Kuis*, dan *Kolektor Bintang*.
- **Top Skor**: Menyimpan dan menampilkan **5 catatan waktu lap tercepat**.
- **Misi Harian (*Daily Challenges*)**: 3 tantangan harian (termasuk *Jawab 5 Soal Benar*) dengan poin bonus yang otomatis reset setiap hari.

### 5. Dukungan Desktop & Mobile
- **Desktop**: `WASD` / tombol Panah untuk bergerak, `Spasi` untuk Lompat (*coyote time* & *jump buffer*), `Shift` / `E` / `K` untuk Terjang (*Dive*), `M` Mute, `R` Ulangi, `Esc` / `P` Jeda.
- **HP / Tablet**: Kontrol sentuh bergaya *Stumble Guys* tampil otomatis (dapat dinyalakan/dimatikan lewat tombol ikon *gamepad* di pojok kanan atas), dilengkapi stik analog virtual 360°, mode **Auto Lari**, tombol **LOMPAT** & **TERJANG** dengan cincin *cooldown*, serta umpan balik getar `navigator.vibrate()`.

---

## Teknologi

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **3D Engine**: Three.js (`WebGLRenderer`, `RoomEnvironment`, `InstancedMesh`, procedural `CanvasTexture`)
- **Audio**: Web Audio API procedural synthesizer & dynamic tempo sequencer
- **Build & Tooling**: Vite 8, `tsx`, Node.js built-in test runner (`node:test`)

---

## Menjalankan Proyek

### Prasyarat
- Node.js 20+

### Instalasi & Pengembangan
```bash
npm install
npm run dev
```
Aplikasi berjalan di `http://localhost:3000`.

### Parameter URL Berguna
- `http://localhost:3000/?autostart=1` — Langsung bermain di mode default (**Mode Acak**).
- `http://localhost:3000/?mode=classic&autostart=1` — Langsung bermain di mode **Balap Klasik**.
- `http://localhost:3000/?mode=tile_fall&autostart=1` — Langsung bermain di mode **Lantai Jebakan (Tile Fall)**.
- `http://localhost:3000/?mode=ice_slide&autostart=1` — Langsung bermain di mode **Seluncur Es**.
- `http://localhost:3000/?mode=laser_dash&autostart=1` — Langsung bermain di mode **Lari Laser**.
- `http://localhost:3000/?mode=honey_drop&autostart=1` — Langsung bermain di mode **Jatuh Madu**.
- `http://localhost:3000/?preview_gameover=1` — Pratinjau modal hasil akhir & lencana pencapaian.

### Build, Type-Check & Unit Test
```bash
# Type-check TypeScript
npm run lint

# Build produksi
npm run build

# Jalankan seluruh unit test
npx --yes tsx --test src/game/*.test.ts
```

---

## Struktur Proyek

```text
src/
├── App.tsx                       # Root shell, lifecycle canvas WebGL & state utama
├── main.tsx                      # Entry point React
├── index.css                     # Tailwind CSS v4 & keyframes animasi sprite
├── components/                   # Komponen UI / HUD / Modal (React murni)
│   ├── TitleOverlay.tsx          # Layar awal, pemilih mode & mata pelajaran
│   ├── PlayingHud.tsx            # HUD balapan, papan kuis & utilitas pojok kanan
│   ├── TouchControls.tsx         # Stik analog virtual, Auto Lari, Lompat & Terjang
│   ├── StatusModals.tsx          # Modal Jeda, Menang, Waktu Habis & review kuis
│   ├── AchievementBadges.tsx     # Tampilan kartu lencana pencapaian
│   ├── TopScoresModal.tsx        # Papan peringkat 5 lap tercepat
│   ├── DailyChallengesModal.tsx  # Daftar misi harian & progres poin bonus
│   └── ArhamSprite.tsx           # Sprite karakter reaktif berbasis CSS steps()
└── game/                         # Engine 3D, fisika, audio & logika terpisah
    ├── ThreeEngine.ts            # Scene Three.js, kamera, render loop & sinkronisasi
    ├── models.ts                 # Generator mesh 3D karakter, rintangan & gerbang
    ├── textures.ts               # Generator tekstur CanvasTexture prosedural
    ├── particles.ts              # Renderer partikel & shockwave InstancedMesh
    ├── particlePresets.ts        # Resep & kinematika partikel murni (+ .test.ts)
    ├── courseData.ts             # Layout lintasan 5 mode (Klasik, Tile Fall, Es, Laser, Madu)
    ├── gameModes.ts              # Katalog mode, resolver Mode Acak, laser & hex grid (+ .test.ts)
    ├── tileFall.ts               # Generator grid Tile Fall, state ubin & AI (+ .test.ts)
    ├── physics.ts                # Fisika pembalap, kolisi & AI (+ .test.ts)
    ├── questions.ts              # Bank soal Kelas 5 SD (+ .test.ts)
    ├── audio.ts                  # Synthesizer Web Audio SFX & sequencer musik
    ├── musicTempo.ts             # Kalkulasi tempo/BPM dinamis musik (+ .test.ts)
    ├── achievements.ts           # Logika lencana pencapaian (+ .test.ts)
    ├── leaderboard.ts            # Penyimpanan Top 5 skor tercepat (+ .test.ts)
    ├── dailyChallenges.ts        # Generator & tracker misi harian (+ .test.ts)
    ├── touchControls.ts          # Matematika joystick & haptic vibrate (+ .test.ts)
    ├── spriteMood.ts             # Pemetaan mood sprite HUD (+ .test.ts)
    └── types.ts                  # Definisi tipe TypeScript bersama
```
