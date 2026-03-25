import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORDER_FILE = path.join(__dirname, '../src/data/photo-order.json');

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('Missing Cloudinary credentials. Run: npm run reorder');
  process.exit(1);
}

async function fetchPhotos() {
  const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/search`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression: 'asset_folder=pictures', max_results: 500 }),
  });
  const { resources } = await res.json();
  return resources ?? [];
}

function readOrder() {
  try {
    const raw = JSON.parse(fs.readFileSync(ORDER_FILE, 'utf-8'));
    return raw.map(entry => typeof entry === 'string' ? entry : entry.id);
  } catch { return []; }
}

function readMeta() {
  try {
    const raw = JSON.parse(fs.readFileSync(ORDER_FILE, 'utf-8'));
    const map = {};
    for (const entry of raw) {
      if (typeof entry === 'object' && entry.id) map[entry.id] = entry;
    }
    return map;
  } catch { return {}; }
}

function buildHTML(photos, currentOrder) {
  const sorted = currentOrder.length > 0
    ? [...photos].sort((a, b) => {
        const ai = currentOrder.indexOf(a.public_id);
        const bi = currentOrder.indexOf(b.public_id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : photos;

  const items = sorted.map(p => `
    <div class="item" draggable="true" data-id="${p.public_id}">
      <img src="https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_400,f_auto,q_auto/${p.public_id}" alt="" />
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Reorder Photos</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #111; color: #eee; padding: 2rem; }
  h1 { font-size: 0.875rem; font-weight: 400; margin-bottom: 1.5rem; opacity: 0.5; letter-spacing: 0.05em; text-transform: uppercase; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .item { cursor: grab; border-radius: 4px; overflow: hidden; transition: opacity 150ms, outline 150ms; outline: 2px solid transparent; }
  .item:active { cursor: grabbing; }
  .item.dragging { opacity: 0.25; }
  .item.over { outline-color: #fff; }
  .item img { width: 100%; height: auto; display: block; pointer-events: none; }
  .actions { margin-top: 1.5rem; display: flex; align-items: center; gap: 1rem; }
  button { padding: 0.4rem 1.2rem; background: #fff; color: #111; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8125rem; }
  button:hover { background: #ccc; }
  .status { font-size: 0.75rem; opacity: 0.45; }
</style>
</head>
<body>
<h1>${photos.length} photo${photos.length === 1 ? '' : 's'} — drag to reorder</h1>
<div class="grid" id="grid">${items}</div>
<div class="actions">
  <button onclick="save()">Save order</button>
  <span class="status" id="status"></span>
</div>
<script>
  const grid = document.getElementById('grid');
  let dragged = null;

  grid.addEventListener('dragstart', e => {
    dragged = e.target.closest('.item');
    setTimeout(() => dragged.classList.add('dragging'), 0);
  });
  grid.addEventListener('dragend', () => {
    dragged.classList.remove('dragging');
    grid.querySelectorAll('.item').forEach(el => el.classList.remove('over'));
    dragged = null;
  });
  grid.addEventListener('dragover', e => {
    e.preventDefault();
    const target = e.target.closest('.item');
    if (!target || target === dragged) return;
    grid.querySelectorAll('.item').forEach(el => el.classList.remove('over'));
    target.classList.add('over');
  });
  grid.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.item');
    if (!target || target === dragged) return;
    target.classList.remove('over');
    const all = [...grid.querySelectorAll('.item')];
    const from = all.indexOf(dragged);
    const to = all.indexOf(target);
    if (from < to) target.after(dragged);
    else target.before(dragged);
  });

  async function save() {
    const ids = [...grid.querySelectorAll('.item')].map(el => el.dataset.id);
    const res = await fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids),
    });
    const status = document.getElementById('status');
    if (res.ok) {
      status.textContent = 'Saved.';
      setTimeout(() => status.textContent = '', 2000);
    } else {
      status.textContent = 'Error saving.';
    }
  }
</script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const photos = await fetchPhotos();
    const order = readOrder();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(buildHTML(photos, order));
  } else if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const ids = JSON.parse(body);
      const meta = readMeta();
      const result = ids.map(id => meta[id] || { id });
      fs.writeFileSync(ORDER_FILE, JSON.stringify(result, null, 2) + '\n');
      res.writeHead(200);
      res.end('ok');
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3333, () => console.log('http://localhost:3333'));
