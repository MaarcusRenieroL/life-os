// Generic board adapter: fetch a URL and pull JobPosting objects out of any
// schema.org JSON-LD blocks. This is the polite, ToS-friendly path - most job
// boards and company career pages publish JobPosting JSON-LD for exactly this.
// When USE_PLAYWRIGHT=true and a page needs JS to render, it falls back to a
// headless render.

const UA =
  'Mozilla/5.0 (compatible; LifeOS-JobScraper/0.1; +https://github.com/MaarcusRenieroL/life-os)';

async function fetchHtml(url) {
  const response = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return response.text();
}

async function renderHtml(url) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('playwright not installed; set USE_PLAYWRIGHT=false or add the dependency');
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    return page.content();
  } finally {
    await browser.close();
  }
}

function extractJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  const postings = [];
  for (const [, body] of blocks) {
    let parsed;
    try {
      parsed = JSON.parse(body.trim());
    } catch {
      continue;
    }
    for (const node of Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] || [])]) {
      if (node && (node['@type'] === 'JobPosting' || node['@type']?.includes?.('JobPosting'))) {
        postings.push(node);
      }
    }
  }
  return postings;
}

export async function scrapeGeneric(source) {
  if (!source.url) return [];
  const usePlaywright = String(process.env.USE_PLAYWRIGHT).toLowerCase() === 'true';
  const html = usePlaywright ? await renderHtml(source.url) : await fetchHtml(source.url);
  return extractJsonLd(html).map((posting) => ({ ...posting, source: source.name || 'generic' }));
}
