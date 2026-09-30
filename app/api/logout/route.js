import { NextResponse } from 'next/server';

export async function POST(request) {
  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  response.cookies.set('wallstreet_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
