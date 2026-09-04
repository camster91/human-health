import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = existsSync('out') ? 'out' : 'public';
const required = ['manifest.webmanifest', 'sw.js', 'offline.html', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
if (root === 'out') required.push('index.html', 'health/index.html', 'coach/index.html', 'platform/index.html');

for (const file of required) {
  const path = join(root, file);
  if (!existsSync(path) || statSync(path).size === 0) throw new Error(`Missing or empty PWA asset: ${path}`);
}

function assertPng(file, width, height) {
  const buffer = readFileSync(join(root, file));
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, index) => buffer[index] === byte)) throw new Error(`${file} is not a valid PNG asset.`);
  if (buffer.readUInt32BE(16) !== width || buffer.readUInt32BE(20) !== height) throw new Error(`${file} must be ${width}x${height}.`);
}
assertPng('icon-192.png', 192, 192);
assertPng('icon-512.png', 512, 512);
assertPng('apple-touch-icon.png', 180, 180);

const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
if (manifest.start_url !== '/' || manifest.scope !== '/') throw new Error('Manifest start_url and scope must remain root-relative.');
if (!['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display)) throw new Error('Manifest must support an installable display mode.');
const sizes = new Set((manifest.icons || []).map(icon => icon.sizes));
if (!sizes.has('192x192') || !sizes.has('512x512')) throw new Error('Manifest requires 192x192 and 512x512 icons.');
if (!(manifest.icons || []).some(icon => String(icon.purpose || '').includes('maskable'))) throw new Error('Manifest requires a maskable icon.');

const serviceWorker = readFileSync(join(root, 'sw.js'), 'utf8');
for (const route of ["'/health/'", "'/coach/'", "'/platform/'"]) {
  if (!serviceWorker.includes(route)) throw new Error(`Service worker is missing route ${route}.`);
}
if (!serviceWorker.includes('CACHE_VERSION') || !serviceWorker.includes('CACHE_PREFIX') || !serviceWorker.includes('offline.html') || !serviceWorker.includes('new Response') || !serviceWorker.includes('504')) throw new Error('Service worker is missing required offline handling.');
if (!serviceWorker.includes('fetchRequired') || !serviceWorker.includes('verifyNewCacheBeforeActivation')) throw new Error('Service worker must fail closed when the required offline shell is incomplete.');
if (!serviceWorker.includes('await caches.delete(CACHE_VERSION)')) throw new Error('Failed service-worker installs must remove the incomplete candidate cache.');
if (!serviceWorker.includes('key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION')) throw new Error('Service worker activation must delete only stale Human Health caches, never unrelated origin caches.');
const installBlock = serviceWorker.slice(serviceWorker.indexOf("self.addEventListener('install'"), serviceWorker.indexOf("self.addEventListener('activate'"));
if (installBlock.includes('skipWaiting()')) throw new Error('Service worker must not automatically skip waiting after install; the known-good worker must remain active until explicit activation.');
console.log(`PWA static checks passed using ${root}/`);
