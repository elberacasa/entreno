/**
 * Genera los iconos PNG de la PWA a partir de un SVG.
 *
 *   node scripts/make-icons.mjs
 *
 * Solo hay que volver a ejecutarlo si cambia el dibujo o los colores.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'icons');

const BG = '#0C0F13';
const FG = '#FF6B35';

/**
 * Una mancuerna centrada. `scale` encoge el dibujo dejando margen: los iconos
 * "maskable" de Android se recortan en círculo y hay que respetar esa zona.
 */
function svg(scale = 1) {
  const shapes = [
    // barra, discos y topes (todo centrado en y = 256)
    [100, 224, 312, 64, 20],
    [68, 156, 64, 200, 26],
    [380, 156, 64, 200, 26],
    [20, 206, 36, 100, 18],
    [456, 206, 36, 100, 18],
  ];

  const body = shapes
    .map(([x, y, w, h, r]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`)
    .join('');

  const offset = (512 * (1 - scale)) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  <g fill="${FG}" transform="translate(${offset} ${offset}) scale(${scale})">${body}</g>
</svg>`;
}

const targets = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  { file: 'apple-touch-icon.png', size: 180, scale: 1 },
  { file: 'maskable-512.png', size: 512, scale: 0.62 },
];

await mkdir(OUT, { recursive: true });

for (const { file, size, scale } of targets) {
  const png = await sharp(Buffer.from(svg(scale))).resize(size, size).png().toBuffer();
  await writeFile(join(OUT, file), png);
  console.log(`${file} (${size}x${size})`);
}

// El SVG también sirve como favicon vectorial en escritorio.
await writeFile(join(OUT, 'icon.svg'), svg());
console.log('icon.svg');
