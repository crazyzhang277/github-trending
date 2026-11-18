import { Marked } from 'marked';
import DOMPurify from 'dompurify';

interface RenderReadmeOptions {
  author: string;
  name: string;
  branch?: string;
  baseDir?: string;
}

const gfmMarked = new Marked({
  gfm: true,
  breaks: false,
});

function isExternalOrSpecialUrl(url: string): boolean {
  return (
    /^(https?:)?\/\//i.test(url) ||
    url.startsWith('data:') ||
    url.startsWith('mailto:') ||
    url.startsWith('tel:') ||
    url.startsWith('#')
  );
}

function joinRepoPath(baseDir: string, relativePath: string): string {
  const cleanRel = relativePath.split('#')[0].split('?')[0];
  const baseParts = baseDir ? baseDir.split('/').filter(Boolean) : [];
  const relParts = cleanRel.replace(/^\/+/, '').split('/');

  const stack = relativePath.startsWith('/') ? [] : [...baseParts];
  for (const part of relParts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

function resolveRawAssetUrl(
  rawSrc: string,
  { author, name, branch = 'HEAD', baseDir = '' }: RenderReadmeOptions
): string {
  const trimmed = rawSrc.trim();
  if (!trimmed) return trimmed;

  // Convert github.com/{owner}/{repo}/blob/{branch}/... image links to raw
  const blobMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^?#]+)/i
  );
  if (blobMatch) {
    return `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${blobMatch[3]}`;
  }

  if (isExternalOrSpecialUrl(trimmed)) {
    return trimmed;
  }

  const repoPath = joinRepoPath(baseDir, trimmed);
  return `https://raw.githubusercontent.com/${encodeURIComponent(author)}/${encodeURIComponent(name)}/${encodeURIComponent(branch)}/${repoPath}`;
}

function resolveRepoLinkUrl(
  rawHref: string,
  { author, name, branch = 'HEAD', baseDir = '' }: RenderReadmeOptions
): string {
  const trimmed = rawHref.trim();
  if (!trimmed || trimmed.startsWith('#')) return trimmed;
  if (isExternalOrSpecialUrl(trimmed)) return trimmed;

  const [pathPart, hashPart] = trimmed.split('#');
  const repoPath = joinRepoPath(baseDir, pathPart);
  const hash = hashPart ? `#${hashPart}` : '';
  return `https://github.com/${encodeURIComponent(author)}/${encodeURIComponent(name)}/blob/${encodeURIComponent(branch)}/${repoPath}${hash}`;
}

function resolveSrcSet(srcset: string, options: RenderReadmeOptions): string {
  return srcset
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) return '';
      const spaceIdx = trimmed.search(/\s+/);
      if (spaceIdx === -1) {
        return resolveRawAssetUrl(trimmed, options);
      }
      const urlPart = trimmed.slice(0, spaceIdx);
      const descriptorPart = trimmed.slice(spaceIdx);
      return `${resolveRawAssetUrl(urlPart, options)}${descriptorPart}`;
    })
    .filter(Boolean)
    .join(', ');
}

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-');
}

export function renderReadmeHtml(
  markdown: string,
  options: RenderReadmeOptions
): string {
  const rawHtml = gfmMarked.parse(markdown, { async: false });
  const htmlString = typeof rawHtml === 'string' ? rawHtml : '';

  const sanitizer = DOMPurify;
  const usedIds = new Map<string, number>();

  const hook = (node: Element) => {
    const tag = node.tagName;
    if (tag === 'A') {
      const href = node.getAttribute('href');
      if (href) {
        const resolved = resolveRepoLinkUrl(href, options);
        node.setAttribute('href', resolved);
        if (!resolved.startsWith('#')) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      }
    } else if (tag === 'IMG') {
      const src = node.getAttribute('src');
      if (src) {
        node.setAttribute('src', resolveRawAssetUrl(src, options));
      }
      node.setAttribute('loading', 'lazy');
      node.setAttribute('decoding', 'async');
    } else if (tag === 'SOURCE') {
      const srcset = node.getAttribute('srcset');
      if (srcset) {
        node.setAttribute('srcset', resolveSrcSet(srcset, options));
      }
    } else if (/^H[1-6]$/.test(tag) && !node.getAttribute('id')) {
      const baseSlug = slugifyHeading(node.textContent || '');
      if (baseSlug) {
        const count = usedIds.get(baseSlug) ?? 0;
        usedIds.set(baseSlug, count + 1);
        node.setAttribute('id', count === 0 ? baseSlug : `${baseSlug}-${count}`);
      }
    }
  };

  sanitizer.addHook('afterSanitizeAttributes', hook);
  try {
    return sanitizer.sanitize(htmlString, {
      ADD_TAGS: ['details', 'summary', 'picture', 'source'],
      ADD_ATTR: ['id', 'align', 'width', 'height', 'open', 'target', 'rel', 'srcset', 'media'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    });
  } finally {
    sanitizer.removeHook('afterSanitizeAttributes');
  }
}
