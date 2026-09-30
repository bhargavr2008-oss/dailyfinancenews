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

export default async function Home() {
  const [markets, news] = await Promise.all([getMarkets(), getNews()]);
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }).format(now);
  const featured = news[0];
  const remaining = news.slice(1, 16);

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

      <section className="news-layout section-block">
        <div className="news-column">
          <div className="section-heading"><div><p className="eyebrow">NEWS</p><h2>What to know today</h2></div></div>
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
