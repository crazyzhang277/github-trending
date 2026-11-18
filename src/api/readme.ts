export interface ReadmeResult {
  content: string;
  fileName: string;
  branch: string;
  baseDir: string;
  htmlUrl: string;
}

const readmeCache = new Map<string, ReadmeResult>();

function decodeUtf8Base64(base64: string): string {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

function extractBranchAndBaseDir(downloadUrl: string | null | undefined, filePath: string) {
  let branch = 'HEAD';
  if (downloadUrl) {
    // Format: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
    const match = downloadUrl.match(
      /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/([^/]+)\//
    );
    if (match?.[1]) {
      branch = match[1];
    }
  }
  const slashIdx = filePath.lastIndexOf('/');
  const baseDir = slashIdx >= 0 ? filePath.slice(0, slashIdx) : '';
  return { branch, baseDir };
}

export function getCachedReadme(author: string, name: string): ReadmeResult | null {
  const key = `${author}/${name}`.toLowerCase();
  return readmeCache.get(key) ?? null;
}

export async function fetchRepoReadme(
  author: string,
  name: string,
  signal?: AbortSignal
): Promise<ReadmeResult> {
  const cacheKey = `${author}/${name}`.toLowerCase();
  const cached = readmeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const encodedAuthor = encodeURIComponent(author);
  const encodedName = encodeURIComponent(name);

  // Same-origin /api/readme when served by Vite/Express/Vercel/Cloudflare (skip on static github.io)
  const isStaticGithubPages =
    typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io');

  if (!isStaticGithubPages) {
    try {
      const proxyRes = await fetch(
        `/api/readme?owner=${encodedAuthor}&repo=${encodedName}`,
        { signal }
      );
      const contentType = proxyRes.headers.get('content-type') || '';
      if (proxyRes.ok) {
        if (contentType.includes('application/json')) {
          const parsed = (await proxyRes.json()) as ReadmeResult;
          if (parsed && typeof parsed.content === 'string') {
            readmeCache.set(cacheKey, parsed);
            return parsed;
          }
        }
      } else if (proxyRes.status === 404 && contentType.includes('application/json')) {
        throw new Error('README_NOT_FOUND');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      if (err instanceof Error && err.message === 'README_NOT_FOUND') {
        throw err;
      }
    }
  }

  // Direct path: raw.githubusercontent.com avoids GitHub REST API 60 req/hr unauthenticated limit
  const rawUrl = `https://raw.githubusercontent.com/${encodedAuthor}/${encodedName}/HEAD/README.md`;
  try {
    const rawRes = await fetch(rawUrl, { signal });
    if (rawRes.ok) {
      const content = await rawRes.text();
      const result: ReadmeResult = {
        content,
        fileName: 'README.md',
        branch: 'HEAD',
        baseDir: '',
        htmlUrl: `https://github.com/${encodedAuthor}/${encodedName}/blob/HEAD/README.md`,
      };
      readmeCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
  }

  // Fallback path: GitHub REST API resolves readme.md, README.rst, docs/README.md, etc.
  const apiUrl = `https://api.github.com/repos/${encodedAuthor}/${encodedName}/readme`;
  const apiRes = await fetch(apiUrl, {
    signal,
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!apiRes.ok) {
    if (apiRes.status === 404) {
      throw new Error('README_NOT_FOUND');
    }
    throw new Error(`HTTP ${apiRes.status}`);
  }

  const data = (await apiRes.json()) as {
    name?: string;
    path?: string;
    content?: string;
    encoding?: string;
    download_url?: string;
    html_url?: string;
  };

  let content = '';
  if (data.content && data.encoding === 'base64') {
    content = decodeUtf8Base64(data.content);
  } else if (data.download_url) {
    const dlRes = await fetch(data.download_url, { signal });
    if (!dlRes.ok) throw new Error(`HTTP ${dlRes.status}`);
    content = await dlRes.text();
  } else {
    throw new Error('README_NOT_FOUND');
  }

  const filePath = data.path || data.name || 'README.md';
  const { branch, baseDir } = extractBranchAndBaseDir(data.download_url, filePath);

  const result: ReadmeResult = {
    content,
    fileName: data.name || 'README.md',
    branch,
    baseDir,
    htmlUrl: data.html_url || `https://github.com/${encodedAuthor}/${encodedName}`,
  };

  readmeCache.set(cacheKey, result);
  return result;
}
