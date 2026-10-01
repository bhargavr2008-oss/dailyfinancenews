import { XMLParser } from 'fast-xml-parser';

const MARKET_SYMBOLS = [
  ['^GSPC', 'S&P 500'],
  ['^DJI', 'Dow Jones'],
  ['^IXIC', 'Nasdaq'],
  ['^VIX', 'VIX'],
  ['GC=F', 'Gold'],
  ['CL=F', 'Crude Oil'],
  ['BTC-USD', 'Bitcoin'],
];

async function getQuote(symbol, label) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`quote ${res.status}`);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    const closes = (result?.indicators?.quote?.[0]?.close || []).filter((n) => Number.isFinite(n));
    const price = meta?.regularMarketPrice ?? closes.at(-1);
    const previous = meta?.chartPreviousClose ?? closes.at(-2);
    if (!Number.isFinite(price)) throw new Error('missing price');
    const change = Number.isFinite(previous) ? price - previous : 0;
    const pct = Number.isFinite(previous) && previous !== 0 ? (change / previous) * 100 : 0;
    return { symbol, label, price, change, pct, ok: true };
  } catch {
    return { symbol, label, ok: false };
  }
}

export async function getMarkets() {
  return Promise.all(MARKET_SYMBOLS.map(([s, l]) => getQuote(s, l)));
}

const NEWS_QUERIES = [
  ['General News', 'US business economy major companies technology policy when:1d'],
  ['Wall Street', 'Wall Street stocks bonds Federal Reserve markets earnings when:1d'],
  ['Investment Banking', 'investment banking mergers acquisitions IPO private equity dealmaking Goldman Sachs JPMorgan Morgan Stanley when:2d'],
];

function cleanTitle(title = '') {
  return title.replace(/\s+-\s+[^-]+$/, '').trim();
}

function decodeHtml(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function stripHtml(text = '') {
  return decodeHtml(text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function trimSummary(text = '', max = 320) {
  const clean = stripHtml(text);
  if (!clean) return '';
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}

async function getArticleSummary(item) {
  try {
    const res = await fetch(item.link, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error('article unavailable');
    const html = await res.text();

    const patterns = [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      const summary = trimSummary(match?.[1] || '');
      if (summary && summary.toLowerCase() !== item.title.toLowerCase()) return summary;
    }
  } catch {}

  const rssSummary = trimSummary(item.rssDescription || '');
  if (rssSummary && !rssSummary.toLowerCase().includes(item.title.toLowerCase())) return rssSummary;
  return `This story reports on: ${item.title}`;
}

export async function getNews() {
  const parser = new XMLParser({ ignoreAttributes: false });
  const groups = await Promise.all(NEWS_QUERIES.map(async ([category, query]) => {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (!res.ok) throw new Error(`news ${res.status}`);
      const xml = await res.text();
      const parsed = parser.parse(xml);
      const raw = parsed?.rss?.channel?.item || [];
      const baseItems = (Array.isArray(raw) ? raw : [raw]).slice(0, 7).map((item) => ({
        category,
        title: cleanTitle(item.title),
        source: item?.source?.['#text'] || item?.source || 'News',
        link: item.link,
        pubDate: item.pubDate,
        rssDescription: item.description || '',
      }));

      return Promise.all(baseItems.map(async (item) => ({
        ...item,
        summary: await getArticleSummary(item),
      })));
    } catch {
      return [];
    }
  }));

  const seen = new Set();
  return groups.flat().filter((item) => {
    const key = item.title.toLowerCase();
    if (!item.title || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
