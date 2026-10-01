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

function trimText(text = '', max = 9000) {
  const clean = stripHtml(text);
  if (!clean) return '';
  return clean.length > max ? `${clean.slice(0, max).trim()}…` : clean;
}

function extractArticleText(html = '') {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const paragraphs = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter((text) => text.length >= 60)
    .filter((text) => !/cookie|privacy policy|sign up|newsletter|advertisement|all rights reserved/i.test(text));

  const unique = [];
  const seen = new Set();
  for (const paragraph of paragraphs) {
    const key = paragraph.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(paragraph);
    }
    if (unique.join(' ').length >= 9000) break;
  }
  return trimText(unique.join('\n\n'), 9000);
}

function metadataDescription(html = '') {
  const patterns = [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = trimText(match?.[1] || '', 700);
    if (value) return value;
  }
  return '';
}

async function summarizeWithOpenAI(item, articleText) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !articleText) return '';

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SUMMARY_MODEL || 'gpt-5-mini',
        input: [
          {
            role: 'system',
            content: 'Summarize financial and business news accurately and neutrally. Write one detailed paragraph of about 120-180 words. Include the main event, key companies or people, important numbers or terms, relevant context, and the consequence described in the article. Do not add facts that are not in the provided article text. Do not give investment advice.',
          },
          {
            role: 'user',
            content: `Headline: ${item.title}\nSource: ${item.source}\nCategory: ${item.category}\n\nArticle text:\n${articleText}`,
          },
        ],
        max_output_tokens: 350,
      }),
      cache: 'no-store',
    });

    if (!response.ok) return '';
    const json = await response.json();
    const output = json?.output_text
      || json?.output?.flatMap((part) => part?.content || []).map((part) => part?.text || '').join(' ').trim();
    return trimText(output || '', 1800);
  } catch {
    return '';
  }
}

function fallbackDetailedSummary(item, articleText, metaDescription) {
  const rss = trimText(item.rssDescription || '', 700);
  const context = articleText || metaDescription || rss;
  if (context) {
    const sentences = context.match(/[^.!?]+[.!?]+/g) || [context];
    const selected = sentences
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 35)
      .slice(0, 5)
      .join(' ');
    if (selected) return trimText(selected, 1200);
  }
  return `This article focuses on ${item.title}. The source did not expose enough article text for a full detailed summary, so use the original link for the complete reporting and supporting details.`;
}

async function getArticleSummary(item) {
  try {
    const res = await fetch(item.link, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WallStreetDaily/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 1800 },
    });
    if (!res.ok) throw new Error('article unavailable');

    const html = await res.text();
    const articleText = extractArticleText(html);
    const metaDescription = metadataDescription(html);
    const aiSummary = await summarizeWithOpenAI(item, articleText || metaDescription);

    return aiSummary || fallbackDetailedSummary(item, articleText, metaDescription);
  } catch {
    return fallbackDetailedSummary(item, '', '');
  }
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
