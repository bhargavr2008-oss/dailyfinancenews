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
      return (Array.isArray(raw) ? raw : [raw]).slice(0, 7).map((item) => ({
        category,
        title: cleanTitle(item.title),
        source: item?.source?.['#text'] || item?.source || 'News',
        link: item.link,
        pubDate: item.pubDate,
      }));
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
