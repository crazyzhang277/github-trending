export interface TranslatedReadmeResult {
  html: string;
  translatedCount: number;
  alreadyChinese: boolean;
}

const translatedCache = new Map<string, TranslatedReadmeResult>();
let apiTranslateAvailable: boolean | null = null;

const SKIP_TAGS = new Set([
  'PRE',
  'CODE',
  'KBD',
  'SAMP',
  'VAR',
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'SVG',
]);

const MAX_BATCH_CHARS = 1600;
const MAX_BATCH_ITEMS = 18;
const CONCURRENCY = 3;

function getCacheKey(author: string, name: string): string {
  return `${author}/${name}`.toLowerCase();
}

export function getCachedTranslatedReadme(
  author: string,
  name: string
): TranslatedReadmeResult | null {
  return translatedCache.get(getCacheKey(author, name)) ?? null;
}

function hasSkippedAncestor(node: Text): boolean {
  let parent: Node | null = node.parentNode;
  while (parent && parent.nodeType === Node.ELEMENT_NODE) {
    const el = parent as Element;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.getAttribute('translate') === 'no') return true;
    parent = parent.parentNode;
  }
  return false;
}

function collapseSingleLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function shouldTranslateSegment(core: string): boolean {
  if (!core) return false;
  // Skip URLs, emails, paths, versions, and numbers
  if (/^(https?:\/\/\S+|mailto:\S+|v?\d+(\.\d+)*|[./~_-]+\S*)$/i.test(core)) {
    return false;
  }
  const foreignLetters = core.match(/[A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁёぁ-んァ-ヶ가-힣]/g);
  return Boolean(foreignLetters && foreignLetters.length >= 2);
}

function splitBatches(texts: string[], maxItems = MAX_BATCH_ITEMS, maxChars = MAX_BATCH_CHARS): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let chars = 0;

  for (const text of texts) {
    const nextChars = chars + text.length + 1;
    if (current.length > 0 && (current.length >= maxItems || nextChars > maxChars)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length + 1;
  }

  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  outerSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  outerSignal?.addEventListener('abort', onAbort, { once: true });

  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (outerSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
    outerSignal?.removeEventListener('abort', onAbort);
  }
}

async function translateViaApiEndpoint(
  texts: string[],
  signal?: AbortSignal
): Promise<string[] | null> {
  const isStaticGithubPages =
    typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io');

  if (isStaticGithubPages || apiTranslateAvailable === false) {
    return null;
  }

  try {
    const res = await fetchWithTimeout(
      '/api/translate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, to: 'zh-CN' }),
      },
      10000,
      signal
    );

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      apiTranslateAvailable = false;
      return null;
    }

    if (!res.ok) {
      if (res.status === 404 || res.status === 405) {
        apiTranslateAvailable = false;
      }
      return null;
    }

    const data = (await res.json()) as { translations?: unknown };
    if (
      Array.isArray(data.translations) &&
      data.translations.length === texts.length
    ) {
      apiTranslateAvailable = true;
      return data.translations.map((item) => String(item ?? ''));
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
  }

  return null;
}

function parseGoogleResult(data: unknown): string | null {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  return (data[0] as unknown[])
    .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
    .join('');
}

async function translateJoinedGoogleDirect(
  texts: string[],
  signal?: AbortSignal
): Promise<string[]> {
  const payload = new URLSearchParams({
    client: 'gtx',
    sl: 'auto',
    tl: 'zh-CN',
    dt: 't',
    q: texts.join('\n'),
  });

  const res = await fetchWithTimeout(
    'https://translate.googleapis.com/translate_a/single',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: payload.toString(),
    },
    8000,
    signal
  );

  if (!res.ok) {
    throw new Error(`Google Translate HTTP ${res.status}`);
  }

  const data: unknown = await res.json();
  const joined = parseGoogleResult(data);
  if (typeof joined !== 'string') {
    throw new Error('Invalid Google Translate response');
  }

  const lines = joined.split('\n').map((line) => line.trim());
  if (lines.length === texts.length) {
    return lines;
  }

  if (texts.length <= 1) {
    return [joined.replace(/\n+/g, ' ').trim()];
  }

  const mid = Math.floor(texts.length / 2);
  const [left, right] = await Promise.all([
    translateJoinedGoogleDirect(texts.slice(0, mid), signal),
    translateJoinedGoogleDirect(texts.slice(mid), signal),
  ]);
  return [...left, ...right];
}

function splitLongTextForMyMemory(text: string, maxEncodedBytes = 360): string[] {
  if (encodeURIComponent(text).length <= maxEncodedBytes) {
    return [text];
  }
  const sentences = text.split(/(?<=[.!?。；;])\s+/);
  const chunks: string[] = [];
  let buf = '';

  for (const sentence of sentences) {
    if (encodeURIComponent(sentence).length > maxEncodedBytes) {
      if (buf) {
        chunks.push(buf);
        buf = '';
      }
      const words = sentence.split(/\s+/);
      let wordBuf = '';
      for (const word of words) {
        const candidate = wordBuf ? `${wordBuf} ${word}` : word;
        if (wordBuf && encodeURIComponent(candidate).length > maxEncodedBytes) {
          chunks.push(wordBuf);
          wordBuf = word;
        } else {
          wordBuf = candidate;
        }
      }
      if (wordBuf) chunks.push(wordBuf);
      continue;
    }

    const candidate = buf ? `${buf} ${sentence}` : sentence;
    if (buf && encodeURIComponent(candidate).length > maxEncodedBytes) {
      chunks.push(buf);
      buf = sentence;
    } else {
      buf = candidate;
    }
  }

  if (buf) chunks.push(buf);
  return chunks.length > 0 ? chunks : [text.slice(0, 280)];
}

