// Generate every PWA icon from the animation-ready AbenzaGym vector source.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/icons');
const mark = await readFile(join(root, 'public/brand/abenzagym-mark.svg'), 'utf8');
const paths = mark
  .slice(mark.indexOf('<g'), mark.lastIndexOf('</svg>'))
  .replaceAll('#244CE8', '#FFFFFF');
function icon(scale) {
  const offset = 60 * (1 - scale);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 120 120"><rect width="120" height="120" fill="#244CE8"/><g transform="translate(${offset} ${offset}) scale(${scale})">${paths}</g></svg>`;
}
await mkdir(out, { recursive: true });
for (const [file, size, scale] of [
  ['icon-192.png', 192, 0.82],
  ['icon-512.png', 512, 0.82],
  ['apple-touch-icon.png', 180, 0.82],
  ['maskable-512.png', 512, 0.65],
]) {
  await sharp(Buffer.from(icon(scale)))
    .resize(size, size)
    .png()
    .toFile(join(out, file));
}
await writeFile(join(out, 'icon.svg'), icon(0.82));
await sharp(Buffer.from(icon(0.82)))
  .resize(512, 512)
  .png()
  .toFile(join(root, 'assets/images/icon.png'));
await sharp(Buffer.from(icon(0.82)))
  .resize(48, 48)
  .png()
  .toFile(join(root, 'assets/images/favicon.png'));
console.log('Generated AbenzaGym app icons.');
