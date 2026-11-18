import axios from 'axios';

const VALID_SEGMENT = /^[a-zA-Z0-9._-]+$/;

function extractBranchAndBaseDir(downloadUrl, filePath) {
  let branch = 'HEAD';
  if (downloadUrl) {
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

export async function fetchReadmeServer(owner, repo) {
  const cleanOwner = String(owner || '').trim();
  const cleanRepo = String(repo || '').trim();

  if (!VALID_SEGMENT.test(cleanOwner) || !VALID_SEGMENT.test(cleanRepo)) {
    const err = new Error('Invalid repository owner or name');
    err.statusCode = 400;
    throw err;
  }

  const encodedOwner = encodeURIComponent(cleanOwner);
  const encodedRepo = encodeURIComponent(cleanRepo);

  // Primary: raw.githubusercontent.com avoids GitHub REST API 60 req/hr limit
  const candidates = ['README.md', 'readme.md'];
  for (const candidate of candidates) {
    try {
      const rawRes = await axios.get(
        `https://raw.githubusercontent.com/${encodedOwner}/${encodedRepo}/HEAD/${candidate}`,
        {
          timeout: 8000,
          responseType: 'text',
          transformResponse: [(data) => data],
          headers: {
            'User-Agent': 'github-trending-web/1.0',
          },
        }
      );
      if (typeof rawRes.data === 'string' && rawRes.data.length > 0) {
        return {
          content: rawRes.data,
          fileName: candidate,
          branch: 'HEAD',
          baseDir: '',
          htmlUrl: `https://github.com/${encodedOwner}/${encodedRepo}/blob/HEAD/${candidate}`,
        };
      }
    } catch {
      // Fall through to next candidate or GitHub API
    }
  }

  // Fallback: GitHub REST API resolves custom branch / filename / docs/README.md
  try {
    const apiRes = await axios.get(
      `https://api.github.com/repos/${encodedOwner}/${encodedRepo}/readme`,
      {
        timeout: 10000,
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'github-trending-web/1.0',
        },
      }
    );

    const data = apiRes.data || {};
    let content = '';
    if (data.content && data.encoding === 'base64') {
      content = Buffer.from(String(data.content).replace(/\s+/g, ''), 'base64').toString('utf-8');
    } else if (data.download_url) {
      const dlRes = await axios.get(data.download_url, {
        timeout: 8000,
        responseType: 'text',
        transformResponse: [(raw) => raw],
      });
      content = String(dlRes.data || '');
    }

    if (!content) {
      const err = new Error('README not found');
      err.statusCode = 404;
      throw err;
    }

    const filePath = data.path || data.name || 'README.md';
    const { branch, baseDir } = extractBranchAndBaseDir(data.download_url, filePath);

    return {
      content,
      fileName: data.name || 'README.md',
      branch,
      baseDir,
      htmlUrl: data.html_url || `https://github.com/${encodedOwner}/${encodedRepo}`,
    };
  } catch (error) {
    if (error?.statusCode === 404 || error?.response?.status === 404) {
      const notFound = new Error('README not found');
      notFound.statusCode = 404;
      throw notFound;
    }
    throw error;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { owner = '', repo = '' } = req.query || {};
    const result = await fetchReadmeServer(owner, repo);
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=600');
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode === 400 ? 400 : error?.statusCode === 404 ? 404 : 502;
    res.status(status).json({
      error: error instanceof Error ? error.message : 'Failed to fetch README',
    });
  }
}