async function translateSingleMyMemory(text: string, signal?: AbortSignal): Promise<string> {
  const parts = splitLongTextForMyMemory(text);
  const out: string[] = [];

  for (const part of parts) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(part)}&langpair=en|zh-CN`;
    const res = await fetchWithTimeout(url, { method: 'GET' }, 7000, signal);
    if (!res.ok) {
      throw new Error(`MyMemory HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
    };
    const translated = data?.responseData?.translatedText;
    if (data?.responseStatus !== 200 || typeof translated !== 'string') {
      throw new Error('MyMemory translation unavailable');
    }
    out.push(translated.trim());
  }

  return out.join('');
}

async function translateBatchMyMemory(texts: string[], signal?: AbortSignal): Promise<string[]> {
  const subBatches = splitBatches(texts, 8, 300);
  const results: string[] = [];

  for (const sub of subBatches) {
    const joined = sub.join('\n');
    if (encodeURIComponent(joined).length <= 420 && sub.length > 1) {
      try {
        const translatedJoined = await translateSingleMyMemory(joined, signal);
        const lines = translatedJoined.split('\n').map((l) => l.trim());
        if (lines.length === sub.length) {
          results.push(...lines);
          continue;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
      }
    }

    for (const item of sub) {
      results.push(await translateSingleMyMemory(item, signal));
    }
  }

  return results;
}

async function translateBatch(texts: string[], signal?: AbortSignal): Promise<string[]> {
  const apiResult = await translateViaApiEndpoint(texts, signal);
  if (apiResult) return apiResult;

  try {
    return await translateJoinedGoogleDirect(texts, signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    return await translateBatchMyMemory(texts, signal);
  }
}

interface TextSegment {
  node: Text;
  leading: string;
  core: string;
  trailing: string;
}

export async function translateReadmeHtml(
  author: string,
  name: string,
  renderedHtml: string,
  options?: {
    signal?: AbortSignal;
    onProgress?: (done: number, total: number) => void;
  }
): Promise<TranslatedReadmeResult> {
  const key = getCacheKey(author, name);
  const cached = translatedCache.get(key);
  if (cached) {
    return cached;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(renderedHtml, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);

  const segments: TextSegment[] = [];
  let cjkCount = 0;
  let foreignCount = 0;

  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    current = walker.nextNode();

    if (hasSkippedAncestor(textNode)) continue;
    const raw = textNode.nodeValue || '';
    const match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match) continue;

    const leading = match[1] ? ' ' : '';
    const core = collapseSingleLine(match[2]);
    const trailing = match[3] ? ' ' : '';

    if (!core) continue;

    const cjkMatches = core.match(/[\u4e00-\u9fff]/g);
    const foreignMatches = core.match(/[A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁёぁ-んァ-ヶ가-힣]/g);
    cjkCount += cjkMatches ? cjkMatches.length : 0;
    foreignCount += foreignMatches ? foreignMatches.length : 0;

    if (shouldTranslateSegment(core)) {
      segments.push({ node: textNode, leading, core, trailing });
    }
  }

  // Already primarily Chinese or nothing translatable
  if (segments.length === 0 || (cjkCount > 40 && cjkCount > foreignCount * 1.4)) {
    const res: TranslatedReadmeResult = {
      html: renderedHtml,
      translatedCount: 0,
      alreadyChinese: true,
    };
    translatedCache.set(key, res);
    return res;
  }

  const uniqueTexts = Array.from(new Set(segments.map((seg) => seg.core)));
  const batches = splitBatches(uniqueTexts);
  const translationMap = new Map<string, string>();

  let nextBatchIdx = 0;
  let completedBatches = 0;
  options?.onProgress?.(0, batches.length);

  const worker = async () => {
    while (nextBatchIdx < batches.length) {
      if (options?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const batchIdx = nextBatchIdx++;
      const batch = batches[batchIdx];
      const translated = await translateBatch(batch, options?.signal);
      batch.forEach((orig, idx) => {
        const out = translated[idx];
        translationMap.set(orig, out && out.length > 0 ? out : orig);
      });
      completedBatches++;
      options?.onProgress?.(completedBatches, batches.length);
    }
  };

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, batches.length) },
    () => worker()
  );
  await Promise.all(workers);

  if (options?.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  for (const seg of segments) {
    const translatedCore = translationMap.get(seg.core);
    if (translatedCore) {
      seg.node.nodeValue = `${seg.leading}${translatedCore}${seg.trailing}`;
    }
  }

  const result: TranslatedReadmeResult = {
    html: doc.body.innerHTML,
    translatedCount: segments.length,
    alreadyChinese: false,
  };
  translatedCache.set(key, result);
  return result;
}
