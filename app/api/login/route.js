import { NextResponse } from 'next/server';
import { sessionToken } from '../../../lib/auth';

export async function POST(request) {
  const form = await request.formData();
  const entered = String(form.get('password') || '');
  const from = String(form.get('from') || '/');
  const password = process.env.DASHBOARD_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!password || !secret) {
    return NextResponse.redirect(new URL('/login?error=config', request.url), 303);
  }

  if (entered !== password) {
    const url = new URL('/login', request.url);
    url.searchParams.set('error', '1');
    url.searchParams.set('from', from);
    return NextResponse.redirect(url, 303);
  }

  const token = await sessionToken(password, secret);
  const target = from.startsWith('/') && !from.startsWith('//') ? from : '/';
  const response = NextResponse.redirect(new URL(target, request.url), 303);
  response.cookies.set('wallstreet_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
