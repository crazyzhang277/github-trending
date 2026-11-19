import axios from 'axios';

const MAX_BATCH_CHARS = 1800;
const MAX_BATCH_ITEMS = 18;

function collapseSingleLine(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function parseGoogleTranslateResult(data) {
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    return null;
  }
  return data[0]
    .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
    .join('');
}

async function translateJoinedGoogle(texts) {
  const cleaned = texts.map(collapseSingleLine);
  const payload = new URLSearchParams({
    client: 'gtx',
    sl: 'auto',
    tl: 'zh-CN',
    dt: 't',
    q: cleaned.join('\n'),
  });

  const { data } = await axios.post(
    'https://translate.googleapis.com/translate_a/single',
    payload.toString(),
    {
      timeout: 9000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'github-trending-web/1.0',
      },
    }
  );

  const joined = parseGoogleTranslateResult(data);
  if (typeof joined !== 'string') {
    throw new Error('Unexpected translate response');
  }

  const lines = joined.split('\n').map((line) => line.trim());
  if (lines.length === cleaned.length) {
    return lines;
  }

  // Binary split fallback if Google Translate merged or added a line break
  if (cleaned.length <= 1) {
    return [joined.replace(/\n+/g, ' ').trim()];
  }
  const mid = Math.floor(cleaned.length / 2);
  const [left, right] = await Promise.all([
    translateJoinedGoogle(cleaned.slice(0, mid)),
    translateJoinedGoogle(cleaned.slice(mid)),
  ]);
  return [...left, ...right];
}

export async function translateTextsServer(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const batches = [];
  let currentBatch = [];
  let currentChars = 0;

  for (const item of texts) {
    const clean = collapseSingleLine(item);
    const nextChars = currentChars + clean.length + 1;
    if (
      currentBatch.length > 0 &&
      (currentBatch.length >= MAX_BATCH_ITEMS || nextChars > MAX_BATCH_CHARS)
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentChars = 0;
    }
    currentBatch.push(clean);
    currentChars += clean.length + 1;
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  const results = [];
  for (const batch of batches) {
    const translated = await translateJoinedGoogle(batch);
    results.push(...translated);
  }
  return results;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const texts = Array.isArray(body.texts) ? body.texts.slice(0, 80) : [];
    if (texts.length === 0) {
      res.status(400).json({ error: 'No texts provided' });
      return;
    }

    const translations = await translateTextsServer(texts);
    res.status(200).json({ translations });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Translation failed',
    });
  }
}
