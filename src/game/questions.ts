import { QuizQuestion, SubjectFilter, SubjectKey } from './types';

export const SUBJECT_LABELS: Record<SubjectFilter, string> = {
  semua: 'Semua Mapel',
  matematika: 'Matematika',
  ipa: 'IPA',
  ips: 'IPS & PPKn',
  bahasa: 'B. Indonesia',
};

export const SUBJECT_COLORS: Record<SubjectKey, { bg: string; accent: string; label: string }> = {
  matematika: { bg: '#2563eb', accent: '#60a5fa', label: 'Matematika' },
  ipa: { bg: '#16a34a', accent: '#4ade80', label: 'IPA' },
  ips: { bg: '#d97706', accent: '#fbbf24', label: 'IPS & PPKn' },
  bahasa: { bg: '#db2777', accent: '#f472b6', label: 'B. Indonesia' },
};

/**
 * Kurikulum Kelas 5 SD (Matematika, IPA/IPAS, IPS & PPKn, Bahasa Indonesia).
 * Setiap soal memiliki 3 pilihan jawaban singkat agar mudah dibaca pada gerbang 3D.
 */
export const GRADE_5_QUESTIONS: readonly QuizQuestion[] = [
  // ===================== MATEMATIKA =====================
  {
    id: 'mat-1',
    subject: 'matematika',
    topic: 'Pecahan',
    question: 'Hasil dari 3/4 + 1/2 adalah ...',
    options: ['4/6', '5/4', '3/2'],
    correctIndex: 1,
    explanation: 'Samakan penyebut: 3/4 + 2/4 = 5/4 (atau 1 1/4).',
  },
  {
    id: 'mat-2',
    subject: 'matematika',
    topic: 'Volume Kubus',
    question: 'Volume kubus dengan panjang rusuk 6 cm adalah ...',
    options: ['216 cm³', '144 cm³', '36 cm³'],
    correctIndex: 0,
    explanation: 'Volume kubus = s × s × s = 6 × 6 × 6 = 216 cm³.',
  },
  {
    id: 'mat-3',
    subject: 'matematika',
    topic: 'Kecepatan & Jarak',
    question: 'Sepeda melaju 15 km/jam selama 3 jam. Jarak tempuhnya adalah ...',
    options: ['30 km', '45 km', '60 km'],
    correctIndex: 1,
    explanation: 'Jarak = Kecepatan × Waktu = 15 × 3 = 45 km.',
  },
  {
    id: 'mat-4',
    subject: 'matematika',
    topic: 'Volume Balok',
    question: 'Balok berukuran p = 8 cm, l = 5 cm, t = 4 cm. Volumenya adalah ...',
    options: ['120 cm³', '140 cm³', '160 cm³'],
    correctIndex: 2,
    explanation: 'Volume balok = p × l × t = 8 × 5 × 4 = 160 cm³.',
  },
  {
    id: 'mat-5',
    subject: 'matematika',
    topic: 'Akar Pangkat Tiga',
    question: 'Hasil dari ∛125 (akar pangkat tiga dari 125) adalah ...',
    options: ['5', '15', '25'],
    correctIndex: 0,
    explanation: 'Karena 5 × 5 × 5 = 125, maka ∛125 = 5.',
  },
  {
    id: 'mat-6',
    subject: 'matematika',
    topic: 'Skala Peta',
    question: 'Skala 1 : 200.000. Jika jarak di peta 4 cm, jarak sebenarnya adalah ...',
    options: ['4 km', '8 km', '80 km'],
    correctIndex: 1,
    explanation: '4 × 200.000 cm = 800.000 cm = 8 km.',
  },
  {
    id: 'mat-7',
    subject: 'matematika',
    topic: 'Persen & Desimal',
    question: 'Bentuk persen dari pecahan 3/5 adalah ...',
    options: ['35%', '50%', '60%'],
    correctIndex: 2,
    explanation: '3/5 × 100% = 300% / 5 = 60%.',
  },
  {
    id: 'mat-8',
    subject: 'matematika',
    topic: 'Operasi Hitung',
    question: 'Hasil dari 25 + 15 × 4 adalah ...',
    options: ['85', '160', '100'],
    correctIndex: 0,
    explanation: 'Kerjakan perkalian dulu: 15 × 4 = 60, lalu 25 + 60 = 85.',
  },

  // ===================== IPA / IPAS ALAM =====================
  {
    id: 'ipa-1',
    subject: 'ipa',
    topic: 'Perpindahan Panas',
    question: 'Panas matahari sampai ke bumi merupakan perpindahan kalor secara ...',
    options: ['Konduksi', 'Konveksi', 'Radiasi'],
    correctIndex: 2,
    explanation: 'Radiasi adalah perpindahan panas tanpa zat perantara.',
  },
  {
    id: 'ipa-2',
    subject: 'ipa',
    topic: 'Sistem Pernapasan',
    question: 'Pertukaran oksigen dan karbon dioksida di paru-paru terjadi di ...',
    options: ['Alveolus', 'Trakea', 'Bronkus'],
    correctIndex: 0,
    explanation: 'Alveolus adalah kantung udara kecil tempat pertukaran gas.',
  },
  {
    id: 'ipa-3',
    subject: 'ipa',
    topic: 'Siklus Air',
    question: 'Proses penguapan air laut oleh panas matahari disebut ...',
    options: ['Kondensasi', 'Evaporasi', 'Presipitasi'],
    correctIndex: 1,
    explanation: 'Evaporasi adalah penguapan air menjadi uap air ke atmosfer.',
  },
  {
    id: 'ipa-4',
    subject: 'ipa',
    topic: 'Ekosistem',
    question: 'Dalam rantai makanan, tumbuhan hijau berperan sebagai ...',
    options: ['Produsen', 'Konsumen I', 'Pengurai'],
    correctIndex: 0,
    explanation: 'Tumbuhan membuat makanan sendiri lewat fotosintesis (produsen).',
  },
  {
    id: 'ipa-5',
    subject: 'ipa',
    topic: 'Sistem Pencernaan',
    question: 'Penyerapan sari-sari makanan pada tubuh manusia terjadi di ...',
    options: ['Lambung', 'Usus Halus', 'Usus Besar'],
    correctIndex: 1,
    explanation: 'Usus halus memiliki jonjot usus untuk menyerap sari makanan.',
  },
  {
    id: 'ipa-6',
    subject: 'ipa',
    topic: 'Peredaran Darah',
    question: 'Organ tubuh yang berfungsi memompa darah ke seluruh tubuh adalah ...',
    options: ['Paru-paru', 'Ginjal', 'Jantung'],
    correctIndex: 2,
    explanation: 'Jantung memompa darah kaya oksigen ke seluruh tubuh.',
  },
  {
    id: 'ipa-7',
    subject: 'ipa',
    topic: 'Sifat Cahaya',
    question: 'Pensil di dalam gelas berisi air tampak patah karena cahaya dapat ...',
    options: ['Dibiaskan', 'Dipantulkan', 'Diuraikan'],
    correctIndex: 0,
    explanation: 'Pembiasan terjadi saat cahaya melewati dua medium berbeda kerapatan.',
  },
  {
    id: 'ipa-8',
    subject: 'ipa',
    topic: 'Organ Gerak Hewan',
    question: 'Hewan bertulang belakang seperti ikan, katak, dan burung disebut ...',
    options: ['Avertebrata', 'Vertebrata', 'Herbivora'],
    correctIndex: 1,
    explanation: 'Vertebrata adalah kelompok hewan yang memiliki tulang belakang.',
  },

  // ===================== IPS & PPKN =====================
  {
    id: 'ips-1',
    subject: 'ips',
    topic: 'Letak Geografis',
    question: 'Indonesia diapit dua samudra, yaitu Samudra Hindia dan ...',
    options: ['Atlantik', 'Pasifik', 'Arktik'],
    correctIndex: 1,
    explanation: 'Indonesia terletak di antara Samudra Hindia dan Samudra Pasifik.',
  },
  {
    id: 'ips-2',
    subject: 'ips',
    topic: 'Pancasila',
    question: 'Lambang sila ke-3 Pancasila "Persatuan Indonesia" adalah ...',
    options: ['Pohon Beringin', 'Kepala Banteng', 'Rantai Emas'],
    correctIndex: 0,
    explanation: 'Sila ke-3 Pancasila dilambangkan dengan Pohon Beringin.',
  },
  {
    id: 'ips-3',
    subject: 'ips',
    topic: 'Sejarah Kemerdekaan',
    question: 'Teks Proklamasi Kemerdekaan Indonesia dibacakan pada tanggal ...',
    options: ['1 Juni 1945', '17 Agustus 1945', '10 November 1945'],
    correctIndex: 1,
    explanation: 'Proklamasi dibacakan Soekarno-Hatta pada 17 Agustus 1945.',
  },
  {
    id: 'ips-4',
    subject: 'ips',
    topic: 'Kegiatan Ekonomi',
    question: 'Kegiatan menyalurkan barang dari produsen ke konsumen disebut ...',
    options: ['Produksi', 'Konsumsi', 'Distribusi'],
    correctIndex: 2,
    explanation: 'Distribusi adalah kegiatan menyalurkan hasil produksi ke konsumen.',
  },
  {
    id: 'ips-5',
    subject: 'ips',
    topic: 'Kenampakan Alam',
    question: 'Indonesia disebut negara maritim karena sebagian besar wilayahnya berupa ...',
    options: ['Perairan / Laut', 'Pegunungan', 'Gurun Pasir'],
    correctIndex: 0,
    explanation: 'Negara maritim memiliki wilayah perairan yang sangat luas.',
  },
  {
    id: 'ips-6',
    subject: 'ips',
    topic: 'Pahlawan Nasional',
    question: 'Bapak Pendidikan Nasional Indonesia adalah ...',
    options: ['Jenderal Sudirman', 'Ki Hajar Dewantara', 'R.A. Kartini'],
    correctIndex: 1,
    explanation: 'Ki Hajar Dewantara mendirikan Taman Siswa dengan semboyan Tut Wuri Handayani.',
  },
  {
    id: 'ips-7',
    subject: 'ips',
    topic: 'Pancasila',
    question: 'Musyawarah untuk mufakat merupakan pengamalan Pancasila sila ke- ...',
    options: ['Sila ke-2', 'Sila ke-4', 'Sila ke-5'],
    correctIndex: 1,
    explanation: 'Sila ke-4 menekankan kerakyatan dan permusyawaratan/perwakilan.',
  },

  // ===================== BAHASA INDONESIA =====================
  {
    id: 'bhs-1',
    subject: 'bahasa',
    topic: 'Pantun',
    question: 'Baris ke-1 dan ke-2 dalam sebuah pantun disebut ...',
    options: ['Sampiran', 'Isi', 'Amanat'],
    correctIndex: 0,
    explanation: 'Pantun terdiri atas 4 baris: baris 1-2 sampiran, baris 3-4 isi.',
  },
  {
    id: 'bhs-2',
    subject: 'bahasa',
    topic: 'Sinonim',
    question: 'Sinonim (persamaan kata) dari kata "rajin" adalah ...',
    options: ['Malas', 'Giat', 'Lelah'],
    correctIndex: 1,
    explanation: 'Giat memiliki arti yang sama dengan rajin dan tekun.',
  },
  {
    id: 'bhs-3',
    subject: 'bahasa',
    topic: 'Antonim',
    question: 'Antonim (lawan kata) dari kata "hemat" adalah ...',
    options: ['Boros', 'Cermat', 'Sederhana'],
    correctIndex: 0,
    explanation: 'Lawan kata hemat adalah boros (berlebihan membelanjakan).',
  },
  {
    id: 'bhs-4',
    subject: 'bahasa',
    topic: 'Paragraf',
    question: 'Gagasan utama yang menjadi dasar pengembangan paragraf disebut ...',
    options: ['Kalimat Tanya', 'Ide Pokok', 'Kata Kunci'],
    correctIndex: 1,
    explanation: 'Ide pokok adalah inti permasalahan dalam suatu paragraf.',
  },
  {
    id: 'bhs-5',
    subject: 'bahasa',
    topic: 'Pantun',
    question: 'Pola rima (sajak) yang benar pada pantun adalah ...',
    options: ['a - a - b - b', 'a - b - b - a', 'a - b - a - b'],
    correctIndex: 2,
    explanation: 'Pantun bersajak silang dengan pola rima a-b-a-b.',
  },
  {
    id: 'bhs-6',
    subject: 'bahasa',
    topic: 'Kata Tanya',
    question: 'Kata tanya untuk menanyakan alasan atau sebab suatu peristiwa adalah ...',
    options: ['Mengapa', 'Di mana', 'Kapan'],
    correctIndex: 0,
    explanation: 'Kata tanya "Mengapa" digunakan untuk menanyakan sebab atau alasan.',
  },
  {
    id: 'bhs-7',
    subject: 'bahasa',
    topic: 'Imbuhan',
    question: 'Kata dasar "sapu" jika mendapat awalan me- menjadi ...',
    options: ['Mesapu', 'Menyapu', 'Mengsapu'],
    correctIndex: 1,
    explanation: 'Huruf "s" pada kata dasar luluh saat bertemu awalan me- menjadi menyapu.',
  },
];

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function selectRaceQuestions(
  subject: SubjectFilter,
  count: number,
  seed?: number,
): QuizQuestion[] {
  const rng = seed !== undefined ? createSeededRng(seed) : Math.random;
  const shuffle = <T,>(items: readonly T[]): T[] => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  if (subject !== 'semua') {
    const filtered = shuffle(GRADE_5_QUESTIONS.filter((q) => q.subject === subject));
    const chosen: QuizQuestion[] = [];
    for (let i = 0; i < count; i++) {
      chosen.push(filtered[i % filtered.length]);
    }
    return chosen;
  }

  // Balanced mix across all 4 Grade 5 SD subjects when "semua" is selected
  const subjects: SubjectKey[] = shuffle(['matematika', 'ipa', 'ips', 'bahasa']);
  const pools: Record<SubjectKey, QuizQuestion[]> = {
    matematika: shuffle(GRADE_5_QUESTIONS.filter((q) => q.subject === 'matematika')),
    ipa: shuffle(GRADE_5_QUESTIONS.filter((q) => q.subject === 'ipa')),
    ips: shuffle(GRADE_5_QUESTIONS.filter((q) => q.subject === 'ips')),
    bahasa: shuffle(GRADE_5_QUESTIONS.filter((q) => q.subject === 'bahasa')),
  };

  const result: QuizQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const subj = subjects[i % subjects.length];
    const pool = pools[subj];
    const idx = Math.floor(i / subjects.length) % pool.length;
    result.push(pool[idx]);
  }
  return result;
}
