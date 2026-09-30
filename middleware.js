import { NextResponse } from 'next/server';
import { sessionToken } from './lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const password = process.env.DASHBOARD_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!password || !secret) return NextResponse.next();

  const expected = await sessionToken(password, secret);
  const actual = request.cookies.get('wallstreet_session')?.value;

  if (actual !== expected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/logout).*)'],
};
