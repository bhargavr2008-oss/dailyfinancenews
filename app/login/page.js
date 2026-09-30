export default async function Login({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;
  const from = params?.from || '/';
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-lock">WS</div>
        <p className="eyebrow">PRIVATE DASHBOARD</p>
        <h1>Wall Street Daily</h1>
        <p className="muted">Your personal market briefing, headlines, and daily watchlist.</p>
        {error === '1' && <p className="error">Incorrect password.</p>}
        {error === 'config' && <p className="error">Set DASHBOARD_PASSWORD and AUTH_SECRET first.</p>}
        <form action="/api/login" method="post" className="login-form">
          <input type="hidden" name="from" value={from} />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Enter your password" />
          <button type="submit">Open dashboard</button>
        </form>
      </section>
    </main>
  );
}
