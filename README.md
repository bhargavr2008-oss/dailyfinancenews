# Wall Street Daily

A private personal dashboard for daily market checks and current Wall Street/business news.

## Features
- Password-protected access using a secure HTTP-only cookie
- Live/delayed market snapshots for S&P 500, Dow, Nasdaq, VIX, gold, crude oil, and Bitcoin
- Fresh market, economy, company, and technology headlines
- Clean responsive design for desktop and mobile
- No paid data API key required for the included data sources

## Run locally
1. Install Node.js 20+
2. Run `npm install`
3. Copy `.env.example` to `.env.local`
4. Choose a strong `DASHBOARD_PASSWORD`
5. Set `AUTH_SECRET` to a long random string
6. Run `npm run dev`
7. Open `http://localhost:3000`

## Deploy on Vercel
1. Import this GitHub repository into Vercel
2. Add these Environment Variables in Vercel Project Settings:
   - `DASHBOARD_PASSWORD`
   - `AUTH_SECRET`
3. Deploy

The middleware allows access when these environment variables are absent so the project can build locally. For a truly private deployed site, always set both variables in Vercel.

## Data notes
Market prices come from a public Yahoo Finance chart endpoint and may be delayed. Headlines are aggregated from Google News RSS queries and link to the original publisher or Google News redirect. External sources can change availability over time.
