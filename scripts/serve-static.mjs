import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.env.STATIC_ROOT || 'out');
const port = Number(process.env.PORT || 3000);
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
};

function candidatePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const relative = normalize(clean).replace(/^([/\\])+/, '');
  const base = join(root, relative);
  const candidates = [base];
  if (clean.endsWith('/')) candidates.push(join(base, 'index.html'));
  else candidates.push(`${base}.html`, join(base, 'index.html'));
  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) continue;
    if (existsSync(resolved) && statSync(resolved).isFile()) return resolved;
  }
  return null;
}

if (!existsSync(root)) {
  console.error(`Static export not found at ${root}. Run npm run build first.`);
  process.exit(1);
}

createServer((request, response) => {
  try {
    const file = candidatePath(request.url || '/');
    if (!file) { response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Not found'); return; }
    const extension = extname(file).toLowerCase();
    const immutable = file.includes(`${sep}_next${sep}static${sep}`);
    const noCache = extension === '.html' || file.endsWith(`${sep}sw.js`);
    response.writeHead(200, {
      'content-type': mime[extension] || 'application/octet-stream',
      'cache-control': noCache ? 'no-cache' : immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin',
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
  }
}).listen(port, '0.0.0.0', () => console.log(`Serving ${root} on http://localhost:${port}`));
