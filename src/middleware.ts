import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/constants';

/**
 * Fast UX gate: bounce unauthenticated visitors from the app to /login. This is a
 * presence check only — the real security gate is `requireProfileId()` in each server
 * component and the per-route auth checks, which verify the cookie's signature.
 */

const PROTECTED = [
  '/dashboard', '/learn', '/playground', '/practice', '/projects', '/interviews',
  '/labs', '/capstone', '/cheatsheets', '/glossary', '/flashcards', '/leaderboard', '/badges',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  if (!req.cookies.get(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
