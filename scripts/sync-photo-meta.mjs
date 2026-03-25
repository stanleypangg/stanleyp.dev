import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse .env manually (no dotenv dependency)
const envPath = path.join(__dirname, '../.env');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
  if (match) process.env[match[1].trim()] ??= match[2].trim();
}

const ORDER_FILE = path.join(__dirname, '../src/data/photo-order.json');
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('Missing CLOUDINARY_* env vars.');
  process.exit(1);
}

const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/search`, {
  method: 'POST',
  headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ expression: 'asset_folder=pictures', max_results: 500 }),
});

if (!res.ok) { console.error(`Cloudinary ${res.status}`); process.exit(1); }

const { resources } = await res.json();
const byId = Object.fromEntries(resources.map(r => [r.public_id, r]));

// Read existing order (supports both old string[] and new object[] formats)
let currentOrder = [];
try {
  const raw = JSON.parse(fs.readFileSync(ORDER_FILE, 'utf-8'));
  currentOrder = raw.map(entry => typeof entry === 'string' ? entry : entry.id);
} catch {}

// Sort: ordered first, then any new photos
const ordered = currentOrder.filter(id => byId[id]);
const newIds = resources.map(r => r.public_id).filter(id => !ordered.includes(id));
const allIds = [...ordered, ...newIds];

const result = allIds.map(id => {
  const r = byId[id];
  return { id: r.public_id, w: r.width, h: r.height };
});

fs.writeFileSync(ORDER_FILE, JSON.stringify(result, null, 2) + '\n');
console.log(`Synced ${result.length} photos with dimensions.`);
