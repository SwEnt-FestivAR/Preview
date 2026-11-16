// Local preview: node scripts/serve.mjs [history-dir]  -> http://localhost:8090
// Serves site/ and maps /data/* to the history folder (a checkout of the `data` branch).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('site');
const data = path.resolve(process.argv[2] || 'history');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = url.startsWith('/data/') ? path.join(data, url.slice(6)) : path.join(root, url === '/' ? 'index.html' : url);
  if (url === '/data/demo.json') file = path.resolve('demo.json');
  if (!file.startsWith(data) && !file.startsWith(root) && !file.endsWith('demo.json')) return res.writeHead(403).end();
  fs.readFile(file, (err, buf) => {
    if (err) return res.writeHead(404).end('not found');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(buf);
  });
}).listen(8090, () => console.log('http://localhost:8090'));
