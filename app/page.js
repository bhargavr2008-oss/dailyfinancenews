import { ArrowDownRight, ArrowUpRight, ExternalLink, LockKeyhole, Newspaper, RefreshCw } from 'lucide-react';
import { getMarkets, getNews } from '../lib/data';

export const dynamic = 'force-dynamic';

function formatPrice(item) {
  if (!item.ok) return 'Unavailable';
  if (item.symbol === 'BTC-USD') return `$${item.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (item.symbol === 'GC=F' || item.symbol === 'CL=F') return `$${item.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return item.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function marketMeaning(item) {
  if (!item.ok) return 'Live pricing is unavailable, so wait for the quote to refresh before drawing conclusions.';
  const magnitude = Math.abs(item.pct);

  if (item.symbol === '^VIX') {
    return item.pct >= 0
      ? 'Volatility is rising, which usually signals more investor caution and a greater chance of sharp market swings.'
      : 'Volatility is easing, which generally points to calmer risk sentiment across stocks.';
  }
  if (item.symbol === 'GC=F') {
    return item.pct >= 0
      ? 'Gold moving higher can reflect demand for safety, inflation protection, or expectations for lower real interest rates.'
      : 'Gold moving lower can signal less demand for defensive assets or pressure from higher yields and a stronger dollar.';
  }
  if (item.symbol === 'CL=F') {
    return item.pct >= 0
      ? 'Higher oil prices can lift energy shares but also raise inflation and transportation-cost concerns.'
      : 'Lower oil prices can reduce inflation pressure and consumer costs, though they may weigh on energy companies.';
  }
  if (item.symbol === 'BTC-USD') {
    return item.pct >= 0
      ? 'Bitcoin strength can signal stronger appetite for risk-sensitive assets and improving crypto demand.'
      : 'Bitcoin weakness can point to softer risk appetite, especially if other speculative assets are also falling.';
  }

  if (magnitude >= 1) {
    return `A ${magnitude.toFixed(2)}% move is meaningful for a major index and suggests investors are reacting strongly to macro, earnings, or policy news.`;
  }
  return 'The move is relatively contained, which points more to a shift in daily sentiment than a major market regime change by itself.';
}

function newsMeaning(item) {
  const text = item.title.toLowerCase();
  if (/fed|federal reserve|rate|rates|yield|treasury/.test(text)) {
    return 'This matters because interest-rate expectations affect borrowing costs, bond yields, and stock valuations, especially for growth companies.';
  }
  if (/inflation|cpi|pce|prices/.test(text)) {
    return 'Inflation data can change expectations for Federal Reserve policy, which can quickly move both stocks and bonds.';
  }
  if (/jobs|employment|payroll|unemployment|labor/.test(text)) {
    return 'Labor-market strength affects consumer spending and the Fed outlook, so unusually strong or weak data can shift rate expectations.';
  }
  if (/earnings|revenue|profit|guidance|forecast/.test(text)) {
    return 'Investors use earnings and guidance to reset expectations for future cash flow, so the impact can spread to competitors and the broader sector.';
  }
  if (/ai|artificial intelligence|chip|semiconductor|nvidia/.test(text)) {
    return 'AI and semiconductor spending remains a major driver of technology valuations, capital spending, and expectations for future growth.';
  }
  if (/oil|crude|opec|energy/.test(text)) {
    return 'Energy developments can influence inflation, transportation costs, consumer spending, and the earnings outlook for energy companies.';
  }
  if (/merger|acquisition|deal|buyout/.test(text)) {
    return 'Large deals can reprice companies across an industry and reveal where executives see strategic value, growth, or consolidation opportunities.';
  }
  return 'The key market question is whether this changes expectations for growth, interest rates, company profits, or investor risk appetite.';
}

export default async function Home() {
  const [markets, news] = await Promise.all([getMarkets(), getNews()]);
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }).format(now);
  const featured = news[0];
  const remaining = news.slice(1, 16);
  const keyMovers = markets.filter((item) => item.ok).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 4);
  const keyNews = news.slice(0, 5);

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <div className="brand-row"><span className="brand-mark">WS</span><span>Wall Street Daily</span></div>
          <p className="date">{date} · New York market time</p>
        </div>
        <div className="header-actions">
          <span className="private-pill"><LockKeyhole size={14}/> Private</span>
          <form action="/api/logout" method="post"><button className="ghost-button" type="submit">Log out</button></form>
        </div>
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">YOUR DAILY BRIEFING</p>
          <h1>Know what moved.<br/>Know what matters.</h1>
          <p className="hero-sub">A fast read of the market, the economy, major companies, and the stories shaping Wall Street today.</p>
          <div className="refresh-note"><RefreshCw size={15}/> Market data and headlines refresh automatically.</div>
        </div>
        <div className="brief-card">
          <div className="brief-label"><Newspaper size={16}/> Lead story</div>
          {featured ? <>
            <h2>{featured.title}</h2>
            <div className="story-meta">{featured.source} · {timeAgo(featured.pubDate)}</div>
            <a className="read-link" href={featured.link} target="_blank" rel="noreferrer">Read story <ExternalLink size={14}/></a>
          </> : <p className="muted">Headlines are temporarily unavailable. Try refreshing shortly.</p>}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">MARKETS</p><h2>At a glance</h2></div><span className="tiny-note">Prices may be delayed</span></div>
        <div className="market-grid">
          {markets.map((item) => {
            const up = item.ok && item.change >= 0;
            return <article className="market-card" key={item.symbol}>
              <div className="market-name">{item.label}</div>
              <div className="market-price">{formatPrice(item)}</div>
              {item.ok ? <div className={`market-change ${up ? 'up' : 'down'}`}>{up ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>} {Math.abs(item.pct).toFixed(2)}%</div> : <div className="market-change muted">No live quote</div>}
            </article>
          })}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">KEY MOVING POINTS</p><h2>What moved — and what it means</h2></div></div>
        <div className="insight-grid">
          {keyMovers.length ? keyMovers.map((item) => {
            const up = item.pct >= 0;
            return <article className="insight-card" key={`mover-${item.symbol}`}>
              <div className="insight-topline">
                <span>{item.label}</span>
                <span className={up ? 'up' : 'down'}>{up ? '+' : '-'}{Math.abs(item.pct).toFixed(2)}%</span>
              </div>
              <h3>{item.label} moved {up ? 'higher' : 'lower'} today.</h3>
              <p><strong>What it means:</strong> {marketMeaning(item)}</p>
            </article>
          }) : <div className="empty-card">Market movers are temporarily unavailable.</div>}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">KEY NEWS</p><h2>The headlines that matter most</h2></div></div>
        <div className="key-news-list">
          {keyNews.length ? keyNews.map((item) => <article className="key-news-card" key={`key-${item.title}-${item.pubDate}`}>
            <div className="news-kicker">{item.category} · {item.source} · {timeAgo(item.pubDate)}</div>
            <h3>{item.title}</h3>
            <p><strong>What it means:</strong> {newsMeaning(item)}</p>
            <a className="read-link dark-link" href={item.link} target="_blank" rel="noreferrer">Read original <ExternalLink size={14}/></a>
          </article>) : <div className="empty-card">Key news is temporarily unavailable.</div>}
        </div>
      </section>

      <section className="news-layout section-block">
        <div className="news-column">
          <div className="section-heading"><div><p className="eyebrow">MORE NEWS</p><h2>What else to know today</h2></div></div>
          <div className="news-list">
            {remaining.length ? remaining.map((item) => <a className="news-item" href={item.link} target="_blank" rel="noreferrer" key={`${item.title}-${item.pubDate}`}>
              <div><div className="news-kicker">{item.category} · {item.source}</div><h3>{item.title}</h3><span>{timeAgo(item.pubDate)}</span></div>
              <ExternalLink size={17}/>
            </a>) : <div className="empty-card">No headlines loaded right now.</div>}
          </div>
        </div>
        <aside className="routine-card">
          <p className="eyebrow">5-MINUTE ROUTINE</p>
          <h2>Daily market check</h2>
          <ol>
            <li><span>01</span><div><strong>Scan the indexes</strong><p>Check direction, not just the number.</p></div></li>
            <li><span>02</span><div><strong>Read the lead story</strong><p>Find the main catalyst moving markets.</p></div></li>
            <li><span>03</span><div><strong>Check economy + Fed</strong><p>Watch rates, inflation, jobs, and policy.</p></div></li>
            <li><span>04</span><div><strong>Scan company news</strong><p>Look for earnings, deals, and major guidance.</p></div></li>
          </ol>
          <p className="disclaimer">For information only, not investment advice.</p>
        </aside>
      </section>

      <footer>Built as a private personal finance dashboard · Sources open in their original publishers.</footer>
    </main>
  );
}
