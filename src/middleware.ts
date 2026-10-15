import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internals, static assets, PWA manifest, service worker, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icons') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|avif|webmanifest)$/)
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('licosa_session');

  // If user is accessing /login, let them access the page so stale sessions don't cause an infinite redirect loop
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Any other route requires authentication
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'],
};
