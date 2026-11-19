// Cloudflare Pages Function for translating README prose segments to Simplified Chinese

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

  const res = await fetch('https://translate.googleapis.com/translate_a/single', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': 'github-trending-web/1.0',
    },
    body: payload.toString(),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  const joined = parseGoogleTranslateResult(data);
  if (typeof joined !== 'string') {
    throw new Error('Unexpected translate response');
  }

  const lines = joined.split('\n').map((line) => line.trim());
  if (lines.length === cleaned.length) {
    return lines;
  }

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

async function translateTextsBatched(texts) {
  const MAX_BATCH_CHARS = 1800;
  const MAX_BATCH_ITEMS = 18;
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

export async function onRequest(context) {
  const { request } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const texts = Array.isArray(body?.texts) ? body.texts.slice(0, 80) : [];
    if (texts.length === 0) {
      return new Response(JSON.stringify({ error: 'No texts provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const translations = await translateTextsBatched(texts);
    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Translation failed' }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
