import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const root = resolve('.next-static');
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const extension = (name) => name.slice(name.lastIndexOf('.'));

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const target = resolve(root, `.${pathname}`, pathname.endsWith('/') ? 'index.html' : '');
    if (target !== root && !target.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    let file = target;
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extension(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': file.includes(`${sep}_next${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache' });
    response.end(data);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found'); }
}).listen(port, () => process.stdout.write(`Static export listening on http://localhost:${port}\n`));
