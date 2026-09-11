// Keep the Expo base path identical on Vercel, GitHub Pages, and local previews.
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { expo } = JSON.parse(await readFile(join(root, 'app.json'), 'utf8'));
const base = expo.experiments?.baseUrl;
if (base !== '/entreno') {
  throw new Error('Update vercel.json routing before changing the Expo base URL.');
}
const output = join(root, 'dist-vercel');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(join(root, 'dist'), join(output, base.slice(1)), { recursive: true });
console.log('Prepared Vercel output under /entreno/.');
