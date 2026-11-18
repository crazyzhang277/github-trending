// Cloudflare Pages Function for fetching repository README
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

function decodeUtf8Base64(base64) {
  const clean = String(base64).replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export async function onRequest(context) {
  const { request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const owner = (url.searchParams.get('owner') || '').trim();
    const repo = (url.searchParams.get('repo') || '').trim();

    if (!VALID_SEGMENT.test(owner) || !VALID_SEGMENT.test(repo)) {
      return new Response(JSON.stringify({ error: 'Invalid repository owner or name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);

    for (const candidate of ['README.md', 'readme.md']) {
      try {
        const rawRes = await fetch(
          `https://raw.githubusercontent.com/${encodedOwner}/${encodedRepo}/HEAD/${candidate}`,
          { headers: { 'User-Agent': 'github-trending-web/1.0' } }
        );
        if (rawRes.ok) {
          const content = await rawRes.text();
          return new Response(
            JSON.stringify({
              content,
              fileName: candidate,
              branch: 'HEAD',
              baseDir: '',
              htmlUrl: `https://github.com/${encodedOwner}/${encodedRepo}/blob/HEAD/${candidate}`,
            }),
            {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Cache-Control':
                  'public, max-age=120, s-maxage=600, stale-while-revalidate=600',
              },
            }
          );
        }
      } catch {
        // Fall through
      }
    }

    const apiRes = await fetch(
      `https://api.github.com/repos/${encodedOwner}/${encodedRepo}/readme`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'github-trending-web/1.0',
        },
      }
    );

    if (!apiRes.ok) {
      return new Response(
        JSON.stringify({ error: apiRes.status === 404 ? 'README not found' : `HTTP ${apiRes.status}` }),
        {
          status: apiRes.status === 404 ? 404 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await apiRes.json();
    let content = '';
    if (data.content && data.encoding === 'base64') {
      content = decodeUtf8Base64(data.content);
    } else if (data.download_url) {
      const dlRes = await fetch(data.download_url);
      if (dlRes.ok) content = await dlRes.text();
    }

    if (!content) {
      return new Response(JSON.stringify({ error: 'README not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const filePath = data.path || data.name || 'README.md';
    const { branch, baseDir } = extractBranchAndBaseDir(data.download_url, filePath);

    return new Response(
      JSON.stringify({
        content,
        fileName: data.name || 'README.md',
        branch,
        baseDir,
        htmlUrl: data.html_url || `https://github.com/${encodedOwner}/${encodedRepo}`,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch README' }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
