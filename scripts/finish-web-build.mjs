/**
 * Convierte el `dist/` que genera `expo export --platform web` en una PWA
 * instalable. Expo, en modo SPA, escribe un index.html mínimo: aquí le metemos
 * el manifest, los iconos de iOS y el registro del service worker.
 *
 * La ruta base sale de `expo.experiments.baseUrl` en app.json, así que no hay
 * que repetirla en ningún otro sitio.
 */
import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const { expo } = JSON.parse(await readFile(join(ROOT, 'app.json'), 'utf8'));
const base = (expo.experiments?.baseUrl ?? '').replace(/\/$/, '');
const name = expo.name;
const theme = '#0C0F13';
const description = 'Planifica tus entrenamientos y sigue tu progreso.';

const manifest = {
  name,
  short_name: name,
  description,
  lang: 'es',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: theme,
  theme_color: theme,
  icons: [
    { src: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
    {
      src: `${base}/icons/maskable-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

await writeFile(join(DIST, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const head = `
    <meta name="description" content="${description}" />
    <link rel="manifest" href="${base}/manifest.json" />
    <meta name="theme-color" content="${theme}" />

    <!-- iOS ignora el manifest para esto: necesita sus propias etiquetas. -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="${name}" />
    <link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png" />
    <link rel="icon" type="image/png" href="${base}/icons/icon-192.png" />

    <style id="pwa-reset">
      html, body, #root { background-color: ${theme}; }
      @media (prefers-color-scheme: light) {
        html, body, #root { background-color: #F4F6F8; }
      }
      body {
        /* Ni rebote elástico ni zoom accidental con dos dedos. */
        overscroll-behavior: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
      /* Por debajo de 16px iOS hace zoom al enfocar un campo. */
      input, textarea, select { font-size: 16px; }
    </style>

    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker
            .register('${base}/sw.js', { scope: '${base}/' })
            .catch(function () { /* sin service worker la app sigue yendo online */ });
        });
      }
    </script>
`;

let html = await readFile(join(DIST, 'index.html'), 'utf8');

html = html
  .replace('<html lang="en">', '<html lang="es">')
  // `viewport-fit=cover` deja pintar bajo la isla dinámica y la barra inferior.
  .replace(
    /<meta name="viewport"[^>]*>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
  )
  .replace('</head>', `${head}  </head>`);

await writeFile(join(DIST, 'index.html'), html);

// Sin `.nojekyll`, GitHub Pages ignora las carpetas que empiezan por "_"
// y Expo publica todo el bundle dentro de `_expo/`.
await writeFile(join(DIST, '.nojekyll'), '');

// La app enruta en el cliente: si recargas en una ruta profunda GitHub
// devuelve un 404, así que servimos el mismo shell y la app resuelve sola.
await copyFile(join(DIST, 'index.html'), join(DIST, '404.html'));

console.log(`dist/ listo para publicar en "${base || '/'}"`);

// Precache the production shell and every emitted runtime asset. The build ID
// includes content so worker updates track HTML, CSS, icons, and JavaScript.
const files = (await readdir(DIST, { recursive: true, withFileTypes: true }))
  .filter(
    (file) =>
      file.isFile() && !['sw.js', '404.html', '.nojekyll', 'metadata.json'].includes(file.name),
  )
  .map((file) =>
    join(file.parentPath, file.name)
      .slice(DIST.length + 1)
      .replaceAll('\\', '/'),
  )
  .sort();
const hash = createHash('sha256');
for (const file of files) hash.update(await readFile(join(DIST, file)));
const urls = [
  `${base}/`,
  ...files.filter((file) => file !== 'index.html').map((file) => `${base}/${file}`),
];
const worker = (await readFile(join(ROOT, 'public/sw.js'), 'utf8'))
  .replace('__BUILD_ID__', hash.digest('hex').slice(0, 16))
  .replace('/*__PRECACHE__*/ []', JSON.stringify(urls));
await writeFile(join(DIST, 'sw.js'), worker);
