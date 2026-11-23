import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createTrackTileTexture(
  primaryColor: string,
  secondaryColor: string,
  maxAniso: number,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, 512, 512);

  // Playful checkered toy-course squares
  const cell = 128;
  ctx.fillStyle = secondaryColor;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if ((row + col) % 2 === 0) {
        ctx.fillRect(col * cell, row * cell, cell, cell);
      }
    }
  }

  // Subtle school-notebook grid hairlines for crisp depth perception
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Center lane chevrons
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(246, 0, 20, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createSurfaceBumpTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  // Subtle rubberized tactile speckle
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 4) {
      const v = 115 + ((x * 37 + y * 17) % 26);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }
  ctx.strokeStyle = '#606060';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 252);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createRulerTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  // Warm maple ruler wood
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle wood stripes
  ctx.fillStyle = 'rgba(217, 119, 6, 0.18)';
  for (let i = 0; i < 512; i += 24) {
    ctx.fillRect(0, i, 512, 10);
  }

  // Crisp edge trim
  ctx.fillStyle = '#92400e';
  ctx.fillRect(0, 0, 18, 512);
  ctx.fillRect(494, 0, 18, 512);

  // Ruler tick markings on both sides
  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 34px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 16; i++) {
    const y = i * 32;
    const isMajor = i % 4 === 0;
    const tickLen = isMajor ? 74 : 42;
    ctx.fillRect(18, y, tickLen, isMajor ? 7 : 4);
    ctx.fillRect(494 - tickLen, y, tickLen, isMajor ? 7 : 4);
    if (isMajor && i > 0 && i < 16) {
      ctx.fillText(`${i * 5}`, 126, y + 12);
      ctx.fillText(`${i * 5}`, 386, y + 12);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createSpeedPadTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 256);

  // Bright emerald/cyan boost chevrons pointing forward (-Z = up on texture)
  for (let i = 0; i < 3; i++) {
    const y = 46 + i * 74;
    ctx.strokeStyle = i === 0 ? '#fde047' : '#22d3ee';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(42, y + 42);
    ctx.lineTo(128, y);
    ctx.lineTo(214, y + 42);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createQuizDoorTexture(
  letter: 'A' | 'B' | 'C',
  optionText: string,
  state: 'normal' | 'wrong',
  maxAniso: number,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);

  // Door wood/panel background
  const bg = state === 'wrong' ? '#991b1b' : '#fffbeb';
  const border = state === 'wrong' ? '#ef4444' : '#1e293b';
  const badgeBg =
    state === 'wrong'
      ? '#ef4444'
      : letter === 'A'
        ? '#2563eb'
        : letter === 'B'
          ? '#16a34a'
          : '#ea580c';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  // Thick comic-crisp frame
  ctx.strokeStyle = border;
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, 490, 490);

  // Inner subtle inset panel
  ctx.strokeStyle = state === 'wrong' ? 'rgba(255,255,255,0.25)' : '#fde68a';
  ctx.lineWidth = 10;
  ctx.strokeRect(32, 32, 448, 448);

  // Top Letter Emblem (A / B / C)
  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  ctx.arc(256, 128, 76, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 94px Fredoka, Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 256, 132);

  // Wrap answer text cleanly with bold, high-contrast sizing readable from 25m away
  ctx.fillStyle = state === 'wrong' ? '#fecaca' : '#0f172a';
  const words = optionText.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (test.length > 11 && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const longest = Math.max(...lines.map((l) => l.length));
  const fontSize = longest > 12 ? 54 : longest > 8 ? 66 : 78;
  ctx.font = `800 ${fontSize}px Plus Jakarta Sans, sans-serif`;
  const lineHeight = fontSize * 1.15;
  const startY = 336 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, idx) => {
    ctx.fillText(line, 256, startY + idx * lineHeight);
  });

  if (state === 'wrong') {
    // Crisp diagonal X mark
    ctx.strokeStyle = 'rgba(254, 202, 202, 0.88)';
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(92, 92);
    ctx.lineTo(420, 420);
    ctx.moveTo(420, 92);
    ctx.lineTo(92, 420);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createGateHeaderTexture(
  gateNumber: number,
  subjectLabel: string,
  accentHex: string,
  maxAniso: number,
): THREE.CanvasTexture {
  // Match 15.2 x 2.2 box aspect (~6.9:1) so header text renders crisp with zero horizontal stretching
  const [canvas, ctx] = makeCanvas(1408, 204);

  // Classroom chalkboard green-slate look with wooden border
  ctx.fillStyle = '#14532d';
  ctx.fillRect(0, 0, 1408, 204);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, 1388, 184);

  // Accent ribbon bar
  ctx.fillStyle = accentHex;
  ctx.fillRect(30, 30, 1348, 16);

  ctx.fillStyle = '#fef9c3';
  ctx.font = 'bold 76px Fredoka, Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`GERBANG KUIS ${gateNumber}  ·  ${subjectLabel.toUpperCase()}`, 704, 118);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createFinishBannerTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(1024, 256);
  const sq = 32;
  for (let y = 0; y < 256; y += sq) {
    for (let x = 0; x < 1024; x += sq) {
      ctx.fillStyle = ((x / sq + y / sq) % 2 === 0) ? '#0f172a' : '#ffffff';
      ctx.fillRect(x, y, sq, sq);
    }
  }

  // Center plaque
  ctx.fillStyle = '#facc15';
  ctx.fillRect(212, 52, 600, 152);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 14;
  ctx.strokeRect(212, 52, 600, 152);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 84px Fredoka, Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GARIS FINIS!', 512, 132);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.24)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
