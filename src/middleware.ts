import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // --- Content Security Policy ---
    // Allow YouTube iframe embeds and Google Fonts
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https://i.ytimg.com https://*.googleusercontent.com https://is1-ssl.mzstatic.com",
        "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
        "connect-src 'self' https://www.googleapis.com https://itunes.apple.com",
        "media-src https://www.youtube.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join('; ');

    response.headers.set('Content-Security-Policy', csp);

    // --- Clickjacking Protection ---
    response.headers.set('X-Frame-Options', 'DENY');

    // --- MIME Sniffing Protection ---
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // --- HTTPS Enforcement ---
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // --- Referrer Policy ---
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // --- Permissions Policy ---
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // --- Remove fingerprinting headers ---
    response.headers.delete('X-Powered-By');

    return response;
}

export const config = {
    matcher: [
        // Apply to all routes except static files
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
