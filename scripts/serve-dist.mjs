/**
 * Sirve `dist/` en local bajo la misma ruta base que GitHub Pages, para poder
 * comprobar la build antes de publicarla.
 *
 *   npm run serve:web    →    http://localhost:4173/entreno/
 */
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 4173);

const { expo } = JSON.parse(await readFile(join(ROOT, 'app.json'), 'utf8'));
const base = (expo.experiments?.baseUrl ?? '').replace(/\/$/, '');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

async function resolve(pathname) {
  if (!pathname.startsWith(`${base}/`) && pathname !== base) return null;

  const rest = pathname.slice(base.length) || '/';
  // normalize() corta los "..": nadie sale de dist.
  const candidate = join(DIST, normalize(rest));
  if (!candidate.startsWith(DIST)) return null;

  try {
    const info = await stat(candidate);
    if (info.isFile()) return candidate;
    const index = join(candidate, 'index.html');
    return (await stat(index)).isFile() ? index : null;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/') {
    res.writeHead(302, { Location: `${base}/` });
    res.end();
    return;
  }

  // Igual que en GitHub Pages: lo que no existe cae en el shell de la app.
  const file = (await resolve(pathname)) ?? (await resolve(`${base}/index.html`));

  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
    return;
  }

  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`Sirviendo dist/ en http://localhost:${PORT}${base}/`);
});
